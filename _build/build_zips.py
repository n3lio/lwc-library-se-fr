#!/usr/bin/env python3
"""
SE FR Component Library - Self-contained zip builder
=====================================================

Scans every seFr<Name>/ component, auto-detects its Apex dependencies (local +
shared), and produces a self-contained zip in _zips/.

Each generated zip looks like:

    seFrContactCard.zip
    ├── README.md                    (component README, if any)
    ├── INSTALL.md                   (auto-generated install doc)
    └── force-app/main/default/
        ├── lwc/seFrContactCard/...
        └── classes/                 (local + bundled shared classes)

Detection logic
---------------
For each LWC bundle, we grep the JS sources for:

    import X from '@salesforce/apex/<ClassName>.<methodName>';

Each <ClassName> referenced is then looked up in:
  1. The component's own classes/ folder (local class — already in the bundle)
  2. _shared_apex/classes/ (shared class — needs to be bundled)
  3. Otherwise: warning (unknown — likely a typo or a class deployed separately)

Override file (optional)
------------------------
_build/manifest_overrides.yaml lets you force-include or exclude classes:

    seFrXxxx:
      include:
        - SE_FR_SomeClass        # force-add this class to the zip
      exclude:
        - SE_FR_OtherClass       # exclude even if auto-detected

Run
---
    python3 _build/build_zips.py            # builds all
    python3 _build/build_zips.py seFrContactCard seFrTerritoryMap   # a subset
    python3 _build/build_zips.py --yes      # skip the confirmation prompt
    python3 _build/build_zips.py --dry-run  # show plan, don't write zips

Outputs
-------
- _zips/seFr<Name>.zip                  (one per component)
- _build/dependencies.detected.yaml     (audit trail of detected deps)
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import sys
import tempfile
import zipfile
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent
SHARED_APEX = ROOT / "_shared_apex" / "classes"
ZIPS_DIR = ROOT / "_zips"
BUILD_DIR = ROOT / "_build"
DETECTED_MANIFEST = BUILD_DIR / "dependencies.detected.yaml"
OVERRIDES_FILE = BUILD_DIR / "manifest_overrides.yaml"

# Apex import pattern: import xyz from '@salesforce/apex/<ClassName>.<methodName>';
APEX_IMPORT_RE = re.compile(
    r"""@salesforce/apex/([A-Za-z_][A-Za-z0-9_]*)\.""",
    re.MULTILINE,
)

ANSI = {
    "reset": "\033[0m",
    "bold": "\033[1m",
    "dim": "\033[2m",
    "blue": "\033[34m",
    "cyan": "\033[36m",
    "green": "\033[32m",
    "yellow": "\033[33m",
    "red": "\033[31m",
    "magenta": "\033[35m",
}


def color(s: str, c: str) -> str:
    if not sys.stdout.isatty():
        return s
    return f"{ANSI[c]}{s}{ANSI['reset']}"


# ----------------------------------------------------------------------
# Data structures
# ----------------------------------------------------------------------


@dataclass
class ApexClass:
    name: str
    cls_path: Path
    meta_path: Path
    source: str  # 'local' or 'shared'


@dataclass
class Component:
    name: str
    folder: Path
    lwc_folder: Path
    local_classes: dict[str, ApexClass] = field(default_factory=dict)
    detected_imports: set[str] = field(default_factory=set)
    bundled: list[ApexClass] = field(default_factory=list)
    unknown_refs: set[str] = field(default_factory=set)
    has_readme: bool = False


# ----------------------------------------------------------------------
# Discovery
# ----------------------------------------------------------------------


def discover_shared_apex() -> dict[str, ApexClass]:
    """Index every .cls in _shared_apex/classes/ by class name."""
    index: dict[str, ApexClass] = {}
    if not SHARED_APEX.exists():
        return index
    for cls_path in SHARED_APEX.glob("*.cls"):
        meta_path = cls_path.with_suffix(".cls-meta.xml")
        if not meta_path.exists():
            print(color(f"  ⚠  shared class missing meta: {cls_path.name}", "yellow"))
            continue
        index[cls_path.stem] = ApexClass(
            name=cls_path.stem,
            cls_path=cls_path,
            meta_path=meta_path,
            source="shared",
        )
    return index


def discover_components() -> list[Component]:
    """Find every seFr<Name>/ folder that contains an lwc/ subfolder."""
    components: list[Component] = []
    for folder in sorted(ROOT.iterdir()):
        if not folder.is_dir() or not folder.name.startswith("seFr"):
            continue
        lwc_root = folder / "lwc" / folder.name
        if not lwc_root.exists():
            continue
        comp = Component(
            name=folder.name,
            folder=folder,
            lwc_folder=lwc_root,
            has_readme=(folder / "README.md").exists(),
        )
        # Local classes (if any)
        local_classes_folder = folder / "classes"
        if local_classes_folder.exists():
            for cls_path in local_classes_folder.glob("*.cls"):
                meta_path = cls_path.with_suffix(".cls-meta.xml")
                if not meta_path.exists():
                    continue
                comp.local_classes[cls_path.stem] = ApexClass(
                    name=cls_path.stem,
                    cls_path=cls_path,
                    meta_path=meta_path,
                    source="local",
                )
        components.append(comp)
    return components


# ----------------------------------------------------------------------
# Apex-import detection
# ----------------------------------------------------------------------


def detect_apex_imports(comp: Component) -> set[str]:
    """Grep JS files in the LWC bundle for `@salesforce/apex/X.Y` imports."""
    found: set[str] = set()
    for js_path in comp.lwc_folder.rglob("*.js"):
        try:
            text = js_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for match in APEX_IMPORT_RE.finditer(text):
            found.add(match.group(1))
    return found


# ----------------------------------------------------------------------
# Overrides
# ----------------------------------------------------------------------


def load_overrides() -> dict[str, dict[str, list[str]]]:
    """Tiny YAML-ish parser. Format expected:

        seFrXxxx:
          include:
            - SomeClass
          exclude:
            - OtherClass

    No external dependency — we don't need a real YAML lib for this shape.
    """
    overrides: dict[str, dict[str, list[str]]] = {}
    if not OVERRIDES_FILE.exists():
        return overrides
    current_comp: Optional[str] = None
    current_section: Optional[str] = None
    for raw in OVERRIDES_FILE.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        # Top-level component name (no leading whitespace, ends with ':')
        if line[0] not in (" ", "\t") and line.endswith(":"):
            current_comp = line[:-1].strip()
            current_section = None
            overrides.setdefault(current_comp, {"include": [], "exclude": []})
            continue
        # Section name (2-space indent, ends with ':')
        if current_comp and line.startswith("  ") and not line.startswith("    ") and line.endswith(":"):
            current_section = line.strip()[:-1]
            continue
        # Item (4-space indent, '-' prefix)
        if current_comp and current_section and line.lstrip().startswith("-"):
            item = line.lstrip()[1:].strip()
            overrides[current_comp].setdefault(current_section, []).append(item)
    return overrides


# ----------------------------------------------------------------------
# Bundle resolution
# ----------------------------------------------------------------------


def resolve_bundle(
    comp: Component,
    shared_index: dict[str, ApexClass],
    overrides: dict[str, dict[str, list[str]]],
) -> None:
    """Decide which classes go into this component's zip."""
    comp.detected_imports = detect_apex_imports(comp)

    bundled: dict[str, ApexClass] = {}

    # Always include local classes (they're part of the component already)
    for name, cls in comp.local_classes.items():
        bundled[name] = cls

    # For each detected import, find the class
    for class_name in comp.detected_imports:
        if class_name in comp.local_classes:
            continue  # already bundled (local)
        if class_name in shared_index:
            bundled[class_name] = shared_index[class_name]
            continue
        comp.unknown_refs.add(class_name)

    # Apply overrides
    overrides_for_comp = overrides.get(comp.name, {})
    for forced in overrides_for_comp.get("include", []):
        if forced in shared_index:
            bundled[forced] = shared_index[forced]
        elif forced in comp.local_classes:
            bundled[forced] = comp.local_classes[forced]
        else:
            comp.unknown_refs.add(forced)
    for excluded in overrides_for_comp.get("exclude", []):
        bundled.pop(excluded, None)

    comp.bundled = sorted(bundled.values(), key=lambda c: c.name)


# ----------------------------------------------------------------------
# Output
# ----------------------------------------------------------------------


def render_install_md(comp: Component) -> str:
    """Auto-generated install doc dropped at the root of each zip."""
    lines: list[str] = []
    lines.append(f"# Install — {comp.name}")
    lines.append("")
    lines.append("This zip is **self-contained**. Everything it needs is here.")
    lines.append("")
    lines.append("## Quick deploy (SF CLI)")
    lines.append("")
    lines.append("```bash")
    lines.append("# unzip the bundle")
    lines.append(f"unzip {comp.name}.zip -d {comp.name}")
    lines.append(f"cd {comp.name}")
    lines.append("")
    lines.append("# deploy to your demo org")
    lines.append("sf project deploy start --source-dir force-app --target-org <your-org-alias>")
    lines.append("```")
    lines.append("")
    lines.append("## What's inside")
    lines.append("")
    lines.append(f"- **LWC bundle** · `force-app/main/default/lwc/{comp.name}/`")
    if comp.bundled:
        lines.append("- **Apex classes** · `force-app/main/default/classes/`")
        for cls in comp.bundled:
            tag = "(local)" if cls.source == "local" else "(shared, bundled here for self-containment)"
            lines.append(f"  - `{cls.name}.cls` {tag}")
    else:
        lines.append("- No Apex required.")
    lines.append("")
    lines.append("## Configure")
    lines.append("")
    lines.append("Open App Builder, drop **`SE FR - " +
                 comp.name.replace("seFr", "").replace("seFr", "") + "`** "
                 "(or search for it) on the right Lightning page, tune the properties.")
    lines.append("")
    lines.append("See the component README inside this zip for the full property reference.")
    lines.append("")
    if any(cls.source == "shared" for cls in comp.bundled):
        lines.append("## Note on shared classes")
        lines.append("")
        lines.append(
            "Some Apex classes in `classes/` are also used by other components in the SE FR "
            "Component Library. Deploying this zip is safe even if those classes already exist "
            "in your org — Salesforce performs an idempotent overwrite (same code, same name)."
        )
        lines.append("")
    return "\n".join(lines)


def build_zip(comp: Component, dry_run: bool) -> Optional[Path]:
    """Stage files in a temp dir and zip them into _zips/."""
    if not comp.lwc_folder.exists():
        print(color(f"  ✘  {comp.name}: lwc folder missing, skipped", "red"))
        return None

    if dry_run:
        return None

    ZIPS_DIR.mkdir(exist_ok=True)
    out_path = ZIPS_DIR / f"{comp.name}.zip"
    out_path.unlink(missing_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        staging = Path(tmp) / comp.name
        staging.mkdir()

        # Copy README at the zip root if it exists
        if comp.has_readme:
            shutil.copy(comp.folder / "README.md", staging / "README.md")

        # Drop INSTALL.md
        (staging / "INSTALL.md").write_text(render_install_md(comp), encoding="utf-8")

        # Place LWC + classes under force-app/main/default
        force_app = staging / "force-app" / "main" / "default"
        (force_app / "lwc").mkdir(parents=True)
        shutil.copytree(comp.lwc_folder, force_app / "lwc" / comp.name)

        if comp.bundled:
            classes_dir = force_app / "classes"
            classes_dir.mkdir()
            for cls in comp.bundled:
                shutil.copy(cls.cls_path, classes_dir / cls.cls_path.name)
                shutil.copy(cls.meta_path, classes_dir / cls.meta_path.name)

        # Zip it
        with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for path in staging.rglob("*"):
                if path.is_file():
                    zf.write(path, path.relative_to(staging.parent))

    return out_path


# ----------------------------------------------------------------------
# Pretty-print plan + audit manifest
# ----------------------------------------------------------------------


def print_plan(components: list[Component]) -> None:
    print()
    print(color("Build plan", "bold"))
    print(color("─" * 80, "dim"))
    for comp in components:
        readme_tag = "" if comp.has_readme else color(" [no README]", "yellow")
        print(f"  {color(comp.name, 'cyan')}{readme_tag}")
        if not comp.bundled:
            print(f"    {color('(no Apex)', 'dim')}")
        else:
            for cls in comp.bundled:
                tag = color("local", "green") if cls.source == "local" else color("shared", "magenta")
                print(f"    + {cls.name:<45} {tag}")
        if comp.unknown_refs:
            for ref in sorted(comp.unknown_refs):
                print(f"    {color('?', 'red')} {ref:<45} {color('not found', 'red')}")
    print(color("─" * 80, "dim"))
    total = len(components)
    bundled_count = sum(len(c.bundled) for c in components)
    shared_count = sum(1 for c in components for cls in c.bundled if cls.source == "shared")
    no_readme = sum(1 for c in components if not c.has_readme)
    print(
        f"  {total} components · {bundled_count} classes total · "
        f"{shared_count} shared inclusions · {no_readme} READMEs missing"
    )
    print()


def write_detected_manifest(components: list[Component]) -> None:
    BUILD_DIR.mkdir(exist_ok=True)
    lines: list[str] = []
    lines.append("# Auto-generated by build_zips.py — DO NOT EDIT.")
    lines.append("# Snapshot of detected dependencies at the last successful build.")
    lines.append("")
    for comp in components:
        lines.append(f"{comp.name}:")
        if comp.bundled:
            lines.append("  classes:")
            for cls in comp.bundled:
                lines.append(f"    - {cls.name}  # {cls.source}")
        else:
            lines.append("  classes: []")
        if comp.detected_imports:
            lines.append("  imports_detected:")
            for imp in sorted(comp.detected_imports):
                lines.append(f"    - {imp}")
        if comp.unknown_refs:
            lines.append("  unknown:")
            for ref in sorted(comp.unknown_refs):
                lines.append(f"    - {ref}")
        lines.append("")
    DETECTED_MANIFEST.write_text("\n".join(lines), encoding="utf-8")


# ----------------------------------------------------------------------
# Entry point
# ----------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("components", nargs="*", help="Subset of components to build (default: all)")
    parser.add_argument("-y", "--yes", action="store_true", help="Skip confirmation prompt")
    parser.add_argument("--dry-run", action="store_true", help="Show plan only, don't write zips")
    args = parser.parse_args()

    print()
    print(color("SE FR Component Library — zip builder", "bold"))
    print(color(f"Root: {ROOT}", "dim"))

    shared_index = discover_shared_apex()
    print(color(f"Indexed {len(shared_index)} shared Apex classes from _shared_apex/", "dim"))

    overrides = load_overrides()
    if overrides:
        print(color(f"Loaded overrides for {len(overrides)} components", "dim"))

    components = discover_components()
    if args.components:
        wanted = set(args.components)
        components = [c for c in components if c.name in wanted]
        missing = wanted - {c.name for c in components}
        for m in missing:
            print(color(f"  ⚠  unknown component: {m}", "yellow"))

    for comp in components:
        resolve_bundle(comp, shared_index, overrides)

    print_plan(components)

    if any(comp.unknown_refs for comp in components):
        print(color(
            "  ⚠  Some Apex references could not be resolved — they're either typos, "
            "deployed separately, or missing from _shared_apex/.",
            "yellow"
        ))
        print()

    if args.dry_run:
        print(color("Dry run — no zips written.", "dim"))
        return 0

    if not args.yes:
        ans = input("Proceed? [y/N] ").strip().lower()
        if ans not in ("y", "yes"):
            print("Aborted.")
            return 1

    print()
    print(color("Building zips...", "bold"))
    for comp in components:
        out = build_zip(comp, dry_run=False)
        if out:
            size_kb = out.stat().st_size // 1024
            print(f"  {color('✔', 'green')}  {comp.name:<35} {size_kb:>4} KB")

    write_detected_manifest(components)
    print()
    print(color(f"Wrote audit manifest to {DETECTED_MANIFEST.relative_to(ROOT)}", "dim"))
    print(color("Done.", "green"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
