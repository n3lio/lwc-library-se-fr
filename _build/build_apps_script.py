#!/usr/bin/env python3
"""Regenerate _deck/AppsScript_GenerateSlides.gs from the manifest.

The .gs file is fully overwritten — it embeds the manifest as a JS const
plus the static intro / closing slides + a helper that turns each
component record into a TITLE_AND_BODY slide with notes.
"""

from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_deck" / "AppsScript_GenerateSlides.gs"
MANIFEST = ROOT / "_build" / "manifest.json"

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


def js_string(value: str) -> str:
    """Render a Python string as a safe JS double-quoted literal."""
    return json.dumps(value, ensure_ascii=False)


def build_payload(manifest: dict) -> dict:
    """Build a JSON-serializable payload the .gs script will use."""
    by_cat: dict[str, list[dict]] = {c: [] for c in CATEGORY_ORDER}
    for c in manifest["components"]:
        for cat in c.get("categories", []):
            by_cat.setdefault(cat, []).append({
                "apiName": c["apiName"],
                "name": (c.get("masterLabel") or c["apiName"]).replace("SE FR - ", "").strip(),
                "tagline": c.get("tagline") or "",
                "chips": c.get("chips") or [],
                "keyProps": c.get("keyProps") or [],
                "seBenefit": c.get("seBenefit") or "",
                "surfaces": c.get("surfaces") or [],
                "objects": c.get("objects") or [],
                "apexDeps": c.get("apexDeps") or [],
                "sharedApexDeps": c.get("sharedApexDeps") or [],
                "dataMode": c.get("dataMode") or "mock",
                "mobileReady": bool(c.get("mobileReady")),
                "originalAuthor": c.get("originalAuthor") or "",
            })
    for cat in by_cat:
        by_cat[cat].sort(key=lambda x: x["apiName"])

    sections = []
    for cat in CATEGORY_ORDER:
        if not by_cat.get(cat):
            continue
        sections.append({
            "category": cat,
            "lede": CATEGORY_LEDE.get(cat, ""),
            "components": by_cat[cat],
        })
    return {"sections": sections}


def main() -> int:
    if not MANIFEST.exists():
        raise SystemExit(f"{MANIFEST} not found — run build_manifest.py first.")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    payload = build_payload(manifest)
    payload_js = json.dumps(payload, indent=2, ensure_ascii=False)

    n_components = sum(len(s["components"]) for s in payload["sections"])

    gs = f'''/**
 * SE FR Component Library — Google Slides generator
 * --------------------------------------------------
 * AUTO-GENERATED from _build/manifest.json by _build/build_apps_script.py.
 * Do not hand-edit — regenerate via:
 *     python3 _build/build_apps_script.py
 *
 * To use this script:
 *  1. Open https://script.google.com → "New project"
 *  2. Paste this entire file into Code.gs
 *  3. Save, ▶ Run, accept Drive / Slides permissions
 *  4. The execution log prints the URL of the created presentation
 *
 * The script creates a deck with:
 *   - 4 static intro slides (cover, why, principles, reading)
 *   - 1 catalog slide
 *   - 1 tech-prereqs slide
 *   - For each manifest category (in order): 1 divider + N component slides
 *   - 2 closing slides (deploy, contribute)
 *
 * Each slide uses TITLE_AND_BODY (plain text). Restyle with your branded
 * template once content is in place.
 */

// ============================================================
// MANIFEST PAYLOAD (auto-generated)
// ============================================================
var MANIFEST = {payload_js};

// ============================================================
// MAIN ENTRY POINT
// ============================================================
function generateDeck() {{
    var deck = buildDeckArray();
    var presentation = SlidesApp.create('SE FR Component Library — Draft');
    var firstSlide = presentation.getSlides()[0];
    if (firstSlide) firstSlide.remove();

    deck.forEach(function(s) {{
        var layout = SlidesApp.PredefinedLayout.TITLE_AND_BODY;
        var slide = presentation.appendSlide(layout);
        var title = slide.getPlaceholder(SlidesApp.PlaceholderType.TITLE);
        var body  = slide.getPlaceholder(SlidesApp.PlaceholderType.BODY);
        if (title) title.asShape().getText().setText(s.title || '');
        if (body)  body.asShape().getText().setText(s.body || '');
        if (s.notes) {{
            var notesShape = slide.getNotesPage().getSpeakerNotesShape();
            if (notesShape) notesShape.getText().setText(s.notes);
        }}
    }});

    Logger.log('Done. Open: ' + presentation.getUrl());
}}

// ============================================================
// BUILD THE DECK ARRAY (static slides + manifest-driven slides)
// ============================================================
function buildDeckArray() {{
    var deck = [];

    // ----- Intro -----
    deck.push({{
        title: 'SE FR Component Library',
        body: 'A reusable Lightning Web Components kit shared across the SE France team to speed up Salesforce demos.\\n\\nInternal asset · SE FR · 2026',
        notes: 'Cover slide. Apply your branded title master.'
    }});

    deck.push({{
        title: 'Why this library',
        body: [
            'Build demos faster.',
            'Drop a vetted component on a page, configure via App Builder, demo in minutes — not days.',
            '',
            'Stay generic.',
            'Every component is industry-neutral. Customize via properties, not by editing code.',
            '',
            'Share & contribute.',
            'One pool of components owned collectively by the SE France team.'
        ].join('\\n'),
        notes: ''
    }});

    deck.push({{
        title: 'Design principles',
        body: [
            '· Lightning base components first — translation comes for free.',
            '· Custom strings as properties — no hardcoded customer copy.',
            '· Demo data as JSON / CSV props — swap datasets in App Builder.',
            '· Currency & locale exposed.',
            '· Standard fields first — schema-safe optional Apex enrichment.',
            '· Bilingual EN / FR via the language prop.'
        ].join('\\n'),
        notes: ''
    }});

    deck.push({{
        title: 'Reading the deck',
        body: [
            'Each component slide carries:',
            '  · A name + API id',
            '  · One-line tagline + 3-4 SE-friendly chips',
            '  · "Configurable settings" — the props you tune in App Builder',
            '  · "SE benefit" — the demo wow moment',
            '  · Targets · Objects · Apex · Data mode · Mobile-ready badge',
            '',
            'Data mode legend:',
            '  · LIVE — reads / writes real records',
            '  · HYBRID — uses real fields if present, otherwise mock',
            '  · MOCK — 100% prop-driven, no org dependency'
        ].join('\\n'),
        notes: ''
    }});

    deck.push({{
        title: 'Catalog',
        body: 'See the canonical component table in the README — auto-generated from the same manifest as this deck.',
        notes: ''
    }});

    deck.push({{
        title: 'Tech prerequisites (per component)',
        body: [
            'Most components: zero setup, deploy and drop on a page.',
            '',
            'Specific prereqs:',
            '  · seFrAgentforceHeader needs a static resource named astro_agentforce.',
            '  · seFrPromptLauncher needs a Named Credential routing to /services/data/...',
            '  · seFrOrderSummary needs at least one Order linked to the Case.',
            '  · seFrSmartRecommendations Commerce-AI variant needs a WebStoreNetwork.'
        ].join('\\n'),
        notes: ''
    }});

    // ----- Manifest-driven category sections -----
    MANIFEST.sections.forEach(function(sec, idx) {{
        var sectionNum = (idx + 1).toString().padStart(2, '0');
        var pieces = sec.components.map(function(c) {{ return c.name; }}).join(' · ');

        deck.push({{
            title: 'SECTION ' + sectionNum + ' — ' + sec.category,
            body: sec.lede + '\\n\\nIncludes: ' + pieces,
            notes: ''
        }});

        sec.components.forEach(function(c) {{
            deck.push(componentSlide(sec.category, c));
        }});
    }});

    // ----- Closing -----
    deck.push({{
        title: 'Get the components into your org',
        body: [
            'Three steps. Five minutes per component.',
            '',
            '1 · PICK',
            '  Browse the catalog on Drive (or GitHub when published).',
            '  Each component is a standalone zip with everything it needs.',
            '',
            '2 · DROP — three options:',
            '  SF CLI: sf project deploy start --source-dir <folder>',
            '  Claude Code / Cursor: pass the bundle to your AI assistant',
            '  Lightning Studio plugin: drag the zip in the UI',
            '',
            '3 · CONFIGURE',
            '  Place the component on the right page in App Builder.',
            '  Tune via the properties panel — no code change.',
            '  Demo-ready in minutes.'
        ].join('\\n'),
        notes: ''
    }});

    deck.push({{
        title: 'Thanks for using the SE FR kit',
        body: [
            'Built by SE France, for SE France. Contributions and feedback welcome.',
            '',
            'CONTRIBUTE',
            'Spotted a bug, want a new component, or have an SDO use case in mind?',
            'Ping the maintainer or open an issue when the GitHub repo lands.',
            '',
            'Lionel Braun · Solution Engineering France',
            'lionel.braun@salesforce.com'
        ].join('\\n'),
        notes: ''
    }});

    return deck;
}}

// ============================================================
// Helper: turn a component record into a content block
// ============================================================
function componentSlide(category, c) {{
    var SURFACE_LABELS = {{
        HomePage: 'Home Page', AppPage: 'App Page', RecordPage: 'Record Page'
    }};
    var targets = c.surfaces.map(function(s) {{ return SURFACE_LABELS[s] || s; }}).join(' · ') || '—';
    var objects = (c.objects && c.objects.length) ? c.objects.join(' · ') : 'Any';
    var apex;
    if ((c.apexDeps && c.apexDeps.length) || (c.sharedApexDeps && c.sharedApexDeps.length)) {{
        var local = (c.apexDeps || []).slice();
        var shared = (c.sharedApexDeps || []).map(function(x) {{ return x + ' (shared)'; }});
        apex = local.concat(shared).join(' + ');
    }} else {{
        apex = '—';
    }}
    var lines = [];
    lines.push('[' + category + ']');
    lines.push('');
    lines.push(c.tagline);
    if (c.chips && c.chips.length) {{
        lines.push('');
        lines.push('CHIPS · ' + c.chips.join(' · '));
    }}
    lines.push('');
    lines.push('CONFIGURABLE SETTINGS');
    (c.keyProps || []).forEach(function(p) {{ lines.push('  · ' + p); }});
    lines.push('');
    lines.push('SE BENEFIT');
    lines.push('  ' + c.seBenefit);
    lines.push('');
    lines.push('Targets · ' + targets);
    lines.push('Objects · ' + objects);
    lines.push('Apex · ' + apex);
    lines.push('Data mode · ' + c.dataMode.toUpperCase());
    if (c.mobileReady) lines.push('Mobile-ready · yes');
    if (c.originalAuthor && c.originalAuthor !== 'Lionel Braun') {{
        lines.push('Original author · ' + c.originalAuthor);
    }}
    return {{
        title: c.name + '  [' + c.apiName + ']',
        body: lines.join('\\n'),
        notes: ''
    }};
}}
'''

    OUT.write_text(gs, encoding="utf-8")
    print(f"✔ Regenerated {OUT.relative_to(ROOT)} ({n_components} component slides)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
