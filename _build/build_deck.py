#!/usr/bin/env python3
"""Regenerate the manifest-driven zones in _deck/index.html.

Two zones are managed:
  - DECK:nav        — sidebar nav for the 7 manifest categories
  - DECK:components — all component slides + per-category dividers

Static slides (cover, why, principles, reading, catalog, tech prereqs,
deploy, closing, agentforce cross-ref) are left untouched, including
their handcrafted layouts.
"""

from __future__ import annotations
import html as html_lib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "_deck" / "index.html"
MANIFEST = ROOT / "_build" / "manifest.json"

# Order in which categories appear in the deck. Must mirror the manifest's
# category set.
CATEGORY_ORDER = [
    "Account 360°",
    "Sales Productivity",
    "Geo & Field",
    "Marketing & Data",
    "Agentforce & AI",
    "Dashboards & KPIs",
    "Transverse",
]

CATEGORY_LEDE = {
    "Account 360°": "Everything that gives the account team a synthetic, actionable view of the customer.",
    "Sales Productivity": "Day-to-day reps' tooling — tasks, events, kanban, order entry.",
    "Geo & Field": "On-the-ground components for field reps — maps, voice notes.",
    "Marketing & Data": "Segments, consent, marketing-side metrics.",
    "Agentforce & AI": "Components that surface or trigger Salesforce AI capabilities.",
    "Dashboards & KPIs": "At-a-glance metric tiles, KPI grids, persona Home Pages.",
    "Transverse": "Polish & transverse components reused across categories.",
}


# ----------------------------------------------------------------------
# Markdown-ish to HTML for keyProps + seBenefit
# ----------------------------------------------------------------------
def md_inline_to_html(s: str) -> str:
    """Tiny converter: `code`, **bold**, *italic*. Plain text otherwise."""
    out = s
    # Backtick code spans first
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    # Bold then italic
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", out)
    return out


# ----------------------------------------------------------------------
# Filename mapping (category id used in HTML ids / nav anchors)
# ----------------------------------------------------------------------
def cat_id(name: str) -> str:
    """'Account 360°' -> 'account-360', 'Geo & Field' -> 'geo-field' ..."""
    s = name.lower()
    s = s.replace("&", " ").replace("/", " ")
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"\s+", "-", s).strip("-")
    return s


def slide_id(api: str) -> str:
    return f"slide-{api}"


def divider_id(cat: str) -> str:
    return f"slide-divider-{cat_id(cat)}"


# ----------------------------------------------------------------------
# Renderers
# ----------------------------------------------------------------------
def render_nav(by_cat: dict[str, list[dict]]) -> str:
    """Sidebar sections — one per category, with the existing static
    'Intro' / 'Closing' sections kept outside this block."""
    blocks = []
    for idx, cat in enumerate(CATEGORY_ORDER, start=1):
        comps = by_cat.get(cat, [])
        if not comps:
            continue
        num = f"{idx:02d}"
        lines = [
            '        <div class="sb-section">',
            f'            <div class="sb-section-title"><span class="num">{num}</span>{cat}</div>',
            f'            <a class="sb-link" href="#{divider_id(cat)}"><span class="sb-num">▸</span>Section opener</a>',
        ]
        for c in comps:
            human = c.get("masterLabel", c["apiName"]).replace("CCO FR - ", "").strip()
            lines.append(
                f'            <a class="sb-link" href="#{slide_id(c["apiName"])}">'
                f'<span class="sb-num">·</span>{html_lib.escape(human)}</a>'
            )
        lines.append("        </div>")
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)


def render_divider(idx: int, cat: str, comps: list[dict]) -> str:
    pieces = " · ".join(
        c.get("masterLabel", c["apiName"]).replace("CCO FR - ", "").strip()
        for c in comps
    )
    lede = CATEGORY_LEDE.get(cat, "")
    num = f"SECTION {idx:02d}"
    return f'''<!-- ================================================================ -->
<!-- DIVIDER · {cat.upper()} -->
<!-- ================================================================ -->
<div class="slide divider" id="{divider_id(cat)}" data-section="{html_lib.escape(cat)}">
    <div class="num">{num}</div>
    <h2>{html_lib.escape(cat)}</h2>
    <div class="lede">{html_lib.escape(lede)}</div>
    <div class="pieces"><span>Includes</span>{html_lib.escape(pieces)}</div>
    <div class="slide-brand"><strong>CCO FR Component Library</strong></div>
    <div class="slide-num">section</div>
</div>'''


def render_component(c: dict, cat: str) -> str:
    api = c["apiName"]
    human = c.get("masterLabel", api).replace("CCO FR - ", "").strip()
    tagline = c.get("tagline") or ""
    chips = c.get("chips") or []
    keyProps = c.get("keyProps") or []
    seBenefit = c.get("seBenefit") or ""
    targets = " · ".join(
        {"HomePage": "Home Page", "AppPage": "App Page", "RecordPage": "Record Page"}.get(s, s)
        for s in c.get("surfaces", [])
    ) or "—"
    objects = " · ".join(c.get("objects", [])) or "Any"
    apex_local = c.get("apexDeps", [])
    apex_shared = c.get("sharedApexDeps", [])
    if apex_local or apex_shared:
        apex_html = " + ".join(
            [f"<code>{x}</code>" for x in apex_local]
            + [f"<code>{x}</code> <em>(shared)</em>" for x in apex_shared]
        )
    else:
        apex_html = "<em>none</em>"
    data_mode = (c.get("dataMode") or "mock").lower()
    pill_label = data_mode.capitalize()
    mobile_pill = (
        '<span class="data-pill" style="background:#E0F2FE;color:#075985;'
        'border:1px solid #BAE6FD">Mobile-ready</span>'
        if c.get("mobileReady") else ""
    )

    chips_html = ""
    if chips:
        chips_html = (
            '<div class="comp-chips" style="display:flex;flex-wrap:wrap;gap:6px;'
            'margin-top:8px">'
            + "".join(
                f'<span class="chip" style="background:#F4F6F9;border:1px solid #E5E5E5;'
                f'border-radius:999px;padding:2px 10px;font-size:11.5pt;color:#333">'
                f'{html_lib.escape(ch)}</span>'
                for ch in chips
            )
            + "</div>"
        )

    key_props_html = "\n".join(
        f"                <li>{md_inline_to_html(html_lib.escape(p, quote=False).replace('&lt;code&gt;', '<code>').replace('&lt;/code&gt;', '</code>').replace('&lt;strong&gt;', '<strong>').replace('&lt;/strong&gt;', '</strong>').replace('&lt;em&gt;', '<em>').replace('&lt;/em&gt;', '</em>'))}</li>"
        for p in keyProps
    )

    se_benefit_html = md_inline_to_html(html_lib.escape(seBenefit, quote=False)
        .replace('&lt;code&gt;', '<code>').replace('&lt;/code&gt;', '</code>')
        .replace('&lt;strong&gt;', '<strong>').replace('&lt;/strong&gt;', '</strong>')
        .replace('&lt;em&gt;', '<em>').replace('&lt;/em&gt;', '</em>')
    )

    return f'''<!-- ================================================================ -->
<!-- {api.upper()} -->
<!-- ================================================================ -->
<div class="slide comp" id="{slide_id(api)}" data-section="{html_lib.escape(cat)}">
    <div class="slide-section-tag">{html_lib.escape(cat)}</div>
    <div class="comp-head">
        <h2 class="comp-name">{html_lib.escape(human)}<code>{api}</code></h2>
        <div class="comp-tag">{html_lib.escape(tagline)}</div>
        {chips_html}
    </div>
    <div class="comp-shot"><div class="placeholder-name">{api}.png</div></div>
    <div class="comp-meta">
        <div class="meta-block">
            <h4>Configurable settings</h4>
            <ul>
{key_props_html}
            </ul>
        </div>
        <div class="se-benefit">
            <strong>SE benefit</strong>
            {se_benefit_html}
        </div>
        <div class="meta-block">
            <dl class="meta-row">
                <dt>Targets</dt><dd>{targets}</dd>
                <dt>Objects</dt><dd>{html_lib.escape(objects)}</dd>
                <dt>Apex</dt><dd>{apex_html}</dd>
            </dl>
        </div>
        <div style="display:flex;gap:6px"><span class="data-pill {data_mode}">{pill_label}</span>{mobile_pill}</div>
    </div>
    <div class="slide-brand"><strong>CCO FR Component Library</strong></div>
    <div class="slide-num">{api}</div>
</div>'''


def render_components_block(by_cat: dict[str, list[dict]]) -> str:
    blocks = []
    for idx, cat in enumerate(CATEGORY_ORDER, start=1):
        comps = by_cat.get(cat, [])
        if not comps:
            continue
        blocks.append(render_divider(idx, cat, comps))
        for c in comps:
            blocks.append(render_component(c, cat))
    return "\n\n".join(blocks)


def replace_block(body: str, name: str, new_content: str) -> str:
    pattern = re.compile(
        rf"(<!--\s*DECK:start\s+{re.escape(name)}\s*-->)(.*?)(<!--\s*DECK:end\s+{re.escape(name)}\s*-->)",
        re.DOTALL,
    )
    if not pattern.search(body):
        raise SystemExit(f"DECK:{name} markers not found in {HTML.name}")
    return pattern.sub(rf"\1\n{new_content}\n\3", body)


def main() -> int:
    if not MANIFEST.exists():
        raise SystemExit(f"{MANIFEST} not found — run build_manifest.py first.")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    components = manifest["components"]

    # Build by-category list, sorted by apiName within each category. A
    # component with N categories appears N times — once per category.
    by_cat: dict[str, list[dict]] = {c: [] for c in CATEGORY_ORDER}
    for c in components:
        for cat in c.get("categories", []):
            by_cat.setdefault(cat, []).append(c)
    for cat in by_cat:
        by_cat[cat].sort(key=lambda x: x["apiName"])

    body = HTML.read_text(encoding="utf-8")
    body = replace_block(body, "nav", render_nav(by_cat))
    body = replace_block(body, "components", render_components_block(by_cat))
    HTML.write_text(body, encoding="utf-8")

    n_dividers = sum(1 for cat in CATEGORY_ORDER if by_cat.get(cat))
    n_slides = sum(len(v) for v in by_cat.values())
    print(f"✔ Regenerated _deck/index.html: {n_dividers} dividers + {n_slides} component slides")
    return 0


if __name__ == "__main__":
    sys.exit(main())
