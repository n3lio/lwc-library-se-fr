#!/usr/bin/env python3
"""Regenerate manifest-driven sections of the root README.md.

Sections rewritten (delimited by HTML comment markers):
  - by-persona      : persona pivot table
  - by-category     : category pivot table  (added — replaces nothing today)
  - by-surface      : surface pivot table
  - by-mobile       : mobile-ready pivot
  - catalog         : full component catalog table

Other sections (Language, Naming, Folder layout, Install, Design,
Known caveats, Version log) are left untouched.

Markers in README.md:
    <!-- MANIFEST:start <name> -->
    ...content...
    <!-- MANIFEST:end <name> -->
"""

from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
README = ROOT / "README.md"
MANIFEST = ROOT / "_build" / "manifest.json"

PERSONA_LABELS = {
    "Sales": "Sales (B2B account management)",
    "FieldSales": "Field Sales (rep on the ground)",
    "Telesales": "Telesales (inside sales / contact center)",
    "Service": "Service (support, case handling)",
    "Retail": "Retail (B2C point of sale)",
    "Marketing": "Marketing",
    "Agents": "Agents / AI",
    "All": "All / Transverse",
}

SURFACE_LABELS = {
    "HomePage": "Home Page",
    "AppPage": "App Page",
    "RecordPage": "Record Page",
}


def fmt_apex(c: dict) -> str:
    parts = [f"`{x}`" for x in c.get("apexDeps", [])]
    parts += [f"`{x}` *(shared)*" for x in c.get("sharedApexDeps", [])]
    return " + ".join(parts) if parts else "—"


def fmt_targets(c: dict) -> str:
    if not c.get("surfaces"):
        return "—"
    return " / ".join(c["surfaces"])


def fmt_objects(c: dict) -> str:
    if not c.get("objects"):
        return "—"
    return " / ".join(c["objects"])


def render_pivot(title_col: str, key_label_map: dict, comp_key: str, components: list[dict], note: str | None = None) -> str:
    lines = [f"| {title_col} | Components |", "|---|---|"]
    for key, label in key_label_map.items():
        comps = [c for c in components if key in c.get(comp_key, [])]
        if not comps:
            continue
        names = ", ".join(f"`{c['apiName']}`" for c in comps)
        lines.append(f"| **{label}** | {names} |")
    out = "\n".join(lines)
    if note:
        out += f"\n\n{note}"
    return out


def render_category_pivot(components: list[dict]) -> str:
    cats: dict[str, list[str]] = {}
    for c in components:
        for cat in c.get("categories", []):
            cats.setdefault(cat, []).append(c["apiName"])
    order = [
        "Account 360°", "Sales Productivity", "Geo & Field",
        "Marketing & Data", "Agentforce & AI", "Dashboards & KPIs",
        "Transverse",
    ]
    lines = ["| Category | Components |", "|---|---|"]
    for cat in order:
        if cat not in cats:
            continue
        names = ", ".join(f"`{n}`" for n in cats[cat])
        lines.append(f"| **{cat}** | {names} |")
    return "\n".join(lines)


def render_mobile_pivot(components: list[dict]) -> str:
    yes = [c["apiName"] for c in components if c.get("mobileReady")]
    no = [c["apiName"] for c in components if not c.get("mobileReady")]
    lines = ["| Mobile-ready | Components |", "|---|---|"]
    lines.append(f"| ✅ **Yes** ({len(yes)}) | " + ", ".join(f"`{n}`" for n in yes) + " |")
    lines.append(f"| ⚪ No ({len(no)}) | " + ", ".join(f"`{n}`" for n in no) + " |")
    return "\n".join(lines)


def render_catalog_table(components: list[dict]) -> str:
    lines = [
        "| Component | Master label | Tagline | Categories | Targets | Object(s) | Apex |",
        "|---|---|---|---|---|---|---|",
    ]
    for c in sorted(components, key=lambda x: x["apiName"]):
        lines.append(
            f"| `{c['apiName']}` "
            f"| {c.get('masterLabel') or '—'} "
            f"| {c.get('tagline') or '—'} "
            f"| {', '.join(c.get('categories', []))} "
            f"| {fmt_targets(c)} "
            f"| {fmt_objects(c)} "
            f"| {fmt_apex(c)} |"
        )
    return "\n".join(lines)


def replace_block(body: str, name: str, new_content: str) -> str:
    pattern = re.compile(
        rf"(<!--\s*MANIFEST:start\s+{re.escape(name)}\s*-->)(.*?)(<!--\s*MANIFEST:end\s+{re.escape(name)}\s*-->)",
        re.DOTALL,
    )
    if not pattern.search(body):
        raise SystemExit(f"Marker MANIFEST:{name} not found in README.md — add it first.")
    return pattern.sub(rf"\1\n{new_content}\n\3", body)


def main() -> int:
    if not MANIFEST.exists():
        raise SystemExit(f"{MANIFEST} not found — run build_manifest.py first.")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    components = manifest["components"]

    body = README.read_text(encoding="utf-8")

    body = replace_block(body, "by-persona", render_pivot(
        "Persona", PERSONA_LABELS, "personas", components,
        note="A component can appear in more than one row when it's genuinely multi-persona.",
    ))
    body = replace_block(body, "by-category", render_category_pivot(components))
    body = replace_block(body, "by-surface", render_pivot(
        "Surface", SURFACE_LABELS, "surfaces", components,
    ))
    body = replace_block(body, "by-mobile", render_mobile_pivot(components))
    body = replace_block(body, "catalog", render_catalog_table(components))

    README.write_text(body, encoding="utf-8")
    print(f"✔ Regenerated 5 manifest-driven sections in {README.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
