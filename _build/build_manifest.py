#!/usr/bin/env python3
"""
Build _build/manifest.json — single source of truth that aggregates
component metadata for downstream generators (KB PDF, deck, future site).

Sources merged per component:
- README.md frontmatter   → editorial fields (tagline, categories, personas, chips, author, ...)
- lwc/<name>.js-meta.xml  → masterLabel, description, targets, objects, properties
- dependencies.detected.yaml → apexDeps / sharedApexDeps

The script validates that every required field is present and that enum
values are within the allowed set. Run with --strict to fail hard on the
first error; default mode prints all errors then exits non-zero.
"""

from __future__ import annotations
import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_build" / "manifest.json"
DEPS_FILE = ROOT / "_build" / "dependencies.detected.yaml"

NS = "{http://soap.sforce.com/2006/04/metadata}"

# ----------------------------------------------------------------------
# Allowed enum values
# ----------------------------------------------------------------------
ALLOWED_CATEGORIES = {
    "Account 360°",
    "Sales Productivity",
    "Geo & Field",
    "Marketing & Data",
    "Agentforce & AI",
    "Dashboards & KPIs",
    "Transverse",
}
ALLOWED_PERSONAS = {
    "Sales", "FieldSales", "Telesales", "Service",
    "Retail", "Marketing", "Agents", "All",
}
ALLOWED_SURFACES = {"HomePage", "AppPage", "RecordPage"}
ALLOWED_STATUSES = {"active", "deprecated"}

REQUIRED_FRONTMATTER_KEYS = {
    "tagline", "categories", "personas", "chips",
    "originalAuthor", "status",
}

SURFACE_FROM_TARGET = {
    "lightning__HomePage": "HomePage",
    "lightning__AppPage": "AppPage",
    "lightning__RecordPage": "RecordPage",
}

# ----------------------------------------------------------------------
# Tiny YAML frontmatter parser (supports the subset we use)
# ----------------------------------------------------------------------
FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def parse_frontmatter(md_text: str) -> tuple[dict | None, str]:
    """Return (frontmatter_dict_or_None, body_without_frontmatter)."""
    m = FM_RE.match(md_text)
    if not m:
        return None, md_text
    raw = m.group(1)
    body = md_text[m.end():]
    return parse_yaml_block(raw), body


def parse_yaml_block(raw: str) -> dict:
    """Tiny YAML subset: top-level scalars, [a, b, c] inline arrays, and
    nested - block lists. No nested dicts. Comments stripped."""
    out: dict = {}
    current_key = None
    for line in raw.splitlines():
        # strip end-of-line comments (only when '#' is preceded by space, to
        # not break colors like #0176d3 inside values — though we don't use
        # those here, future-proof)
        line = re.sub(r"\s+#.*$", "", line)
        if not line.strip():
            continue
        stripped = line.lstrip()
        if stripped.startswith("- "):
            if current_key is None:
                raise ValueError(f"unexpected list item before key: {line}")
            out[current_key].append(_yaml_scalar(stripped[2:].strip()))
            continue
        m = re.match(r"^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$", line)
        if not m:
            raise ValueError(f"cannot parse line: {line!r}")
        key, val = m.group(1), m.group(2).strip()
        if val == "":
            # block list to follow
            out[key] = []
            current_key = key
        elif val.startswith("[") and val.endswith("]"):
            inner = val[1:-1].strip()
            out[key] = [_yaml_scalar(x.strip()) for x in inner.split(",") if x.strip()]
            current_key = None
        else:
            out[key] = _yaml_scalar(val)
            current_key = None
    return out


def _yaml_scalar(s: str):
    if s in ("null", "~", ""):
        return None
    if s in ("true", "True"):
        return True
    if s in ("false", "False"):
        return False
    if s.startswith('"') and s.endswith('"'):
        return s[1:-1]
    if s.startswith("'") and s.endswith("'"):
        return s[1:-1]
    return s


# ----------------------------------------------------------------------
# meta.xml parser
# ----------------------------------------------------------------------
@dataclass
class MetaXml:
    masterLabel: str
    description: str
    targets: list[str]
    objects: list[str]
    properties: list[dict] = field(default_factory=list)


def parse_meta_xml(path: Path) -> MetaXml:
    tree = ET.parse(path)
    root = tree.getroot()

    def t(tag: str) -> str | None:
        el = root.find(f"{NS}{tag}")
        return (el.text or "").strip() if el is not None and el.text else None

    targets_el = root.find(f"{NS}targets")
    targets = []
    if targets_el is not None:
        for tnode in targets_el.findall(f"{NS}target"):
            if tnode.text:
                targets.append(tnode.text.strip())

    objects: list[str] = []
    properties: list[dict] = []
    tcs = root.find(f"{NS}targetConfigs")
    if tcs is not None:
        for tc in tcs.findall(f"{NS}targetConfig"):
            obj_el = tc.find(f"{NS}objects")
            if obj_el is not None:
                for o in obj_el.findall(f"{NS}object"):
                    if o.text and o.text not in objects:
                        objects.append(o.text)
            for prop in tc.findall(f"{NS}property"):
                p = {
                    "name": prop.attrib.get("name"),
                    "type": prop.attrib.get("type"),
                    "label": prop.attrib.get("label"),
                    "default": prop.attrib.get("default"),
                    "description": prop.attrib.get("description"),
                }
                # de-dup if listed in multiple targetConfigs
                if not any(x["name"] == p["name"] for x in properties):
                    properties.append(p)

    return MetaXml(
        masterLabel=t("masterLabel") or "",
        description=t("description") or "",
        targets=targets,
        objects=objects,
        properties=properties,
    )


# ----------------------------------------------------------------------
# deps.yaml parser (only the bits we need)
# ----------------------------------------------------------------------
def parse_deps_yaml(path: Path) -> dict:
    if not path.exists():
        return {}
    out: dict = {}
    current = None
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("#") or not line.strip():
            continue
        m = re.match(r"^([A-Za-z][A-Za-z0-9_]*):\s*$", line)
        if m:
            current = m.group(1)
            out[current] = {"local": [], "shared": []}
            continue
        m = re.match(r"^\s+-\s+([A-Za-z][A-Za-z0-9_]*)\s*(#\s*(local|shared))?", line)
        if m and current:
            cls, kind = m.group(1), (m.group(3) or "local")
            # we only care under 'classes:' block; the file also has
            # 'imports_detected:' which dups; classes lines come first
            # under each component — but to be robust, take unique.
            bucket = out[current][kind]
            if cls not in bucket:
                bucket.append(cls)
    return out


# ----------------------------------------------------------------------
# Build per-component record
# ----------------------------------------------------------------------
@dataclass
class ComponentRecord:
    apiName: str
    masterLabel: str
    description: str
    tagline: str
    categories: list[str]
    personas: list[str]
    surfaces: list[str]
    objects: list[str]
    chips: list[str]
    keyProps: list[str]
    seBenefit: str
    dataMode: str | None
    mobileReady: bool
    featured: bool
    featuredRank: int | None
    releaseStatus: str
    originalAuthor: str
    originalAuthorEmail: str | None
    maintainedBy: str | None
    libraryIntegrationDate: str | None
    status: str
    deprecatedNote: str | None
    screenshots: list[str]
    gif: str | None
    apexDeps: list[str]
    sharedApexDeps: list[str]
    staticResourceDeps: list[str]
    customFieldsOptional: list[str]
    customFieldsRequired: list[str]
    properties: list[dict]


def build_component(
    folder: Path,
    deps: dict,
    errors: list[str],
) -> ComponentRecord | None:
    api = folder.name
    readme = folder / "README.md"
    meta_path = folder / "lwc" / api / f"{api}.js-meta.xml"

    if not readme.exists():
        errors.append(f"{api}: README.md missing")
        return None
    if not meta_path.exists():
        errors.append(f"{api}: meta.xml missing at {meta_path}")
        return None

    fm, _ = parse_frontmatter(readme.read_text(encoding="utf-8"))
    if fm is None:
        errors.append(f"{api}: README has no frontmatter — skipping")
        return None

    # required keys
    missing = REQUIRED_FRONTMATTER_KEYS - fm.keys()
    if missing:
        errors.append(f"{api}: missing required frontmatter keys: {sorted(missing)}")

    # validate enums
    cats = fm.get("categories") or []
    bad_cats = [c for c in cats if c not in ALLOWED_CATEGORIES]
    if bad_cats:
        errors.append(f"{api}: unknown categories {bad_cats} (allowed: {sorted(ALLOWED_CATEGORIES)})")
    personas = fm.get("personas") or []
    bad_p = [p for p in personas if p not in ALLOWED_PERSONAS]
    if bad_p:
        errors.append(f"{api}: unknown personas {bad_p}")
    chips = fm.get("chips") or []
    if not (2 <= len(chips) <= 4):
        errors.append(f"{api}: chips must be 2-4 entries (got {len(chips)})")
    status = fm.get("status") or "active"
    if status not in ALLOWED_STATUSES:
        errors.append(f"{api}: status {status!r} not in {sorted(ALLOWED_STATUSES)}")
    if status == "deprecated" and not fm.get("deprecatedNote"):
        errors.append(f"{api}: status=deprecated requires 'deprecatedNote'")

    # external contributor checks
    author = fm.get("originalAuthor") or ""
    if author and author != "Lionel Braun":
        for k in ("originalAuthorEmail", "maintainedBy", "libraryIntegrationDate"):
            if not fm.get(k):
                errors.append(f"{api}: external contributor requires '{k}'")

    # parse meta.xml
    meta = parse_meta_xml(meta_path)

    # invariant: masterLabel from meta wins (frontmatter doesn't carry it)
    surfaces = sorted({SURFACE_FROM_TARGET[t] for t in meta.targets if t in SURFACE_FROM_TARGET})

    # apex deps
    d = deps.get(api, {})
    apex_local = list(d.get("local", []))
    apex_shared = list(d.get("shared", []))

    # dataMode validation
    ALLOWED_DATA_MODES = {"live", "hybrid", "mock"}
    data_mode = fm.get("dataMode")
    if data_mode is not None and data_mode not in ALLOWED_DATA_MODES:
        errors.append(f"{api}: dataMode {data_mode!r} not in {sorted(ALLOWED_DATA_MODES)}")

    return ComponentRecord(
        apiName=api,
        masterLabel=meta.masterLabel,
        description=meta.description,
        tagline=fm.get("tagline") or "",
        categories=cats,
        personas=personas,
        surfaces=surfaces,
        objects=meta.objects,
        chips=chips,
        keyProps=fm.get("keyProps") or [],
        seBenefit=fm.get("seBenefit") or "",
        dataMode=data_mode,
        mobileReady=bool(fm.get("mobileReady")),
        featured=bool(fm.get("featured")),
        featuredRank=int(fm["featuredRank"]) if fm.get("featuredRank") not in (None, "") else None,
        releaseStatus=fm.get("releaseStatus") or "stable",
        originalAuthor=author,
        originalAuthorEmail=fm.get("originalAuthorEmail"),
        maintainedBy=fm.get("maintainedBy"),
        libraryIntegrationDate=fm.get("libraryIntegrationDate"),
        status=status,
        deprecatedNote=fm.get("deprecatedNote"),
        screenshots=fm.get("screenshots") or [],
        gif=fm.get("gif"),
        apexDeps=apex_local,
        sharedApexDeps=apex_shared,
        staticResourceDeps=fm.get("staticResourceDeps") or [],
        customFieldsOptional=fm.get("customFieldsOptional") or [],
        customFieldsRequired=fm.get("customFieldsRequired") or [],
        properties=meta.properties,
    )


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--strict", action="store_true", help="fail on first validation error")
    ap.add_argument("--out", type=Path, default=OUT)
    args = ap.parse_args()

    deps = parse_deps_yaml(DEPS_FILE)

    errors: list[str] = []
    components: list[ComponentRecord] = []
    skipped: list[str] = []

    folders = sorted(p for p in ROOT.iterdir() if p.is_dir() and p.name.startswith("seFr"))
    for folder in folders:
        rec = build_component(folder, deps, errors)
        if rec is None:
            skipped.append(folder.name)
            if args.strict:
                break
        else:
            components.append(rec)

    # cross-aggregations
    by_category: dict[str, list[str]] = {c: [] for c in ALLOWED_CATEGORIES}
    by_persona: dict[str, list[str]] = {p: [] for p in ALLOWED_PERSONAS}
    by_surface: dict[str, list[str]] = {s: [] for s in ALLOWED_SURFACES}
    for c in components:
        for cat in c.categories:
            by_category.setdefault(cat, []).append(c.apiName)
        for p in c.personas:
            by_persona.setdefault(p, []).append(c.apiName)
        for s in c.surfaces:
            by_surface.setdefault(s, []).append(c.apiName)

    payload = {
        "generatedAt": date.today().isoformat(),
        "componentCount": len(components),
        "skippedCount": len(skipped),
        "skipped": skipped,
        "components": [c.__dict__ for c in components],
        "byCategory": {k: v for k, v in by_category.items() if v},
        "byPersona": {k: v for k, v in by_persona.items() if v},
        "bySurface": {k: v for k, v in by_surface.items() if v},
    }

    args.out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Wrote {args.out}")
    print(f"  {len(components)} components built, {len(skipped)} skipped")
    if errors:
        print("\nValidation errors:")
        for e in errors:
            print(f"  - {e}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
