#!/usr/bin/env python3
"""Generate the static site from the manifest + recipes.yml + README changelog.

Output:
  _site/
    index.html              Hero + featured + cookbook strip + how-it-works
    components.html         Filterable grid (categories as section bands)
    components/<api>.html   One detail page per component
    cookbook.html           Recipe grid
    about.html              Why / Design principles / How it works / Reading the deck
    docs.html               Install + Configure (no Contribute)
    whats-new.html          Changelog timeline (parsed from root README)
    contributors.html       Maintainers + external authors (footer-only)
    assets/site.css, site.js, logo-library.png, logo-sefr.png

UX features (mocked on the static draft, wired on Heroku later):
  - Bilingual FR / EN switcher (FR default, persisted in localStorage)
  - "Try the showcase org" modal — STORM bot user provisioning explainer
  - Tracking modal before any download / deploy (email + reason + opp/customer)
    → fired once per session, then session-quiet
  - "Submit a component" + "Share feedback" modals with Slack / Q Branch / email
  - Cmd+K global search
  - "Ask the library agent" widget
"""

from __future__ import annotations
import html as html_lib
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "_site"
ASSETS_DIR = SITE / "assets"
COMPONENTS_DIR = SITE / "components"
MANIFEST = ROOT / "_build" / "manifest.json"
MANIFEST_FR = ROOT / "_build" / "manifest.fr.json"
RECIPES_YML = ROOT / "_build" / "recipes.yml"
RELEASE_NOTES_YML = ROOT / "_build" / "release_notes.yml"
ROOT_README = ROOT / "README.md"
SOURCE_LOGO_LIB = ROOT / "_doc" / "_assets" / "logo-library-s.png"
SOURCE_LOGO_SEFR = ROOT / "_doc" / "_assets" / "logo-sefr-s.png"
SOURCE_USER_GUIDE = ROOT / "_doc" / "SE_FR_LIBRARY_USER_GUIDE_FR.md"

# Component preview images (PNG / JPG / GIF / WebP) live on the SE FR
# Drive — user drops them in `LWC Library SE FR/Previews/` via the
# Google Drive Desktop mount. The builder scans this folder, copies
# matched images into _site/assets/previews/ and wires them to cards
# and detail pages.
SOURCE_PREVIEWS = Path(
    "/Users/lionel.braun/Library/CloudStorage/"
    "GoogleDrive-lionel.braun@salesforce.com/Mon Drive/"
    "LWC Library SE FR/Previews"
)
PREVIEW_EXTS = (".png", ".jpg", ".jpeg", ".gif", ".webp")

CATEGORY_ORDER = [
    "Account 360°",
    "Sales Productivity",
    "Geo & Field",
    "Marketing & Data",
    "Agentforce & AI",
    "Dashboards & KPIs",
    "Transverse",
]

CATEGORY_EMOJI = {
    "Account 360°": "🏢",
    "Sales Productivity": "📋",
    "Geo & Field": "🚗",
    "Marketing & Data": "🎯",
    "Agentforce & AI": "🤖",
    "Dashboards & KPIs": "📊",
    "Transverse": "✨",
}

PERSONA_LABEL = {
    "Sales": ("📌", "Sales", "persona-sales"),
    "FieldSales": ("🚗", "Field", "persona-field"),
    "Telesales": ("☎️", "Telesales", "persona-service"),
    "Service": ("🎧", "Service", "persona-service"),
    "Retail": ("🛍", "Retail", "persona-marketing"),
    "Marketing": ("🎯", "Marketing", "persona-marketing"),
    "Agents": ("🤖", "Agentforce", "persona-ai"),
    "All": ("✨", "All", ""),
}

SURFACE_LABEL = {"HomePage": "Home", "AppPage": "App", "RecordPage": "Record"}

DATA_MODE_PILLS = {"live": ("Live", "var(--success)", "rgba(46, 132, 74, 0.08)"),
                   "hybrid": ("Hybrid", "#c84d10", "rgba(254, 147, 57, 0.10)"),
                   "mock": ("Mock", "var(--text-muted)", "var(--bg-soft)")}


def seeded_counts(api: str, featured_rank: int | None = None) -> tuple[int, int]:
    """Deterministic (downloads, likes) per component apiName.
    Featured / well-ranked components get a boost. Pure mock — same seed gives same numbers."""
    h = 0
    for ch in api:
        h = (h * 131 + ord(ch)) & 0xFFFFFFFF
    base_dl = 80 + (h % 920)             # 80 .. 999
    base_lk = 5 + ((h >> 5) % 80)        # 5 .. 84
    if featured_rank is not None and featured_rank > 0:
        boost = max(0, 11 - featured_rank)   # rank 1 → +10, rank 10 → +1
        base_dl += boost * 110               # ~+1100 for rank 1, ~+110 for rank 10
        base_lk += boost * 8
    return base_dl, base_lk


def fmt_count(n: int) -> str:
    """Compact human-readable count: 1234 → '1.2k', 999 → '999'."""
    if n >= 10000:
        return f"{n // 1000}k"
    if n >= 1000:
        return f"{n / 1000:.1f}k".rstrip("0").rstrip(".")
    return str(n)

# Dummy avatar gradients for unknown contributors
AVATAR_GRADIENTS = [
    "linear-gradient(135deg, #fe9339 0%, #c2185b 100%)",
    "linear-gradient(135deg, #2e844a 0%, #0176d3 100%)",
    "linear-gradient(135deg, #6b4eff 0%, #ba0517 100%)",
    "linear-gradient(135deg, #0176d3 0%, #6b4eff 100%)",
]


# ----------------------------------------------------------------------
# Tiny YAML reader for recipes.yml (subset)
# ----------------------------------------------------------------------
def parse_recipes(path: Path) -> list[dict]:
    """Parse the recipes YAML. Format is a list of dicts with simple
    scalars and one list field (components)."""
    out: list[dict] = []
    current: dict = {}
    components_block = False
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = re.sub(r"\s+#.*$", "", raw)
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.startswith("- "):
            if current:
                out.append(current)
            current = {}
            components_block = False
            line = "  " + line[2:]
        stripped = line.strip()
        if components_block and stripped.startswith("- "):
            current["components"].append(stripped[2:].strip())
            continue
        components_block = False
        m = re.match(r"^\s+([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$", line)
        if not m:
            continue
        key, val = m.group(1), m.group(2).strip()
        if key == "components":
            if val.upper() == "ALL":
                current["components"] = "ALL"
            elif val == "":
                current["components"] = []
                components_block = True
        else:
            current[key] = val
    if current:
        out.append(current)
    return out


# ----------------------------------------------------------------------
# Inline markdown to HTML
# ----------------------------------------------------------------------
def md_inline(s: str) -> str:
    out = html_lib.escape(s, quote=False)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", out)
    return out


# ----------------------------------------------------------------------
# Changelog parser — extracts the "Version" section from root README
# ----------------------------------------------------------------------
def parse_release_notes(path: Path) -> list[dict]:
    """Tiny YAML reader for release_notes.yml — list of items with version,
    date, title (fr/en map), body (fr/en map)."""
    if not path.exists():
        return []
    out: list[dict] = []
    cur: dict = {}
    sub_key: str | None = None  # 'title' or 'body'
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.startswith("- "):
            if cur:
                out.append(cur)
            cur = {}
            sub_key = None
            line = "  " + line[2:]
        m = re.match(r"^(\s+)([a-zA-Z]+)\s*:\s*(.*)$", line)
        if not m:
            continue
        indent = len(m.group(1))
        key = m.group(2)
        val = m.group(3).strip()
        # Strip surrounding quotes
        if val.startswith('"') and val.endswith('"'):
            val = val[1:-1]
        elif val.startswith("'") and val.endswith("'"):
            val = val[1:-1]
        if indent <= 2 and key in ("version", "date", "title", "body"):
            sub_key = key if val == "" else None
            if val == "":
                cur[key] = {}
            else:
                cur[key] = val
        elif indent > 2 and sub_key in ("title", "body") and key in ("fr", "en"):
            cur[sub_key][key] = val
    if cur:
        out.append(cur)
    return out


# ----------------------------------------------------------------------
# CSS — adapted from _shared.css with extras for new pages
# ----------------------------------------------------------------------
CSS = """:root {
  --bg: #ffffff;
  --bg-soft: #f6f8fb;
  --bg-card: #ffffff;
  --bg-card-hover: #f9fbff;
  --border: #e3e8f0;
  --border-hot: #c9d3e3;
  --text: #032d60;
  --text-body: #181818;
  --text-soft: #5c6b85;
  --text-muted: #8c97ad;
  --brand: #0176d3;
  --brand-deep: #032d60;
  --brand-light: #e7f1fb;
  --accent: #6b4eff;
  --accent-light: #efeaff;
  --success: #2e844a;
  --warning: #fe9339;
  --error: #ba0517;
  --shadow-xs: 0 1px 2px rgba(3, 45, 96, 0.06);
  --shadow-sm: 0 2px 8px rgba(3, 45, 96, 0.08);
  --shadow-md: 0 6px 18px rgba(3, 45, 96, 0.10);
  --shadow-glow: 0 0 0 1px rgba(1, 118, 211, 0.4), 0 6px 20px rgba(1, 118, 211, 0.12);
  --r-sm: 6px;
  --r-md: 10px;
  --r-lg: 14px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
/* Custom cursors — slim arrow with brand stroke; gradient dot for interactive surfaces.
   SVG inline as data URL — no extra HTTP request, works offline, falls back to native if unsupported. */
html, body {
  cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'><path d='M5 3 L5 22 L11 17 L14 24 L17 23 L14 16 L21 16 Z' fill='%23ffffff' stroke='%23032d60' stroke-width='1.4' stroke-linejoin='round'/></svg>") 4 3, default;
}
/* Page transitions — soft fade-in on every page load, the content fades up from
   a brand-coloured veil instead of plain white.
   1. <body> starts at opacity 0 — never paints a flash of un-styled content.
   2. A gradient veil (::before-style div added in HTML) covers the viewport;
      the body fades in over it, then the veil fades out.
   Never animate transform on <body> — it'd become the containing block of fixed descendants. */
body { opacity: 0; transition: opacity 0.5s cubic-bezier(0.4, 0, 0.6, 1); }
body.page-ready { opacity: 1; }
.page-veil {
  position: fixed; inset: 0; z-index: 9999; pointer-events: none;
  background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%);
  opacity: 1;
  transition: opacity 0.6s cubic-bezier(0.4, 0, 0.6, 1);
}
body.page-ready .page-veil { opacity: 0; }
body.page-ready .page-veil.gone { display: none; }
@view-transition { navigation: auto; }
::view-transition-old(root) { animation: pageFadeOut 0.45s cubic-bezier(0.4, 0, 0.6, 1) forwards; }
::view-transition-new(root) { animation: pageFadeIn 0.55s cubic-bezier(0.4, 0, 0.6, 1) both; }
@keyframes pageFadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes pageFadeIn  { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
  body { opacity: 1; transition: none; }
}
a, button, [role='button'], .card, .recipe, .recipe-card, .pill, .chip, .btn, .nav-links a, .lang-switch button, .filter-pill, .like-btn, .cmd-k, .agent-button, label[for], summary, [data-mock], [data-lang-btn] {
  cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'><defs><radialGradient id='g' cx='50%25' cy='50%25' r='50%25'><stop offset='0%25' stop-color='%236b4eff' stop-opacity='0.35'/><stop offset='70%25' stop-color='%236b4eff' stop-opacity='0'/></radialGradient><linearGradient id='c' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%230176d3'/><stop offset='100%25' stop-color='%236b4eff'/></linearGradient></defs><circle cx='15' cy='15' r='14' fill='url(%23g)'/><circle cx='15' cy='15' r='5' fill='url(%23c)' stroke='%23ffffff' stroke-width='1.5'/></svg>") 15 15, pointer;
}
input, textarea, select { cursor: text; }
input[type='checkbox'], input[type='radio'] { cursor: pointer; }
html {
  scroll-behavior: smooth;
  background: #ffffff;
}
body {
  background: transparent;
  color: var(--text-body);
  font-family: 'Inter', -apple-system, system-ui, sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  position: relative;
  overflow-x: hidden;
}

/* Animated background — subtle pastel blue blobs that drift slowly.
   Three layers, all in fixed position so they stay put on scroll. */
body::before, body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -2;
  pointer-events: none;
}
body::before {
  background:
    radial-gradient(ellipse 60% 50% at 18% 20%, rgba(1, 118, 211, 0.22) 0%, transparent 60%),
    radial-gradient(ellipse 55% 45% at 82% 78%, rgba(107, 78, 255, 0.14) 0%, transparent 60%),
    radial-gradient(ellipse 70% 50% at 50% 100%, rgba(120, 180, 240, 0.32) 0%, transparent 65%);
  animation: bgDriftA 28s ease-in-out infinite alternate;
}
body::after {
  background:
    radial-gradient(ellipse 45% 40% at 75% 25%, rgba(140, 195, 245, 0.36) 0%, transparent 60%),
    radial-gradient(ellipse 50% 45% at 22% 80%, rgba(1, 118, 211, 0.14) 0%, transparent 60%);
  animation: bgDriftB 36s ease-in-out infinite alternate;
}

@keyframes bgDriftA {
  0%   { transform: translate3d(0, 0, 0)        scale(1); }
  50%  { transform: translate3d(-3%, 2%, 0)     scale(1.05); }
  100% { transform: translate3d(2%, -3%, 0)     scale(1.02); }
}
@keyframes bgDriftB {
  0%   { transform: translate3d(0, 0, 0)        scale(1); }
  50%  { transform: translate3d(3%, -2%, 0)     scale(1.04); }
  100% { transform: translate3d(-2%, 3%, 0)     scale(1.06); }
}

/* Honour user accessibility preference: stop the animation when the
   OS asks for reduced motion. */
@media (prefers-reduced-motion: reduce) {
  body::before, body::after { animation: none; }
}

/* Make sure content cards stay readable on top of the animated bg. */
.card, .recipe, .recipe-card, .step, .about-card, .side-card, .modal,
.search-box, .agent-panel, .filter-bar, footer, .nav,
.detail-head, .card-block, .preview-large, .cart {
  position: relative;
  z-index: 1;
}
a { color: inherit; text-decoration: none; }
h1, h2, h3, h4 {
  font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
  color: var(--text);
  letter-spacing: -0.01em;
  line-height: 1.2;
}

/* NAV */
.nav { position: sticky; top: 0; z-index: 100; backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.92); border-bottom: 1px solid var(--border); }
.nav-inner { max-width: 1280px; margin: 0 auto; padding: 6px 20px; display: flex; align-items: center; gap: 18px; }
.logo { display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 14.5px; color: var(--text); letter-spacing: -0.01em; white-space: nowrap; flex-shrink: 0; }
.logo img { height: 30px; width: auto; flex-shrink: 0; display: block; }
.nav-links { display: flex; gap: 18px; font-size: 13px; color: var(--text-soft); font-weight: 500; flex-shrink: 0; align-self: stretch; align-items: center; }
.nav-links a { position: relative; align-self: stretch; display: flex; align-items: center; transition: color 0.15s; white-space: nowrap; }
.nav-links a::after { content: ''; position: absolute; bottom: -7px; left: 0; right: 0; height: 3px; background: var(--text-muted); border-radius: 2px 2px 0 0; opacity: 0; transition: opacity 0.45s ease, background 0.2s ease; pointer-events: none; }
.nav-links a:hover { color: var(--text); }
.nav-links a:hover::after { opacity: 0.4; transition: opacity 0.18s ease; }
.nav-links a.active { color: var(--brand-deep); font-weight: 600; }
.nav-links a.active::after { background: linear-gradient(90deg, var(--brand) 0%, var(--accent) 100%); opacity: 1; transition: opacity 0.2s ease; }
.nav-spacer { flex: 1; }
.cmd-k { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--bg-soft); border: 1px solid var(--border); border-radius: 8px; font-size: 12.5px; color: var(--text-muted); cursor: pointer; min-width: 140px; transition: all 0.15s; font-family: inherit; flex-shrink: 1; overflow: hidden; }
.cmd-k > span:nth-child(2) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cmd-k:hover { border-color: var(--border-hot); background: #fff; }
.kbd { background: #fff; border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; font-size: 10.5px; font-family: 'SF Mono', Menlo, monospace; margin-left: auto; color: var(--text-soft); }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; font-family: inherit; white-space: nowrap; line-height: 1.35; }
.btn-primary { background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%); color: #fff; border-color: transparent; box-shadow: 0 2px 8px rgba(1, 118, 211, 0.25); }
.btn-primary:hover { box-shadow: 0 6px 16px rgba(1, 118, 211, 0.35); transform: translateY(-1px); }
.btn-ghost { background: #fff; color: var(--text); border: 1px solid var(--border); }
.btn-ghost:hover { border-color: var(--border-hot); background: var(--bg-soft); }
.btn-sm { padding: 5px 10px; font-size: 12px; }

.container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.container-narrow { max-width: 880px; margin: 0 auto; padding: 0 24px; }

/* PAGE HEADER */
.page-header { padding: 36px 0 24px; border-bottom: 1px solid var(--border); margin-bottom: 28px; }
.page-header h1 { font-size: 28px; font-weight: 700; margin-bottom: 6px; }
.page-header .subtitle { color: var(--text-soft); font-size: 14.5px; }
.breadcrumb { font-size: 12.5px; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.breadcrumb a:hover { color: var(--brand); }
.breadcrumb .sep { opacity: 0.6; }

/* PILLS / CHIPS */
.pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; background: #fff; border: 1px solid var(--border); border-radius: 100px; font-size: 12.5px; color: var(--text-soft); cursor: pointer; font-weight: 500; transition: all 0.15s; font-family: inherit; }
.pill:hover { border-color: var(--border-hot); color: var(--text); }
.pill.active { background: var(--brand-light); border-color: var(--brand); color: var(--brand-deep); }
.chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; background: var(--bg-soft); border: 1px solid var(--border); border-radius: 5px; font-size: 11px; color: var(--text-soft); font-weight: 500; }
.chip.persona-sales { color: #0176d3; border-color: rgba(1, 118, 211, 0.25); background: rgba(1, 118, 211, 0.05); }
.chip.persona-field { color: #2e844a; border-color: rgba(46, 132, 74, 0.25); background: rgba(46, 132, 74, 0.05); }
.chip.persona-service { color: #c84d10; border-color: rgba(254, 147, 57, 0.25); background: rgba(254, 147, 57, 0.06); }
.chip.persona-marketing { color: #c2185b; border-color: rgba(194, 24, 91, 0.22); background: rgba(194, 24, 91, 0.04); }
.chip.persona-ai { color: #6b4eff; border-color: rgba(107, 78, 255, 0.25); background: rgba(107, 78, 255, 0.05); }

/* CARDS */
.card { position: relative; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; transition: all 0.15s; cursor: pointer; display: flex; flex-direction: column; }
.card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--border-hot); }
.card.selected { border-color: var(--brand); box-shadow: var(--shadow-glow); }
.card-preview-link { display: block; color: inherit; text-decoration: none; }
.card-preview { position: relative; height: 110px; background: linear-gradient(135deg, var(--brand-light) 0%, var(--accent-light) 100%); display: grid; place-items: center; overflow: hidden; }
.card-preview.has-image { background: #f6f8fb; }
/* Pastel gradient strip under the image — visually separates a (mostly white) screenshot
   from the card body, and reuses the same gradient as cards without an image. */
.card-preview.has-image::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  background: linear-gradient(135deg, var(--brand-light) 0%, var(--accent-light) 100%);
  pointer-events: none;
}
.card-preview-mock { color: rgba(3, 45, 96, 0.18); font-size: 38px; font-weight: 800; letter-spacing: -0.04em; }
.card-preview-img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
.card .gif-badge { position: absolute; bottom: 6px; right: 6px; background: rgba(3, 45, 96, 0.85); color: #fff; padding: 1px 7px; border-radius: 100px; font-size: 9.5px; font-weight: 600; letter-spacing: 0.04em; backdrop-filter: blur(4px); pointer-events: none; }
.card-checkbox { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; background: rgba(255, 255, 255, 0.95); border: 1px solid var(--border-hot); border-radius: 5px; display: grid; place-items: center; z-index: 5; transition: all 0.15s; box-shadow: var(--shadow-xs); cursor: pointer; }
.card.selected .card-checkbox { background: var(--brand); border-color: var(--brand); }
.card.selected .card-checkbox::after { content: ''; width: 5px; height: 9px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg) translate(-1px, -1px); }
.card-status { position: absolute; top: 8px; left: 8px; z-index: 2; display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 100px; font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; backdrop-filter: blur(6px); }
.card-status.stable { background: rgba(46, 132, 74, 0.12); color: var(--success); }
.card-status.new { background: rgba(254, 178, 26, 0.18); color: #8a5a00; }
.card-status.ai { left: auto; right: 8px; background: linear-gradient(135deg, rgba(1, 118, 211, 0.15) 0%, rgba(107, 78, 255, 0.15) 100%); color: var(--accent); border: 1px solid rgba(107, 78, 255, 0.25); }
.card.has-checkbox-slot .card-status.ai { right: 36px; }
.card-body { padding: 12px 14px 14px; position: relative; display: flex; flex-direction: column; flex: 1; }
.card-title { display: flex; align-items: baseline; gap: 6px; margin-bottom: 3px; }
.card-name { font-size: 14px; font-weight: 600; color: var(--text); }
.card-api { font-family: 'SF Mono', Menlo, monospace; font-size: 10.5px; color: var(--text-muted); }
.card-tagline { font-size: 12.5px; color: var(--text-soft) !important; margin-bottom: 10px; line-height: 1.55; font-weight: 300 !important; letter-spacing: 0; }
.chips { display: flex; gap: 4px; flex-wrap: wrap; }
/* Card foot — chips on the left, social counters on the right, same row, pinned to bottom */
.card-foot { display: flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 10px; }
.card-foot .chips { flex: 1; min-width: 0; }
.card-foot .card-stats { margin-top: 0; padding-top: 0; border-top: none; flex-shrink: 0; }
/* Card / recipe social counters: downloads + likes */
.card-stats { display: flex; gap: 12px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); font-size: 11.5px; color: var(--text-muted); align-items: center; }
.card-stats .stat-pill { display: inline-flex; align-items: center; gap: 4px; font-variant-numeric: tabular-nums; }
.card-stats .stat-pill .icon { font-size: 12px; line-height: 1; }
.card-stats .like-btn { background: none; border: none; padding: 0; margin: 0; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font: inherit; color: inherit; font-variant-numeric: tabular-nums; transition: color 0.15s, transform 0.15s; position: relative; z-index: 5; }
.card-stats .like-btn:hover { color: #c2185b; transform: scale(1.06); }
.card-stats .like-btn .icon { font-size: 12px; line-height: 1; transition: transform 0.18s; display: inline-block; }
.card-stats .like-btn.liked { color: #c2185b; }
.card-stats .like-btn.liked .icon { transform: scale(1.18); }
.card-stats .like-btn.bump .icon { animation: heartBump 0.45s ease; }
@keyframes heartBump { 0% { transform: scale(1); } 30% { transform: scale(1.5) rotate(-12deg); } 60% { transform: scale(0.92); } 100% { transform: scale(1.18); } }

/* INDEX HERO */
.hero { padding: 44px 0 36px; text-align: center; background: radial-gradient(ellipse 70% 60% at 50% 0%, rgba(1, 118, 211, 0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(107, 78, 255, 0.05), transparent 60%); }
.hero-logo { display: block; margin: 0 auto 24px; height: 92px; width: auto; filter: drop-shadow(0 8px 22px rgba(3, 45, 96, 0.14)); }
.hero h1.hero-title { font-size: clamp(30px, 4.2vw, 44px); font-weight: 800; line-height: 1.12; margin: 0 auto 16px; letter-spacing: -0.025em; max-width: 820px; }
.hero h1 .accent { background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero p.hero-sub { font-size: 15.5px; color: var(--text-soft); max-width: 640px; margin: 0 auto 26px; line-height: 1.55; }
.hero-aside { display: inline-block; margin-top: 8px; font-size: 13.5px; color: var(--text-muted); font-style: italic; }
.hero-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 8px; }

/* Hero buttons — bigger, bolder, with subtle motion */
.btn-hero { padding: 12px 24px; font-size: 14.5px; font-weight: 600; border-radius: 10px; letter-spacing: 0.01em; transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease; }
.btn-hero-primary {
  background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%);
  color: #fff;
  box-shadow: 0 6px 20px rgba(1, 118, 211, 0.32), 0 1px 3px rgba(1, 118, 211, 0.2);
  border: none;
}
.btn-hero-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(1, 118, 211, 0.42), 0 2px 4px rgba(1, 118, 211, 0.25); }
.btn-hero-primary:active { transform: translateY(0); }
.btn-hero-ghost {
  background: rgba(255, 255, 255, 0.85);
  color: var(--brand-deep);
  border: 1.5px solid var(--brand-light);
  box-shadow: 0 1px 3px rgba(3, 45, 96, 0.04);
  backdrop-filter: blur(4px);
}
.btn-hero-ghost:hover { background: #fff; border-color: var(--brand); transform: translateY(-2px); box-shadow: 0 8px 20px rgba(3, 45, 96, 0.08); }

/* KPI stats — editorial inline strip, no cards.
   Big numbers anchored on a thin gradient rail; thin vertical dividers between them.
   On hover, a soft glow circles the number. */
.hero-stats { display: flex; align-items: stretch; justify-content: center; gap: 0; margin: 44px auto 0; padding: 28px 32px 22px; max-width: 920px; position: relative; }
.hero-stats::before { content: ''; position: absolute; left: 5%; right: 5%; bottom: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(1, 118, 211, 0.25) 20%, rgba(107, 78, 255, 0.40) 50%, rgba(1, 118, 211, 0.25) 80%, transparent 100%); }
.hero-stats::after { content: ''; position: absolute; left: 5%; right: 5%; top: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(1, 118, 211, 0.25) 20%, rgba(107, 78, 255, 0.40) 50%, rgba(1, 118, 211, 0.25) 80%, transparent 100%); }
.stat { position: relative; flex: 1; padding: 8px 18px; text-align: center; transition: transform 0.25s ease; }
.stat + .stat { border-left: 1px dashed rgba(3, 45, 96, 0.12); }
.stat:hover { transform: translateY(-2px); }
.stat .num-row { display: inline-flex; align-items: baseline; gap: 14px; }
.stat .stat-icon { font-size: 26px; line-height: 1; opacity: 0.78; transition: transform 0.3s ease, opacity 0.2s ease; display: inline-block; transform-origin: center; align-self: center; }
.stat:hover .stat-icon { transform: scale(1.55) rotate(-4deg); opacity: 1; }
.stat .num { font-size: 38px; font-weight: 800; line-height: 1; letter-spacing: -0.035em; background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-family: 'Inter', system-ui, sans-serif; font-feature-settings: 'tnum'; display: inline-block; position: relative; }
.stat .num::after { content: ''; position: absolute; left: 50%; bottom: -3px; width: 0; height: 2px; background: linear-gradient(90deg, var(--brand), var(--accent)); border-radius: 1px; transition: width 0.3s ease, left 0.3s ease; }
.stat:hover .num::after { width: 100%; left: 0; }
/* All KPIs share the brand blue→purple gradient, with subtle direction shifts for variety. */
.stat.stat-2 .num { background: linear-gradient(135deg, var(--accent) 0%, var(--brand) 100%); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.stat.stat-2 .num::after { background: linear-gradient(90deg, var(--accent), var(--brand)); }
.stat.stat-3 .num { background: linear-gradient(135deg, var(--brand-deep) 0%, var(--accent) 100%); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.stat.stat-3 .num::after { background: linear-gradient(90deg, var(--brand-deep), var(--accent)); }
.stat.stat-4 .num { background: linear-gradient(135deg, var(--accent) 0%, var(--brand-deep) 100%); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.stat.stat-4 .num::after { background: linear-gradient(90deg, var(--accent), var(--brand-deep)); }
.stat .label { font-size: 10.5px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.12em; margin-top: 8px; font-weight: 600; }
@media (max-width: 700px) {
  .hero-stats { flex-wrap: wrap; padding: 20px 12px; gap: 4px 0; }
  .stat { flex: 1 1 50%; padding: 14px 8px; }
  .stat + .stat { border-left: none; }
  .stat:nth-child(2n)::before { content: ''; position: absolute; left: 0; top: 20%; bottom: 20%; width: 1px; background: rgba(3, 45, 96, 0.12); }
  .stat .num { font-size: 30px; }
}

section.block { padding: 40px 0; }
section.block.alt { background: rgba(246, 248, 251, 0.55); backdrop-filter: blur(6px); }
.block-head { display: flex; justify-content: space-between; align-items: end; margin-bottom: 20px; gap: 20px; flex-wrap: wrap; }
.block-head h2 { font-size: 22px; font-weight: 700; }
.block-head .subtitle { color: var(--text-soft); font-size: 13.5px; margin-top: 3px; }
.block-head a.see-all { font-size: 13px; color: var(--brand); font-weight: 600; }
.block-head a.see-all:hover { text-decoration: underline; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }

/* COOKBOOK STRIP (index) */
.recipes { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.recipe { padding: 18px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-lg); transition: all 0.15s; cursor: pointer; }
.recipe:hover { border-color: var(--brand); box-shadow: var(--shadow-sm); }
.recipe-emoji { font-size: 22px; display: block; margin-bottom: 6px; }
.recipe h3 { font-size: 15px; margin-bottom: 4px; }
.recipe p { font-size: 12.5px; color: var(--text-soft); margin-bottom: 8px; }
.recipe-stack-mini { font-family: 'SF Mono', Menlo, monospace; font-size: 10.5px; color: var(--text-muted); line-height: 1.6; }

/* HOW IT WORKS */
.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 8px; }
.step { padding: 18px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-lg); }
.step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--brand-light); color: var(--brand-deep); font-weight: 700; font-size: 13px; display: grid; place-items: center; margin-bottom: 10px; }
.step h3 { font-size: 14px; margin-bottom: 4px; }
.step p { font-size: 12.5px; color: var(--text-soft); }

/* Fancy steps — used on the home "browse to live demo" section */
.steps-fancy { gap: 18px; margin-top: 18px; position: relative; }
.steps-fancy .step { position: relative; padding: 28px 22px 22px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-lg); transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s; overflow: hidden; }
.steps-fancy .step::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: var(--r-lg) var(--r-lg) 0 0; }
.steps-fancy .step:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: var(--border-hot); }
.steps-fancy .step.v1::before { background: linear-gradient(90deg, #0176d3, #6b4eff); }
.steps-fancy .step.v1 { background: linear-gradient(180deg, #ffffff 0%, rgba(231, 241, 251, 0.45) 220%); }
.steps-fancy .step.v2::before { background: linear-gradient(90deg, #6b4eff, #2e844a); }
.steps-fancy .step.v2 { background: linear-gradient(180deg, #ffffff 0%, rgba(239, 234, 255, 0.55) 220%); }
.steps-fancy .step.v3::before { background: linear-gradient(90deg, #fe9339, #0176d3); }
.steps-fancy .step.v3 { background: linear-gradient(180deg, #ffffff 0%, rgba(254, 147, 57, 0.06) 220%); }
.steps-fancy .step-emoji { font-size: 30px; line-height: 1; margin-bottom: 12px; display: inline-block; filter: drop-shadow(0 4px 6px rgba(3, 45, 96, 0.10)); }
.steps-fancy .step-num { position: absolute; top: 18px; right: 18px; width: 30px; height: 30px; border-radius: 50%; background: rgba(255, 255, 255, 0.85); color: var(--brand-deep); border: 1.5px solid var(--brand-light); font-weight: 700; font-size: 13px; display: grid; place-items: center; margin: 0; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04); }
.steps-fancy .step h3 { font-size: 17px; margin-bottom: 6px; color: var(--brand-deep); letter-spacing: -0.01em; }
.steps-fancy .step p { font-size: 13.5px; color: var(--text-soft); line-height: 1.55; margin: 0; }

/* Connector arrows live as inline elements between cards so they don't
   get clipped by .step's overflow:hidden. */
.step-arrow { display: none; align-self: center; justify-self: center; pointer-events: none; }
@media (min-width: 760px) {
  .steps-fancy { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 0; column-gap: 0; align-items: stretch; }
  .steps-fancy .step { margin: 0 18px; }
  .steps-fancy .step-arrow { display: grid; place-items: center; width: 56px; height: 100%; position: relative; }
  .steps-fancy .step-arrow svg { width: 56px; height: 22px; overflow: visible; opacity: 0.85; }
  .steps-fancy .step-arrow svg path { stroke-dasharray: 80; stroke-dashoffset: 0; animation: arrowDraw 1.2s ease forwards; }
  .steps-fancy .step-arrow.a1 svg path { stroke: url(#arrow-grad-1); animation-delay: 0.1s; }
  .steps-fancy .step-arrow.a2 svg path { stroke: url(#arrow-grad-2); animation-delay: 0.4s; }
  @keyframes arrowDraw { from { stroke-dashoffset: 80; opacity: 0; } to { stroke-dashoffset: 0; opacity: 0.85; } }
}
@media (max-width: 759px) {
  .steps-fancy { display: grid; grid-template-columns: 1fr; gap: 14px; }
  .steps-fancy .step-arrow { display: grid; place-items: center; height: 24px; transform: rotate(90deg); }
  .steps-fancy .step-arrow svg { width: 56px; height: 22px; }
  .steps-fancy .step-arrow.a1 svg path { stroke: url(#arrow-grad-1); }
  .steps-fancy .step-arrow.a2 svg path { stroke: url(#arrow-grad-2); }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 4px 10px rgba(1, 118, 211, 0.30); }
  50%      { box-shadow: 0 4px 18px rgba(107, 78, 255, 0.55); }
}
section.block.home-last { padding-bottom: 8px; }
section.block.home-last + footer, section.home-last ~ footer { margin-top: 32px; }

/* COMPONENTS PAGE — filter bar */
.filter-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 16px; background: var(--bg-soft); border: 1px solid var(--border); border-radius: var(--r-md); margin-bottom: 24px; position: relative; z-index: 30; }
.filter-dd[open] { z-index: 40; position: relative; }
.filter-divider { width: 1px; height: 22px; background: var(--border); }
/* Filter dropdowns — built on <details>/<summary> for keyboard + a11y for free. */
.filter-dd { position: relative; font-size: 13px; }
.filter-dd > summary {
  list-style: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px 7px 14px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid var(--border);
  color: var(--text);
  font-weight: 500;
  font-size: 13px;
  transition: all 0.15s;
  user-select: none;
  white-space: nowrap;
}
.filter-dd > summary::-webkit-details-marker { display: none; }
.filter-dd > summary .dd-label { font-size: 10.5px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; }
.filter-dd > summary .dd-value { color: var(--text); }
.filter-dd > summary .dd-chevron { font-size: 9px; opacity: 0.5; transition: transform 0.2s; margin-left: 2px; }
.filter-dd[open] > summary { border-color: var(--brand); background: var(--brand-light); }
.filter-dd[open] > summary .dd-chevron { transform: rotate(180deg); }
.filter-dd > summary:hover { border-color: var(--border-hot); }
.filter-dd.has-active > summary { border-color: var(--brand); }
.filter-dd.has-active > summary .dd-value { color: var(--brand-deep); font-weight: 600; }
.filter-dd-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 50;
  min-width: 220px;
  max-width: 320px;
  padding: 6px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(3, 45, 96, 0.10), 0 2px 6px rgba(3, 45, 96, 0.05);
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 360px;
  overflow-y: auto;
}
.filter-dd-panel button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.12s;
}
.filter-dd-panel button:hover { background: var(--bg-soft); }
.filter-dd-panel button.active { background: var(--brand-light); color: var(--brand-deep); font-weight: 600; }
.filter-dd-panel button.active::after { content: '✓'; margin-left: auto; color: var(--brand); }
.results-count { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; padding: 5px 12px; background: #fff; border: 1px solid var(--border); border-radius: 100px; font-size: 12.5px; color: var(--text); font-weight: 500; box-shadow: var(--shadow-xs); }

/* Color-code Data mode pills so they read at a glance, even when inactive. */
.pill[data-group="dataMode"][data-value="live"] { color: var(--success); border-color: rgba(46, 132, 74, 0.3); }
.pill[data-group="dataMode"][data-value="live"]:hover { background: rgba(46, 132, 74, 0.06); border-color: var(--success); }
.pill[data-group="dataMode"][data-value="live"].active { background: rgba(46, 132, 74, 0.12); border-color: var(--success); color: var(--success); }
.pill[data-group="dataMode"][data-value="hybrid"] { color: #c84d10; border-color: rgba(254, 147, 57, 0.35); }
.pill[data-group="dataMode"][data-value="hybrid"]:hover { background: rgba(254, 147, 57, 0.08); border-color: var(--warning); }
.pill[data-group="dataMode"][data-value="hybrid"].active { background: rgba(254, 147, 57, 0.15); border-color: var(--warning); color: #c84d10; }
.pill[data-group="dataMode"][data-value="mock"] { color: var(--text-muted); border-color: var(--border); }
.pill[data-group="dataMode"][data-value="mock"]:hover { background: var(--bg-soft); color: var(--text); }
.pill[data-group="dataMode"][data-value="mock"].active { background: var(--bg-soft); border-color: var(--border-hot); color: var(--text); }
.results-count strong { color: var(--brand); font-weight: 700; }
.results-count .results-of { color: var(--text-muted); font-size: 11.5px; }
h2.section-title { font-size: 12.5px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.08em; margin: 32px 0 12px; display: flex; align-items: center; gap: 10px; font-family: 'Inter', sans-serif; }
h2.section-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }
h2.section-title .count { color: var(--text-muted); font-size: 11px; font-weight: 500; text-transform: none; letter-spacing: 0; }

/* STICKY CART */
.cart { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #fff; border: 1px solid var(--border-hot); border-radius: 100px; padding: 6px 6px 6px 18px; display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow-md), 0 0 0 1px rgba(1, 118, 211, 0.15); z-index: 50; transition: opacity 0.2s, transform 0.2s; }
.cart.hidden { opacity: 0; pointer-events: none; transform: translateX(-50%) translateY(20px); }
.cart-count { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text); font-weight: 500; }
.cart-count strong { color: var(--brand); font-weight: 700; font-size: 14px; }
.cart-divider { width: 1px; height: 18px; background: var(--border); }
@media (max-width: 700px) { .cart { left: 12px; right: 12px; transform: none; border-radius: 16px; flex-wrap: wrap; } .cart.hidden { transform: translateY(20px); } }

/* DETAIL PAGE */
.detail-grid { display: grid; grid-template-columns: 1fr 320px; gap: 36px; align-items: start; }
.detail-main { min-width: 0; }
.detail-side { position: sticky; top: 76px; }
.detail-hero { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
.detail-hero .emoji { width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, var(--brand-light) 0%, var(--accent-light) 100%); display: grid; place-items: center; font-size: 26px; flex-shrink: 0; }
.detail-hero h1 { font-size: 30px; margin-bottom: 4px; }
.detail-hero .api { font-family: 'SF Mono', Menlo, monospace; font-size: 13px; color: var(--text-soft); }
.badges-row { display: flex; gap: 6px; flex-wrap: wrap; margin: 14px 0 24px; }
.badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; background: var(--bg-soft); border: 1px solid var(--border); border-radius: 100px; font-size: 11.5px; color: var(--text-soft); font-weight: 500; }
.badge.stable { background: rgba(46, 132, 74, 0.08); color: var(--success); border-color: rgba(46, 132, 74, 0.2); }
.badge.new { background: rgba(254, 178, 26, 0.14); color: #8a5a00; border-color: rgba(254, 178, 26, 0.32); }
.badge.ai { background: rgba(107, 78, 255, 0.08); color: var(--accent); border-color: rgba(107, 78, 255, 0.2); }
.preview-large { position: relative; min-height: 240px; max-height: 480px; background: linear-gradient(135deg, var(--brand-light) 0%, var(--accent-light) 100%); border-radius: var(--r-lg); display: grid; place-items: center; margin-bottom: 24px; color: rgba(3, 45, 96, 0.18); font-size: 90px; font-weight: 800; border: 1px solid var(--border); overflow: hidden; }
.preview-large.preview-image, .preview-large.preview-carousel { background: #f6f8fb; padding: 16px; }
.preview-large.preview-image img { max-width: 100%; max-height: 448px; object-fit: contain; display: block; border-radius: 6px; cursor: zoom-in; }
.preview-large.preview-carousel { padding: 0; }
.preview-slide { position: absolute; inset: 16px; display: grid; place-items: center; opacity: 0; transition: opacity 0.25s ease; pointer-events: none; }
.preview-slide.active { opacity: 1; pointer-events: auto; }
.preview-slide img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; border-radius: 6px; cursor: zoom-in; }

/* Lightbox — full-viewport overlay with a blurred mask, image centered. */
.lightbox { position: fixed; inset: 0; background: rgba(3, 45, 96, 0.65); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: none; align-items: center; justify-content: center; padding: 4vh 4vw; z-index: 400; cursor: zoom-out; opacity: 0; transition: opacity 0.18s ease; }
.lightbox.open { display: flex; opacity: 1; }
.lightbox img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); cursor: zoom-out; }
.lightbox-close { position: absolute; top: 20px; right: 24px; width: 38px; height: 38px; border-radius: 50%; border: none; background: rgba(255, 255, 255, 0.92); color: var(--text); font-size: 20px; cursor: pointer; display: grid; place-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: transform 0.1s, background 0.15s; padding: 0; z-index: 2; }
.lightbox-close:hover { background: #fff; }
.lightbox-close:active { transform: scale(0.95); }
.lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 48px; height: 48px; border-radius: 50%; border: none; background: rgba(255, 255, 255, 0.92); color: var(--text); font-size: 22px; cursor: pointer; display: grid; place-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: transform 0.12s, background 0.15s; padding: 0; z-index: 2; font-family: inherit; line-height: 1; }
.lightbox-nav.prev { left: 24px; }
.lightbox-nav.next { right: 24px; }
.lightbox-nav:hover { background: #fff; transform: translateY(-50%) scale(1.06); }
.lightbox-nav:active { transform: translateY(-50%) scale(0.95); }
.lightbox-nav[hidden] { display: none; }
.lightbox-dots { position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%); display: flex; gap: 7px; z-index: 2; }
.lightbox-dots[hidden] { display: none; }
.lightbox-dots button { width: 8px; height: 8px; border-radius: 50%; border: none; background: rgba(255, 255, 255, 0.45); cursor: pointer; padding: 0; transition: background 0.15s, transform 0.15s; }
.lightbox-dots button.active { background: #fff; transform: scale(1.25); }
.lightbox-counter { position: absolute; top: 24px; left: 28px; color: rgba(255,255,255,0.85); font-size: 13px; font-weight: 600; letter-spacing: 0.05em; z-index: 2; font-variant-numeric: tabular-nums; }
.lightbox-counter[hidden] { display: none; }
.preview-arrow { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.92); border: 1px solid var(--border); width: 36px; height: 36px; border-radius: 50%; font-size: 22px; line-height: 1; color: var(--text); cursor: pointer; box-shadow: var(--shadow-sm); transition: background 0.15s, transform 0.1s; z-index: 2; padding: 0; display: grid; place-items: center; }
.preview-arrow:hover { background: #fff; }
.preview-arrow:active { transform: translateY(-50%) scale(0.95); }
.preview-arrow.prev { left: 12px; }
.preview-arrow.next { right: 12px; }
.preview-dots { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index: 2; }
.preview-dot { width: 8px; height: 8px; border-radius: 50%; border: none; background: rgba(3, 45, 96, 0.25); cursor: pointer; padding: 0; transition: background 0.15s, transform 0.1s; }
.preview-dot.active { background: var(--brand); transform: scale(1.2); }
.preview-dot:hover { background: rgba(3, 45, 96, 0.5); }
h2.section { font-size: 12.5px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.08em; margin: 36px 0 14px; display: flex; align-items: center; gap: 10px; font-family: 'Inter', sans-serif; }
h2.section::after { content: ''; flex: 1; height: 1px; background: var(--border); }
h2.section:first-child { margin-top: 0; }
/* Detail-main paragraphs — soft body colour, font 14px, line-height 1.65 (matches .card-tagline tone) */
.detail-main p { font-size: 14px; color: var(--text-soft) !important; line-height: 1.65; margin-bottom: 12px; font-weight: 300 !important; }
.detail-main p strong { font-weight: 500 !important; }
.detail-main p.lead { font-size: 15px; color: var(--text-soft); line-height: 1.6; margin-bottom: 18px; }
.detail-main p.note,
.detail-main .note { font-size: 14px; color: var(--text-soft) !important; line-height: 1.65; font-weight: 300 !important; }
/* Lightweight subsection title — sober, used for "1) Bouton Déployer" etc.
   Same colour for the number and the label; size between body and section h2. */
.detail-main h3.subsection { font-size: 13.5px; font-weight: 600; color: var(--text); margin: 18px 0 6px; display: flex; gap: 6px; align-items: baseline; }
.detail-main h3.subsection .num { color: inherit; font-weight: inherit; }
/* Inline code in main flows — same neutral pill style as global, slightly tighter. */
.detail-main code:not(pre code) { font-size: 12.5px; }
/* Anchored sections (Docs, About, etc.) — leave room for the sticky nav (~60px) when scrolled to. */
h1[id], h2[id], h3[id], section[id] { scroll-margin-top: 76px; }
p.lead { font-size: 15px; color: var(--text-soft); line-height: 1.6; margin-bottom: 18px; }
/* Properties table — fixed layout so a giant default value cannot blow up the columns.
   Long defaults wrap inside their own cell instead of squeezing the description. */
.props-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
.props-table col.col-name { width: 22%; }
.props-table col.col-type { width: 14%; }
.props-table col.col-default { width: 22%; }
.props-table col.col-desc { width: 42%; }
.props-table th, .props-table td { padding: 9px 12px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
.props-table th { background: var(--bg-soft); font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.props-table td.api { font-family: 'SF Mono', Menlo, monospace; font-size: 12px; color: var(--brand-deep); }
.props-table td.api code { white-space: normal; }
.props-table td.type { color: var(--text-muted); font-size: 12px; }
.props-table td.default { font-family: 'SF Mono', Menlo, monospace; font-size: 12px; }
.props-table tr:last-child td { border-bottom: none; }
/* Code & terminal — single look across the whole site:
   - pre (multi-line): soft slate background, hairline border, body-text colour, italic-grey comments.
   - code inline: tighter pill, same palette as pre, brand-deep text. */
pre { background: var(--bg-soft); padding: 12px 14px; border-radius: var(--r-sm); font-family: 'SF Mono', Menlo, monospace; font-size: 12px; line-height: 1.6; overflow-x: auto; border: 1px solid var(--border); color: var(--text-body); margin: 8px 0 12px; }
pre code { background: transparent; border: none; padding: 0; color: inherit; font-size: inherit; }
pre .comment, pre .comment * { color: var(--text-muted); font-style: italic; }
.detail-bullets { padding-left: 20px; font-size: 14px; line-height: 1.7; color: var(--text-soft) !important; margin-bottom: 12px; font-weight: 300 !important; }
.detail-bullets li { font-weight: 300 !important; }
.detail-bullets li strong { font-weight: 500 !important; }
.detail-bullets li { margin-bottom: 4px; }
code:not(pre code) { background: var(--bg-soft); padding: 1px 6px; border-radius: 3px; font-family: 'SF Mono', Menlo, monospace; font-size: 12px; color: var(--brand-deep); }
.side-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px; margin-bottom: 14px; }
.side-card h3 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text); margin-bottom: 12px; font-family: 'Inter', sans-serif; }
.meta-row { display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; font-size: 13px; border-bottom: 1px dashed var(--border); }
.meta-row:last-child { border-bottom: none; }
.meta-row .key { color: var(--text-muted); flex-shrink: 0; }
.meta-row .val { color: var(--text); font-weight: 500; text-align: right; word-break: break-word; }
.meta-row .val code { font-size: 11.5px; }
.related-list { display: flex; flex-direction: column; gap: 6px; }
.related-list a { padding: 8px 10px; background: var(--bg-soft); border-radius: 6px; font-size: 12.5px; transition: background 0.15s; display: flex; align-items: center; gap: 8px; }
.related-list a:hover { background: var(--brand-light); }
.related-list a .api { font-family: 'SF Mono', Menlo, monospace; font-size: 10.5px; color: var(--text-muted); margin-left: auto; }

/* COOKBOOK PAGE */
.recipe-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
.recipe-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; transition: all 0.18s; position: relative; scroll-margin-top: 80px; }
.recipe-card:hover { border-color: var(--brand); box-shadow: var(--shadow-md); }
/* Selected via URL hash (e.g. cookbook.html#full-pack) — gradient frame + glow + tag */
.recipe-card:target {
  border-color: transparent;
  box-shadow: 0 0 0 2px var(--brand), 0 14px 40px rgba(1, 118, 211, 0.22), 0 4px 14px rgba(107, 78, 255, 0.18);
  animation: recipeTargetIn 0.6s ease both;
}
.recipe-card:target::before {
  content: '✓ ' attr(data-target-label);
  position: absolute; top: 12px; right: 12px;
  z-index: 3;
  padding: 4px 10px;
  border-radius: 100px;
  background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%);
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  box-shadow: 0 4px 10px rgba(1, 118, 211, 0.30);
  animation: pulseGlow 2.4s ease-in-out infinite;
}
@keyframes recipeTargetIn {
  0%   { transform: scale(0.985); }
  60%  { transform: scale(1.01); }
  100% { transform: scale(1); }
}
.recipe-cover { height: 100px; background: linear-gradient(135deg, var(--brand-light) 0%, var(--accent-light) 100%); display: flex; align-items: center; justify-content: center; font-size: 44px; }
.recipe-card { display: flex; flex-direction: column; }
.recipe-body { padding: 18px 20px 20px; display: flex; flex-direction: column; flex: 1; }
.recipe-body h3 { font-size: 17px; margin-bottom: 6px; }
.recipe-body .desc { font-size: 13px; color: var(--text-soft); margin-bottom: 14px; line-height: 1.5; }
.recipe-stack { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; padding: 10px 12px; background: var(--bg-soft); border-radius: 6px; }
.recipe-stack .item { display: flex; align-items: baseline; gap: 8px; font-size: 12.5px; }
.recipe-stack .item .name { color: var(--text); font-weight: 500; }
.recipe-stack .item .api { font-family: 'SF Mono', Menlo, monospace; font-size: 11px; color: var(--text-muted); margin-left: auto; }
.recipe-actions { display: flex; gap: 6px; margin-top: auto; }
/* Bottom row of a recipe-card: meta on the left, social counters on the right, single line.
   The recipe-actions sits just above and is the one pushed down by margin-top:auto. */
.recipe-foot { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 11.5px; color: var(--text-muted); flex-shrink: 0; }
.recipe-foot .recipe-meta { display: flex; gap: 12px; flex: 1; min-width: 0; align-items: center; }
.recipe-foot .recipe-meta strong { color: var(--text); font-weight: 600; }
.recipe-foot .card-stats { margin-top: 0; padding-top: 0; border-top: none; flex-shrink: 0; }

/* WHATS NEW */
.timeline { position: relative; padding-left: 32px; }
.timeline::before { content: ''; position: absolute; left: 9px; top: 8px; bottom: 8px; width: 2px; background: linear-gradient(to bottom, var(--brand) 0%, var(--border) 100%); }
.release { position: relative; margin-bottom: 36px; }
.release::before { content: ''; position: absolute; left: -28px; top: 6px; width: 14px; height: 14px; background: #fff; border: 3px solid var(--brand); border-radius: 50%; box-shadow: 0 0 0 4px var(--bg); }
.release.minor::before { border-color: var(--text-muted); }
.release-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
.release-version { font-family: 'SF Mono', Menlo, monospace; font-size: 13px; background: var(--brand-deep); color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
.release.minor .release-version { background: var(--bg-soft); color: var(--text); border: 1px solid var(--border); }
.release-date { font-size: 12.5px; color: var(--text-muted); }
.release h2 { font-size: 19px; margin-bottom: 8px; }
.release p { font-size: 13.5px; color: var(--text-soft); margin-bottom: 10px; }

/* CONTRIBUTORS */
.lead-intro { background: linear-gradient(135deg, var(--brand-light) 0%, var(--accent-light) 100%); border-radius: var(--r-lg); padding: 24px 28px; margin-bottom: 28px; }
.lead-intro h2 { font-size: 19px; margin-bottom: 6px; }
.lead-intro p { font-size: 13.5px; color: var(--text-soft); margin-bottom: 12px; }
.contributors-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.contributor { padding: 22px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-lg); transition: all 0.18s; position: relative; overflow: hidden; }
.contributor::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, rgba(1, 118, 211, 0.18), rgba(107, 78, 255, 0.30), rgba(1, 118, 211, 0.18), transparent); opacity: 0.7; }
.contributor:hover { box-shadow: var(--shadow-md); border-color: var(--border-hot); transform: translateY(-2px); }
.contrib-head { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.avatar { width: 54px; height: 54px; border-radius: 50%; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 19px; flex-shrink: 0; box-shadow: var(--shadow-sm); letter-spacing: -0.01em; }
.contrib-name { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
.contrib-role { font-size: 12px; color: var(--text-muted); }
.contrib-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  padding: 14px 0;
  margin-bottom: 14px;
  position: relative;
}
.contrib-stats::before, .contrib-stats::after { content: ''; position: absolute; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, var(--border) 20%, var(--border) 80%, transparent 100%); }
.contrib-stats::before { top: 0; }
.contrib-stats::after { bottom: 0; }
.contrib-stat { text-align: center; position: relative; padding: 0 6px; }
.contrib-stat + .contrib-stat::before { content: ''; position: absolute; left: 0; top: 18%; bottom: 18%; width: 1px; background: var(--border); }
.contrib-stat .icon { font-size: 13px; line-height: 1; opacity: 0.65; margin-bottom: 4px; display: block; }
.contrib-stat .num {
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.025em;
  background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-variant-numeric: tabular-nums;
  display: block;
}
.contrib-stat .label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; font-weight: 600; }
.contrib-list { display: flex; flex-direction: column; gap: 4px; }
.contrib-list h4 { font-family: 'Inter', sans-serif; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 4px; }
.contrib-list a { padding: 5px 8px; font-size: 12px; color: var(--text-soft); border-radius: 4px; display: flex; justify-content: space-between; transition: background 0.15s; }
.contrib-list a:hover { background: var(--bg-soft); color: var(--text); }
.contrib-list a .api { font-family: 'SF Mono', Menlo, monospace; font-size: 10px; color: var(--text-muted); }

/* ABOUT */
.about-section { margin-bottom: 56px; }
.about-section h2 { font-size: 22px; margin-bottom: 16px; }
.about-section h3 { font-size: 15px; margin: 20px 0 8px; color: var(--brand-deep); }
.about-section p { font-size: 14px; line-height: 1.65; color: var(--text-soft); margin-bottom: 12px; max-width: 760px; font-weight: 400; }
.about-3col { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 16px; }
.about-4col { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 18px; }
.about-card { position: relative; padding: 26px 22px 22px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s; }
.about-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--brand); border-radius: var(--r-lg) var(--r-lg) 0 0; }
.about-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: var(--border-hot); }
.about-card.v1::before { background: linear-gradient(90deg, #0176d3, #6b4eff); }
.about-card.v1 { background: linear-gradient(180deg, #ffffff 0%, rgba(231, 241, 251, 0.45) 200%); }
.about-card.v2::before { background: linear-gradient(90deg, #6b4eff, #c2185b); }
.about-card.v2 { background: linear-gradient(180deg, #ffffff 0%, rgba(239, 234, 255, 0.55) 200%); }
.about-card.v3::before { background: linear-gradient(90deg, #2e844a, #0176d3); }
.about-card.v3 { background: linear-gradient(180deg, #ffffff 0%, rgba(46, 132, 74, 0.05) 200%); }
.about-card.v4::before { background: linear-gradient(90deg, #fe9339, #c2185b); }
.about-card.v4 { background: linear-gradient(180deg, #ffffff 0%, rgba(254, 147, 57, 0.06) 200%); }
.about-emoji { font-size: 22px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(3, 45, 96, 0.08)); }
.about-card-head { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; text-align: center; }
.about-card-head h3 { font-size: 15px; margin: 0; line-height: 1.2; }
.about-card { text-align: center; }
.about-card h3 { font-size: 15px; margin-bottom: 8px; }
.about-card p { font-size: 13.5px; color: var(--text-soft); margin: 0; line-height: 1.55; text-align: center; }
.about-bullets { padding-left: 20px; line-height: 1.7; max-width: 820px; color: var(--text-soft); font-weight: 400; }
.about-bullets li { margin-bottom: 8px; font-size: 14px; }
/* Lead-in (the bold word at the start of each bullet) — sober brand-deep, not too heavy */
.about-bullets li strong { font-weight: 600; color: var(--brand-deep); }

/* DOCS */
.docs-grid { display: grid; grid-template-columns: 240px 1fr; gap: 36px; align-items: start; }
.docs-side { position: sticky; top: 76px; border-right: 1px solid var(--border); padding-right: 18px; }
.docs-side h4 { font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text); margin: 18px 0 8px; }
.docs-side h4:first-child { margin-top: 0; }
.docs-side ul { list-style: none; display: flex; flex-direction: column; gap: 2px; }
.docs-side a { position: relative; padding: 6px 10px 6px 14px; border-radius: 6px; font-size: 13px; color: var(--text-soft); display: block; transition: color 0.18s, background 0.18s, padding-left 0.2s ease; }
.docs-side a::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--brand) 0%, var(--accent) 100%);
  transform: scaleY(0);
  transform-origin: center;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
  opacity: 0;
}
.docs-side a:hover { background: var(--bg-soft); color: var(--text); }
.docs-side a.active {
  background: linear-gradient(90deg, var(--brand-light) 0%, transparent 100%);
  color: var(--brand-deep);
  font-weight: 600;
  padding-left: 18px;
}
.docs-side a.active::before { transform: scaleY(1); opacity: 1; }
.docs-main { min-width: 0; max-width: 720px; }
.docs-main h2 { font-size: 12.5px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.08em; margin: 36px 0 14px; display: flex; align-items: center; gap: 10px; font-family: 'Inter', sans-serif; }
.docs-main h2::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.docs-main h2:first-child { margin-top: 0; }
.docs-main h3 { font-size: 16px; margin: 20px 0 8px; color: var(--brand-deep); }
.docs-main p { font-size: 14px; line-height: 1.65; color: var(--text-soft); margin-bottom: 12px; font-weight: 400; }
.docs-main ul, .docs-main ol { padding-left: 20px; font-size: 14px; line-height: 1.7; margin-bottom: 14px; }
.docs-main li { margin-bottom: 4px; }
.callout { padding: 12px 14px; border-left: 3px solid var(--brand); background: var(--brand-light); border-radius: 0 6px 6px 0; font-size: 13.5px; color: var(--text); margin: 14px 0; }

/* AGENT WIDGET */
.agent { position: fixed; bottom: 20px; right: 20px; z-index: 60; }
.agent-button { display: flex; align-items: center; gap: 9px; padding: 10px 16px 10px 12px; border-radius: 100px; background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%); color: #fff; border: none; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 8px 24px rgba(1, 118, 211, 0.3); transition: transform 0.15s, box-shadow 0.15s; font-family: inherit; }
.agent-button:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(1, 118, 211, 0.4); }
.agent-icon { width: 22px; height: 22px; background: rgba(255, 255, 255, 0.2); border-radius: 50%; display: grid; place-items: center; font-size: 13px; }
.agent-panel { position: fixed; bottom: 78px; right: 20px; width: 340px; max-width: calc(100vw - 40px); background: #fff; border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 20px 50px rgba(3,45,96,0.2); padding: 18px 18px 16px; z-index: 65; display: none; }
.agent-panel.open { display: block; }
.agent-panel h4 { font-size: 14px; margin-bottom: 6px; }
.agent-panel p { font-size: 12.5px; color: var(--text-soft); margin-bottom: 12px; }
.agent-panel .close { position: absolute; top: 10px; right: 12px; background: transparent; border: none; cursor: pointer; font-size: 18px; color: var(--text-muted); }

/* MODAL */
.modal-mask { position: fixed; inset: 0; background: rgba(3, 45, 96, 0.55); display: none; align-items: flex-start; justify-content: center; padding-top: 8vh; z-index: 200; }
.modal-mask.open { display: flex; }
.modal { background: #fff; border-radius: 14px; padding: 24px; max-width: 520px; width: calc(100% - 40px); box-shadow: 0 20px 60px rgba(0,0,0,0.4); max-height: calc(100vh - 80px); overflow-y: auto; }
.modal.modal-wide { max-width: 640px; }
.tracking-form .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 560px) { .tracking-form .form-row { grid-template-columns: 1fr; } }
.modal h3 { font-size: 18px; margin-bottom: 8px; }
.modal p { font-size: 14px; color: var(--text-soft); margin-bottom: 14px; }
.modal .modal-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
.modal-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.modal-list li { padding: 10px 12px; background: var(--bg-soft); border-radius: 8px; font-size: 13px; color: var(--text-body); }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
.tracking-form { display: flex; flex-direction: column; gap: 12px; }
.tracking-form label { display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; color: var(--text-soft); font-weight: 500; }
.tracking-form input, .tracking-form textarea { font-family: inherit; font-size: 14px; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; outline: none; transition: border-color 0.15s; resize: vertical; }
.tracking-form input:focus, .tracking-form textarea:focus { border-color: var(--brand); }

/* Language switcher */
.lang-switch { display: inline-flex; gap: 0; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: #fff; }
.lang-switch button { font-family: inherit; background: transparent; border: none; box-sizing: border-box; padding: 5px 0; font-size: 12px; color: var(--text-soft); cursor: pointer; font-weight: 600; transition: background 0.15s, color 0.15s; width: 38px; text-align: center; letter-spacing: 0; }
.lang-switch button.active { background: var(--brand-light); color: var(--brand-deep); }
.lang-switch button:hover:not(.active) { background: var(--bg-soft); color: var(--text); }

/* CMD K MODAL */
.search-modal { position: fixed; inset: 0; background: rgba(3, 45, 96, 0.4); display: none; align-items: flex-start; justify-content: center; padding-top: 14vh; z-index: 250; backdrop-filter: blur(3px); }
.search-modal.open { display: flex; }
.search-box { background: #fff; border-radius: 14px; max-width: 560px; width: calc(100% - 40px); box-shadow: 0 20px 60px rgba(0,0,0,0.35); display: flex; flex-direction: column; max-height: 70vh; }
.search-box input { font-size: 16px; padding: 16px 20px; border: none; border-bottom: 1px solid var(--border); border-radius: 14px 14px 0 0; outline: none; font-family: inherit; }
.search-results { flex: 1; overflow-y: auto; padding: 8px; }
.search-result { display: block; padding: 10px 14px; border-radius: 8px; transition: background 0.1s; cursor: pointer; }
.search-result:hover, .search-result.active { background: var(--brand-light); }
.search-result .name { font-weight: 600; color: var(--text); font-size: 14px; }
.search-result .api { font-family: 'SF Mono', Menlo, monospace; font-size: 11px; color: var(--text-muted); margin-left: 8px; }
.search-result .tagline { font-size: 12.5px; color: var(--text-soft); margin-top: 2px; }
.search-empty { padding: 30px; text-align: center; color: var(--text-muted); font-size: 13px; }

/* TOAST */
.toast-host { position: fixed; bottom: 78px; left: 50%; transform: translateX(-50%); z-index: 300; display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; }
.toast { background: var(--brand-deep); color: #fff; padding: 10px 18px; border-radius: 100px; font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); font-weight: 500; opacity: 0; transform: translateY(10px); transition: opacity 0.2s, transform 0.2s; }
.toast.show { opacity: 1; transform: translateY(0); }
.toast-sticky { background: linear-gradient(135deg, #1d4ed8, #6c63ff); padding-left: 18px; padding-right: 22px; }
.toast-sticky::before { content: ''; display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; margin-right: 10px; vertical-align: -2px; animation: sefr-spin 0.7s linear infinite; }
@keyframes sefr-spin { to { transform: rotate(360deg); } }

/* CONNECT */
[data-mock="connect"].is-connected { background: rgba(46, 132, 74, 0.10) !important; color: var(--success) !important; border: 1px solid rgba(46, 132, 74, 0.30) !important; }
[data-mock="connect"].is-connected:hover { background: rgba(46, 132, 74, 0.18) !important; }
.connect-modal { max-width: 460px; }
.connect-choices { display: flex; flex-direction: column; gap: 10px; margin: 18px 0 12px; }
.connect-choice { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: #fff; border: 1px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.15s; text-align: left; width: 100%; }
.connect-choice:hover { border-color: var(--brand); background: rgba(108, 99, 255, 0.04); transform: translateX(2px); }
.connect-choice .cc-icon { font-size: 22px; flex: 0 0 auto; }
.connect-choice .cc-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.connect-choice .cc-label { font-weight: 600; color: var(--text); font-size: 14px; }
.connect-choice .cc-sub { font-size: 11.5px; color: var(--text-muted); }
.connect-custom { gap: 10px; align-items: center; cursor: default; }
.connect-custom:hover { border-color: var(--border); background: #fff; transform: none; }
.connect-custom .cc-text { gap: 6px; }
.connect-custom input { padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 12.5px; font-family: inherit; outline: none; }
.connect-custom input:focus { border-color: var(--brand); box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.15); }
.connect-custom input.err { border-color: #dc2626; box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.18); animation: sefr-shake 0.32s; }
@keyframes sefr-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
.connect-custom.is-primary { border: 1.5px solid var(--brand); background: linear-gradient(135deg, rgba(108, 99, 255, 0.04), rgba(59, 130, 246, 0.04)); }
.connect-custom.is-primary .cc-icon { font-size: 24px; }
.connect-advanced-toggle { color: var(--text-muted); }
.connect-advanced-toggle .cc-chev { margin-left: auto; font-size: 18px; color: var(--text-muted); transition: transform 0.15s; }
.connect-advanced-toggle:hover .cc-chev { transform: translateX(2px); color: var(--brand); }
.cm-screen[hidden] { display: none !important; }
/* Confirm-deploy */
.deploy-confirm-modal { max-width: 480px; }
.deploy-confirm-modal .dc-host { color: var(--brand-deep); font-family: 'IBM Plex Mono', monospace; font-size: 13px; background: rgba(108, 99, 255, 0.08); padding: 2px 8px; border-radius: 6px; }
.deploy-confirm-modal .dc-list { list-style: none; padding: 0; margin: 14px 0 4px; max-height: 240px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--surface, #fafbff); }
.deploy-confirm-modal .dc-list li { padding: 8px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
.deploy-confirm-modal .dc-list li:last-child { border-bottom: none; }
.deploy-confirm-modal .dc-list code { background: none; padding: 0; color: var(--text); }
/* Deploy success modal — persistent recap */
.deploy-success-modal { max-width: 540px; }
.deploy-success-modal h3 { color: var(--success); }
.deploy-success-modal .ds-list { list-style: none; padding: 0; margin: 14px 0 4px; max-height: 220px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--surface, #fafbff); }
.deploy-success-modal .ds-list li { padding: 8px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
.deploy-success-modal .ds-list li:last-child { border-bottom: none; }
.deploy-success-modal .ds-list code { background: none; padding: 0; color: var(--text); }
.deploy-success-modal .ds-list:empty { display: none; }
.deploy-success-modal .ds-ko { border-color: rgba(220, 38, 38, 0.30); background: rgba(220, 38, 38, 0.04); margin-top: 10px; }
.deploy-success-modal .ds-ko li { color: #b91c1c; }
.deploy-success-modal .ds-ko code { color: #b91c1c; font-weight: 600; }
.btn-sm { padding: 6px 12px !important; font-size: 12px !important; }
.connect-menu { position: absolute; background: #fff; border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 12px 40px rgba(0,0,0,0.14); z-index: 350; min-width: 220px; overflow: hidden; animation: sefr-menu-in 0.14s ease-out; }
@keyframes sefr-menu-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
.connect-menu-head { padding: 12px 14px; border-bottom: 1px solid var(--border); background: rgba(108, 99, 255, 0.04); }
.connect-menu-head .cmh-name { font-weight: 600; font-size: 13px; color: var(--text); }
.connect-menu-head .cmh-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.connect-menu-item { display: block; width: 100%; padding: 10px 14px; background: none; border: none; text-align: left; font-size: 13px; color: var(--text); cursor: pointer; transition: background 0.12s; }
.connect-menu-item:hover { background: rgba(220, 38, 38, 0.06); color: #b91c1c; }

/* FOOTER */
/* Back-to-top — sober link, centered, above the footer. Acts as a consistent end-of-content
   marker so spacing between page content and footer is identical on every page. */
.back-to-top-wrap { display: flex; justify-content: center; margin-top: 56px; padding: 0 20px; }
.back-to-top { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 12.5px; color: var(--text-soft); border: 1px solid var(--border); border-radius: 100px; background: rgba(255, 255, 255, 0.7); transition: all 0.18s ease; backdrop-filter: blur(4px); }
.back-to-top:hover { color: var(--brand-deep); border-color: var(--brand-light); background: #fff; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(1, 118, 211, 0.10); }
footer { margin-top: 32px; padding: 36px 0 28px; border-top: 1px solid var(--border); background: rgba(246, 248, 251, 0.65); backdrop-filter: blur(6px); }
.footer-inner { max-width: 1240px; margin: 0 auto; padding: 0 24px; display: grid; grid-template-columns: 1.4fr repeat(4, 1fr); gap: 30px; font-size: 13px; color: var(--text-soft); }
.footer-brand { display: flex; flex-direction: column; gap: 12px; margin-top: 0; }
.footer-brand .logos { display: flex; align-items: center; gap: 12px; }
.footer-brand .logos img { height: 44px; width: auto; }
.footer-brand p { color: var(--text-muted); font-size: 12.5px; max-width: 280px; margin-bottom: 0; }
.footer-copy { font-size: 11px; color: var(--text-muted); margin-top: -1px; }
.footer-col h4 { font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 600; color: var(--text); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }
.footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 7px; }
.footer-col a { color: var(--text-soft); transition: color 0.15s; }
.footer-col a:hover { color: var(--brand); }
.pulse-badge { display: inline-flex; align-items: center; gap: 5px; padding: 2px 7px; background: rgba(46, 132, 74, 0.08); color: var(--success); border-radius: 100px; font-size: 10.5px; font-weight: 600; }
.pulse-dot { width: 5px; height: 5px; background: var(--success); border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

@media (max-width: 900px) {
  .nav-links { display: none; }
  .cmd-k { min-width: auto; }
  .footer-inner { grid-template-columns: 1fr 1fr; }
  .detail-grid { grid-template-columns: 1fr; }
  .detail-side { position: static; }
  .docs-grid { grid-template-columns: 1fr; }
  .docs-side { position: static; border-right: none; padding-right: 0; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
}
"""

# ----------------------------------------------------------------------
# JS — i18n, Cmd+K, filters, cart, modals (tracking, showcase, submit, feedback)
# ----------------------------------------------------------------------
JS = r"""// SE FR Library — client UX
// Public surface: window.__SE_T(key) for i18n; window.__SE_INDEX for search.
(function () {
  const STORAGE_LANG = 'sefr.lang';
  const STORAGE_TRACKED = 'sefr.tracked.v1';
  const STORAGE_AUTH = 'sefr.auth.v1';
  const STORAGE_FP = 'sefr.fp.v1';
  const PKCE_KEY = 'sefr.pkce.v1';

  // ── Tracking — fire-and-forget POST to backend. Never blocks UX.
  function track(path, body) {
    const url = '/api/track/' + path;
    const payload = JSON.stringify(body || {});
    // Use sendBeacon when available so the request survives page navigation.
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(url, blob)) return;
      } catch (e) { /* fall through to fetch */ }
    }
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch (e) { /* ignore */ }
  }

  // Stable per-browser fingerprint for like dedup (not used for identification).
  function getFingerprint() {
    let fp = localStorage.getItem(STORAGE_FP);
    if (!fp) {
      fp = (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 24);
      localStorage.setItem(STORAGE_FP, fp);
    }
    return fp;
  }

  // ── i18n
  const T = {
    fr: {
      'connect.btn': '↗ Connecter à mon org',
      'showcase.btn': '🚀 Voir en live',
      'search.placeholder': 'Rechercher…',
      'search.empty': 'Aucun résultat.',
      'cart.selected': 'composants sélectionnés',
      'cart.copy': '📋 Copier en kit',
      'cart.download': '⬇ Télécharger .zip',
      'cart.deploy': '🚀 Déployer dans mon org',
      'tracking.title': 'Avant de continuer — un instant',
      'tracking.sub': 'On suit qui utilise quoi pour mieux maintenir la lib. Promis, on ne spam pas.',
      'tracking.email': 'Votre email Salesforce',
      'tracking.reason': "Pourquoi ce composant / bundle ?",
      'tracking.opp': "Nom de l'opportunité ou du client (optionnel)",
      'tracking.submit': 'Continuer →',
      'tracking.cancel': 'Annuler',
      'tracking.toast': '✓ Merci, suivi enregistré pour la session.',
      'showcase.title': "Demander un accès à l'org de démo",
      'showcase.body': "Un compte read-only vous est créé dans l'org SE_FR_SDO. Renseignez votre email — Lionel revient vers vous avec un magic-link.",
      'showcase.email': 'Votre email',
      'showcase.comment': 'Commentaire (optionnel)',
      'showcase.comment.ph': 'Un cas d’usage spécifique, un composant à voir en priorité, …',
      'showcase.submit': 'Envoyer la demande →',
      'showcase.cancel': 'Annuler',
      'submit.title': 'Soumettre un composant',
      'submit.body': "Un composant que d'autres SE pourraient adorer ? Envoyez-le moi via :",
      'feedback.title': 'Partager un feedback / une idée',
      'feedback.body': "Bug, idée ou retour — dites-moi tout.",
      'feedback.kind': 'Type',
      'feedback.kind.bug': 'Bug',
      'feedback.kind.idea': "Idée d'amélioration",
      'feedback.kind.other': 'Autre',
      'feedback.email': 'Votre email',
      'feedback.message': 'Votre message',
      'feedback.submit': 'Envoyer →',
      'feedback.cancel': 'Annuler',
      'feedback.via.agent': 'Préférez le chat ? Ouvrez le Library Agent (bas à droite).',
      'feedback.subject.bug': 'LWC Library — Bug',
      'feedback.subject.idea': 'LWC Library — Idée',
      'feedback.subject.other': 'LWC Library — Feedback',
      'feedback.toast.sent': '✓ Merci, votre message a bien été enregistré.',
      'feedback.toast.error': '✗ Erreur d’envoi. Réessayez dans un instant.',
      'contact.title': 'Me contacter',
      'contact.body': "Une question ? Un retour ? Écrivez-moi.",
      'contact.email': 'Votre email',
      'contact.subject': 'Sujet',
      'contact.message': 'Votre message',
      'contact.submit': 'Envoyer →',
      'contact.cancel': 'Annuler',
      'contact.subject.placeholder': 'Ex. Question sur seFrKanbanBoard',
      'submitc.title': 'Soumettre un composant',
      'submitc.body': "Merci pour votre contribution !",
      'submitc.author': 'Votre nom',
      'submitc.email': 'Votre email',
      'submitc.name': 'Nom du composant',
      'submitc.name.ph': 'Ex. seFrPipelineHeatmap',
      'submitc.desc': 'Description courte',
      'submitc.desc.ph': 'En une phrase, ce que fait le composant.',
      'submitc.usage': "Cas d'usage / personas",
      'submitc.usage.ph': 'Sales, Service, Marketing… page Account, Home, Service Console, etc.',
      'submitc.attach': 'Lien (zip, repo, vidéo)',
      'submitc.attach.ph': 'Drive, Quip, GitHub… (les pièces jointes lourdes passent mieux par lien)',
      'submitc.notes': 'Commentaires libres',
      'submitc.submit': 'Envoyer →',
      'submitc.cancel': 'Annuler',
      'channels.slack': "Slack #cco-fr-assets — le canal de partage des assets SE FR",
      'channels.qbranch': "Q Branch — Demo Components",
      'channels.email': "Email · lionel.braun@salesforce.com",
      'channels.agent': "Le Library Agent (bouton en bas à droite)",
      'connect.title': 'Déployer sur votre org Salesforce',
      'connect.body': "Connectez-vous via OAuth à votre org de démo (popup de login Salesforce, choix de l'org, le token reste dans votre session navigateur), puis déployez les composants sélectionnés en un clic.",
      'modal.ok': 'Compris',
      'agent.btn': "Demander à l'agent",
      'agent.title': '💬 Library Agent',
      'agent.body': "Posez une question sur la lib — composants, recettes, comment configurer telle ou telle prop. L'agent répond depuis la knowledge base à jour.",
      'agent.examples': 'Exemples : « un composant mobile-ready pour le Field Sales », « ceux qui utilisent l’Apex partagé », « les nouveautés de la v2.8 ».',
      'deploy.toast': '🚀 Déploiement lancé',
      'download.toast': '⬇ Téléchargement lancé',
      'download.multi.allow': 'autorisez les téléchargements multiples si demandé',
      'connect.menu.disconnect': 'Se déconnecter',
      'connect.menu.signedinas': 'Connecté en tant que',
      'connect.choose.title': 'Connecter votre org de démo',
      'connect.choose.sub': "Cette org sera la cible des déploiements. Connectez-vous à VOTRE org de démo (SDO/IDO/scratch) — pas à l'org showcase, pas à une prod client.",
      'connect.choose.login': 'Login Salesforce',
      'connect.choose.login.sub': 'login.salesforce.com — vos identifiants Salesforce habituels',
      'connect.choose.sandbox': 'Sandbox',
      'connect.choose.sandbox.sub': 'test.salesforce.com',
      'connect.choose.advanced': 'My Domain personnalisé',
      'connect.choose.advanced.sub': 'Si vous connaissez l’URL exacte de votre org',
      'connect.choose.sdo': 'My Domain',
      'connect.choose.sdo.sub': 'Tapez votre URL d’org',
      'connect.choose.sdo.ph': 'storm.my.salesforce.com',
      'connect.choose.scratch': 'Scratch org',
      'connect.choose.scratch.sub': 'test.salesforce.com',
      'connect.choose.continue': 'Continuer →',
      'connect.choose.back': '← Retour',
      'connect.choose.cancel': 'Annuler',
      'connect.popup.blocked': '⚠ Autorisez la popup pour vous connecter à Salesforce.',
      'connect.toast.connected': '✓ Connecté à',
      'connect.toast.disconnected': 'Déconnecté de votre org.',
      'connect.toast.failed': '✗ Connexion échouée',
      'connect.toast.notconfigured': 'OAuth pas encore configuré côté serveur — réessayez dans quelques minutes.',
      'deploy.progress.preparing': 'Préparation du package…',
      'deploy.progress.uploading': 'Envoi du package à Salesforce…',
      'deploy.progress.deploying': 'Déploiement en cours',
      'deploy.toast.success': '✓ Déployé sur',
      'deploy.toast.partial': '⚠ Déployé partiellement —',
      'deploy.toast.failed': '✗ Déploiement échoué',
      'deploy.error.notconnected': 'Veuillez vous connecter à votre org avant de déployer.',
      'deploy.confirm.title': 'Confirmer le déploiement',
      'deploy.confirm.body.one': 'Déployer ce composant sur',
      'deploy.confirm.body.many': 'Déployer ces composants sur',
      'deploy.confirm.deploy': 'Déployer →',
      'deploy.confirm.cancel': 'Annuler',
      'deploy.success.title': '✓ Déploiement réussi',
      'deploy.success.title.partial': '⚠ Déploiement partiel',
      'deploy.success.sub': '{count} composant(s) déployé(s) sur {host}.',
      'deploy.success.sub.partial': '{deployed}/{total} composant(s) déployé(s) sur {host}. Quelques erreurs ci-dessous.',
      'deploy.success.open': '↗ Ouvrir mon org',
      'deploy.success.close': 'Fermer',
      'showcase.toast.failed': '✗ Showcase indisponible',
      'showcase.toast.popupblocked': '⚠ Popup bloquée — ouverture dans cet onglet…',
    },
    en: {
      'connect.btn': '↗ Connect to my org',
      'showcase.btn': '🚀 See it live',
      'search.placeholder': 'Search…',
      'search.empty': 'No match.',
      'cart.selected': 'components selected',
      'cart.copy': '📋 Copy as kit',
      'cart.download': '⬇ Download .zip',
      'cart.deploy': '🚀 Deploy to my org',
      'tracking.title': 'One quick thing before you continue',
      'tracking.sub': 'We track usage so we can maintain the library better. No spam, promise.',
      'tracking.email': 'Your Salesforce email',
      'tracking.reason': 'Why this component / bundle?',
      'tracking.opp': 'Opportunity or customer name (optional)',
      'tracking.submit': 'Continue →',
      'tracking.cancel': 'Cancel',
      'tracking.toast': '✓ Thanks — tracked for this session.',
      'showcase.title': 'Request access to the demo org',
      'showcase.body': "A read-only account will be provisioned for you in SE_FR_SDO. Drop your email — Lionel comes back to you with a magic-link.",
      'showcase.email': 'Your email',
      'showcase.comment': 'Comment (optional)',
      'showcase.comment.ph': 'A specific use case, a component you want to see first, …',
      'showcase.submit': 'Send request →',
      'showcase.cancel': 'Cancel',
      'submit.title': 'Submit a component',
      'submit.body': "Built something other SEs might love? Send it my way through:",
      'feedback.title': 'Share feedback or an idea',
      'feedback.body': "Bug, idea or feedback — tell me anything.",
      'feedback.kind': 'Type',
      'feedback.kind.bug': 'Bug',
      'feedback.kind.idea': 'Improvement idea',
      'feedback.kind.other': 'Other',
      'feedback.email': 'Your email',
      'feedback.message': 'Your message',
      'feedback.submit': 'Send →',
      'feedback.cancel': 'Cancel',
      'feedback.via.agent': 'Prefer chat? Open the Library Agent (bottom right).',
      'feedback.subject.bug': 'LWC Library — Bug',
      'feedback.subject.idea': 'LWC Library — Idea',
      'feedback.subject.other': 'LWC Library — Feedback',
      'feedback.toast.sent': '✓ Thanks — your message has been recorded.',
      'feedback.toast.error': '✗ Submission failed. Please try again.',
      'contact.title': 'Contact me',
      'contact.body': "A question? Feedback? Drop me a line.",
      'contact.email': 'Your email',
      'contact.subject': 'Subject',
      'contact.message': 'Your message',
      'contact.submit': 'Send →',
      'contact.cancel': 'Cancel',
      'contact.subject.placeholder': 'E.g. Question about seFrKanbanBoard',
      'submitc.title': 'Submit a component',
      'submitc.body': "Thanks for your contribution!",
      'submitc.author': 'Your name',
      'submitc.email': 'Your email',
      'submitc.name': 'Component name',
      'submitc.name.ph': 'E.g. seFrPipelineHeatmap',
      'submitc.desc': 'Short description',
      'submitc.desc.ph': 'In one sentence, what your component does.',
      'submitc.usage': 'Use cases / personas',
      'submitc.usage.ph': 'Sales, Service, Marketing… Account record page, Home, Service Console, etc.',
      'submitc.attach': 'Link (zip, repo, video)',
      'submitc.attach.ph': 'Drive, Quip, GitHub… (large attachments are easier via link)',
      'submitc.notes': 'Other comments',
      'submitc.submit': 'Send →',
      'submitc.cancel': 'Cancel',
      'channels.slack': "Slack #cco-fr-assets — the SE FR shared-assets channel",
      'channels.qbranch': "Q Branch — Demo Components",
      'channels.email': "Email · lionel.braun@salesforce.com",
      'channels.agent': "The Library Agent (bottom-right button)",
      'connect.title': 'Deploy to your Salesforce org',
      'connect.body': "Connect via OAuth to your demo org (Salesforce popup login, pick your org, session token lives in your browser only), then deploy the selected components in one click.",
      'modal.ok': 'Got it',
      'agent.btn': 'Ask the agent',
      'agent.title': '💬 Library Agent',
      'agent.body': "Ask anything about the library — components, recipes, how to configure a given prop. The agent answers from the latest knowledge base.",
      'agent.examples': 'Try: "a mobile-ready component for Field Sales", "what uses Apex shared classes", "what’s new in v2.8".',
      'deploy.toast': '🚀 Deploy launched',
      'download.toast': '⬇ Download started',
      'download.multi.allow': 'allow multiple downloads if your browser asks',
      'connect.menu.disconnect': 'Disconnect',
      'connect.menu.signedinas': 'Signed in as',
      'connect.choose.title': 'Connect to your demo org',
      'connect.choose.sub': "This org will be the deploy target. Connect to YOUR demo org (SDO/IDO/scratch) — NOT the showcase org, NOT a customer prod.",
      'connect.choose.login': 'Salesforce login',
      'connect.choose.login.sub': 'login.salesforce.com — your usual Salesforce credentials',
      'connect.choose.sandbox': 'Sandbox',
      'connect.choose.sandbox.sub': 'test.salesforce.com',
      'connect.choose.advanced': 'Custom My Domain',
      'connect.choose.advanced.sub': 'If you know your org URL exactly',
      'connect.choose.sdo': 'My Domain',
      'connect.choose.sdo.sub': 'Type your org URL',
      'connect.choose.sdo.ph': 'storm.my.salesforce.com',
      'connect.choose.scratch': 'Scratch org',
      'connect.choose.scratch.sub': 'test.salesforce.com',
      'connect.choose.continue': 'Continue →',
      'connect.choose.back': '← Back',
      'connect.choose.cancel': 'Cancel',
      'connect.popup.blocked': '⚠ Please allow the popup to sign in to Salesforce.',
      'connect.toast.connected': '✓ Connected to',
      'connect.toast.disconnected': 'Disconnected from your org.',
      'connect.toast.failed': '✗ Connection failed',
      'connect.toast.notconfigured': 'OAuth not configured yet on the server — try again in a moment.',
      'deploy.progress.preparing': 'Preparing the package…',
      'deploy.progress.uploading': 'Uploading the package to Salesforce…',
      'deploy.progress.deploying': 'Deploying',
      'deploy.toast.success': '✓ Deployed to',
      'deploy.toast.partial': '⚠ Partial deploy —',
      'deploy.toast.failed': '✗ Deploy failed',
      'deploy.error.notconnected': 'Please connect to your org before deploying.',
      'deploy.confirm.title': 'Confirm deploy',
      'deploy.confirm.body.one': 'Deploy this component to',
      'deploy.confirm.body.many': 'Deploy these components to',
      'deploy.confirm.deploy': 'Deploy →',
      'deploy.confirm.cancel': 'Cancel',
      'deploy.success.title': '✓ Deploy successful',
      'deploy.success.title.partial': '⚠ Partial deploy',
      'deploy.success.sub': '{count} component(s) deployed to {host}.',
      'deploy.success.sub.partial': '{deployed}/{total} component(s) deployed to {host}. A few errors are listed below.',
      'deploy.success.open': '↗ Open my org',
      'deploy.success.close': 'Close',
      'showcase.toast.failed': '✗ Showcase unavailable',
      'showcase.toast.popupblocked': '⚠ Popup blocked — opening in this tab…',
    }
  };

  function getLang() {
    return localStorage.getItem(STORAGE_LANG) || 'fr';
  }
  function setLang(l) {
    localStorage.setItem(STORAGE_LANG, l);
    applyLang();
  }
  function t(k) { return (T[getLang()] || T.fr)[k] || k; }
  window.__SE_T = t;

  function applyLang() {
    const lang = getLang();
    document.documentElement.lang = lang;
    // Library-controlled content — innerHTML is safe here.
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.innerHTML = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const tx = t(el.dataset.i18nPlaceholder);
      if ('placeholder' in el && el.tagName !== 'SPAN') el.placeholder = tx;
      else el.textContent = tx;
    });
    document.querySelectorAll('[data-i18n-pair]').forEach(el => {
      try {
        const map = JSON.parse(el.dataset.i18nPair);
        const v = map[lang] || map.en || '';
        el.innerHTML = v;
      } catch (e) { /* ignore */ }
    });
    // Component-level i18n: data-i18n-comp="apiName.field" or
    // "apiName.field.idx" (for arrays). EN content lives in DOM,
    // window.__SE_I18N[apiName] = { tagline, chips: [...], keyProps: [...],
    // seBenefit, description } provides the FR replacements.
    const dict = window.__SE_I18N || {};
    function mdInline(s) {
      // Mirror of Python md_inline: escape HTML, then turn `…` → <code>, **…** → <strong>, *…* → <em>.
      var out = String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
      out = out.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
      out = out.replace(/(^|[^*])\\*([^*]+)\\*(?!\\*)/g, '$1<em>$2</em>');
      return out;
    }
    document.querySelectorAll('[data-i18n-comp]').forEach(el => {
      const key = el.dataset.i18nComp;
      // Cache the EN version once
      if (el.dataset.i18nEn === undefined) el.dataset.i18nEn = el.innerHTML;
      if (lang === 'en') { el.innerHTML = el.dataset.i18nEn; return; }
      const parts = key.split('.');
      const api = parts[0];
      const field = parts[1];
      const idx = parts[2] !== undefined ? parseInt(parts[2], 10) : null;
      const entry = dict[api];
      if (!entry) return;
      let v;
      if (idx !== null && Array.isArray(entry[field])) v = entry[field][idx];
      else v = entry[field];
      if (typeof v === 'string') el.innerHTML = mdInline(v);
    });
    document.querySelectorAll('[data-lang-btn]').forEach(b => {
      b.classList.toggle('active', b.dataset.langBtn === lang);
    });
    // Update cmd-k index pointer
    if (window.__SE_INDEX_FR && lang === 'fr') window.__SE_ACTIVE_INDEX = window.__SE_INDEX_FR;
    else window.__SE_ACTIVE_INDEX = window.__SE_INDEX;
  }

  // ── Toast helper
  let toastHost = null;
  function toast(msg, ms = 2400) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toast-host';
      document.body.appendChild(toastHost);
    }
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastHost.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    }, ms);
  }
  window.__seToast = toast;

  // ── Generic info modal (Connect, Showcase, Submit, Feedback)
  function openInfoModal(opts) {
    let m = document.getElementById('global-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'global-modal';
      m.className = 'modal-mask';
      m.innerHTML = '<div class="modal"><h3 id="m-t"></h3><div id="m-b"></div><div class="modal-actions"><button class="btn btn-primary" id="m-close">' + t('modal.ok') + '</button></div></div>';
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => { if (ev.target === m || ev.target.id === 'm-close') m.classList.remove('open'); });
    }
    m.querySelector('#m-t').textContent = opts.title;
    m.querySelector('#m-b').innerHTML = opts.bodyHtml || ('<p>' + (opts.body || '') + '</p>');
    m.querySelector('#m-close').textContent = t('modal.ok');
    m.classList.add('open');
  }

  // ── Tracking modal — fired before download/deploy, once per session
  function isTracked() { return sessionStorage.getItem(STORAGE_TRACKED) === '1'; }
  function markTracked() { sessionStorage.setItem(STORAGE_TRACKED, '1'); }

  function openTrackingModal(onComplete) {
    let m = document.getElementById('tracking-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'tracking-modal';
      m.className = 'modal-mask';
      m.innerHTML = (
        '<div class="modal">' +
        '<h3 data-i18n="tracking.title"></h3>' +
        '<p class="modal-sub" data-i18n="tracking.sub"></p>' +
        '<form id="tracking-form" class="tracking-form">' +
        '<label><span data-i18n="tracking.email"></span><input type="email" name="email" required></label>' +
        '<label><span data-i18n="tracking.reason"></span><textarea name="reason" rows="2" required></textarea></label>' +
        '<label><span data-i18n="tracking.opp"></span><input type="text" name="opp"></label>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-tracking-cancel data-i18n="tracking.cancel"></button>' +
        '<button type="submit" class="btn btn-primary" data-i18n="tracking.submit"></button>' +
        '</div></form></div>'
      );
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-tracking-cancel]')) {
          m.classList.remove('open');
        }
      });
      m.querySelector('#tracking-form').addEventListener('submit', (e) => {
        e.preventDefault();
        markTracked();
        m.classList.remove('open');
        toast(t('tracking.toast'));
        const cb = m.__sePending;
        m.__sePending = null;
        if (typeof cb === 'function') setTimeout(cb, 100);
      });
      applyLang();
    }
    m.__sePending = onComplete;
    m.classList.add('open');
    setTimeout(() => m.querySelector('input[name="email"]').focus(), 30);
  }

  // ── Form submission helper — POST /api/feedback, returns Promise<ok>
  async function submitFeedbackForm(payload) {
    try {
      const r = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return r.ok;
    } catch (e) {
      return false;
    }
  }

  // ── Feedback modal — POSTs to /api/feedback (DB only, V1)
  function openFeedbackModal() {
    let m = document.getElementById('feedback-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'feedback-modal';
      m.className = 'modal-mask';
      m.innerHTML = (
        '<div class="modal">' +
        '<h3 data-i18n="feedback.title"></h3>' +
        '<p class="modal-sub" data-i18n="feedback.body"></p>' +
        '<form id="feedback-form" class="tracking-form">' +
        '<label><span data-i18n="feedback.kind"></span><select name="kind">' +
        '<option value="bug" data-i18n="feedback.kind.bug"></option>' +
        '<option value="idea" data-i18n="feedback.kind.idea"></option>' +
        '<option value="other" data-i18n="feedback.kind.other"></option>' +
        '</select></label>' +
        '<label><span data-i18n="feedback.email"></span><input type="email" name="email" required></label>' +
        '<label><span data-i18n="feedback.message"></span><textarea name="message" rows="5" required></textarea></label>' +
        '<p style="font-size:11.5px;color:var(--text-muted);margin:0" data-i18n="feedback.via.agent"></p>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-feedback-cancel data-i18n="feedback.cancel"></button>' +
        '<button type="submit" class="btn btn-primary" data-i18n="feedback.submit"></button>' +
        '</div></form></div>'
      );
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-feedback-cancel]')) {
          m.classList.remove('open');
        }
      });
      m.querySelector('#feedback-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        const submitBtn = f.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        const ok = await submitFeedbackForm({
          kind: 'feedback',
          subkind: f.kind.value,
          email: f.email.value.trim(),
          subject: t('feedback.subject.' + f.kind.value),
          message: f.message.value.trim(),
          page: window.location.pathname,
        });
        if (submitBtn) submitBtn.disabled = false;
        if (ok) {
          m.classList.remove('open');
          f.reset();
          toast(t('feedback.toast.sent'), 3500);
        } else {
          toast(t('feedback.toast.error'), 4000);
        }
      });
      applyLang();
    }
    m.classList.add('open');
    setTimeout(() => m.querySelector('input[name="email"]').focus(), 30);
  }

  // ── Submit-component modal — full form, mailto on submit
  function openSubmitComponentModal() {
    const TO = 'lionel.braun@salesforce.com';
    let m = document.getElementById('submit-component-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'submit-component-modal';
      m.className = 'modal-mask';
      m.innerHTML = (
        '<div class="modal modal-wide">' +
        '<h3 data-i18n="submitc.title"></h3>' +
        '<p class="modal-sub" data-i18n="submitc.body"></p>' +
        '<form id="submit-component-form" class="tracking-form">' +
        '<div class="form-row">' +
        '<label><span data-i18n="submitc.author"></span><input type="text" name="author" required></label>' +
        '<label><span data-i18n="submitc.email"></span><input type="email" name="email" required></label>' +
        '</div>' +
        '<label><span data-i18n="submitc.name"></span><input type="text" name="cname" data-i18n-placeholder="submitc.name.ph" required></label>' +
        '<label><span data-i18n="submitc.desc"></span><textarea name="desc" rows="2" data-i18n-placeholder="submitc.desc.ph" required></textarea></label>' +
        '<label><span data-i18n="submitc.usage"></span><textarea name="usage" rows="2" data-i18n-placeholder="submitc.usage.ph" required></textarea></label>' +
        '<label><span data-i18n="submitc.attach"></span><input type="url" name="attach" data-i18n-placeholder="submitc.attach.ph"></label>' +
        '<label><span data-i18n="submitc.notes"></span><textarea name="notes" rows="3"></textarea></label>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-submitc-cancel data-i18n="submitc.cancel"></button>' +
        '<button type="submit" class="btn btn-primary" data-i18n="submitc.submit"></button>' +
        '</div></form></div>'
      );
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-submitc-cancel]')) {
          m.classList.remove('open');
        }
      });
      m.querySelector('#submit-component-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const author = f.author.value.trim();
        const fromEmail = f.email.value.trim();
        const cname = f.cname.value.trim();
        const desc = f.desc.value.trim();
        const usage = f.usage.value.trim();
        const attach = f.attach.value.trim();
        const notes = f.notes.value.trim();
        const subject = 'LWC Library — Submission: ' + cname;
        const lines = [
          'Author: ' + author + ' <' + fromEmail + '>',
          'Component: ' + cname,
          '',
          'Description:',
          desc,
          '',
          'Use cases / personas:',
          usage,
        ];
        if (attach) { lines.push('', 'Link: ' + attach); }
        if (notes)  { lines.push('', 'Notes:', notes); }
        lines.push('', '— sent via the LWC Library site');
        const url = 'mailto:' + TO +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(lines.join('\\n'));
        window.location.href = url;
        m.classList.remove('open');
      });
      applyLang();
    }
    m.classList.add('open');
    setTimeout(() => m.querySelector('input[name="author"]').focus(), 30);
  }

  // ── Contact modal — POSTs to /api/feedback (kind='contact')
  function openContactModal() {
    let m = document.getElementById('contact-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'contact-modal';
      m.className = 'modal-mask';
      m.innerHTML = (
        '<div class="modal">' +
        '<h3 data-i18n="contact.title"></h3>' +
        '<p class="modal-sub" data-i18n="contact.body"></p>' +
        '<form id="contact-form" class="tracking-form">' +
        '<label><span data-i18n="contact.email"></span><input type="email" name="email" required></label>' +
        '<label><span data-i18n="contact.subject"></span><input type="text" name="subject" data-i18n-placeholder="contact.subject.placeholder" required></label>' +
        '<label><span data-i18n="contact.message"></span><textarea name="message" rows="5" required></textarea></label>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-contact-cancel data-i18n="contact.cancel"></button>' +
        '<button type="submit" class="btn btn-primary" data-i18n="contact.submit"></button>' +
        '</div></form></div>'
      );
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-contact-cancel]')) {
          m.classList.remove('open');
        }
      });
      m.querySelector('#contact-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        const submitBtn = f.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        const ok = await submitFeedbackForm({
          kind: 'contact',
          email: f.email.value.trim(),
          subject: f.subject.value.trim() || 'LWC Library — Contact',
          message: f.message.value.trim(),
          page: window.location.pathname,
        });
        if (submitBtn) submitBtn.disabled = false;
        if (ok) {
          m.classList.remove('open');
          f.reset();
          toast(t('feedback.toast.sent'), 3500);
        } else {
          toast(t('feedback.toast.error'), 4000);
        }
      });
      applyLang();
    }
    m.classList.add('open');
    setTimeout(() => m.querySelector('input[name="email"]').focus(), 30);
  }

  // ── Showcase access request — same blurred-mask UX, prefills mailto on submit
  // (Showcase magic-link modal removed — superseded by the JWT 'Voir en live'
  // flow that drops the SE directly into LEX as the Showcase Visitor bot.)

  // ── OAuth state machine (sefr.auth.v1)
  // Stored in localStorage so the SE remains connected across browser sessions
  // (refresh_token grant covers token expiry transparently).
  // Shape: { accessToken, refreshToken, instanceUrl, loginHost, name, username, orgId, issuedAt }
  const auth = {
    get() {
      try { return JSON.parse(localStorage.getItem(STORAGE_AUTH) || 'null'); } catch { return null; }
    },
    set(v) {
      if (v) localStorage.setItem(STORAGE_AUTH, JSON.stringify(v));
      else localStorage.removeItem(STORAGE_AUTH);
      renderConnectButtons();
    },
    isConnected() { return !!(auth.get() && auth.get().accessToken); },
    instanceHost() { const a = auth.get(); if (!a) return ''; try { return new URL(a.instanceUrl).hostname; } catch { return ''; } },
    async fetch(url, opts) {
      // Wrapper: adds Authorization, refreshes once on 401.
      const a = auth.get();
      if (!a) throw new Error('not_connected');
      const doFetch = (token) => fetch(url, Object.assign({}, opts, {
        headers: Object.assign({}, (opts && opts.headers) || {}, {
          Authorization: 'Bearer ' + token,
          'X-SF-Instance-Url': a.instanceUrl,
        }),
      }));
      let r = await doFetch(a.accessToken);
      if (r.status !== 401 || !a.refreshToken) return r;
      // Try refresh
      const rr = await fetch('/api/oauth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: a.refreshToken, loginHost: a.loginHost }),
      });
      if (!rr.ok) { auth.set(null); throw new Error('refresh_failed'); }
      const fresh = await rr.json();
      const merged = Object.assign({}, a, { accessToken: fresh.accessToken, instanceUrl: fresh.instanceUrl || a.instanceUrl, issuedAt: fresh.issuedAt });
      auth.set(merged);
      return doFetch(merged.accessToken);
    },
  };

  function renderConnectButtons() {
    const a = auth.get();
    const buttons = document.querySelectorAll('[data-mock="connect"]');
    buttons.forEach(b => {
      if (a && a.accessToken) {
        const label = (a.name || a.username || '').split(' ')[0] || 'connecté';
        b.textContent = '✓ ' + label + ' · ' + auth.instanceHost();
        b.classList.add('is-connected');
      } else {
        b.textContent = t('connect.btn');
        b.classList.remove('is-connected');
      }
    });
  }

  // ── PKCE helpers (RFC 7636)
  function b64url(buf) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  async function makePkcePair() {
    const rand = new Uint8Array(48); crypto.getRandomValues(rand);
    const verifier = b64url(rand);
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return { verifier, challenge: b64url(hash) };
  }

  // ── Connect modal — 2-screen flow
  // Screen 1 (default): Mon SDO/IDO (input direct) / Scratch / Sandbox or Prod (advanced ↘)
  // Screen 2 (advanced): Sandbox / Production / ← Back
  function openConnectChooser(onProceed) {
    let m = document.getElementById('connect-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'connect-modal';
      m.className = 'modal-mask';
      m.innerHTML = (
        '<div class="modal connect-modal">' +
        // Screen 1 — main
        '<div class="cm-screen cm-screen-main">' +
        '<h3 data-i18n="connect.choose.title"></h3>' +
        '<p class="modal-sub" data-i18n="connect.choose.sub"></p>' +
        '<div class="connect-choices">' +
        '<button type="button" class="connect-choice is-primary" data-host="login.salesforce.com" data-kind="login">' +
        '<span class="cc-icon">☁️</span><span class="cc-text"><span class="cc-label" data-i18n="connect.choose.login"></span><span class="cc-sub" data-i18n="connect.choose.login.sub"></span></span></button>' +
        '<button type="button" class="connect-choice" data-host="test.salesforce.com" data-kind="sandbox">' +
        '<span class="cc-icon">🧪</span><span class="cc-text"><span class="cc-label" data-i18n="connect.choose.sandbox"></span><span class="cc-sub" data-i18n="connect.choose.sandbox.sub"></span></span></button>' +
        '<button type="button" class="connect-choice connect-advanced-toggle">' +
        '<span class="cc-icon">⚙️</span><span class="cc-text"><span class="cc-label" data-i18n="connect.choose.advanced"></span><span class="cc-sub" data-i18n="connect.choose.advanced.sub"></span></span><span class="cc-chev">›</span></button>' +
        '</div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-connect-cancel data-i18n="connect.choose.cancel"></button></div>' +
        '</div>' +
        // Screen 2 (advanced) — custom My Domain
        '<div class="cm-screen cm-screen-advanced" hidden>' +
        '<h3 data-i18n="connect.choose.advanced"></h3>' +
        '<p class="modal-sub" data-i18n="connect.choose.sub"></p>' +
        '<div class="connect-choices">' +
        '<div class="connect-choice connect-custom is-primary"><span class="cc-icon">🛠️</span>' +
        '<span class="cc-text"><span class="cc-label" data-i18n="connect.choose.sdo"></span>' +
        '<input type="text" name="sdoDomain" data-i18n-placeholder="connect.choose.sdo.ph" autocomplete="off"></span>' +
        '<button type="button" class="btn btn-primary btn-sm" data-sdo-go data-i18n="connect.choose.continue"></button></div>' +
        '</div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-ghost" data-connect-back data-i18n="connect.choose.back"></button>' +
        '<button type="button" class="btn btn-ghost" data-connect-cancel data-i18n="connect.choose.cancel"></button></div>' +
        '</div>' +
        '</div>'
      );
      document.body.appendChild(m);

      const screenMain = m.querySelector('.cm-screen-main');
      const screenAdv = m.querySelector('.cm-screen-advanced');
      function showMain() { screenMain.hidden = false; screenAdv.hidden = true; }
      function showAdv() { screenMain.hidden = true; screenAdv.hidden = false; }

      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-connect-cancel]')) {
          m.classList.remove('open'); showMain();
        }
      });
      m.querySelector('.connect-advanced-toggle').addEventListener('click', () => {
        showAdv();
        setTimeout(() => {
          const inp = m.querySelector('input[name="sdoDomain"]');
          if (inp) inp.focus();
        }, 30);
      });
      m.querySelector('[data-connect-back]').addEventListener('click', showMain);

      // Direct host buttons (Scratch on screen 1, Sandbox/Prod on screen 2)
      m.querySelectorAll('.connect-choice[data-host]').forEach(b => {
        b.addEventListener('click', () => {
          m.classList.remove('open'); showMain();
          const cb = m.__sePending; m.__sePending = null;
          if (typeof cb === 'function') cb(b.dataset.host);
        });
      });

      // SDO/IDO direct domain
      const sdoInput = m.querySelector('input[name="sdoDomain"]');
      const goSdo = () => {
        const raw = (sdoInput.value || '').trim().toLowerCase();
        const host = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.(my\.salesforce\.com|force\.com)$/i.test(host)) {
          sdoInput.focus(); sdoInput.classList.add('err');
          setTimeout(() => sdoInput.classList.remove('err'), 800);
          return;
        }
        m.classList.remove('open'); showMain();
        const cb = m.__sePending; m.__sePending = null;
        if (typeof cb === 'function') cb(host);
      };
      m.querySelector('[data-sdo-go]').addEventListener('click', goSdo);
      sdoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); goSdo(); } });

      applyLang();
    }
    m.__sePending = onProceed;
    m.classList.add('open');
  }

  // ── Launch the OAuth popup flow against `loginHost`.
  async function startOAuth(loginHost, onDone) {
    const cfg = await (await fetch('/api/oauth/config')).json().catch(() => ({}));
    if (!cfg.clientId) {
      toast(t('connect.toast.notconfigured'), 4000);
      return;
    }
    const pkce = await makePkcePair();
    const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
    sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier: pkce.verifier, state, loginHost }));
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      scope: cfg.scopes,
      state,
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
      prompt: 'login',
    });
    const url = 'https://' + loginHost + '/services/oauth2/authorize?' + params.toString();
    const popup = window.open(url, 'sefr-oauth', 'width=520,height=720,menubar=no,toolbar=no,location=yes');
    if (!popup) { toast(t('connect.popup.blocked'), 4000); return; }

    function handler(ev) {
      const data = ev && ev.data;
      if (!data || data.source !== 'sefr-oauth') return;
      window.removeEventListener('message', handler);
      try { popup.close(); } catch (e) {}
      if (data.error) { toast(t('connect.toast.failed') + ' — ' + data.error_description, 4000); return; }
      // Validate state
      const pending = JSON.parse(sessionStorage.getItem(PKCE_KEY) || 'null');
      sessionStorage.removeItem(PKCE_KEY);
      if (!pending || data.state !== pending.state) { toast(t('connect.toast.failed'), 4000); return; }
      // Exchange code for tokens via our backend
      fetch('/api/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: data.code, codeVerifier: pending.verifier, loginHost: pending.loginHost }),
      }).then(r => r.json().then(j => ({ ok: r.ok, j }))).then(async ({ ok, j }) => {
        if (!ok) { toast(t('connect.toast.failed') + ' — ' + (j.error || ''), 4000); return; }
        // Identity lookup for display
        let ident = {};
        try {
          const idResp = await fetch('/api/oauth/identity', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: j.accessToken, idUrl: j.id }),
          });
          if (idResp.ok) ident = await idResp.json();
        } catch (e) {}
        auth.set({
          accessToken: j.accessToken,
          refreshToken: j.refreshToken,
          instanceUrl: j.instanceUrl,
          loginHost: pending.loginHost,
          name: ident.name || '',
          username: ident.username || '',
          orgId: ident.organizationId || '',
          issuedAt: j.issuedAt,
        });
        let host = ''; try { host = new URL(j.instanceUrl).hostname; } catch (e) {}
        toast(t('connect.toast.connected') + ' ' + host, 3200);
        if (typeof onDone === 'function') onDone();
      }).catch(() => toast(t('connect.toast.failed'), 4000));
    }
    window.addEventListener('message', handler);
  }

  function disconnectOrg() {
    auth.set(null);
    toast(t('connect.toast.disconnected'), 2400);
  }

  // ── Connect button menu (when already connected)
  function openConnectMenu(anchor) {
    const a = auth.get(); if (!a) return;
    let menu = document.getElementById('connect-menu');
    if (menu) { menu.remove(); }
    menu = document.createElement('div');
    menu.id = 'connect-menu';
    menu.className = 'connect-menu';
    menu.innerHTML = (
      '<div class="connect-menu-head">' +
      '<div class="cmh-name">' + (a.name || a.username || '—') + '</div>' +
      '<div class="cmh-sub">' + auth.instanceHost() + '</div>' +
      '</div>' +
      '<button type="button" class="connect-menu-item" data-connect-disconnect data-i18n="connect.menu.disconnect"></button>'
    );
    document.body.appendChild(menu);
    const r = anchor.getBoundingClientRect();
    menu.style.top = (r.bottom + window.scrollY + 6) + 'px';
    menu.style.right = (window.innerWidth - r.right) + 'px';
    applyLang();
    function close(ev) {
      if (ev && menu.contains(ev.target)) return;
      window.removeEventListener('click', close, true);
      menu.remove();
    }
    setTimeout(() => window.addEventListener('click', close, true), 10);
    menu.querySelector('[data-connect-disconnect]').addEventListener('click', () => {
      disconnectOrg();
      close();
    });
  }

  // Update connect button labels when the page loads (pre-existing localStorage state)
  setTimeout(renderConnectButtons, 0);

  // Page-load visit tracking — fired once per pageview, fire-and-forget.
  setTimeout(() => {
    track('visit', {
      page: window.location.pathname || '/',
      referrer: document.referrer ? document.referrer.slice(0, 500) : null,
      lang: getLang(),
    });
  }, 50);

  // ── Resolve the list of components to deploy/download from the click target.
  function resolveTargetComponents(target) {
    // Priority: data-bundle-members (CSV), then data-component-api (single).
    const csv = (target.dataset.bundleMembers || '').trim();
    if (csv) return csv.split(',').map(s => s.trim()).filter(Boolean);
    const single = target.dataset.componentApi || target.dataset.api || '';
    return single ? [single] : [];
  }

  function bumpDownloadCounters(target) {
    const ids = [];
    const bundleId = target.dataset.bundleId;
    if (bundleId) ids.push('recipe-' + bundleId);
    const members = (target.dataset.bundleMembers || '').split(',').filter(Boolean);
    ids.push(...members);
    ids.forEach(id => bumpDownload(id));
  }

  // ── Real download: trigger a real <a download> click for each zip.
  function downloadComponents(target) {
    const list = resolveTargetComponents(target);
    if (!list.length) return;
    // Stagger via hidden iframes — more reliable than chained <a>.click() in Safari/Firefox.
    list.forEach((api, i) => {
      setTimeout(() => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = '/zips/' + api + '.zip';
        document.body.appendChild(iframe);
        // Clean up iframe after browser kicks the download
        setTimeout(() => iframe.remove(), 4000);
      }, i * 250);
    });
    if (list.length > 1) {
      toast(t('download.toast') + ' (' + list.length + ') — ' + t('download.multi.allow'), 5000);
    } else {
      toast(t('download.toast'));
    }
    bumpDownloadCounters(target);
    // Server-side tracking — one row per component, plus carry the recipe id
    // when the download originated from a cookbook bundle.
    const recipeId = target.dataset.bundleId || null;
    const sourcePage = window.location.pathname || '/';
    list.forEach(api => track('download', { apiName: api, recipeId, sourcePage }));
  }

  // ── Deploy success modal — persistent recap, doesn't auto-dismiss.
  // Shows host, deployed components, link to open the org. Optional `partial`
  // payload renders a warning section listing the failures.
  function openDeploySuccessModal(host, list, instanceUrl, partial) {
    let m = document.getElementById('deploy-success');
    if (!m) {
      m = document.createElement('div');
      m.id = 'deploy-success';
      m.className = 'modal-mask';
      // Build DOM via createElement to avoid innerHTML lint warnings
      const modal = document.createElement('div');
      modal.className = 'modal deploy-success-modal';
      const h = document.createElement('h3');
      h.dataset.role = 'title';
      modal.appendChild(h);
      const sub = document.createElement('p');
      sub.className = 'modal-sub';
      sub.dataset.role = 'sub';
      modal.appendChild(sub);
      const ulOk = document.createElement('ul');
      ulOk.className = 'ds-list ds-ok';
      ulOk.dataset.role = 'ok';
      modal.appendChild(ulOk);
      const ulKo = document.createElement('ul');
      ulKo.className = 'ds-list ds-ko';
      ulKo.dataset.role = 'ko';
      modal.appendChild(ulKo);
      const actions = document.createElement('div');
      actions.className = 'modal-actions';
      const btnOpen = document.createElement('a');
      btnOpen.className = 'btn btn-primary';
      btnOpen.target = '_blank';
      btnOpen.rel = 'noopener';
      btnOpen.dataset.role = 'open';
      btnOpen.dataset.i18n = 'deploy.success.open';
      actions.appendChild(btnOpen);
      const btnClose = document.createElement('button');
      btnClose.type = 'button';
      btnClose.className = 'btn btn-ghost';
      btnClose.dataset.dsClose = '1';
      btnClose.dataset.i18n = 'deploy.success.close';
      actions.appendChild(btnClose);
      modal.appendChild(actions);
      m.appendChild(modal);
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-ds-close]')) m.classList.remove('open');
      });
      applyLang();
    }
    const isPartial = partial && partial.partial;
    const title = isPartial ? t('deploy.success.title.partial') : t('deploy.success.title');
    m.querySelector('[data-role="title"]').textContent = title;
    let subText = '';
    if (isPartial) {
      subText = t('deploy.success.sub.partial')
        .replace('{deployed}', String(partial.deployed))
        .replace('{total}', String(partial.total))
        .replace('{host}', host);
    } else {
      subText = t('deploy.success.sub')
        .replace('{count}', String(list.length))
        .replace('{host}', host);
    }
    const sub = m.querySelector('[data-role="sub"]');
    sub.textContent = '';
    sub.appendChild(document.createTextNode(subText));
    // OK list (deployed components)
    const ulOk = m.querySelector('[data-role="ok"]');
    ulOk.textContent = '';
    list.forEach(api => {
      const li = document.createElement('li');
      const code = document.createElement('code');
      code.textContent = api;
      li.appendChild(code);
      ulOk.appendChild(li);
    });
    // KO list (failures, only on partial)
    const ulKo = m.querySelector('[data-role="ko"]');
    ulKo.textContent = '';
    if (isPartial && partial.failures && partial.failures.length) {
      partial.failures.forEach(f => {
        const li = document.createElement('li');
        const code = document.createElement('code');
        code.textContent = f.fullName || f.componentName || '?';
        li.appendChild(code);
        const span = document.createElement('span');
        span.textContent = ' — ' + (f.problem || f.problemType || '');
        li.appendChild(span);
        ulKo.appendChild(li);
      });
    }
    // Open button → instance home
    const btnOpen = m.querySelector('[data-role="open"]');
    const cleanInstance = (instanceUrl || '').replace(/\/+$/, '');
    btnOpen.href = cleanInstance + '/lightning/page/home';
    m.classList.add('open');
  }

  // ── Confirm-deploy modal — last chance to abort if the SE is signed in to the wrong org.
  function openConfirmDeploy(host, list, onConfirm) {
    let m = document.getElementById('deploy-confirm');
    if (!m) {
      m = document.createElement('div');
      m.id = 'deploy-confirm';
      m.className = 'modal-mask';
      m.innerHTML = (
        '<div class="modal deploy-confirm-modal">' +
        '<h3 data-i18n="deploy.confirm.title"></h3>' +
        '<p class="modal-sub"><span class="dc-prefix"></span> <strong class="dc-host"></strong></p>' +
        '<ul class="dc-list"></ul>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-dc-cancel data-i18n="deploy.confirm.cancel"></button>' +
        '<button type="button" class="btn btn-primary" data-dc-go data-i18n="deploy.confirm.deploy"></button>' +
        '</div></div>'
      );
      document.body.appendChild(m);
      m.addEventListener('click', (ev) => {
        if (ev.target === m || ev.target.matches('[data-dc-cancel]')) m.classList.remove('open');
      });
      m.querySelector('[data-dc-go]').addEventListener('click', () => {
        m.classList.remove('open');
        const cb = m.__sePending; m.__sePending = null;
        if (typeof cb === 'function') setTimeout(cb, 80);
      });
      applyLang();
    }
    m.querySelector('.dc-prefix').textContent = list.length === 1 ? t('deploy.confirm.body.one') : t('deploy.confirm.body.many');
    m.querySelector('.dc-host').textContent = host;
    const ul = m.querySelector('.dc-list');
    ul.innerHTML = list.map(api => '<li><code>' + api + '</code></li>').join('');
    m.__sePending = onConfirm;
    m.classList.add('open');
  }

  // ── Real deploy: posts components to /api/deploy then polls status.
  let deployInFlight = false;
  async function deployComponents(target) {
    if (deployInFlight) return;
    const list = resolveTargetComponents(target);
    if (!list.length) return;
    if (!auth.isConnected()) {
      // Prompt connect and resume once done.
      openConnectChooser((host) => startOAuth(host, () => deployComponents(target)));
      return;
    }
    // Last-chance confirmation showing the cible host.
    if (!target.dataset.deployConfirmed) {
      const a0 = auth.get();
      const host0 = auth.instanceHost();
      openConfirmDeploy(host0, list, () => {
        target.dataset.deployConfirmed = '1';
        try { deployComponents(target); }
        finally { delete target.dataset.deployConfirmed; }
      });
      return;
    }
    deployInFlight = true;
    const a = auth.get();
    const host = auth.instanceHost();
    const stickyMs = 60000;
    const stickyToast = openStickyToast(t('deploy.progress.preparing'));
    try {
      stickyToast.update(t('deploy.progress.uploading'));
      const r = await auth.fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: a.accessToken, instanceUrl: a.instanceUrl, components: list }),
      });
      const data = await r.json();
      if (!r.ok) {
        stickyToast.close();
        toast(t('deploy.toast.failed') + ' — ' + (data.message || data.error || r.status), 5000);
        return;
      }
      const id = data.deployRequestId;
      stickyToast.update(t('deploy.progress.deploying') + ' (1/' + list.length + ')');
      // Poll status every 2s, up to 120s.
      let tries = 0;
      const result = await new Promise((resolve) => {
        const itv = setInterval(async () => {
          tries++;
          let rr;
          try { rr = await auth.fetch('/api/deploy/status/' + id, { method: 'GET' }); } catch (e) { return; }
          let dd; try { dd = await rr.json(); } catch (e) { dd = {}; }
          if (dd && (dd.numberComponentsDeployed || dd.numberComponentsTotal)) {
            stickyToast.update(t('deploy.progress.deploying') + ' (' + (dd.numberComponentsDeployed || 0) + '/' + (dd.numberComponentsTotal || list.length) + ')');
          }
          if (dd && dd.done) { clearInterval(itv); resolve(dd); return; }
          if (tries > 60) { clearInterval(itv); resolve({ done: true, success: false, status: 'Timeout' }); }
        }, 2000);
      });
      stickyToast.close();
      // Server-side deploy tracking (success/partial/fail). Carries org metadata
      // for the admin dashboard (which SE deployed what to which org).
      const deployTrack = {
        components: list,
        recipeId: target.dataset.bundleId || null,
        targetHost: host,
        sfOrgId: a.orgId || null,
        sfUserId: '', // not stored by auth state
        sfUsername: a.username || a.name || null,
        deployRequestId: data.deployRequestId || null,
        status: result.success ? 'success' : (result.numberComponentsDeployed > 0 ? 'partial' : 'failed'),
        numTotal: result.numberComponentsTotal || list.length,
        numSuccess: result.numberComponentsDeployed || 0,
        sourcePage: window.location.pathname || '/',
      };
      track('deploy', deployTrack);
      if (result.success) {
        openDeploySuccessModal(host, list, a.instanceUrl);
        bumpDownloadCounters(target);
      } else if (result.numberComponentsDeployed > 0) {
        const failures = result.componentFailures || [];
        openDeploySuccessModal(host, list, a.instanceUrl, {
          partial: true,
          deployed: result.numberComponentsDeployed,
          total: result.numberComponentsTotal || list.length,
          failures
        });
      } else {
        const fail = (result.componentFailures && result.componentFailures[0]) || {};
        const msg = fail.problem || fail.fullName || result.status || '';
        toast(t('deploy.toast.failed') + (msg ? ' — ' + msg : ''), 8000);
      }
    } catch (err) {
      stickyToast.close();
      toast(t('deploy.toast.failed') + ' — ' + (err.message || err), 5000);
    } finally {
      deployInFlight = false;
    }
  }

  // Persistent toast (no auto-dismiss) for in-flight progress.
  function openStickyToast(initialMsg) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toast-host';
      document.body.appendChild(toastHost);
    }
    const el = document.createElement('div');
    el.className = 'toast toast-sticky';
    el.textContent = initialMsg;
    toastHost.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    return {
      update(msg) { el.textContent = msg; },
      close() { el.classList.remove('show'); setTimeout(() => el.remove(), 250); },
    };
  }

  // ── Showcase live — opens a frontdoor.jsp URL in a new tab (read-only bot user).
  // The URL is short-lived and minted by the backend on each click.
  let showcaseInFlight = false;
  function openShowcaseLive(target) {
    if (showcaseInFlight) return;
    showcaseInFlight = true;
    // Open the tab synchronously to keep the user-gesture context (avoids popup
    // blockers). We fill its location after the fetch resolves.
    const tab = window.open('about:blank', '_blank');
    if (tab) {
      try {
        tab.document.title = 'SE FR Showcase — chargement…';
        tab.document.body.style.cssText = 'background:#0a0e2a;color:#e6e9ff;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0';
        const wrap = tab.document.createElement('div');
        wrap.style.textAlign = 'center';
        const icon = tab.document.createElement('div');
        icon.style.cssText = 'font-size:42px;margin-bottom:12px';
        icon.textContent = '🚀';
        const label = tab.document.createElement('div');
        label.textContent = 'Chargement de l’org showcase…';
        wrap.appendChild(icon); wrap.appendChild(label);
        tab.document.body.appendChild(wrap);
      } catch (e) { /* same-origin restrictions are fine to ignore */ }
    }
    fetch('/api/showcase/url').then(r => r.json().then(j => ({ ok: r.ok, j }))).then(({ ok, j }) => {
      showcaseInFlight = false;
      if (!ok || !j.url) {
        if (tab) { try { tab.close(); } catch (e) {} }
        const code = (j && j.error) || 'unknown';
        toast(t('showcase.toast.failed') + ' — ' + code, 5000);
        return;
      }
      if (tab) { tab.location = j.url; }
      else {
        // Popup got blocked — fall back to a plain navigation in the current tab.
        toast(t('showcase.toast.popupblocked'), 3500);
        setTimeout(() => { window.location.href = j.url; }, 800);
      }
    }).catch(() => {
      showcaseInFlight = false;
      if (tab) { try { tab.close(); } catch (e) {} }
      toast(t('showcase.toast.failed'), 5000);
    });
  }

  // ── Mock buttons handler (now real for connect/deploy/download)
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-mock]');
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    const kind = target.dataset.mock;

    if (kind === 'connect') {
      if (auth.isConnected()) { openConnectMenu(target); }
      else { openConnectChooser((host) => startOAuth(host)); }
      return;
    }
    if (kind === 'showcase') { openShowcaseLive(target); return; }
    if (kind === 'submit' || kind === 'submit-component') { openSubmitComponentModal(); return; }
    if (kind === 'feedback') { openFeedbackModal(); return; }
    if (kind === 'contact') { openContactModal(); return; }

    if (kind === 'download') {
      const go = () => downloadComponents(target);
      if (isTracked()) go(); else openTrackingModal(go);
      return;
    }
    if (kind === 'deploy' || kind === 'deploy-bundle' || kind === 'deploy-all') {
      const go = () => deployComponents(target);
      if (isTracked()) go(); else openTrackingModal(go);
      return;
    }
    // Default fallthrough — keep behaviour for any future data-mock kind
    bumpDownloadCounters(target);
  });

  // ── Language switcher
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang-btn]');
    if (!b) return;
    e.preventDefault();
    setLang(b.dataset.langBtn);
  });

  // ── Agent widget mock
  const agentBtn = document.querySelector('.agent-button');
  if (agentBtn) {
    let panel = null;
    agentBtn.addEventListener('click', () => {
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'agent-panel';
        panel.innerHTML = '<button class="close">×</button><h4 data-i18n="agent.title"></h4><p data-i18n="agent.body"></p><p style="font-size:11.5px; color:var(--text-muted)" data-i18n="agent.examples"></p>';
        document.body.appendChild(panel);
        panel.querySelector('.close').addEventListener('click', () => panel.classList.remove('open'));
        applyLang();
      }
      panel.classList.toggle('open');
    });
  }

  // ── Cmd+K search
  const cmdkBtn = document.querySelector('.cmd-k');
  if (cmdkBtn && window.__SE_INDEX) {
    let modal = null, input = null, list = null, idx = 0, current = [];
    function openSearch() {
      if (!modal) buildSearch();
      modal.classList.add('open');
      input.value = '';
      idx = 0;
      render('');
      setTimeout(() => input.focus(), 30);
    }
    function buildSearch() {
      modal = document.createElement('div');
      modal.className = 'search-modal';
      modal.innerHTML = '<div class="search-box"><input data-i18n-placeholder="search.placeholder"><div class="search-results"></div></div>';
      document.body.appendChild(modal);
      input = modal.querySelector('input');
      list = modal.querySelector('.search-results');
      applyLang();
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
      input.addEventListener('input', () => { idx = 0; render(input.value); });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modal.classList.remove('open');
        else if (e.key === 'Enter') current[idx] && (window.location = current[idx].href);
        else if (e.key === 'ArrowDown') { idx = Math.min(idx + 1, current.length - 1); refreshActive(); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { idx = Math.max(idx - 1, 0); refreshActive(); e.preventDefault(); }
      });
    }
    function render(q) {
      q = q.trim().toLowerCase();
      const all = window.__SE_ACTIVE_INDEX || window.__SE_INDEX;
      current = q ? all.filter(x => x.haystack.includes(q)).slice(0, 12) : all.slice(0, 12);
      if (!current.length) {
        list.innerHTML = '<div class="search-empty">' + t('search.empty') + '</div>';
        return;
      }
      list.innerHTML = current.map((x, i) =>
        `<a class="search-result${i===idx?' active':''}" href="${x.href}"><span class="name">${x.name}</span><span class="api">${x.api}</span><div class="tagline">${x.tagline||''}</div></a>`
      ).join('');
    }
    function refreshActive() {
      list.querySelectorAll('.search-result').forEach((el, i) => el.classList.toggle('active', i === idx));
    }
    cmdkBtn.addEventListener('click', openSearch);
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    });
  }

  // ── Components page filters
  const filterBar = document.querySelector('.filter-bar');
  const grid = document.querySelector('.components-grid-host');
  if (filterBar && grid) {
    const allCards = Array.from(grid.querySelectorAll('.card'));
    const allSections = Array.from(grid.querySelectorAll('h2.section-title'));
    const counter = filterBar.querySelector('.results-count');
    const totalEl = counter && counter.querySelector('.results-of');
    // Cards are duplicated per category (a multi-cat component appears
    // in each of its categories), so dedup by data-api for accurate
    // counts in the badge.
    const uniqueApis = new Set(allCards.map(c => c.dataset.api).filter(Boolean));
    const totalUnique = uniqueApis.size;
    const state = { category: '', persona: '', surface: '', dataMode: '', q: '' };

    filterBar.addEventListener('click', (e) => {
      const p = e.target.closest('.filter-dd-panel button[data-group]');
      if (!p) return;
      const group = p.dataset.group;
      const value = p.dataset.value || '';
      const dd = p.closest('.filter-dd');
      const summary = dd && dd.querySelector('summary');
      const groupBtns = filterBar.querySelectorAll('.filter-dd-panel button[data-group="' + group + '"]');
      groupBtns.forEach(x => x.classList.toggle('active', x === p));
      // Update summary label
      if (summary) {
        const valEl = summary.querySelector('.dd-value');
        if (valEl) {
          const lang = (typeof getLang === 'function') ? getLang() : 'fr';
          const lbl = (lang === 'en' && p.dataset.labelEn) ? p.dataset.labelEn : (p.dataset.label || '');
          valEl.textContent = lbl;
          valEl.setAttribute('data-i18n-pair', JSON.stringify({fr: p.dataset.label || '', en: p.dataset.labelEn || p.dataset.label || ''}).replace(/'/g, '&#39;'));
        }
        dd.classList.toggle('has-active', !!value);
      }
      state[group] = value;
      // Close the dropdown
      if (dd) dd.open = false;
      apply();
    });
    // Close any open dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target.closest('.filter-dd')) return;
      filterBar.querySelectorAll('.filter-dd[open]').forEach(d => d.open = false);
    });
    // Mutually exclusive: opening one dropdown closes the others.
    filterBar.querySelectorAll('.filter-dd').forEach(dd => {
      dd.addEventListener('toggle', () => {
        if (!dd.open) return;
        filterBar.querySelectorAll('.filter-dd[open]').forEach(other => {
          if (other !== dd) other.open = false;
        });
      });
    });

    function apply() {
      const q = (state.q || '').toLowerCase();
      const visibleApis = new Set();
      allCards.forEach(c => {
        const personas = (c.dataset.personas || '').split('|');
        const surfaces = (c.dataset.surfaces || '').split('|');
        const cats = (c.dataset.categories || '').split('|');
        const dm = c.dataset.datamode || '';
        const haystack = (c.dataset.haystack || '').toLowerCase();
        let show = true;
        if (state.category && !cats.includes(state.category)) show = false;
        if (show && state.persona && !personas.includes(state.persona)) show = false;
        if (show && state.surface && !surfaces.includes(state.surface)) show = false;
        if (show && state.dataMode && dm !== state.dataMode) show = false;
        if (show && q && !haystack.includes(q)) show = false;
        c.style.display = show ? '' : 'none';
        if (show && c.dataset.api) visibleApis.add(c.dataset.api);
      });
      const visible = visibleApis.size;
      allSections.forEach(h => {
        const gridEl = h.nextElementSibling;
        if (!gridEl) return;
        const sectionCat = h.dataset.category || '';
        const visibleCards = Array.from(gridEl.querySelectorAll('.card')).filter(c => c.style.display !== 'none');
        // If a category filter is active, only the matching section stays visible.
        const matchesCatFilter = !state.category || state.category === sectionCat;
        const showSection = matchesCatFilter && visibleCards.length > 0;
        h.style.display = showSection ? '' : 'none';
        gridEl.style.display = showSection ? '' : 'none';
        // Hide non-matching cards within this section so the count reflects reality
        // even though they remain in the DOM (multi-category components are duplicated).
        if (!matchesCatFilter) {
          gridEl.querySelectorAll('.card').forEach(c => { c.style.display = 'none'; });
        }
        // Update the count badge
        const cnt = h.querySelector('.count');
        if (cnt) {
          const n = matchesCatFilter ? visibleCards.length : 0;
          const lang = (typeof getLang === 'function') ? getLang() : 'fr';
          cnt.textContent = (lang === 'fr')
            ? `${n} composant${n === 1 ? '' : 's'}`
            : `${n} component${n === 1 ? '' : 's'}`;
        }
      });
      if (counter) {
        const strong = counter.querySelector('strong');
        if (strong) strong.textContent = visible;
        // Patch the trailing "/ N affichés" / "/ N shown" so it matches
        // the unique count even after the i18n switch.
        if (totalEl) {
          const lang = (typeof getLang === 'function') ? getLang() : 'fr';
          totalEl.textContent = (lang === 'fr')
            ? `/ ${totalUnique} affichés`
            : `/ ${totalUnique} shown`;
        }
      }
    }
    apply();
  }

  // ── Cart for multi-select on the components page
  const cart = document.querySelector('.cart');
  if (cart) {
    const selected = new Set();
    function refresh() {
      cart.classList.toggle('hidden', selected.size === 0);
      const c = cart.querySelector('.cart-count strong');
      if (c) c.textContent = selected.size;
      const csv = Array.from(selected).join(',');
      cart.dataset.selectedApis = csv;
      // Propagate the selected apiNames + count onto every action button so
      // resolveTargetComponents() / bumpDownloadCounters() see them.
      cart.querySelectorAll('[data-mock="deploy-bundle"], [data-mock="download"]').forEach(btn => {
        btn.dataset.count = selected.size;
        btn.dataset.bundleMembers = csv;
      });
    }
    document.addEventListener('click', (e) => {
      const cb = e.target.closest('.card-checkbox');
      if (!cb) return;
      e.preventDefault();
      e.stopPropagation();
      const card = cb.closest('.card');
      if (!card) return;
      const api = card.dataset.api;
      if (selected.has(api)) {
        selected.delete(api);
        card.classList.remove('selected');
      } else {
        selected.add(api);
        card.classList.add('selected');
      }
      refresh();
    });
    refresh();
  }

  // ── Preview carousel (component detail page)
  document.querySelectorAll('.preview-carousel').forEach(car => {
    const slides = Array.from(car.querySelectorAll('.preview-slide'));
    const dots = Array.from(car.querySelectorAll('.preview-dot'));
    const prev = car.querySelector('.preview-arrow.prev');
    const next = car.querySelector('.preview-arrow.next');
    let i = 0;
    function show(idx) {
      i = (idx + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('active', k === i));
      dots.forEach((d, k) => d.classList.toggle('active', k === i));
    }
    if (prev) prev.addEventListener('click', () => show(i - 1));
    if (next) next.addEventListener('click', () => show(i + 1));
    dots.forEach((d, k) => d.addEventListener('click', () => show(k)));
  });

  // ── Lightbox — click any preview image to zoom full-screen + nav across siblings
  let lightbox = null;
  let lbImages = [];
  let lbIndex = 0;
  function buildLightbox() {
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML =
      '<div class="lightbox-counter" aria-live="polite"></div>' +
      '<button class="lightbox-nav prev" aria-label="Previous">‹</button>' +
      '<img alt="">' +
      '<button class="lightbox-nav next" aria-label="Next">›</button>' +
      '<div class="lightbox-dots" role="tablist"></div>' +
      '<button class="lightbox-close" aria-label="Close">×</button>';
    document.body.appendChild(lightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
      else if (e.target.classList.contains('lightbox-close')) closeLightbox();
      else if (e.target.classList.contains('prev')) showLb(lbIndex - 1);
      else if (e.target.classList.contains('next')) showLb(lbIndex + 1);
      else if (e.target.matches('.lightbox-dots button')) {
        const k = Number(e.target.dataset.k); if (!Number.isNaN(k)) showLb(k);
      }
    });
  }
  function showLb(i) {
    if (!lbImages.length) return;
    lbIndex = (i + lbImages.length) % lbImages.length;
    const item = lbImages[lbIndex];
    const img = lightbox.querySelector('img');
    img.src = item.src; img.alt = item.alt || '';
    const multi = lbImages.length > 1;
    lightbox.querySelector('.prev').hidden = !multi;
    lightbox.querySelector('.next').hidden = !multi;
    const counter = lightbox.querySelector('.lightbox-counter');
    counter.hidden = !multi;
    if (multi) counter.textContent = (lbIndex + 1) + ' / ' + lbImages.length;
    const dots = lightbox.querySelector('.lightbox-dots');
    dots.hidden = !multi;
    if (multi && dots.children.length !== lbImages.length) {
      dots.innerHTML = lbImages.map((_, k) => '<button data-k="' + k + '" aria-label="Go to ' + (k+1) + '"></button>').join('');
    }
    if (multi) {
      Array.from(dots.children).forEach((b, k) => b.classList.toggle('active', k === lbIndex));
    }
  }
  function openLightbox(siblings, startIndex) {
    if (!lightbox) buildLightbox();
    lbImages = siblings;
    showLb(startIndex || 0);
    requestAnimationFrame(() => lightbox.classList.add('open'));
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.addEventListener('click', (e) => {
    const img = e.target.closest('.preview-large.preview-image img, .preview-slide img');
    if (!img) return;
    e.preventDefault();
    // Build the sibling list from the parent .preview-large (carousel = many slides, single = 1 image)
    const parent = img.closest('.preview-large');
    let siblings = [];
    let start = 0;
    if (parent && parent.classList.contains('preview-carousel')) {
      const slides = Array.from(parent.querySelectorAll('.preview-slide img'));
      siblings = slides.map(s => ({ src: s.src, alt: s.alt }));
      start = slides.indexOf(img);
      if (start < 0) start = 0;
    } else {
      siblings = [{ src: img.src, alt: img.alt }];
    }
    openLightbox(siblings, start);
  });
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
    else if (e.key === 'ArrowRight') showLb(lbIndex + 1);
  });

  // ── Social counters: stable per-id base values + localStorage deltas (downloads + likes)
  const COUNTS_KEY = 'se_fr_counts_v1';
  const LIKES_KEY = 'se_fr_likes_v1';
  function loadCounts() { try { return JSON.parse(localStorage.getItem(COUNTS_KEY) || '{}'); } catch (_) { return {}; } }
  function saveCounts(c) { try { localStorage.setItem(COUNTS_KEY, JSON.stringify(c)); } catch (_) {} }
  function loadLikedSet() { try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || '[]')); } catch (_) { return new Set(); } }
  function saveLikedSet(s) { try { localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(s))); } catch (_) {} }
  function fmtCount(n) {
    if (n >= 10000) return Math.floor(n / 1000) + 'k';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\\.0$/, '') + 'k';
    return String(n);
  }
  function applyCountsTo(scope) {
    const counts = loadCounts();
    const liked = loadLikedSet();
    (scope || document).querySelectorAll('[data-stats-for]').forEach(el => {
      const id = el.dataset.statsFor;
      const host = id.startsWith('recipe-')
        ? document.querySelector('.recipe-card[id="' + id.slice('recipe-'.length) + '"]')
        : document.querySelector('[data-api="' + id + '"]') || el.closest('[data-base-dl]');
      const baseDl = host ? Number(host.dataset.baseDl || 0) : 0;
      const baseLk = host ? Number(host.dataset.baseLk || 0) : 0;
      const c = counts[id] || {};
      const dl = baseDl + (c.dl || 0);
      const lk = baseLk + (c.lk || 0);
      const dlEl = el.querySelector('.dl-count');
      const lkEl = el.querySelector('.lk-count');
      if (dlEl) dlEl.textContent = fmtCount(dl);
      if (lkEl) lkEl.textContent = fmtCount(lk);
      const btn = el.querySelector('.like-btn');
      if (btn) {
        const isLiked = liked.has(id);
        btn.classList.toggle('liked', isLiked);
        btn.setAttribute('aria-pressed', isLiked ? 'true' : 'false');
        const ic = btn.querySelector('.icon');
        if (ic) ic.textContent = isLiked ? '♥' : '♡';
      }
    });
  }
  function bumpDownload(id) {
    if (!id) return;
    const counts = loadCounts();
    counts[id] = counts[id] || {};
    counts[id].dl = (counts[id].dl || 0) + 1;
    saveCounts(counts);
    applyCountsTo();
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.like-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const id = btn.dataset.likeFor;
    if (!id) return;
    const liked = loadLikedSet();
    const counts = loadCounts();
    counts[id] = counts[id] || {};
    if (liked.has(id)) {
      liked.delete(id);
      counts[id].lk = (counts[id].lk || 0) - 1;
    } else {
      liked.add(id);
      counts[id].lk = (counts[id].lk || 0) + 1;
      btn.classList.remove('bump');
      void btn.offsetWidth;
      btn.classList.add('bump');
    }
    saveLikedSet(liked);
    saveCounts(counts);
    applyCountsTo();
  });
  applyCountsTo();

  // ── Page transitions — fade-in only, on arrival. No fade-out before unload (would leave a
  // white gap during load). The smooth feel comes entirely from pageInitialFade on body.
  // @view-transition CSS gives a true cross-doc fade on the rare browsers that ship it.

  // ── Back-to-top
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a.back-to-top');
    if (!a) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ── Docs scrollspy — highlight the side-nav link matching the section in view
  const docsSide = document.querySelector('.docs-side');
  const docsMain = document.querySelector('.docs-main');
  if (docsSide && docsMain && 'IntersectionObserver' in window) {
    const sectionEls = Array.from(docsMain.querySelectorAll('h2[id]'));
    const linkById = new Map();
    docsSide.querySelectorAll('a[href*="#"]').forEach(a => {
      const hash = a.getAttribute('href').split('#')[1];
      if (hash) linkById.set(hash, a);
    });
    if (sectionEls.length) {
      const visible = new Set();
      const setActive = (id) => {
        docsSide.querySelectorAll('a.active').forEach(a => a.classList.remove('active'));
        const link = linkById.get(id);
        if (link) link.classList.add('active');
      };
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (en.isIntersecting) visible.add(en.target.id);
          else visible.delete(en.target.id);
        });
        // Pick the first section currently visible (closest to top)
        const first = sectionEls.find(s => visible.has(s.id));
        if (first) setActive(first.id);
      }, { rootMargin: '-90px 0px -60% 0px', threshold: 0 });
      sectionEls.forEach(s => obs.observe(s));
      // Default to first section on load
      setActive(sectionEls[0].id);
    }
  }

  // Init i18n on page load
  applyLang();
})();
"""


# ----------------------------------------------------------------------
# Shared partials
# ----------------------------------------------------------------------
NAV_LINKS = [
    ("index.html", {"fr": "Accueil", "en": "Home"}, "home"),
    ("components.html", {"fr": "Composants", "en": "Components"}, "components"),
    ("cookbook.html", {"fr": "Cookbook", "en": "Cookbook"}, "cookbook"),
    ("docs.html", {"fr": "Docs", "en": "Docs"}, "docs"),
    ("whats-new.html", {"fr": "Nouveautés", "en": "What’s new"}, "whats-new"),
    ("about.html", {"fr": "À propos", "en": "About"}, "about"),
]


def nav_html(active: str, base: str = "") -> str:
    def _pair_attr(labels: dict) -> str:
        s = json.dumps(labels, ensure_ascii=False).replace("'", "&#39;")
        return f"data-i18n-pair='{s}'"
    nav_items = "".join(
        f'<a href="{base}{href}" class="{ "active" if key == active else ""}" {_pair_attr(labels)}>{labels["fr"]}</a>'
        for href, labels, key in NAV_LINKS
    )
    return f"""<nav class="nav">
  <div class="nav-inner">
    <a class="logo" href="{base}index.html">
      <img src="{base}assets/logo-sefr.png" alt="Salesforce SE FR">
      <span>LWC Library</span>
    </a>
    <div class="nav-links">{nav_items}</div>
    <div class="nav-spacer"></div>
    <div class="lang-switch" role="group" aria-label="Language">
      <button type="button" data-lang-btn="fr" class="active">FR</button>
      <button type="button" data-lang-btn="en">EN</button>
    </div>
    <button class="cmd-k" type="button"><span>🔍</span><span data-i18n-placeholder="search.placeholder">Rechercher…</span><span class="kbd">⌘K</span></button>
    <button class="btn btn-ghost btn-sm" type="button" data-mock="showcase" data-i18n="showcase.btn">🚀 Voir en live</button>
    <button class="btn btn-primary" type="button" data-mock="connect" data-i18n="connect.btn">↗ Connecter à mon org</button>
  </div>
</nav>"""


def footer_html(component_count: int, base: str = "") -> str:
    # Localised compact dates: FR = JJ/MM/AAAA, EN = MM/DD/YYYY
    today_fr = "08/05/2026"
    today_en = "05/08/2026"
    def pair(fr: str, en: str) -> str:
        s = json.dumps({"fr": fr, "en": en}, ensure_ascii=False).replace("'", "&#39;")
        return f"data-i18n-pair='{s}'"
    p_whatsnew = pair("Nouveautés", "What’s new")
    p_contributors = pair("Contributeurs", "Contributors")
    return f"""<footer>
  <div class="footer-inner">
    <div class="footer-brand">
      <div class="logos"><img src="{base}assets/logo-library.png" alt="LWC Library"><img src="{base}assets/logo-sefr.png" alt="Salesforce SE FR"></div>
      <p {pair('Une librairie de Lightning Web Components<br>faite par et pour les Solution Engineers 🇫🇷', 'A library of Lightning Web Components<br>built by &amp; for French Solution Engineers 🇫🇷')}>Une librairie de Lightning Web Components<br>faite par et pour les Solution Engineers 🇫🇷</p>
      <div class="footer-copy">© 2026 Solution Engineering France</div>
    </div>
    <div class="footer-col">
      <h4 {pair('Bibliothèque', 'Library')}>Bibliothèque</h4>
      <ul>
        <li><a href="{base}about.html" {pair('À propos', 'About')}>À propos</a></li>
        <li><a href="{base}components.html" {pair('Composants', 'Components')}>Composants</a></li>
        <li><a href="{base}cookbook.html">Cookbook</a></li>
        <li><a href="{base}contributors.html" {p_contributors}>Contributeurs</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Docs</h4>
      <ul>
        <li><a href="{base}docs.html#install" {pair('Installation', 'Install')}>Installation</a></li>
        <li><a href="{base}docs.html#bilingual" {pair('Configuration', 'Configure')}>Configuration</a></li>
        <li><a href="{base}whats-new.html" {pair('Releases', 'Releases')}>Releases</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4 {pair('Contribuer', 'Contribute')}>Contribuer</h4>
      <ul>
        <li><a href="#" data-mock="submit" {pair('Soumettre un composant', 'Submit a component')}>Soumettre un composant</a></li>
        <li><a href="#" data-mock="feedback" {pair('Partager un feedback', 'Share feedback')}>Partager un feedback</a></li>
        <li><a href="#" data-mock="contact" {pair('Contact', 'Contact')}>Contact</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4 {pair('État', 'Status')}>État</h4>
      <ul>
        <li><span class="pulse-badge"><span class="pulse-dot"></span><span {pair('En ligne', 'Live')}>En ligne</span></span></li>
        <li><span {pair('Mis à jour :', 'Updated:')}>Mis à jour :</span> <span {pair(today_fr, today_en)}>{today_fr}</span></li>
        <li>{component_count} <span {pair('composants actifs', 'components active')}>composants actifs</span></li>
      </ul>
    </div>
  </div>
</footer>"""


def agent_html() -> str:
    return """<div class="agent">
  <button class="agent-button" type="button"><span class="agent-icon">💬</span><span data-i18n="agent.btn">Demander à l'agent</span></button>
</div>"""


def back_to_top_html() -> str:
    """Inline 'back to top' link rendered above the footer, after every page's content."""
    return """<div class="back-to-top-wrap">
  <a href="#top" class="back-to-top" data-i18n-pair='{"fr":"↑ Haut de page","en":"↑ Back to top"}'>↑ Haut de page</a>
</div>"""


_GLOBAL_I18N: dict = {}
_GLOBAL_INDEX_FR: list = []
_GLOBAL_PREVIEWS: dict[str, list[str]] = {}


def html_shell(title: str, body: str, *, active: str, base: str = "", component_count: int, search_index: list[dict] | None = None, head_extra: str = "") -> str:
    scripts: list[str] = []
    if search_index is not None:
        scripts.append(f"window.__SE_INDEX = {json.dumps(search_index, ensure_ascii=False)};")
    if _GLOBAL_INDEX_FR:
        scripts.append(f"window.__SE_INDEX_FR = {json.dumps(_GLOBAL_INDEX_FR, ensure_ascii=False)};")
    if _GLOBAL_I18N:
        scripts.append(f"window.__SE_I18N = {json.dumps(_GLOBAL_I18N, ensure_ascii=False)};")
    inline = f"<script>{''.join(scripts)}</script>" if scripts else ""
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html_lib.escape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap">
<link rel="stylesheet" href="{base}assets/site.css">
{head_extra}
<script>
// Inject a brand-coloured veil over the page on every navigation, fade it out on ready.
// The body starts hidden (opacity:0 in CSS); revealing it lets the content appear from behind the veil.
function __seInjectVeil() {{
  if (document.querySelector('.page-veil')) return;
  var veil = document.createElement('div');
  veil.className = 'page-veil';
  (document.body || document.documentElement).insertBefore(veil, (document.body || document.documentElement).firstChild);
  veil.addEventListener('transitionend', function() {{ veil.classList.add('gone'); }});
}}
if (document.body) __seInjectVeil();
else document.addEventListener('DOMContentLoaded', __seInjectVeil, {{ once: true }});
document.addEventListener('DOMContentLoaded', function() {{
  document.body.classList.add('page-ready');
}});
window.addEventListener('pageshow', function() {{
  __seInjectVeil();
  document.body.classList.add('page-ready');
  var v = document.querySelector('.page-veil');
  if (v) v.classList.add('gone');
}});
</script>
</head>
<body>
{nav_html(active, base)}
{body}
{back_to_top_html()}
{footer_html(component_count, base)}
{agent_html()}
{inline}
<script src="{base}assets/site.js" defer></script>
</body>
</html>
"""


# ----------------------------------------------------------------------
# Card rendering
# ----------------------------------------------------------------------
def initials(api: str) -> str:
    """Take the part after seFr and produce 2 initials."""
    name = api.replace("seFr", "")
    parts = re.findall(r"[A-Z][a-z]*", name) or [name]
    if len(parts) >= 2:
        return (parts[0][:1] + parts[1][:1]).upper()
    return name[:2].upper()


def preview_for(api: str, *, base: str) -> tuple[str, str]:
    """Return (card_html, detail_html) for an apiName.
    `base` is the path prefix from the rendering page (`""` for index/components,
    `"../"` for component detail pages).
    Card uses the first non-GIF (static) image; detail leads with the GIF if present,
    then static images."""
    files = _GLOBAL_PREVIEWS.get(api) or []
    if not files:
        # Placeholder fallback — initials over a brand gradient.
        card = f'<div class="card-preview-mock">{initials(api)}</div>'
        detail = f'<div class="preview-large">{initials(api)}</div>'
        return card, detail

    statics = [f for f in files if not f.lower().endswith('.gif')]
    # Detail order: keep the natural -N order from the source filenames (no reshuffle).
    detail_files = list(files)
    # Card preview: first static if any (avoids autoplay on listing pages); else fall back to whatever's there.
    card_primary = (statics or files)[0]
    is_gif_card = card_primary.lower().endswith('.gif')
    gif_badge = '<span class="gif-badge">▶ GIF</span>' if is_gif_card else ""
    card = (
        f'<img class="card-preview-img" src="{base}assets/previews/{card_primary}" '
        f'alt="{api} preview" loading="lazy">'
        f'{gif_badge}'
    )

    # ── Detail preview = single image OR carousel if >1
    files = detail_files
    if len(files) == 1:
        f0 = files[0]
        detail = (
            f'<div class="preview-large preview-image">'
            f'<img src="{base}assets/previews/{f0}" alt="{api}">'
            f'</div>'
        )
    else:
        slides = "".join(
            f'<div class="preview-slide{" active" if i == 0 else ""}" data-idx="{i}">'
            f'<img src="{base}assets/previews/{f}" alt="{api} variant {i+1}" loading="lazy">'
            f'</div>'
            for i, f in enumerate(files)
        )
        dots = "".join(
            f'<button class="preview-dot{" active" if i == 0 else ""}" '
            f'data-idx="{i}" aria-label="View {i+1}"></button>'
            for i in range(len(files))
        )
        detail = (
            f'<div class="preview-large preview-carousel" data-count="{len(files)}">'
            f'{slides}'
            f'<button class="preview-arrow prev" aria-label="Previous">‹</button>'
            f'<button class="preview-arrow next" aria-label="Next">›</button>'
            f'<div class="preview-dots">{dots}</div>'
            f'</div>'
        )
    return card, detail


def persona_chip(p: str) -> str:
    emoji, label, cls = PERSONA_LABEL.get(p, ("", p, ""))
    return f'<span class="chip {cls}">{emoji} {html_lib.escape(label)}</span>'


def card_html(c: dict, *, base: str, with_checkbox: bool = False, with_link: bool = True) -> str:
    api = c["apiName"]
    name = (c.get("masterLabel") or api).replace("SE FR - ", "").strip()
    rs = c.get("releaseStatus", "stable")
    status = "● Stable" if rs == "stable" else "✨ New"
    status_cls = "stable" if rs == "stable" else "new"
    is_ai = "Agentforce & AI" in (c.get("categories") or [])
    ai_badge = '<span class="card-status ai">🤖 AI-ready</span>' if is_ai else ""
    chip_personas = (c.get("personas") or [])[:2]
    chip_html = "".join(persona_chip(p) for p in chip_personas)
    haystack = " ".join([api, name, c.get("tagline", "")] + chip_personas + (c.get("chips") or [])).lower()
    cb = '<div class="card-checkbox"></div>' if with_checkbox else ""
    extra_cls = " has-checkbox-slot" if with_checkbox else ""
    card_preview, _ = preview_for(api, base=base)
    has_image_cls = " has-image" if _GLOBAL_PREVIEWS.get(api) else ""
    dl, lk = seeded_counts(api, c.get("featuredRank"))
    # The whole preview area is the only clickable surface for navigation —
    # title/tagline/footer below stay neutral so checkbox + like don't compete with the link.
    preview_open = f'<a class="card-preview-link" href="{base}components/{api}.html"' if with_link else '<div class="card-preview-link"'
    preview_close = '</a>' if with_link else '</div>'
    return f"""<article class="card{extra_cls}"
  data-api="{api}"
  data-personas="{html_lib.escape('|'.join(c.get('personas', [])), quote=True)}"
  data-surfaces="{html_lib.escape('|'.join(c.get('surfaces', [])), quote=True)}"
  data-categories="{html_lib.escape('|'.join(c.get('categories', [])), quote=True)}"
  data-datamode="{c.get('dataMode','mock')}"
  data-base-dl="{dl}"
  data-base-lk="{lk}"
  data-haystack="{html_lib.escape(haystack, quote=True)}">
  {cb}
  {preview_open}>
    <div class="card-preview{has_image_cls}">
      <span class="card-status {status_cls}">{status}</span>
      {ai_badge}
      {card_preview}
    </div>
  {preview_close}
  <div class="card-body">
    <div class="card-title">
      <span class="card-name">{html_lib.escape(name)}</span>
      <span class="card-api">{api}</span>
    </div>
    <p class="card-tagline" data-i18n-comp="{api}.tagline">{html_lib.escape(c.get('tagline','') or '')}</p>
    <div class="card-foot">
      <div class="chips">{chip_html}</div>
      <div class="card-stats" data-stats-for="{api}">
        <span class="stat-pill" title="Downloads"><span class="icon">⬇</span><span class="dl-count">{fmt_count(dl)}</span></span>
        <button type="button" class="like-btn" data-like-for="{api}" aria-pressed="false" title="Like"><span class="icon">♡</span><span class="lk-count">{fmt_count(lk)}</span></button>
      </div>
    </div>
  </div>
</article>"""


# ----------------------------------------------------------------------
# PAGE: index.html
# ----------------------------------------------------------------------
def render_index(components: list[dict], recipes: list[dict], n_components: int, search_index: list[dict]) -> str:
    # Featured ordered by featuredRank (set in each component's frontmatter).
    # Components without rank fall back to alpha order at the end.
    featured = sorted(
        [c for c in components if c.get("featured")],
        key=lambda x: (x.get("featuredRank") if x.get("featuredRank") is not None else 999, x["apiName"])
    )
    if len(featured) < 3:
        featured = sorted(components, key=lambda x: x["apiName"])[:12]
    mobile_count = sum(1 for c in components if c.get("mobileReady"))
    by_api = {c["apiName"]: c for c in components}

    featured_cards = "\n".join(card_html(c, base="") for c in featured[:12])

    def pair_attr(fr: str, en: str) -> str:
        s = json.dumps({"fr": fr, "en": en}, ensure_ascii=False).replace("'", "&#39;")
        return f"data-i18n-pair='{s}'"

    def human_name(api: str) -> str:
        c = by_api.get(api)
        if not c:
            return api
        return (c.get("masterLabel") or api).replace("SE FR - ", "").strip()

    recipes_html = ""
    for r in recipes[:4]:
        comps = r.get("components") or []
        if comps == "ALL":
            stack_text_fr = "Les 32 composants"
            stack_text_en = "All 32 components"
        else:
            names = [human_name(a) for a in comps[:4]]
            stack_text_fr = " · ".join(names) + (f" · +{len(comps)-4}" if len(comps) > 4 else "")
            stack_text_en = stack_text_fr
        recipes_html += f"""
      <article class="recipe">
        <span class="recipe-emoji">{r.get('emoji','📦')}</span>
        <h3>{html_lib.escape(r.get('title',''))}</h3>
        <p>{html_lib.escape(r.get('description',''))}</p>
        <div class="recipe-stack-mini" {pair_attr(stack_text_fr, stack_text_en)}>{stack_text_fr}</div>
      </article>"""

    body = f"""<section class="hero">
  <div class="container-narrow">
    <img class="hero-logo" src="assets/logo-library.png" alt="LWC Library">
    <h1 class="hero-title" {pair_attr('Composants Lightning <span class="accent">must-have</span><br>pour vos démos Salesforce', 'Must-have Lightning components<br>for your <span class="accent">Salesforce demos</span>')}></h1>
    <p class="hero-sub" {pair_attr('Une librairie de Lightning Web Components au design soigné et prêts à l’emploi.<br>Choisissez, déployez en quelques secondes, personnalisez dans App Builder.', 'A library of Lightning Web Components with a polished design, ready to use.<br>Pick what you need, deploy in seconds, customize in App Builder.')}></p>
    <div class="hero-cta">
      <a href="components.html" class="btn btn-hero btn-hero-primary" {pair_attr('Parcourir les composants', 'Browse components')}>Parcourir les composants</a>
      <a href="cookbook.html" class="btn btn-hero btn-hero-ghost" {pair_attr('Voir le cookbook', 'See the cookbook')}>Voir le cookbook</a>
    </div>
    <div class="hero-stats">
      <div class="stat stat-1"><div class="num-row"><span class="stat-icon">🧩</span><span class="num">{n_components}</span></div><div class="label" {pair_attr('Composants', 'Components')}>Composants</div></div>
      <div class="stat stat-2"><div class="num-row"><span class="stat-icon">📦</span><span class="num">0</span></div><div class="label" {pair_attr('Dépendance externe', 'External dependency')}>Dépendance externe</div></div>
      <div class="stat stat-3"><div class="num-row"><span class="stat-icon">🌍</span><span class="num">100%</span></div><div class="label" {pair_attr('Bilingue FR / EN', 'Bilingual FR / EN')}>Bilingue FR / EN</div></div>
      <div class="stat stat-4"><div class="num-row"><span class="stat-icon">⚡️</span><span class="num">~30s</span></div><div class="label" {pair_attr('Déploiement', 'To deploy')}>Déploiement</div></div>
    </div>
  </div>
</section>

<section class="block">
  <div class="container">
    <div class="block-head">
      <div>
        <h2 {pair_attr('Composants à la une', 'Featured components')}>Composants à la une</h2>
        <div class="subtitle" {pair_attr('Quelques pépites de la lib pour démarrer.', 'A handful of the most-loved LWCs from the kit.')}>Quelques pépites de la lib pour démarrer.</div>
      </div>
      <a href="components.html" class="see-all" {pair_attr(f'Voir les {n_components} →', f'See all {n_components} →')}>Voir les {n_components} →</a>
    </div>
    <div class="grid">
{featured_cards}
    </div>
  </div>
</section>

<section class="block alt">
  <div class="container">
    <div class="block-head">
      <div>
        <h2 {pair_attr('Cookbook · compositions prêtes à l’emploi', 'Cookbook · ready-made compositions')}>Cookbook · compositions prêtes à l'emploi</h2>
        <div class="subtitle" {pair_attr('Bundles de composants pour les scénarios de démo classiques.', 'Pre-baked component bundles for typical demo scenarios.')}>Bundles de composants pour les scénarios de démo classiques.</div>
      </div>
      <a href="cookbook.html" class="see-all" {pair_attr('Toutes les recettes →', 'All recipes →')}>Toutes les recettes →</a>
    </div>
    <div class="recipes">
{recipes_html}
    </div>
  </div>
</section>

<section class="block home-last">
  <div class="container">
    <div class="block-head">
      <div>
        <h2 {pair_attr('De la sélection à la démo en quelques minutes', 'From browse to live demo in minutes')}>De la sélection à la démo en quelques minutes</h2>
        <div class="subtitle" {pair_attr('Trois étapes. Votre org de démo reste propre.', 'Three steps. Your demo org stays clean.')}>Trois étapes. Votre org de démo reste propre.</div>
      </div>
      <a href="docs.html#install" class="see-all" {pair_attr('Voir toute la doc →', 'See the full docs →')}>Voir toute la doc →</a>
    </div>
    <div class="steps steps-fancy">
      <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
        <linearGradient id="arrow-grad-1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#0176d3"/><stop offset="100%" stop-color="#6b4eff"/></linearGradient>
        <linearGradient id="arrow-grad-2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#6b4eff"/><stop offset="100%" stop-color="#fe9339"/></linearGradient>
      </defs></svg>
      <div class="step v1">
        <div class="step-emoji">🎯</div>
        <div class="step-num">1</div>
        <h3 {pair_attr('Choisir', 'Pick')}>Choisir</h3>
        <p {pair_attr('Filtrez par persona, surface ou data mode. Sélectionnez un ou plusieurs composants à mettre dans votre bundle.', 'Filter by persona, page target or data mode. Pick one or several components to bundle.')}>Filtrez par persona, surface ou data mode. Sélectionnez un ou plusieurs composants à mettre dans votre bundle.</p>
      </div>
      <div class="step-arrow a1" aria-hidden="true">
        <svg viewBox="0 0 56 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 11 C 18 11, 26 4, 42 11 C 50 14, 52 11, 53 11" stroke-width="2.2" stroke-linecap="round" fill="none"/>
          <path d="M48 6 L 54 11 L 48 16" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </div>
      <div class="step v2">
        <div class="step-emoji">🔐</div>
        <div class="step-num">2</div>
        <h3 {pair_attr('Connecter', 'Connect')}>Connecter</h3>
        <p {pair_attr('OAuth dans votre org de démo. Le token reste dans votre session navigateur — rien n’est stocké côté serveur.', 'OAuth into your demo org. Token lives in your browser session only — nothing stored server-side.')}>OAuth dans votre org de démo. Le token reste dans votre session navigateur — rien n'est stocké côté serveur.</p>
      </div>
      <div class="step-arrow a2" aria-hidden="true">
        <svg viewBox="0 0 56 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 11 C 14 18, 22 5, 38 11 C 48 14, 51 11, 53 11" stroke-width="2.2" stroke-linecap="round" fill="none"/>
          <path d="M48 6 L 54 11 L 48 16" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </div>
      <div class="step v3">
        <div class="step-emoji">🚀</div>
        <div class="step-num">3</div>
        <h3 {pair_attr('Déployer', 'Deploy')}>Déployer</h3>
        <p {pair_attr('Les composants atterrissent dans votre org. Glissez-les sur la page voulue dans App Builder, configurez les props, démo prête.', 'Components land in your org. Drag them on the right page in App Builder, configure props, demo-ready.')}>Les composants atterrissent dans votre org. Glissez-les sur la page voulue dans App Builder, configurez les props, démo prête.</p>
      </div>
    </div>

  </div>
</section>"""
    return html_shell("LWC Library SE FR — composants must-have pour vos démos Salesforce", body,
                      active="home", base="", component_count=n_components,
                      search_index=search_index)


# ----------------------------------------------------------------------
# PAGE: components.html (filterable grid grouped by category)
# ----------------------------------------------------------------------
def render_components_page(components: list[dict], n_components: int, search_index: list[dict]) -> str:
    def pair_attr(fr: str, en: str) -> str:
        s = json.dumps({"fr": fr, "en": en}, ensure_ascii=False).replace("'", "&#39;")
        return f"data-i18n-pair='{s}'"
    # Each component appears in at most ONE section — its primary (first) category.
    # Multi-category components used to be duplicated, which made filter results misleading
    # (e.g. Contact Card showing twice when filtering by Hybrid).
    by_cat: dict[str, list[dict]] = {}
    for c in components:
        cats = c.get("categories", []) or []
        primary = cats[0] if cats else "Transverse"
        by_cat.setdefault(primary, []).append(c)

    sections_html = ""
    for cat in CATEGORY_ORDER:
        comps = sorted(by_cat.get(cat, []), key=lambda x: x["apiName"])
        if not comps:
            continue
        n = len(comps)
        sections_html += f"""
  <h2 class="section-title" data-category="{html_lib.escape(cat, quote=True)}">{CATEGORY_EMOJI.get(cat,'')} {html_lib.escape(cat)} <span class="count" data-base-count="{n}" {pair_attr(f'{n} composant{"" if n==1 else "s"}', f'{n} component{"" if n==1 else "s"}')}>{n} composant{"" if n==1 else "s"}</span></h2>
  <div class="grid">
{chr(10).join(card_html(c, base='', with_checkbox=True) for c in comps)}
  </div>"""

    def _dd(group: str, label_fr: str, label_en: str, all_fr: str, all_en: str, items: list[tuple[str, str]]) -> str:
        # items = list of (value, plain_label_text). The display includes the emoji + label as plain text.
        opts = (
            f'<button data-group="{group}" data-value="" '
            f'data-label="{html_lib.escape(all_fr, quote=True)}" '
            f'data-label-en="{html_lib.escape(all_en, quote=True)}" '
            f'class="active" {pair_attr(all_fr, all_en)}>{html_lib.escape(all_fr)}</button>'
        )
        for val, plain in items:
            opts += (
                f'<button data-group="{group}" data-value="{html_lib.escape(val, quote=True)}" '
                f'data-label="{html_lib.escape(plain, quote=True)}" '
                f'data-label-en="{html_lib.escape(plain, quote=True)}">'
                f'{html_lib.escape(plain)}</button>'
            )
        return f"""<details class="filter-dd" data-dd-for="{group}">
      <summary><span class="dd-label" {pair_attr(label_fr, label_en)}>{label_fr}</span><span class="dd-value" {pair_attr(all_fr, all_en)}>{all_fr}</span><span class="dd-chevron">▾</span></summary>
      <div class="filter-dd-panel">{opts}</div>
    </details>"""

    family_items = [(cat, f"{CATEGORY_EMOJI.get(cat,'')} {cat}") for cat in CATEGORY_ORDER]
    persona_items = [(p, f"{PERSONA_LABEL[p][0]} {PERSONA_LABEL[p][1]}") for p in ["Sales", "FieldSales", "Telesales", "Service", "Marketing"]]
    surface_items = [("HomePage", "Home"), ("RecordPage", "Record"), ("AppPage", "App")]
    datamode_items = [("live", "Live"), ("hybrid", "Hybrid"), ("mock", "Mock")]

    dd_family   = _dd("category", "Famille",   "Family",     "Toutes", "All", family_items)
    dd_persona  = _dd("persona",  "Persona",   "Persona",    "Tous",   "All", persona_items)
    dd_surface  = _dd("surface",  "Page",      "Page",       "Toutes", "All", surface_items)
    dd_datamode = _dd("dataMode", "Data mode", "Data mode",  "Tous",   "All", datamode_items)

    body = f"""<div class="container">
  <header class="page-header">
    <h1 {pair_attr('🧩 Composants', '🧩 Components')}>🧩 Composants</h1>
    <div class="subtitle" {pair_attr(f'{n_components} LWC prêts à déployer · choisissez-en un ou plusieurs, puis déployez sur votre org.', f'{n_components} ready-to-deploy LWCs · pick one or bundle multiple, then deploy to your org.')}>{n_components} LWC prêts à déployer · choisissez-en un ou plusieurs, puis déployez sur votre org.</div>
  </header>

  <div class="filter-bar">
    {dd_family}
    {dd_persona}
    {dd_surface}
    {dd_datamode}
    <span class="results-count" style="margin-left:auto"><strong>{n_components}</strong><span class="results-of" {pair_attr(f'/ {n_components} affichés', f'/ {n_components} shown')}>/ {n_components} affichés</span></span>
  </div>

  <div class="components-grid-host">
{sections_html}
  </div>
</div>

<div class="cart hidden">
  <span class="cart-count"><strong>0</strong> components selected</span>
  <span class="cart-divider"></span>
  <button class="btn btn-ghost btn-sm" type="button" data-mock="download">⬇ Download .zip</button>
  <button class="btn btn-primary btn-sm" type="button" data-mock="deploy-bundle" data-count="0">🚀 Deploy to my org</button>
</div>"""
    return html_shell("Components — LWC Library SE FR", body,
                      active="components", base="", component_count=n_components,
                      search_index=search_index)


# ----------------------------------------------------------------------
# PAGE: components/<api>.html
# ----------------------------------------------------------------------
def render_component_detail(c: dict, all_components: list[dict], recipes: list[dict], n_components: int, search_index: list[dict]) -> str:
    def pair_attr(fr: str, en: str) -> str:
        s = json.dumps({"fr": fr, "en": en}, ensure_ascii=False).replace("'", "&#39;")
        return f"data-i18n-pair='{s}'"
    api = c["apiName"]
    name = (c.get("masterLabel") or api).replace("SE FR - ", "").strip()
    primary_cat = (c.get("categories") or ["—"])[0]
    rs = c.get("releaseStatus", "stable")
    is_ai = "Agentforce & AI" in (c.get("categories") or [])
    badges = []
    badges.append(f'<span class="badge {"new" if rs=="new" else "stable"}">{"✨ New" if rs=="new" else "● Stable"}</span>')
    if is_ai:
        badges.append('<span class="badge ai">🤖 AI-ready</span>')
    for p in (c.get("personas") or []):
        emoji, label, _ = PERSONA_LABEL.get(p, ("", p, ""))
        badges.append(f'<span class="badge">{emoji} {html_lib.escape(label)}</span>')
    surfaces = c.get("surfaces") or []
    if surfaces:
        badges.append(f'<span class="badge">{" · ".join(SURFACE_LABEL.get(s,s) for s in surfaces)} page</span>')
    if c.get("objects"):
        badges.append(f'<span class="badge">{html_lib.escape(", ".join(c["objects"]))}</span>')
    badges.append('<span class="badge">Bilingual FR / EN</span>')
    if not (c.get("apexDeps") or c.get("sharedApexDeps")):
        badges.append('<span class="badge">No Apex</span>')
    if c.get("mobileReady"):
        badges.append('<span class="badge">📱 Mobile-ready</span>')

    chip_html = "".join(
        f'<span class="chip" data-i18n-comp="{api}.chips.{i}">{html_lib.escape(ch)}</span>'
        for i, ch in enumerate(c.get("chips") or [])
    )
    keyProps_html = "".join(
        f'<li data-i18n-comp="{api}.keyProps.{i}">{md_inline(p)}</li>'
        for i, p in enumerate(c.get("keyProps") or [])
    )
    seBenefit_html = md_inline(c.get("seBenefit", "") or "")

    # Properties table
    props_rows = "\n".join(
        f'      <tr><td class="api"><code>{html_lib.escape(p["name"] or "")}</code></td>'
        f'<td class="type">{html_lib.escape(p.get("type") or "")}</td>'
        f'<td class="default">{html_lib.escape(p.get("default") or "") or "—"}</td>'
        f'<td>{html_lib.escape(p.get("description") or "") or "—"}</td></tr>'
        for p in (c.get("properties") or [])
    )

    apex_local = c.get("apexDeps") or []
    apex_shared = c.get("sharedApexDeps") or []
    apex_html = " + ".join(
        [f"<code>{x}</code>" for x in apex_local]
        + [f"<code>{x}</code> <em>(shared)</em>" for x in apex_shared]
    ) or "<em>none</em>"

    # Find recipes that reference this component
    related_recipes = []
    for r in recipes:
        comps = r.get("components") or []
        if comps == "ALL" or api in comps:
            related_recipes.append(r)

    related_recipe_html = ""
    if related_recipes:
        items = "".join(
            f'<a href="../cookbook.html#{r["id"]}"><span>{r.get("emoji","📦")} {html_lib.escape(r.get("title",""))}</span></a>'
            for r in related_recipes[:5]
        )
        related_recipe_html = f"""<div class="side-card">
        <h3>📖 Featured in cookbook</h3>
        <div class="related-list">{items}</div>
      </div>"""

    # Often used with — pick 4 other components from the same primary category
    cat_peers = [x for x in all_components if primary_cat in x.get("categories", []) and x["apiName"] != api]
    related_html = ""
    if cat_peers:
        items = "".join(
            f'<a href="{x["apiName"]}.html"><span>{html_lib.escape((x.get("masterLabel") or x["apiName"]).replace("SE FR - ","").strip())}</span><span class="api">{x["apiName"]}</span></a>'
            for x in cat_peers[:4]
        )
        related_html = f"""<div class="side-card">
        <h3>🧩 Often used with</h3>
        <div class="related-list">{items}</div>
      </div>"""

    author = c.get("originalAuthor") or "—"
    maintained_by = c.get("maintainedBy") or "Lionel Braun"
    contrib_html = f"""<div class="side-card">
        <h3>👤 Contributors</h3>
        <div class="meta-row"><span class="key">Original author</span><span class="val">{html_lib.escape(author)}</span></div>
        <div class="meta-row"><span class="key">Maintained by</span><span class="val">{html_lib.escape(maintained_by)}</span></div>
      </div>"""

    body = f"""<div class="container">
  <header class="page-header" style="border:none; margin-bottom:0;">
    <div class="breadcrumb">
      <a href="../components.html" {pair_attr('Composants', 'Components')}>Composants</a><span class="sep">/</span>
      <span>{html_lib.escape(primary_cat)}</span><span class="sep">/</span>
      <span>{html_lib.escape(name)}</span>
    </div>
  </header>

  <div class="detail-grid">
    <div class="detail-main">
      <div class="detail-hero">
        <div class="emoji">{CATEGORY_EMOJI.get(primary_cat, '🧩')}</div>
        <div>
          <h1>{html_lib.escape(name)}</h1>
          <div class="api">{api}</div>
        </div>
      </div>

      <div class="badges-row">{''.join(badges)}</div>

      {preview_for(api, base="../")[1]}

      <h2 class="section" data-i18n-pair='{{"fr":"Pitch","en":"Tagline"}}'>Pitch</h2>
      <p class="lead" data-i18n-comp="{api}.tagline">{html_lib.escape(c.get('tagline','') or '')}</p>

      <div class="chips" style="margin-bottom: 24px">{chip_html}</div>

      <h2 class="section" data-i18n-pair='{{"fr":"Effet Waouh !","en":"SE benefit"}}'>Effet Waouh !</h2>
      <p data-i18n-comp="{api}.seBenefit">{seBenefit_html}</p>

      <h2 class="section" data-i18n-pair='{{"fr":"Paramètres configurables","en":"Configurable settings"}}'>Paramètres configurables</h2>
      <ul class="detail-bullets">
{keyProps_html}
      </ul>

      <h2 class="section">All properties ({len(c.get('properties') or [])})</h2>
      <div class="props-table-wrap">
      <table class="props-table">
        <colgroup>
          <col class="col-name"><col class="col-type"><col class="col-default"><col class="col-desc">
        </colgroup>
        <thead>
          <tr><th>Name</th><th>Type</th><th>Default</th><th>Description</th></tr>
        </thead>
        <tbody>
{props_rows}
        </tbody>
      </table>
      </div>

      <h2 class="section" data-i18n-pair='{{"fr":"Installation rapide","en":"Quick install"}}'>Installation rapide</h2>
      <p class="note" data-i18n-pair='{{"fr":"Quatre méthodes au choix selon votre contexte :","en":"Four methods depending on your setup:"}}'>Quatre méthodes au choix selon votre contexte :</p>
      <h3 class="subsection"><span class="num">1)</span><span data-i18n-pair='{{"fr":"Bouton Déployer","en":"Deploy button"}}'>Bouton Déployer</span></h3>
      <p class="note" data-i18n-pair='{{"fr":"Cliquez 🚀 Déployer dans le panneau de droite — OAuth dans votre org, déploiement en un clic.","en":"Click 🚀 Deploy in the side panel — OAuth into your org, one-click deploy."}}'>Cliquez 🚀 Déployer dans le panneau de droite — OAuth dans votre org, déploiement en un clic.</p>
      <h3 class="subsection"><span class="num">2)</span>Salesforce CLI</h3>
      <pre><span class="comment"># <span data-i18n-pair='{{"fr":"Téléchargez le zip depuis le panneau de droite, puis :","en":"Download the zip from the side panel, then:"}}'>Téléchargez le zip depuis le panneau de droite, puis :</span></span>
unzip {api}.zip
sf project deploy start --source-dir {api} --target-org &lt;alias&gt;</pre>
      <h3 class="subsection"><span class="num">3)</span><span data-i18n-pair='{{"fr":"Assistant IA (Claude Code / Cursor)","en":"AI assistant (Claude Code / Cursor)"}}'>Assistant IA (Claude Code / Cursor)</span></h3>
      <p class="note" data-i18n-pair='{{"fr":"Drag-and-drop le <code>.zip</code> dans le chat de Claude Code ou Cursor, demandez de déployer dans votre org via la CLI, l’assistant gère décompression et <code>sf project deploy start</code>. <a href=&quot;../docs.html#ai-assistant&quot;>Détails →</a>","en":"Drag-and-drop the <code>.zip</code> into Claude Code or Cursor chat, ask the assistant to deploy via the CLI, it handles unzipping and <code>sf project deploy start</code>. <a href=&quot;../docs.html#ai-assistant&quot;>Details →</a>"}}'>Drag-and-drop le <code>.zip</code> dans le chat de Claude Code ou Cursor, demandez de déployer dans votre org via la CLI, l’assistant gère décompression et <code>sf project deploy start</code>. <a href="../docs.html#ai-assistant">Détails →</a></p>
      <h3 class="subsection"><span class="num">4)</span>Lightning Studio (Chrome)</h3>
      <p class="note" data-i18n-pair='{{"fr":"Pour un déploiement manuel sans CLI : décompressez le zip, copiez-collez chaque fichier (<code>.js</code>, <code>.html</code>, <code>.css</code>, <code>.js-meta.xml</code>) dans l’éditeur Lightning Studio, save, puis hard-refresh la page App Builder. <a href=&quot;../docs.html#lightning-studio&quot;>Détails →</a>","en":"For a manual install without CLI: unzip, copy-paste each file (<code>.js</code>, <code>.html</code>, <code>.css</code>, <code>.js-meta.xml</code>) into Lightning Studio, save, then hard-refresh the App Builder page. <a href=&quot;../docs.html#lightning-studio&quot;>Details →</a>"}}'>Pour un déploiement manuel sans CLI : décompressez le zip, copiez-collez chaque fichier (<code>.js</code>, <code>.html</code>, <code>.css</code>, <code>.js-meta.xml</code>) dans l'éditeur Lightning Studio, save, puis hard-refresh la page App Builder. <a href="../docs.html#lightning-studio">Détails →</a></p>
    </div>

    <aside class="detail-side">
      <button class="btn btn-primary" type="button" data-mock="deploy" data-bundle-members="{api}" style="width:100%; justify-content:center; margin-bottom:8px;">🚀 Deploy to my org</button>
      <button class="btn btn-ghost" type="button" data-mock="download" data-bundle-members="{api}" style="width:100%; justify-content:center; margin-bottom:8px;">⬇ Download .zip</button>
      <button class="btn btn-ghost" type="button" data-mock="showcase" data-component-api="{api}" {pair_attr('🌐 Voir en démo', '🌐 See in showcase')} style="width:100%; justify-content:center; margin-bottom:14px;">🌐 Voir en démo</button>

      <div class="card-stats detail-stats" data-stats-for="{api}" style="margin-bottom:18px;">
        <span class="stat-pill" title="Downloads"><span class="icon">⬇</span><span class="dl-count">{fmt_count(seeded_counts(api, c.get('featuredRank'))[0])}</span></span>
        <button type="button" class="like-btn" data-like-for="{api}" aria-pressed="false" title="Like"><span class="icon">♡</span><span class="lk-count">{fmt_count(seeded_counts(api, c.get('featuredRank'))[1])}</span></button>
      </div>

      <div class="side-card">
        <h3>📋 At a glance</h3>
        <div class="meta-row"><span class="key">API name</span><span class="val"><code>{api}</code></span></div>
        <div class="meta-row"><span class="key">Master label</span><span class="val">{html_lib.escape((c.get('masterLabel') or '—'))}</span></div>
        <div class="meta-row"><span class="key">Status</span><span class="val">{'New' if rs=='new' else 'Stable'}</span></div>
        <div class="meta-row"><span class="key">Targets</span><span class="val">{html_lib.escape(' · '.join(SURFACE_LABEL.get(s,s) for s in surfaces) or '—')}</span></div>
        <div class="meta-row"><span class="key">Objects</span><span class="val">{html_lib.escape(' · '.join(c.get('objects',[])) or 'Any')}</span></div>
        <div class="meta-row"><span class="key">Apex</span><span class="val">{apex_html}</span></div>
        <div class="meta-row"><span class="key">Data mode</span><span class="val">{html_lib.escape((c.get('dataMode') or 'mock').capitalize())}</span></div>
        <div class="meta-row"><span class="key">Mobile</span><span class="val">{'Yes' if c.get('mobileReady') else 'No'}</span></div>
      </div>

      {contrib_html}

      <div class="side-card">
        <h3>🧩 Categories</h3>
        <div class="meta-row"><span class="key">Primary</span><span class="val">{html_lib.escape(primary_cat)}</span></div>{''.join(f'<div class="meta-row"><span class="key">Also</span><span class="val">{html_lib.escape(cat)}</span></div>' for cat in (c.get('categories') or [])[1:])}
      </div>

      {related_recipe_html}
      {related_html}
    </aside>
  </div>
</div>"""
    return html_shell(f"{name} · seFr… — LWC Library SE FR", body,
                      active="components", base="../", component_count=n_components,
                      search_index=search_index)


# ----------------------------------------------------------------------
# PAGE: cookbook.html
# ----------------------------------------------------------------------
def render_cookbook(components: list[dict], recipes: list[dict], n_components: int, search_index: list[dict]) -> str:
    def pair_attr(fr: str, en: str) -> str:
        s = json.dumps({"fr": fr, "en": en}, ensure_ascii=False).replace("'", "&#39;")
        return f"data-i18n-pair='{s}'"

    # Hand-written FR translations for the recipe titles + descriptions (recipes.yml is EN-only).
    RECIPE_FR = {
        "account-360": {
            "title": "Account 360°",
            "description": "Page record clé-en-main pour la Sales B2B — highlights, jauge de santé, pipeline, timeline d’activité et recommandations IA.",
        },
        "field-sales-cockpit": {
            "title": "Cockpit Field Sales",
            "description": "Page Home mobile-first pour les commerciaux terrain — carte, agenda, notes vocales et KPIs.",
        },
        "service-desk": {
            "title": "Service desk",
            "description": "Page record centrée sur le Case avec historique des commandes, kanban, alertes et actions intelligentes.",
        },
        "agentforce-demo": {
            "title": "Démo Agentforce",
            "description": "Page showcase calibrée pour les scénarios IA — bandeau hero, lanceur de prompts et recommandations.",
        },
        "marketing-360": {
            "title": "Marketing 360°",
            "description": "Page centrée contact avec gestion du consentement, appartenance aux segments et signaux d’engagement.",
        },
        "full-pack": {
            "title": "Pack complet",
            "description": "Tous les composants d’un coup — quand vous voulez tout précharger.",
        },
    }

    by_api = {c["apiName"]: c for c in components}
    cards_html = ""
    for r in recipes:
        comps_ids = r.get("components") or []
        if comps_ids == "ALL":
            comps = list(components)
            stack_inner = (
                '<div class="item"><span class="name" style="font-weight:600;" '
                + pair_attr('Tous les composants', 'All components')
                + '>Tous les composants</span><span class="api">'
                + str(len(comps)) + ' LWCs</span></div>'
            )
            stack_class = ' style="background: var(--brand-light);"'
            count_label = (
                f'<span><strong>{len(comps)}</strong> '
                f'<span {pair_attr("composants", "components")}>composants</span></span>'
            )
        else:
            comps = [by_api[a] for a in comps_ids if a in by_api]
            stack_class = ""
            stack_items = []
            for cc in comps:
                cname = (cc.get("masterLabel") or cc["apiName"]).replace("SE FR - ", "").strip()
                stack_items.append(
                    f'<a class="item" href="components/{cc["apiName"]}.html">'
                    f'<span class="name">{html_lib.escape(cname)}</span>'
                    f'<span class="api">{cc["apiName"]}</span></a>'
                )
            stack_inner = "".join(stack_items)
            count_label = (
                f'<span><strong>{len(comps)}</strong> '
                f'<span {pair_attr("composants", "components")}>composants</span></span>'
            )

        primary = r.get("primaryPersona", "All")
        emoji_p = PERSONA_LABEL.get(primary, ("", primary, ""))[0]

        rid = r.get("id", "") or ""
        # Recipe seeded counts: derived from the recipe id, slightly higher floor.
        r_dl, r_lk = seeded_counts("recipe-" + rid, featured_rank=2)
        member_apis = [cc["apiName"] for cc in comps]
        member_csv = ",".join(member_apis)
        # Use hand-written FR translations if we have them, otherwise fall back to the YAML EN.
        fr = RECIPE_FR.get(rid, {})
        title_fr = fr.get("title", r.get("title", ""))
        title_en = r.get("title", "")
        desc_fr = fr.get("description", r.get("description", ""))
        desc_en = r.get("description", "")
        cards_html += f"""
    <article class="recipe-card" id="{html_lib.escape(rid)}" data-target-label="Sélectionné"
             data-base-dl="{r_dl}" data-base-lk="{r_lk}" data-members="{html_lib.escape(member_csv, quote=True)}">
      <div class="recipe-cover">{r.get('emoji','📦')}</div>
      <div class="recipe-body">
        <h3 {pair_attr(title_fr, title_en)}>{html_lib.escape(title_fr)}</h3>
        <p class="desc" {pair_attr(desc_fr, desc_en)}>{html_lib.escape(desc_fr)}</p>
        <div class="recipe-stack"{stack_class}>{stack_inner}</div>
        <div class="recipe-actions">
          <button class="btn btn-primary btn-sm" type="button" data-mock="deploy-bundle" data-count="{len(comps)}" data-bundle-id="{html_lib.escape(rid)}" data-bundle-members="{html_lib.escape(member_csv, quote=True)}" style="flex:1; justify-content:center;" {pair_attr('🚀 Déployer le pack', '🚀 Deploy bundle')}>🚀 Déployer le pack</button>
          <button class="btn btn-ghost btn-sm" type="button" data-mock="download" data-bundle-id="{html_lib.escape(rid)}" data-bundle-members="{html_lib.escape(member_csv, quote=True)}" {pair_attr('⬇ Zip', '⬇ Zip')}>⬇ Zip</button>
        </div>
        <div class="recipe-foot">
          <div class="recipe-meta">
            {count_label}
            <span>{emoji_p} {html_lib.escape(primary)}</span>
          </div>
          <div class="card-stats" data-stats-for="recipe-{html_lib.escape(rid)}">
            <span class="stat-pill" title="Downloads"><span class="icon">⬇</span><span class="dl-count">{fmt_count(r_dl)}</span></span>
            <button type="button" class="like-btn" data-like-for="recipe-{html_lib.escape(rid)}" aria-pressed="false" title="Like"><span class="icon">♡</span><span class="lk-count">{fmt_count(r_lk)}</span></button>
          </div>
        </div>
      </div>
    </article>"""

    body = f"""<div class="container">
  <header class="page-header">
    <h1 {pair_attr('📖 Cookbook', '📖 Cookbook')}>📖 Cookbook</h1>
    <div class="subtitle" {pair_attr('Compositions prêtes à l’emploi pour des scénarios de démo classiques. Choisissez une recette, déployez le pack, vous êtes prêt en quelques minutes.', 'Pre-baked compositions of components for typical demo scenarios. Pick a recipe, deploy the bundle, you’re ready in minutes.')}>Compositions prêtes à l'emploi pour des scénarios de démo classiques. Choisissez une recette, déployez le pack, vous êtes prêt en quelques minutes.</div>
  </header>

  <div class="recipe-grid">
{cards_html}
  </div>
</div>"""
    return html_shell("Cookbook — LWC Library SE FR", body,
                      active="cookbook", base="", component_count=n_components,
                      search_index=search_index)


# ----------------------------------------------------------------------
# PAGE: about.html  — Why / Design principles / How it works / Reading the deck
# ----------------------------------------------------------------------
def render_about(n_components: int, search_index: list[dict]) -> str:
    def pair_attr(fr: str, en: str) -> str:
        s = json.dumps({"fr": fr, "en": en}, ensure_ascii=False).replace("'", "&#39;")
        return f"data-i18n-pair='{s}'"
    body = f"""<div class="container">
  <header class="page-header">
    <h1 {pair_attr('💡 À propos de la librairie', '💡 About the library')}>💡 À propos de la librairie</h1>
    <div class="subtitle" {pair_attr('Pourquoi cette lib existe, comment elle est conçue, et comment l’utiliser efficacement.', 'Why this library exists, how it’s designed, and how to use it effectively.')}>Pourquoi cette lib existe, comment elle est conçue, et comment l'utiliser efficacement.</div>
  </header>

  <section class="about-section">
    <h2 {pair_attr('Pourquoi cette librairie', 'Why this library')}>Pourquoi cette librairie</h2>
    <div class="about-4col">
      <div class="about-card v1">
        <div class="about-card-head"><div class="about-emoji">⚡️</div><h3 {pair_attr('Démos plus vite', 'Faster demos')}>Démos plus vite</h3></div>
        <p {pair_attr('Posez un composant validé sur une page, configurez via App Builder, démo prête en quelques minutes — pas en quelques jours.', 'Drop a vetted component on a page, configure via App Builder, demo in minutes — not days.')}>Posez un composant validé sur une page, configurez via App Builder, démo prête en quelques minutes — pas en quelques jours.</p>
      </div>
      <div class="about-card v2">
        <div class="about-card-head"><div class="about-emoji">✨</div><h3 {pair_attr('Démos plus jolies', 'Prettier demos')}>Démos plus jolies</h3></div>
        <p {pair_attr('Wow facile. Les composants sont travaillés visuellement — animations subtiles, palette cohérente, design polish — pour que vos démos sortent du standard Lightning brut.', 'Easy wow. Components are visually polished — subtle animations, consistent palette, design care — so your demos go beyond the raw Lightning standard.')}>Wow facile. Les composants sont travaillés visuellement — animations subtiles, palette cohérente, design polish — pour que vos démos sortent du standard Lightning brut.</p>
      </div>
      <div class="about-card v3">
        <div class="about-card-head"><div class="about-emoji">🧩</div><h3 {pair_attr('Rester générique', 'Stay generic')}>Rester générique</h3></div>
        <p {pair_attr('Chaque composant est industry-neutral. Personnalisez via les propriétés App Builder, pas en éditant le code.', 'Every component is industry-neutral. Customize via properties, not by editing code.')}>Chaque composant est industry-neutral. Personnalisez via les propriétés App Builder, pas en éditant le code.</p>
      </div>
      <div class="about-card v4">
        <div class="about-card-head"><div class="about-emoji">🤝</div><h3 {pair_attr('Partager & contribuer', 'Share & contribute')}>Partager & contribuer</h3></div>
        <p {pair_attr('Un pool unique de composants, conçu et maintenu par l’équipe SE France. Le vôtre y a sa place.', 'One pool of components, designed and maintained by the SE France team. Yours belongs here too.')}>Un pool unique de composants, conçu et maintenu par l'équipe SE France. Le vôtre y a sa place.</p>
      </div>
    </div>
  </section>

  <section class="about-section">
    <h2 {pair_attr('Principes de design', 'Design principles')}>Principes de design</h2>
    <ul class="about-bullets">
      <li {pair_attr('<strong>Composants Lightning de base d’abord.</strong> <code>lightning-card</code>, <code>lightning-button</code>, <code>lightning-datatable</code> &amp; co. sont traduits par la plateforme — on les utilise dès que possible.', '<strong>Lightning base components first.</strong> <code>lightning-card</code>, <code>lightning-button</code>, <code>lightning-datatable</code> &amp; co. are translated by the platform — we use them wherever possible.')}><strong>Composants Lightning de base d'abord.</strong> <code>lightning-card</code>, <code>lightning-button</code>, <code>lightning-datatable</code> &amp; co. sont traduits par la plateforme — on les utilise dès que possible.</li>
      <li {pair_attr('<strong>Tout texte custom est une propriété.</strong> Tout ce qui peut raisonnablement être renommé est une <code>@api</code> avec un défaut français.', '<strong>Custom strings become properties.</strong> Anything that could reasonably need renaming is an <code>@api</code> with a French default.')}><strong>Tout texte custom est une propriété.</strong> Tout ce qui peut raisonnablement être renommé est une <code>@api</code> avec un défaut français.</li>
      <li {pair_attr('<strong>Données de démo en JSON / CSV.</strong> Les dashboards qui ont des KPI mockés acceptent les jeux de données en string JSON / CSV pour swap dans App Builder.', '<strong>Demo data as JSON / CSV props.</strong> Dashboards with mock KPIs accept those as stringified JSON / CSV so SEs can swap the dataset in App Builder.')}><strong>Données de démo en JSON / CSV.</strong> Les dashboards qui ont des KPI mockés acceptent les jeux de données en string JSON / CSV pour swap dans App Builder.</li>
      <li {pair_attr('<strong>Devise &amp; locale exposées.</strong> <code>currencyCode</code> (défaut <code>EUR</code>) et <code>localeTag</code> (défaut <code>fr-FR</code>) sont des props.', '<strong>Currency &amp; locale exposed.</strong> <code>currencyCode</code> (default <code>EUR</code>) and <code>localeTag</code> (default <code>fr-FR</code>) are properties.')}><strong>Devise &amp; locale exposées.</strong> <code>currencyCode</code> (défaut <code>EUR</code>) et <code>localeTag</code> (défaut <code>fr-FR</code>) sont des props.</li>
      <li {pair_attr('<strong>Champs standards d’abord.</strong> La lib n’utilise que les champs Salesforce standards par défaut. Aucun champ custom obligatoire.', '<strong>Standard fields first.</strong> The library uses only Salesforce standard fields by default. No mandatory custom field.')}><strong>Champs standards d'abord.</strong> La lib n'utilise que les champs Salesforce standards par défaut. Aucun champ custom obligatoire.</li>
      <li {pair_attr('<strong>Apex schema-safe.</strong> Quand un champ custom optionnel <em>peut</em> enrichir l’UI, l’Apex vérifie son existence avant de le référencer — déploiement OK partout.', '<strong>Schema-safe Apex.</strong> Where an optional custom field <em>can</em> enrich the UI, Apex checks for its existence before referencing it — deploys succeed regardless.')}><strong>Apex schema-safe.</strong> Quand un champ custom optionnel <em>peut</em> enrichir l'UI, l'Apex vérifie son existence avant de le référencer — déploiement OK partout.</li>
      <li {pair_attr('<strong>Bilingue FR / EN.</strong> Chaque composant expose une prop <code>language</code> avec dictionnaires FR/EN intégrés.', '<strong>Bilingual FR / EN.</strong> Every component exposes a <code>language</code> prop with FR/EN dictionaries baked in.')}><strong>Bilingue FR / EN.</strong> Chaque composant expose une prop <code>language</code> avec dictionnaires FR/EN intégrés.</li>
    </ul>
  </section>

  <section class="about-section">
    <h2 {pair_attr('Comment lire la fiche d’un composant', 'Reading a component page')}>Comment lire la fiche d'un composant</h2>
    <p {pair_attr('Chaque fiche composant contient :', 'Each component page carries:')}>Chaque fiche composant contient :</p>
    <ul class="about-bullets">
      <li {pair_attr('<strong>Nom</strong> — nom humain affiché dans le master label App Builder. Exemple : <code>Account Health</code>.', '<strong>Name</strong> — human name displayed in the App Builder master label. Example: <code>Account Health</code>.')}><strong>Nom</strong> — nom humain affiché dans le master label App Builder. Exemple : <code>Account Health</code>.</li>
      <li {pair_attr('<strong>API name</strong> — identifiant technique du LWC, en camelCase. Exemple : <code>seFrAccountHealth</code>.', '<strong>API name</strong> — technical LWC identifier in camelCase. Example: <code>seFrAccountHealth</code>.')}><strong>API name</strong> — identifiant technique du LWC, en camelCase. Exemple : <code>seFrAccountHealth</code>.</li>
      <li {pair_attr('<strong>Tagline</strong> — pitch d’une ligne, ce qui est utile pour vendre le composant en 5 secondes.', '<strong>Tagline</strong> — one-line pitch, what you’d use to sell the component in 5 seconds.')}><strong>Tagline</strong> — pitch d'une ligne, ce qui est utile pour vendre le composant en 5 secondes.</li>
      <li {pair_attr('<strong>Chips</strong> — 3-4 features qui claquent. Exemples : <code>SVG donut gauge</code>, <code>Drag &amp; drop natif</code>, <code>4 chart styles</code>.', '<strong>Chips</strong> — 3-4 wow features. Examples: <code>SVG donut gauge</code>, <code>Native drag &amp; drop</code>, <code>4 chart styles</code>.')}><strong>Chips</strong> — 3-4 features qui claquent. Exemples : <code>SVG donut gauge</code>, <code>Drag &amp; drop natif</code>, <code>4 chart styles</code>.</li>
      <li {pair_attr('<strong>Badges de statut</strong> — étiquettes en haut de la fiche. Exemples : <code>● Stable</code>, <code>✨ New</code>, <code>🤖 AI-ready</code>, <code>📱 Mobile-ready</code>, <code>No Apex</code>.', '<strong>Status badges</strong> — labels at the top of the page. Examples: <code>● Stable</code>, <code>✨ New</code>, <code>🤖 AI-ready</code>, <code>📱 Mobile-ready</code>, <code>No Apex</code>.')}><strong>Badges de statut</strong> — étiquettes en haut de la fiche. Exemples : <code>● Stable</code>, <code>✨ New</code>, <code>🤖 AI-ready</code>, <code>📱 Mobile-ready</code>, <code>No Apex</code>.</li>
      <li {pair_attr('<strong>Personas</strong> — équipes ciblées. Exemples : <code>📌 Sales</code>, <code>🚗 Field Sales</code>, <code>📞 Service</code>, <code>🤖 Agentforce</code>.', '<strong>Personas</strong> — target teams. Examples: <code>📌 Sales</code>, <code>🚗 Field Sales</code>, <code>📞 Service</code>, <code>🤖 Agentforce</code>.')}><strong>Personas</strong> — équipes ciblées. Exemples : <code>📌 Sales</code>, <code>🚗 Field Sales</code>, <code>📞 Service</code>, <code>🤖 Agentforce</code>.</li>
      <li {pair_attr('<strong>Targets</strong> — types de pages où le composant peut atterrir. Exemple : <code>Home · App · Record</code>.', '<strong>Targets</strong> — page types where the component can land. Example: <code>Home · App · Record</code>.')}><strong>Targets</strong> — types de pages où le composant peut atterrir. Exemple : <code>Home · App · Record</code>.</li>
      <li {pair_attr('<strong>Objects</strong> — SObjects supportés sur les Record Pages. Exemples : <code>Account</code>, <code>Contact / Lead / Account</code>, <code>Any</code>.', '<strong>Objects</strong> — supported SObjects on Record Pages. Examples: <code>Account</code>, <code>Contact / Lead / Account</code>, <code>Any</code>.')}><strong>Objects</strong> — SObjects supportés sur les Record Pages. Exemples : <code>Account</code>, <code>Contact / Lead / Account</code>, <code>Any</code>.</li>
      <li {pair_attr('<strong>Apex</strong> — dépendances Apex éventuelles, locales ou partagées. Exemples : <code>SE_FR_AccountHealthController</code>, <code>SE_FR_ImageFileController (shared)</code>, <em>none</em>.', '<strong>Apex</strong> — optional Apex dependencies, local or shared. Examples: <code>SE_FR_AccountHealthController</code>, <code>SE_FR_ImageFileController (shared)</code>, <em>none</em>.')}><strong>Apex</strong> — dépendances Apex éventuelles, locales ou partagées. Exemples : <code>SE_FR_AccountHealthController</code>, <code>SE_FR_ImageFileController (shared)</code>, <em>none</em>.</li>
      <li {pair_attr('<strong>Data mode</strong> — comment le composant se comporte vis-à-vis des données de l’org. Valeurs : <code>live</code> (lit/écrit des records réels), <code>hybrid</code> (réel si présent, sinon mock), <code>mock</code> (100% prop-driven, aucune dépendance org).', '<strong>Data mode</strong> — how the component behaves towards org data. Values: <code>live</code> (reads/writes real records), <code>hybrid</code> (real if present, else mock), <code>mock</code> (100% prop-driven, no org dependency).')}><strong>Data mode</strong> — comment le composant se comporte vis-à-vis des données de l'org. Valeurs : <code>live</code> (lit/écrit des records réels), <code>hybrid</code> (réel si présent, sinon mock), <code>mock</code> (100% prop-driven, aucune dépendance org).</li>
      <li {pair_attr('<strong>Pitch</strong> — paragraphe court qui explicite la tagline.', '<strong>Pitch</strong> — short paragraph that fleshes out the tagline.')}><strong>Pitch</strong> — paragraphe court qui explicite la tagline.</li>
      <li {pair_attr('<strong>Effet Waouh !</strong> — l’angle de démo qui marque, le moment où le client lève les yeux de son écran.', '<strong>SE benefit</strong> — the demo angle that lands, the moment the prospect looks up from their screen.')}><strong>Effet Waouh !</strong> — l'angle de démo qui marque, le moment où le client lève les yeux de son écran.</li>
      <li {pair_attr('<strong>Paramètres configurables</strong> — 3-5 props clés à tuner dans App Builder. Exemples : <code>chartStyle</code>, <code>seriesJson</code>, <code>currencyCode</code>.', '<strong>Configurable settings</strong> — 3-5 key props to tune in App Builder. Examples: <code>chartStyle</code>, <code>seriesJson</code>, <code>currencyCode</code>.')}><strong>Paramètres configurables</strong> — 3-5 props clés à tuner dans App Builder. Exemples : <code>chartStyle</code>, <code>seriesJson</code>, <code>currencyCode</code>.</li>
      <li {pair_attr('<strong>Toutes les propriétés</strong> — table exhaustive (nom, type, défaut, description) lue directement depuis le <code>js-meta.xml</code> du composant.', '<strong>All properties</strong> — full table (name, type, default, description) read straight from the component’s <code>js-meta.xml</code>.')}><strong>Toutes les propriétés</strong> — table exhaustive (nom, type, défaut, description) lue directement depuis le <code>js-meta.xml</code> du composant.</li>
      <li {pair_attr('<strong>Installation rapide</strong> — les 4 méthodes de déploiement (Bouton Déployer, CLI, Assistant IA, Lightning Studio).', '<strong>Quick install</strong> — the 4 deploy methods (Deploy button, CLI, AI assistant, Lightning Studio).')}><strong>Installation rapide</strong> — les 4 méthodes de déploiement (Bouton Déployer, CLI, Assistant IA, Lightning Studio).</li>
      <li {pair_attr('<strong>Original author</strong> / <strong>Maintained by</strong> — auteur d’origine et mainteneur dans la lib (visible quand un contributeur externe a contribué au composant).', '<strong>Original author</strong> / <strong>Maintained by</strong> — original author and library maintainer (shown when an external contributor wrote the component).')}><strong>Original author</strong> / <strong>Maintained by</strong> — auteur d'origine et mainteneur dans la lib (visible quand un contributeur externe a contribué au composant).</li>
      <li {pair_attr('<strong>Catégories</strong> — la ou les catégories de la lib auxquelles le composant appartient. Exemples : <code>Account 360°</code>, <code>Agentforce &amp; AI</code>.', '<strong>Categories</strong> — the library categories the component belongs to. Examples: <code>Account 360°</code>, <code>Agentforce &amp; AI</code>.')}><strong>Catégories</strong> — la ou les catégories de la lib auxquelles le composant appartient. Exemples : <code>Account 360°</code>, <code>Agentforce &amp; AI</code>.</li>
      <li {pair_attr('<strong>Featured in cookbook</strong> — recettes du Cookbook qui incluent ce composant.', '<strong>Featured in cookbook</strong> — Cookbook recipes that bundle this component.')}><strong>Featured in cookbook</strong> — recettes du Cookbook qui incluent ce composant.</li>
      <li {pair_attr('<strong>Often used with</strong> — composants de la même catégorie souvent posés ensemble.', '<strong>Often used with</strong> — components of the same category typically dropped together.')}><strong>Often used with</strong> — composants de la même catégorie souvent posés ensemble.</li>
    </ul>
  </section>

  <section class="about-section about-cta">
    <h2 {pair_attr('Envie de contribuer ?', 'Want to contribute?')}>Envie de contribuer ?</h2>
    <p {pair_attr('La librairie vit grâce aux SE qui partagent leurs composants. Ajoutez le vôtre, ou découvrez ceux qui ont déjà rejoint la party.', 'The library grows thanks to SEs who share their components. Add yours, or check out the SEs who already joined.')}>La librairie vit grâce aux SE qui partagent leurs composants. Ajoutez le vôtre, ou découvrez ceux qui ont déjà rejoint la party.</p>
    <div style="margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap; align-items: stretch;">
      <button type="button" class="btn btn-primary" data-mock="submit-component" {pair_attr('Proposer mon composant →', 'Propose my component →')}>Proposer mon composant →</button>
      <a href="contributors.html" class="btn btn-ghost" {pair_attr('Voir les contributeurs', 'See the contributors')}>Voir les contributeurs</a>
    </div>
  </section>
</div>"""
    return html_shell("À propos · LWC Library SE FR", body,
                      active="about", base="", component_count=n_components,
                      search_index=search_index)


# ----------------------------------------------------------------------
# PAGE: docs.html (static content)
# ----------------------------------------------------------------------
def render_docs(n_components: int, search_index: list[dict]) -> str:
    def pair_attr(fr: str, en: str) -> str:
        s = json.dumps({"fr": fr, "en": en}, ensure_ascii=False).replace("'", "&#39;")
        return f"data-i18n-pair='{s}'"
    body = f"""<div class="container">
  <header class="page-header">
    <h1>📚 Docs</h1>
    <div class="subtitle" {pair_attr('Tout pour installer et configurer la librairie dans votre org de démo.', 'Everything you need to install and configure the library in your demo org.')}>Tout pour installer et configurer la librairie dans votre org de démo.</div>
  </header>

  <div class="docs-grid">
    <aside class="docs-side">
      <h4 {pair_attr('Installation', 'Install')}>Installation</h4>
      <ul>
        <li><a href="#install" {pair_attr('Démarrage rapide', 'Quick install')}>Démarrage rapide</a></li>
        <li><a href="#cli" {pair_attr('Déploiement via CLI', 'Deploy via CLI')}>Déploiement via CLI</a></li>
        <li><a href="#ai-assistant" {pair_attr('Assistant IA (Claude / Cursor)', 'AI assistant (Claude / Cursor)')}>Assistant IA (Claude / Cursor)</a></li>
        <li><a href="#lightning-studio" {pair_attr('Lightning Studio (Chrome)', 'Lightning Studio (Chrome)')}>Lightning Studio (Chrome)</a></li>
      </ul>
      <h4 {pair_attr('Configuration', 'Configure')}>Configuration</h4>
      <ul>
        <li><a href="#app-builder" {pair_attr('Page Builder', 'App Builder')}>Page Builder</a></li>
        <li><a href="#bilingual" {pair_attr('Bilingue FR / EN', 'Bilingual FR / EN')}>Bilingue FR / EN</a></li>
        <li><a href="#data-modes" {pair_attr('Data modes', 'Data modes')}>Data modes</a></li>
        <li><a href="#named-credential" {pair_attr('Named Credential', 'Named Credential')}>Named Credential</a></li>
      </ul>
      <h4 {pair_attr('Données', 'Data')}>Données</h4>
      <ul>
        <li><a href="#data-compat" {pair_attr('Compat SDO standard', 'Standard SDO compat')}>Compat SDO standard</a></li>
        <li><a href="#data-images" {pair_attr('Images via ContentDocument', 'Images via ContentDocument')}>Images via ContentDocument</a></li>
        <li><a href="#data-shine" {pair_attr('Faire briller la démo', 'Make the demo shine')}>Faire briller la démo</a></li>
      </ul>
      <h4 {pair_attr('Standards', 'Standards')}>Standards</h4>
      <ul>
        <li><a href="#naming" {pair_attr('Conventions de nommage', 'Naming conventions')}>Conventions de nommage</a></li>
        <li><a href="#schema-safe" {pair_attr('Apex schema-safe', 'Schema-safe Apex')}>Apex schema-safe</a></li>
        <li><a href="#defaults" {pair_attr('Valeurs par défaut', 'Library defaults')}>Valeurs par défaut</a></li>
      </ul>
    </aside>

    <article class="docs-main">
      <h2 id="install" {pair_attr('Démarrage rapide', 'Quick install')}>Démarrage rapide</h2>
      <p {pair_attr('Chaque composant est un zip autonome — bundle LWC, Apex dédié et Apex partagé éventuel inclus. Le chemin le plus rapide :', 'Every component is a self-contained zip — LWC bundle plus dedicated Apex and any shared Apex it depends on. The fastest path:')}>Chaque composant est un zip autonome — bundle LWC, Apex dédié et Apex partagé éventuel inclus. Le chemin le plus rapide :</p>
      <ol>
        <li {pair_attr('Parcourez les <a href="components.html">composants</a> et choisissez ce qu’il vous faut.', 'Browse to <a href="components.html">Components</a> and pick what you need.')}>Parcourez les <a href="components.html">composants</a> et choisissez ce qu'il vous faut.</li>
        <li {pair_attr('Cliquez <strong>Connecter à mon org</strong> en haut à droite — OAuth flow vers votre org de démo.', 'Click <strong>Connect to my org</strong> in the top right — OAuth flow into your demo org.')}>Cliquez <strong>Connecter à mon org</strong> en haut à droite — OAuth flow vers votre org de démo.</li>
        <li {pair_attr('Cliquez <strong>Déployer</strong> sur chaque composant (ou groupez-les dans le panier).', 'Click <strong>Deploy</strong> on each component (or bundle them in the cart).')}>Cliquez <strong>Déployer</strong> sur chaque composant (ou groupez-les dans le panier).</li>
        <li {pair_attr('Ouvrez App Builder, glissez le composant sur la page voulue, configurez le panneau de propriétés.', 'Open App Builder, drag the component on a page, configure in the property panel.')}>Ouvrez App Builder, glissez le composant sur la page voulue, configurez le panneau de propriétés.</li>
      </ol>

      <div class="callout">
        <strong>💡 </strong><span {pair_attr('Astuce : si vous préférez le terminal, sautez directement à la section <a href="#cli">Déploiement via CLI</a> ci-dessous.', 'Tip: if you prefer the terminal, jump straight to the <a href="#cli">Deploy via CLI</a> section below.')}>Astuce : si vous préférez le terminal, sautez directement à la section <a href="#cli">Déploiement via CLI</a> ci-dessous.</span>
      </div>

      <h2 id="cli" {pair_attr('Déploiement via CLI', 'Deploy via CLI')}>Déploiement via CLI</h2>
      <p {pair_attr('Si vous préférez la Salesforce CLI, chaque zip est téléchargeable depuis la fiche du composant :', 'If you prefer the Salesforce CLI, every component zip is downloadable from the component page:')}>Si vous préférez la Salesforce CLI, chaque zip est téléchargeable depuis la fiche du composant :</p>
      <pre># 1. <span {pair_attr('Téléchargez le zip depuis la fiche du composant', 'Download the zip from the component detail page')}>Téléchargez le zip depuis la fiche du composant</span>
# 2. <span {pair_attr('Décompressez et déployez', 'Unzip &amp; deploy')}>Décompressez et déployez</span>
unzip seFr&lt;Name&gt;.zip
sf project deploy start \\
  --source-dir seFr&lt;Name&gt; \\
  --target-org &lt;your-alias&gt;</pre>

      <h2 id="ai-assistant" {pair_attr('Assistant IA (Claude Code / Cursor)', 'AI assistant (Claude Code / Cursor)')}>Assistant IA (Claude Code / Cursor)</h2>
      <p {pair_attr('Le déploiement « no-effort » : laissez votre assistant IA s’occuper de tout. Marche aussi bien avec <strong>Claude Code</strong> qu’avec <strong>Cursor</strong> (ou tout autre assistant IDE qui peut exécuter des commandes shell).', 'The "no-effort" deploy: let your AI assistant handle everything. Works equally well with <strong>Claude Code</strong> or <strong>Cursor</strong> (or any IDE assistant that can execute shell commands).')}>Le déploiement « no-effort » : laissez votre assistant IA s’occuper de tout. Marche aussi bien avec <strong>Claude Code</strong> qu’avec <strong>Cursor</strong> (ou tout autre assistant IDE qui peut exécuter des commandes shell).</p>
      <ol>
        <li {pair_attr('Téléchargez le ou les zips depuis les fiches des composants — un par composant, ou le pack complet via le <a href="cookbook.html#full-pack">Cookbook</a>.', 'Download the zip(s) from the component pages — one per component, or the full pack from the <a href="cookbook.html#full-pack">Cookbook</a>.')}>Téléchargez le ou les zips depuis les fiches des composants — un par composant, ou le pack complet via le <a href="cookbook.html#full-pack">Cookbook</a>.</li>
        <li {pair_attr('Ouvrez votre projet dans Claude Code ou Cursor. Drag-and-drop le ou les <code>.zip</code> directement dans le chat.', 'Open your project in Claude Code or Cursor. Drag-and-drop the <code>.zip</code> file(s) straight into the chat.')}>Ouvrez votre projet dans Claude Code ou Cursor. Drag-and-drop le ou les <code>.zip</code> directement dans le chat.</li>
        <li {pair_attr('Demandez à l’assistant : <em>« Décompresse ces composants et déploie-les dans mon org Salesforce via la CLI »</em>. Précisez l’alias de l’org si vous en avez plusieurs (ex : <code>SE_FR_SDO</code>).', 'Ask the assistant: <em>"Unzip these components and deploy them to my Salesforce org via the CLI"</em>. Mention the org alias if you have several (e.g. <code>SE_FR_SDO</code>).')}>Demandez à l’assistant : <em>« Décompresse ces composants et déploie-les dans mon org Salesforce via la CLI »</em>. Précisez l’alias de l’org si vous en avez plusieurs (ex : <code>SE_FR_SDO</code>).</li>
        <li {pair_attr('L’assistant décompresse, identifie la structure SFDX et lance <code>sf project deploy start</code> avec les bons arguments. Il gère aussi les Apex partagés s’il y en a.', 'The assistant unzips, identifies the SFDX structure and runs <code>sf project deploy start</code> with the right arguments. It also handles shared Apex if any.')}>L’assistant décompresse, identifie la structure SFDX et lance <code>sf project deploy start</code> avec les bons arguments. Il gère aussi les Apex partagés s’il y en a.</li>
        <li {pair_attr('Ouvrez App Builder, glissez les composants sur la page voulue, configurez les propriétés.', 'Open App Builder, drag the components onto the right page, configure the properties.')}>Ouvrez App Builder, glissez les composants sur la page voulue, configurez les propriétés.</li>
      </ol>
      <p {pair_attr('Pré-requis : la <code>sf</code> CLI Salesforce installée et l’org cible authentifiée (<code>sf org login web --alias &lt;alias&gt;</code>) — l’assistant peut le faire pour vous si ce n’est pas encore fait.', 'Prereq: the Salesforce <code>sf</code> CLI installed and the target org authenticated (<code>sf org login web --alias &lt;alias&gt;</code>) — the assistant can do that for you if not already done.')}>Pré-requis : la <code>sf</code> CLI Salesforce installée et l’org cible authentifiée (<code>sf org login web --alias &lt;alias&gt;</code>) — l’assistant peut le faire pour vous si ce n’est pas encore fait.</p>
      <div class="callout">
        <strong>💡 </strong><span {pair_attr('Avantage : zéro commande à taper, zéro souci de structure de dossier. L’assistant lit la lib, comprend la structure, et déploie. Idéal quand vous bundlez 5-10 composants d’un coup.', 'Why this rocks: zero command to type, zero folder-structure hassle. The assistant reads the library, understands the structure, and deploys. Best for bundling 5-10 components at once.')}>Avantage : zéro commande à taper, zéro souci de structure de dossier. L’assistant lit la lib, comprend la structure, et déploie. Idéal quand vous bundlez 5-10 composants d’un coup.</span>
      </div>

      <h2 id="lightning-studio">Lightning Studio (Chrome)</h2>
      <p {pair_attr('Pour un déploiement « manuel » directement depuis le navigateur, sans CLI ni IDE — utile quand vous n’avez pas configuré la CLI sur votre machine, ou pour une installation rapide ad-hoc.', 'For a "manual" install directly from the browser, no CLI or IDE — handy when you don’t have the CLI configured locally, or for a quick ad-hoc deploy.')}>Pour un déploiement « manuel » directement depuis le navigateur, sans CLI ni IDE — utile quand vous n’avez pas configuré la CLI sur votre machine, ou pour une installation rapide ad-hoc.</p>
      <ol>
        <li {pair_attr('Installez l’extension Chrome <strong>Lightning Studio</strong> (depuis le Chrome Web Store).', 'Install the <strong>Lightning Studio</strong> Chrome extension (from the Chrome Web Store).')}>Installez l’extension Chrome <strong>Lightning Studio</strong> (depuis le Chrome Web Store).</li>
        <li {pair_attr('Téléchargez le zip du composant depuis sa fiche, puis décompressez-le localement.', 'Download the component zip from its detail page, then unzip locally.')}>Téléchargez le zip du composant depuis sa fiche, puis décompressez-le localement.</li>
        <li {pair_attr('Connectez-vous à votre org cible. Cliquez l’icône Lightning Studio dans la barre Chrome.', 'Log in to your target org. Click the Lightning Studio icon in the Chrome toolbar.')}>Connectez-vous à votre org cible. Cliquez l’icône Lightning Studio dans la barre Chrome.</li>
        <li {pair_attr('Créez un nouveau LWC du même nom (ex : <code>seFrAccountHealth</code>). Pour chaque fichier du bundle (<code>.js</code>, <code>.html</code>, <code>.css</code>, <code>.js-meta.xml</code>), ouvrez le fichier local, copiez tout le contenu, collez-le dans l’éditeur Lightning Studio, puis <strong>Save</strong>.', 'Create a new LWC with the same name (e.g. <code>seFrAccountHealth</code>). For each file in the bundle (<code>.js</code>, <code>.html</code>, <code>.css</code>, <code>.js-meta.xml</code>), open the local file, copy all content, paste it into the Lightning Studio editor, then <strong>Save</strong>.')}>Créez un nouveau LWC du même nom (ex : <code>seFrAccountHealth</code>). Pour chaque fichier du bundle (<code>.js</code>, <code>.html</code>, <code>.css</code>, <code>.js-meta.xml</code>), ouvrez le fichier local, copiez tout le contenu, collez-le dans l’éditeur Lightning Studio, puis <strong>Save</strong>.</li>
        <li {pair_attr('Si le composant a des dépendances Apex, répétez l’opération côté <em>Apex Class</em> (créez la classe, copiez-collez le contenu de chaque <code>.cls</code>, save).', 'If the component has Apex dependencies, repeat the same flow for <em>Apex Class</em> (create the class, paste each <code>.cls</code>, save).')}>Si le composant a des dépendances Apex, répétez l’opération côté <em>Apex Class</em> (créez la classe, copiez-collez le contenu de chaque <code>.cls</code>, save).</li>
        <li {pair_attr('Ouvrez App Builder, glissez le composant <code>SE FR - &lt;Name&gt;</code> sur la page voulue, configurez les propriétés.', 'Open App Builder, drag the <code>SE FR - &lt;Name&gt;</code> component on the right page, configure the properties.')}>Ouvrez App Builder, glissez le composant <code>SE FR - &lt;Name&gt;</code> sur la page voulue, configurez les propriétés.</li>
        <li {pair_attr('<strong>Hard refresh</strong> de la page (<code>Cmd</code>+<code>Shift</code>+<code>R</code> sur Mac, <code>Ctrl</code>+<code>Shift</code>+<code>R</code> sur Windows) pour forcer le rechargement du bundle compilé.', '<strong>Hard refresh</strong> the page (<code>Cmd</code>+<code>Shift</code>+<code>R</code> on Mac, <code>Ctrl</code>+<code>Shift</code>+<code>R</code> on Windows) to force the compiled bundle to reload.')}><strong>Hard refresh</strong> de la page (<code>Cmd</code>+<code>Shift</code>+<code>R</code> sur Mac, <code>Ctrl</code>+<code>Shift</code>+<code>R</code> sur Windows) pour forcer le rechargement du bundle compilé.</li>
      </ol>
      <div class="callout">
        <strong>💡 </strong><span {pair_attr('Méthode pratique pour démarrer ou pour des composants sans Apex. Pour un déploiement multiple ou propre, préférez la CLI ou le bouton Déployer du site.', 'Handy way to bootstrap or for Apex-free components. For multi-component deploys or proper CI, prefer the CLI or the site’s Deploy button.')}>Méthode pratique pour démarrer ou pour des composants sans Apex. Pour un déploiement multiple ou propre, préférez la CLI ou le bouton Déployer du site.</span>
      </div>

      <h2 id="app-builder" {pair_attr('Configurer dans Page Builder', 'Configure in App Builder')}>Configurer dans Page Builder</h2>
      <p {pair_attr('Une fois le composant déployé, vous le retrouvez dans App Builder dans la palette gauche sous le nom <code>SE FR - &lt;Nom&gt;</code>. Glissez-le sur la page voulue, le panneau de droite expose toutes les propriétés <code>@api</code> du composant.', 'Once the component is deployed, you find it in App Builder in the left palette under <code>SE FR - &lt;Name&gt;</code>. Drag it onto the page, the right panel exposes every <code>@api</code> property of the component.')}>Une fois le composant déployé, vous le retrouvez dans App Builder dans la palette gauche sous le nom <code>SE FR - &lt;Nom&gt;</code>. Glissez-le sur la page voulue, le panneau de droite expose toutes les propriétés <code>@api</code> du composant.</p>

      <h3 {pair_attr('Conventions de nommage côté palette', 'Palette naming conventions')}>Conventions de nommage côté palette</h3>
      <ul>
        <li {pair_attr('<strong>API name LWC</strong> : <code>seFr&lt;Name&gt;</code> (camelCase, sans underscore). C’est le nom du dossier de bundle et le tag HTML interne.', '<strong>LWC API name</strong>: <code>seFr&lt;Name&gt;</code> (camelCase, no underscore). It’s the bundle folder name and internal HTML tag.')}><strong>API name LWC</strong> : <code>seFr&lt;Name&gt;</code> (camelCase, sans underscore). C’est le nom du dossier de bundle et le tag HTML interne.</li>
        <li {pair_attr('<strong>Master label App Builder</strong> : <code>SE FR - &lt;Human name&gt;</code>. C’est ce que vous voyez dans la palette de gauche et dans la barre de titre de la page.', '<strong>App Builder master label</strong>: <code>SE FR - &lt;Human name&gt;</code>. This is what you see in the left palette and in the page title bar.')}><strong>Master label App Builder</strong> : <code>SE FR - &lt;Human name&gt;</code>. C’est ce que vous voyez dans la palette de gauche et dans la barre de titre de la page.</li>
        <li {pair_attr('<strong>Classe Apex</strong> (si applicable) : <code>SE_FR_&lt;Name&gt;Controller</code>.', '<strong>Apex class</strong> (if applicable): <code>SE_FR_&lt;Name&gt;Controller</code>.')}><strong>Classe Apex</strong> (si applicable) : <code>SE_FR_&lt;Name&gt;Controller</code>.</li>
      </ul>

      <h3 {pair_attr('Format des entrées (props)', 'Input formats (props)')}>Format des entrées (props)</h3>
      <p {pair_attr('Les propriétés de type complexe acceptent deux formats selon le composant :', 'Complex-type properties accept two formats depending on the component:')}>Les propriétés de type complexe acceptent deux formats selon le composant :</p>
      <ul>
        <li {pair_attr('<strong>CSV / pipe-separated</strong> : format majoritaire. Une ligne par item, champs séparés par <code>|</code>, items séparés par virgule ou retour à la ligne. Exemple <code>seFrAlertsRibbon.rulesCsv</code> :', '<strong>CSV / pipe-separated</strong>: most common. One line per item, fields split by <code>|</code>, items split by comma or newline. Example <code>seFrAlertsRibbon.rulesCsv</code>:')}><strong>CSV / pipe-separated</strong> : format majoritaire. Une ligne par item, champs séparés par <code>|</code>, items séparés par virgule ou retour à la ligne. Exemple <code>seFrAlertsRibbon.rulesCsv</code> :</li>
      </ul>
      <pre>AnnualRevenue&gt;1000000|warning|utility:warning|Compte stratégique|Voir|/lightning/o/Account/list
LastActivityDate&lt;Today-30|info|utility:clock|Aucune activité depuis 30j||</pre>
      <ul>
        <li {pair_attr('<strong>JSON array</strong> : pour les données numériques ou structurées. Exemple <code>seFrMetricTile.seriesJson</code> :', '<strong>JSON array</strong>: for numeric or structured data. Example <code>seFrMetricTile.seriesJson</code>:')}><strong>JSON array</strong> : pour les données numériques ou structurées. Exemple <code>seFrMetricTile.seriesJson</code> :</li>
      </ul>
      <pre>[2.1, 2.4, 2.7, 3.0, 3.2, 3.1, 3.3, 3.5, 3.4, 3.6, 3.7, 3.85]</pre>
      <p {pair_attr('La <em>description</em> de chaque propriété dans App Builder précise le format attendu. Si elle dit <em>« CSV »</em> ou <em>« pipe-separated »</em>, c’est le premier format. Si elle dit <em>« JSON array »</em>, c’est le second.', 'Each property’s <em>description</em> in App Builder spells out the expected format. If it says <em>"CSV"</em> or <em>"pipe-separated"</em>, use the first format. If it says <em>"JSON array"</em>, use the second.')}>La <em>description</em> de chaque propriété dans App Builder précise le format attendu. Si elle dit <em>« CSV »</em> ou <em>« pipe-separated »</em>, c’est le premier format. Si elle dit <em>« JSON array »</em>, c’est le second.</p>

      <h3 {pair_attr('Override par instance', 'Per-instance override')}>Override par instance</h3>
      <p {pair_attr('Toutes les valeurs par défaut sont ré-écrivables au niveau d’une page : ce que vous saisissez dans App Builder gagne toujours sur le défaut codé dans le composant. Vous pouvez donc avoir 3 instances du même composant sur 3 pages avec 3 configs différentes.', 'Every default is overridable per page: whatever you type in App Builder always wins over the component’s baked-in default. You can have 3 instances of the same component on 3 pages with 3 different configs.')}>Toutes les valeurs par défaut sont ré-écrivables au niveau d’une page : ce que vous saisissez dans App Builder gagne toujours sur le défaut codé dans le composant. Vous pouvez donc avoir 3 instances du même composant sur 3 pages avec 3 configs différentes.</p>

      <h2 id="bilingual" {pair_attr('Bilingue FR / EN', 'Bilingual FR / EN')}>Bilingue FR / EN</h2>
      <p {pair_attr('Tous les composants supportent le français et l’anglais. Chaque LWC expose une prop <code>language</code> :', 'All components support French and English. Each LWC exposes a <code>language</code> prop:')}>Tous les composants supportent le français et l'anglais. Chaque LWC expose une prop <code>language</code> :</p>
      <ul>
        <li><code>fr</code> — <span {pair_attr('défaut de la lib', 'library default')}>défaut de la lib</span></li>
        <li><code>en</code> — <span {pair_attr('pour les démos internationales', 'for international demos')}>pour les démos internationales</span></li>
      </ul>
      <p {pair_attr('Override par instance dans App Builder. Les strings, dates, devises et labels calculés (mois, status pills) se switchent à l’exécution.', 'Override per-instance in App Builder. Strings, dates, currency and computed labels (month names, status pills) all switch at runtime.')}>Override par instance dans App Builder. Les strings, dates, devises et labels calculés (mois, status pills) se switchent à l'exécution.</p>

      <h2 id="data-modes" {pair_attr('Data modes', 'Data modes')}>Data modes</h2>
      <p {pair_attr('Les composants se rangent en trois data modes :', 'Components fall into three data modes:')}>Les composants se rangent en trois data modes :</p>
      <ul>
        <li><code>live</code> — <span {pair_attr('lit / écrit des records réels dans l’org', 'reads / writes real records')}>lit / écrit des records réels dans l'org</span></li>
        <li><code>hybrid</code> — <span {pair_attr('utilise les données réelles si présentes, sinon fallback mock', 'real data + mock fallback when fields are missing or empty')}>utilise les données réelles si présentes, sinon fallback mock</span></li>
        <li><code>mock</code> — <span {pair_attr('100% client-side, aucune dépendance org', 'fully scripted client-side, zero org dependency')}>100% client-side, aucune dépendance org</span></li>
      </ul>
      <p {pair_attr('Cela rend les composants safe à poser sur une org neuve pour une démo one-shot.', 'This makes the components safe to drop on a brand-new org for a one-shot demo.')}>Cela rend les composants safe à poser sur une org neuve pour une démo one-shot.</p>

      <h2 id="named-credential" {pair_attr('Setup Named Credential', 'Named Credential setup')}>Setup Named Credential</h2>
      <p {pair_attr('Quelques composants Agentforce — typiquement <code>seFrPromptLauncher</code>, et le bouton « Résumer » de <code>seFrContactCard</code> / <code>seFrSmartRecommendations</code> — font des callouts REST authentifiés vers l’API Salesforce de l’org pour exécuter les Prompt Templates. Sans Named Credential, ces appels échouent.', 'A few Agentforce-related components — typically <code>seFrPromptLauncher</code>, and the "Summarize" button on <code>seFrContactCard</code> / <code>seFrSmartRecommendations</code> — make authenticated REST callouts to the org’s Salesforce API to run Prompt Templates. Without a Named Credential, these calls fail.')}>Quelques composants Agentforce — typiquement <code>seFrPromptLauncher</code>, et le bouton « Résumer » de <code>seFrContactCard</code> / <code>seFrSmartRecommendations</code> — font des callouts REST authentifiés vers l'API Salesforce de l'org pour exécuter les Prompt Templates. Sans Named Credential, ces appels échouent.</p>
      <p {pair_attr('Le NC attendu s’appelle <code>Agentforce_API</code> (convention de la lib). Il sert à atteindre n’importe quel endpoint <code>/services/data/...</code> de l’org : Prompt Templates, Agent API, custom REST.', 'The expected Named Credential is <code>Agentforce_API</code> (library convention). It’s used to reach any <code>/services/data/...</code> endpoint of the org: Prompt Templates, Agent API, custom REST.')}>Le NC attendu s'appelle <code>Agentforce_API</code> (convention de la lib). Il sert à atteindre n'importe quel endpoint <code>/services/data/...</code> de l'org : Prompt Templates, Agent API, custom REST.</p>
      <p {pair_attr('Setup ~10 minutes, à faire <strong>une fois par org</strong>. La chaîne : Connected App (avec scopes <code>api chatbot_api refresh_token einstein_gpt_api</code>) → Auth Provider <em>Salesforce</em> qui réutilise les credentials de la Connected App → External Credential OAuth 2.0 / Browser Flow qui pointe sur l’Auth Provider → Permission Set qui mappe le principal de l’External Credential sur l’utilisateur → Named Credential <code>Agentforce_API</code> qui pointe sur <code>https://&lt;your-domain&gt;.my.salesforce.com</code> en réutilisant l’External Credential.', 'Setup ~10 minutes, done <strong>once per org</strong>. The chain: Connected App (scopes <code>api chatbot_api refresh_token einstein_gpt_api</code>) → <em>Salesforce</em>-type Auth Provider reusing the Connected App credentials → OAuth 2.0 / Browser Flow External Credential pointing to the Auth Provider → Permission Set mapping the External Credential principal to your user → Named Credential <code>Agentforce_API</code> pointing to <code>https://&lt;your-domain&gt;.my.salesforce.com</code> via the External Credential.')}>Setup ~10 minutes, à faire <strong>une fois par org</strong>. La chaîne : Connected App (avec scopes <code>api chatbot_api refresh_token einstein_gpt_api</code>) → Auth Provider <em>Salesforce</em> qui réutilise les credentials de la Connected App → External Credential OAuth 2.0 / Browser Flow qui pointe sur l'Auth Provider → Permission Set qui mappe le principal de l'External Credential sur l'utilisateur → Named Credential <code>Agentforce_API</code> qui pointe sur <code>https://&lt;your-domain&gt;.my.salesforce.com</code> en réutilisant l'External Credential.</p>
      <p class="note" {pair_attr('Pièges classiques : <strong>PKCE</strong> coché par défaut côté Connected App ET Auth Provider — il faut le décocher des deux côtés. <strong>External Credential</strong> est dispo à partir de Spring ’23. <strong>Permission Set mapping</strong> se fait via la section <em>External Credential Principal Access</em>, pas via Object/Field permissions. Le <strong>nom du Named Credential</strong> doit matcher exactement <code>Agentforce_API</code> (sensible à la casse).', 'Common pitfalls: <strong>PKCE</strong> is checked by default on both the Connected App AND the Auth Provider — uncheck on both. <strong>External Credential</strong> requires Spring ’23 or later. <strong>Permission Set mapping</strong> is done via the <em>External Credential Principal Access</em> section, not via Object/Field permissions. The <strong>Named Credential name</strong> must match <code>Agentforce_API</code> exactly (case-sensitive).')}>Pièges classiques : <strong>PKCE</strong> coché par défaut côté Connected App ET Auth Provider — il faut le décocher des deux côtés. <strong>External Credential</strong> est dispo à partir de Spring '23. <strong>Permission Set mapping</strong> se fait via la section <em>External Credential Principal Access</em>, pas via Object/Field permissions. Le <strong>nom du Named Credential</strong> doit matcher exactement <code>Agentforce_API</code> (sensible à la casse).</p>
      <p {pair_attr('Test rapide depuis la Developer Console :', 'Quick test from the Developer Console:')}>Test rapide depuis la Developer Console :</p>
      <pre>HttpRequest req = new HttpRequest();
req.setEndpoint('callout:Agentforce_API/services/data/v62.0/actions/custom/generatePromptResponse');
req.setMethod('GET');
HttpResponse res = new Http().send(req);
System.debug(res.getStatusCode() + ' ' + res.getBody().abbreviate(500));</pre>
      <p class="note" {pair_attr('Doit retourner <strong>200</strong> + la liste des prompts. <strong>401/403</strong> = revoir l’External Credential / Permission Set. <strong>404</strong> = URL incorrecte. <em>« Named Credential not found »</em> = NC absent ou mal nommé.', 'Should return <strong>200</strong> + the prompt list. <strong>401/403</strong> = re-check External Credential / Permission Set. <strong>404</strong> = wrong URL. <em>"Named Credential not found"</em> = NC missing or misnamed.')}>Doit retourner <strong>200</strong> + la liste des prompts. <strong>401/403</strong> = revoir l'External Credential / Permission Set. <strong>404</strong> = URL incorrecte. <em>« Named Credential not found »</em> = NC absent ou mal nommé.</p>

      <h2 id="data-compat" {pair_attr('Compatibilité avec une SDO standard', 'Compatibility with a standard SDO')}>Compatibilité avec une SDO standard</h2>
      <p {pair_attr('Les composants tournent sur le data model Salesforce standard sans aucun champ custom obligatoire. Tout ce qu’ils lisent (Account, Contact, Opportunity, Case, Order, Task, Event, ContentDocumentLink…) existe out of the box sur n’importe quelle SDO.', 'Components run on the standard Salesforce data model with zero mandatory custom field. Everything they read (Account, Contact, Opportunity, Case, Order, Task, Event, ContentDocumentLink…) ships out of the box on any SDO.')}>Les composants tournent sur le data model Salesforce standard sans aucun champ custom obligatoire. Tout ce qu’ils lisent (Account, Contact, Opportunity, Case, Order, Task, Event, ContentDocumentLink…) existe out of the box sur n’importe quelle SDO.</p>
      <p {pair_attr('Quelques composants <em>peuvent</em> exploiter des champs custom spécifiques à l’SDO Cust360 (signaux client) ou MAPS (visites terrain). S’ils sont absents, le composant bascule silencieusement en mode mock — aucun crash, aucun message d’erreur.', 'A few components <em>can</em> use custom fields specific to the Cust360 SDO (customer signals) or MAPS (field visits). When absent, the component silently falls back to mock — no crash, no error.')}>Quelques composants <em>peuvent</em> exploiter des champs custom spécifiques à l’SDO Cust360 (signaux client) ou MAPS (visites terrain). S’ils sont absents, le composant bascule silencieusement en mode mock — aucun crash, aucun message d’erreur.</p>
      <ul>
        <li><code>seFrAccountHealth</code> — <span {pair_attr('exploite optionnellement <code>NPS__c</code> et <code>SDO_MAPS_Days_Since_Last_Visit__c</code> pour enrichir les signaux. Sans ces champs, le score reste calculé à partir des champs standards (<code>AnnualRevenue</code>, <code>LastActivityDate</code>, Open Cases, Orders).', 'optionally uses <code>NPS__c</code> and <code>SDO_MAPS_Days_Since_Last_Visit__c</code> to enrich signals. Without these, the score is computed from standard fields only (<code>AnnualRevenue</code>, <code>LastActivityDate</code>, Open Cases, Orders).')}>exploite optionnellement <code>NPS__c</code> et <code>SDO_MAPS_Days_Since_Last_Visit__c</code> pour enrichir les signaux. Sans ces champs, le score reste calculé à partir des champs standards (<code>AnnualRevenue</code>, <code>LastActivityDate</code>, Open Cases, Orders).</span></li>
        <li><code>seFrContactCard</code>, <code>seFrRelatedRecordCard</code> — <span {pair_attr('exploitent optionnellement <code>SDO_Cust360_Contact_Picture_URL__c</code>, <code>SDO_Cust360_ChurnRisk__c</code>. Sans ces champs, l’avatar peut être uploadé manuellement (voir ci-dessous) et les jauges se cachent.', 'optionally use <code>SDO_Cust360_Contact_Picture_URL__c</code>, <code>SDO_Cust360_ChurnRisk__c</code>. Without these, the avatar is manually uploadable (see below) and gauges are hidden.')}>exploitent optionnellement <code>SDO_Cust360_Contact_Picture_URL__c</code>, <code>SDO_Cust360_ChurnRisk__c</code>. Sans ces champs, l’avatar peut être uploadé manuellement (voir ci-dessous) et les jauges se cachent.</span></li>
        <li><code>seFrNearbyAccountsMap</code> — <span {pair_attr('utilise <code>BillingLatitude</code> / <code>BillingLongitude</code> standards. Pour la distance « jours depuis la dernière visite », exploite <code>SDO_MAPS_Days_Since_Last_Visit__c</code> si présent.', 'uses standard <code>BillingLatitude</code> / <code>BillingLongitude</code>. For the "days since last visit" indicator, uses <code>SDO_MAPS_Days_Since_Last_Visit__c</code> if present.')}>utilise <code>BillingLatitude</code> / <code>BillingLongitude</code> standards. Pour la distance « jours depuis la dernière visite », exploite <code>SDO_MAPS_Days_Since_Last_Visit__c</code> si présent.</span></li>
      </ul>

      <h2 id="data-images" {pair_attr('Upload d’images simplifié', 'Simplified image upload')}>Upload d’images simplifié</h2>
      <p {pair_attr('Les composants qui affichent des images (<code>seFrRecordHighlights</code>, <code>seFrContactCard</code>, <code>seFrRelatedRecordCard</code>, <code>seFrFilesGallery</code>) passent par <strong>ContentDocument</strong> attaché au record — pas par des Static Resources ou des champs <code>ImageURL__c</code> qui varient d’une org à l’autre.', 'Components that display images (<code>seFrRecordHighlights</code>, <code>seFrContactCard</code>, <code>seFrRelatedRecordCard</code>, <code>seFrFilesGallery</code>) use <strong>ContentDocument</strong> attached to the record — not Static Resources or org-specific <code>ImageURL__c</code> fields.')}>Les composants qui affichent des images (<code>seFrRecordHighlights</code>, <code>seFrContactCard</code>, <code>seFrRelatedRecordCard</code>, <code>seFrFilesGallery</code>) passent par <strong>ContentDocument</strong> attaché au record — pas par des Static Resources ou des champs <code>ImageURL__c</code> qui varient d’une org à l’autre.</p>
      <p {pair_attr('Concrètement : sur le composant déployé, vous cliquez sur l’avatar / la zone image, vous sélectionnez un fichier local, l’image est sauvegardée comme un <code>ContentVersion</code> + <code>ContentDocumentLink</code> sur le record courant, et l’URL de rendu est utilisée automatiquement. Aucun setup admin, aucun host externe, aucun champ custom.', 'Concretely: on the deployed component, click the avatar / image zone, pick a local file, the image is saved as a <code>ContentVersion</code> + <code>ContentDocumentLink</code> on the current record, and the rendition URL is used automatically. No admin setup, no external host, no custom field.')}>Concrètement : sur le composant déployé, vous cliquez sur l’avatar / la zone image, vous sélectionnez un fichier local, l’image est sauvegardée comme un <code>ContentVersion</code> + <code>ContentDocumentLink</code> sur le record courant, et l’URL de rendu est utilisée automatiquement. Aucun setup admin, aucun host externe, aucun champ custom.</p>
      <p {pair_attr('La logique partagée vit dans <code>SE_FR_ImageFileController</code> (Apex partagé) — déployé une fois, réutilisé par tous les composants concernés.', 'Shared logic lives in <code>SE_FR_ImageFileController</code> (shared Apex) — deployed once, reused by every image-aware component.')}>La logique partagée vit dans <code>SE_FR_ImageFileController</code> (Apex partagé) — déployé une fois, réutilisé par tous les composants concernés.</p>

      <h2 id="data-shine" {pair_attr('Faire briller la démo — varier les données', 'Make the demo shine — vary the data')}>Faire briller la démo — varier les données</h2>
      <p {pair_attr('Sur une org neuve, plusieurs composants Live (Activity Feed, Pipeline Snapshot, Customer Orders, My Events…) seront pauvres en contenu. Pour un rendu optimal, il faut <strong>varier les données autour du compte vitrine</strong> :', 'On a fresh org, several Live components (Activity Feed, Pipeline Snapshot, Customer Orders, My Events…) look thin. For an optimal demo, <strong>vary the data around your showcase account</strong>:')}>Sur une org neuve, plusieurs composants Live (Activity Feed, Pipeline Snapshot, Customer Orders, My Events…) seront pauvres en contenu. Pour un rendu optimal, il faut <strong>varier les données autour du compte vitrine</strong> :</p>
      <ul>
        <li {pair_attr('<strong>Étaler les dates</strong> : <code>CloseDate</code> des Opportunities sur 6 mois roulants, <code>EffectiveDate</code> des Orders sur 24 mois, <code>StartDateTime</code> des Events à venir sur les 14 prochains jours, <code>ActivityDate</code> des Tasks variées.', '<strong>Stagger dates</strong>: Opportunity <code>CloseDate</code> across 6 rolling months, Order <code>EffectiveDate</code> across 24 months, future Events <code>StartDateTime</code> within the next 14 days, varied Task <code>ActivityDate</code>.')}><strong>Étaler les dates</strong> : <code>CloseDate</code> des Opportunities sur 6 mois roulants, <code>EffectiveDate</code> des Orders sur 24 mois, <code>StartDateTime</code> des Events à venir sur les 14 prochains jours, <code>ActivityDate</code> des Tasks variées.</li>
        <li {pair_attr('<strong>Mixer les statuts</strong> : Opportunities sur plusieurs <code>StageName</code> (Prospecting / Qualification / Proposal / Closed Won), Cases sur plusieurs <code>Status</code> (New / Working / Escalated / Closed), Orders mix Activated / Draft.', '<strong>Mix statuses</strong>: Opportunities across several <code>StageName</code> values (Prospecting / Qualification / Proposal / Closed Won), Cases across several <code>Status</code> values (New / Working / Escalated / Closed), Orders mix Activated / Draft.')}><strong>Mixer les statuts</strong> : Opportunities sur plusieurs <code>StageName</code> (Prospecting / Qualification / Proposal / Closed Won), Cases sur plusieurs <code>Status</code> (New / Working / Escalated / Closed), Orders mix Activated / Draft.</li>
        <li {pair_attr('<strong>Charger des images</strong> : avatar Contact via <code>seFrContactCard</code>, photo Account via <code>seFrRecordHighlights</code>, fichiers via <code>seFrFilesGallery</code> — quelques uploads suffisent pour donner du relief.', '<strong>Upload images</strong>: Contact avatar via <code>seFrContactCard</code>, Account photo via <code>seFrRecordHighlights</code>, files via <code>seFrFilesGallery</code> — a few uploads are enough to add depth.')}><strong>Charger des images</strong> : avatar Contact via <code>seFrContactCard</code>, photo Account via <code>seFrRecordHighlights</code>, fichiers via <code>seFrFilesGallery</code> — quelques uploads suffisent pour donner du relief.</li>
        <li {pair_attr('<strong>Adresses françaises</strong> (ou cohérentes avec votre démo) : <code>BillingStreet</code>, <code>BillingCity</code>, <code>BillingPostalCode</code>, <code>BillingLatitude</code> / <code>BillingLongitude</code> sur les Accounts. <code>seFrNearbyAccountsMap</code> et <code>seFrTerritoryMap</code> en bénéficient directement.', '<strong>French addresses</strong> (or whatever matches your demo): <code>BillingStreet</code>, <code>BillingCity</code>, <code>BillingPostalCode</code>, <code>BillingLatitude</code> / <code>BillingLongitude</code> on Accounts. <code>seFrNearbyAccountsMap</code> and <code>seFrTerritoryMap</code> light up.')}><strong>Adresses françaises</strong> (ou cohérentes avec votre démo) : <code>BillingStreet</code>, <code>BillingCity</code>, <code>BillingPostalCode</code>, <code>BillingLatitude</code> / <code>BillingLongitude</code> sur les Accounts. <code>seFrNearbyAccountsMap</code> et <code>seFrTerritoryMap</code> en bénéficient directement.</li>
        <li {pair_attr('<strong>Activité réaliste sur le compte vitrine</strong> : 1-2 Tasks complétées récentes, 1-2 Events à venir, 1-2 Cases ouverts, 3-5 Opportunities sur stages variés, quelques Orders Activated. Cela alimente Activity Feed, Pipeline Snapshot, Customer Orders, Account Health en parallèle.', '<strong>Realistic activity on the showcase account</strong>: 1-2 recent completed Tasks, 1-2 upcoming Events, 1-2 open Cases, 3-5 Opportunities across varied stages, a few Activated Orders. This feeds Activity Feed, Pipeline Snapshot, Customer Orders, Account Health in parallel.')}><strong>Activité réaliste sur le compte vitrine</strong> : 1-2 Tasks complétées récentes, 1-2 Events à venir, 1-2 Cases ouverts, 3-5 Opportunities sur stages variés, quelques Orders Activated. Cela alimente Activity Feed, Pipeline Snapshot, Customer Orders, Account Health en parallèle.</li>
      </ul>
      <div class="callout">
        <strong>💡 </strong><span {pair_attr('Astuce : générez ce data setup en quelques secondes via <strong>Claude Code</strong> ou <strong>Cursor</strong>. Pointez l’assistant sur votre org cible (CLI authentifiée), donnez-lui l’ID de votre compte vitrine, demandez-lui d’écrire un script Apex idempotent qui étale dates / statuts / Tasks / Events selon les besoins ci-dessus. Le script peut tourner via <code>sf apex run</code> en quelques secondes — pas besoin d’admin manuelle.', 'Tip: generate this data setup in seconds via <strong>Claude Code</strong> or <strong>Cursor</strong>. Point the assistant at your target org (authenticated CLI), give it your showcase Account Id, ask it to write an idempotent Apex script that staggers dates / statuses / Tasks / Events along the lines above. Run the script via <code>sf apex run</code> — no manual admin needed.')}>Astuce : générez ce data setup en quelques secondes via <strong>Claude Code</strong> ou <strong>Cursor</strong>. Pointez l’assistant sur votre org cible (CLI authentifiée), donnez-lui l’ID de votre compte vitrine, demandez-lui d’écrire un script Apex idempotent qui étale dates / statuts / Tasks / Events selon les besoins ci-dessus. Le script peut tourner via <code>sf apex run</code> en quelques secondes — pas besoin d’admin manuelle.</span>
      </div>

      <h2 id="naming" {pair_attr('Conventions de nommage (interne)', 'Naming conventions (internal)')}>Conventions de nommage (interne)</h2>
      <p {pair_attr('Conventions internes utilisées par le mainteneur. Vous n’avez pas à les respecter pour contribuer — c’est le mainteneur qui adapte vos composants au modèle.', 'Internal conventions used by the maintainer. You don’t have to follow them to contribute — the maintainer adapts your components to the standard.')}>Conventions internes utilisées par le mainteneur. Vous n'avez pas à les respecter pour contribuer — c'est le mainteneur qui adapte vos composants au modèle.</p>
      <ul>
        <li><span {pair_attr('Dossier LWC / classe JS', 'LWC folder / JS class')}>Dossier LWC / classe JS</span> : <code>seFr</code> + PascalCase (ex : <code>seFrAccountStrategyPlan</code>)</li>
        <li><span {pair_attr('Classe Apex', 'Apex class')}>Classe Apex</span> : <code>SE_FR_</code> + PascalCase (ex : <code>SE_FR_AccountHealthController</code>)</li>
        <li><span {pair_attr('Master label App Builder', 'App Builder master label')}>Master label App Builder</span> : <code>SE FR - &lt;Human name&gt;</code></li>
        <li><span {pair_attr('Strings custom', 'Custom strings')}>Strings custom</span> : <span {pair_attr('défauts en français, override par <code>language</code> ou prop explicite', 'French defaults, overridable via <code>language</code> or explicit prop')}>défauts en français, override par <code>language</code> ou prop explicite</span></li>
      </ul>

      <h2 id="schema-safe" {pair_attr('Apex schema-safe', 'Schema-safe Apex')}>Apex schema-safe</h2>
      <p {pair_attr('Quand un champ custom optionnel <em>peut</em> enrichir l’UI (ex : <code>NPS__c</code>), l’Apex vérifie <code>Schema.SObjectType.X.fields.getMap()</code> avant de le référencer — déploiement OK que le champ existe ou non.', 'Where an optional custom field <em>can</em> enrich the UI (e.g. <code>NPS__c</code>), Apex checks <code>Schema.SObjectType.X.fields.getMap()</code> before referencing it so deploys succeed regardless of whether the field exists.')}>Quand un champ custom optionnel <em>peut</em> enrichir l'UI (ex : <code>NPS__c</code>), l'Apex vérifie <code>Schema.SObjectType.X.fields.getMap()</code> avant de le référencer — déploiement OK que le champ existe ou non.</p>

      <h2 id="defaults" {pair_attr('Valeurs par défaut de la lib', 'Library defaults')}>Valeurs par défaut de la lib</h2>
      <ul>
        <li><code>language</code> : <code>fr</code></li>
        <li><code>currencyCode</code> : <code>EUR</code></li>
        <li><code>localeTag</code> : <code>fr-FR</code></li>
        <li><span {pair_attr('Aucun texte d’UI ne révèle le mode mock/démo', 'No UI copy ever reveals mock/demo mode')}>Aucun texte d'UI ne révèle le mode mock/démo</span></li>
      </ul>
    </article>
  </div>
</div>"""
    return html_shell("Docs — LWC Library SE FR", body,
                      active="docs", base="", component_count=n_components,
                      search_index=search_index)


# ----------------------------------------------------------------------
# PAGE: whats-new.html (parsed from README changelog)
# ----------------------------------------------------------------------
def render_whats_new(releases: list[dict], n_components: int, search_index: list[dict]) -> str:
    def pair_attr(fr: str, en: str) -> str:
        s = json.dumps({"fr": fr, "en": en}, ensure_ascii=False).replace("'", "&#39;")
        return f"data-i18n-pair='{s}'"
    if not releases:
        timeline = '<p style="color:var(--text-muted)">No release notes yet.</p>'
    else:
        items = []
        for i, r in enumerate(releases):
            minor = " minor" if i > 0 else ""
            title = r.get("title") or {}
            body = r.get("body") or {}
            title_fr = title.get("fr", "") if isinstance(title, dict) else str(title)
            title_en = title.get("en", title_fr) if isinstance(title, dict) else str(title)
            body_fr = body.get("fr", "") if isinstance(body, dict) else str(body)
            body_en = body.get("en", body_fr) if isinstance(body, dict) else str(body)
            items.append(f"""
    <div class="release{minor}">
      <div class="release-meta">
        <span class="release-version">v{r.get('version','')}</span>
        <span class="release-date">{r.get('date','')}</span>
      </div>
      <h2 {pair_attr(title_fr, title_en)}>{title_fr}</h2>
      <p {pair_attr(body_fr, body_en)}>{body_fr}</p>
    </div>""")
        timeline = "".join(items)

    body = f"""<div class="container">
  <header class="page-header">
    <h1 {pair_attr('📣 Nouveautés', '📣 What’s new')}>📣 Nouveautés</h1>
    <div class="subtitle" {pair_attr('L’historique des releases — nouveaux composants, refontes, polish.', 'Release history — new components, refactors, polish.')}>L'historique des releases — nouveaux composants, refontes, polish.</div>
  </header>
</div>

<div class="container-narrow">
  <div class="timeline">{timeline}</div>
</div>"""
    return html_shell("Nouveautés — LWC Library SE FR", body,
                      active="whats-new", base="", component_count=n_components,
                      search_index=search_index)


# ----------------------------------------------------------------------
# PAGE: contributors.html
# ----------------------------------------------------------------------
def initials_of(name: str) -> str:
    parts = name.split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return name[:2].upper()


def render_contributors(components: list[dict], n_components: int, search_index: list[dict]) -> str:
    def pair_attr(fr: str, en: str) -> str:
        s = json.dumps({"fr": fr, "en": en}, ensure_ascii=False).replace("'", "&#39;")
        return f"data-i18n-pair='{s}'"

    # Group: maintainer (Lionel) + external contributors with components
    by_author: dict[str, list[dict]] = {}
    for c in components:
        a = c.get("originalAuthor", "Unknown")
        by_author.setdefault(a, []).append(c)

    cards_html = ""
    grad_idx = 0
    def _author_totals(comps: list[dict]) -> tuple[int, int]:
        """Sum downloads + likes across all components of an author (using the same seed)."""
        tdl = tlk = 0
        for cc in comps:
            d, l = seeded_counts(cc["apiName"], cc.get("featuredRank"))
            tdl += d
            tlk += l
        return tdl, tlk

    # Maintainer first (no special highlight — same card style as others)
    lionel = by_author.pop("Lionel Braun", [])
    if lionel:
        items = "".join(
            f'<a href="components/{c["apiName"]}.html"><span>{html_lib.escape((c.get("masterLabel") or c["apiName"]).replace("SE FR - ","").strip())}</span><span class="api">{c["apiName"]}</span></a>'
            for c in sorted(lionel, key=lambda x: x["apiName"])[:6]
        )
        tdl, tlk = _author_totals(lionel)
        cards_html += f"""
    <article class="contributor">
      <div class="contrib-head">
        <div class="avatar" style="background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)">LB</div>
        <div>
          <div class="contrib-name">Lionel Braun</div>
          <div class="contrib-role" {pair_attr('Mainteneur · Solution Engineer France', 'Maintainer · Solution Engineer France')}>Mainteneur · Solution Engineer France</div>
        </div>
      </div>
      <div class="contrib-stats">
        <div class="contrib-stat"><span class="icon">🧩</span><span class="num">{len(lionel)}</span><div class="label" {pair_attr('Composants', 'Components')}>Composants</div></div>
        <div class="contrib-stat"><span class="icon">⬇</span><span class="num">{fmt_count(tdl)}</span><div class="label" {pair_attr('Téléchargements', 'Downloads')}>Téléchargements</div></div>
        <div class="contrib-stat"><span class="icon">♥</span><span class="num">{fmt_count(tlk)}</span><div class="label" {pair_attr('Likes', 'Likes')}>Likes</div></div>
      </div>
      <div class="contrib-list">
        <h4 {pair_attr('Sélection', 'Featured authored')}>Sélection</h4>
        {items}
      </div>
    </article>"""

    # External contributors
    for author, comps in by_author.items():
        sample = comps[0]
        email = sample.get("originalAuthorEmail")
        joined = sample.get("libraryIntegrationDate")
        items = "".join(
            f'<a href="components/{c["apiName"]}.html"><span>{html_lib.escape((c.get("masterLabel") or c["apiName"]).replace("SE FR - ","").strip())}</span><span class="api">{c["apiName"]}</span></a>'
            for c in sorted(comps, key=lambda x: x["apiName"])
        )
        gradient = AVATAR_GRADIENTS[grad_idx % len(AVATAR_GRADIENTS)]
        grad_idx += 1
        comp_label_fr = 'Composant' if len(comps) == 1 else 'Composants'
        comp_label_en = 'Component' if len(comps) == 1 else 'Components'
        tdl, tlk = _author_totals(comps)
        meta_rows = (
            f'<div class="contrib-stat"><span class="icon">🧩</span><span class="num">{len(comps)}</span><div class="label" {pair_attr(comp_label_fr, comp_label_en)}>{comp_label_fr}</div></div>'
            f'<div class="contrib-stat"><span class="icon">⬇</span><span class="num">{fmt_count(tdl)}</span><div class="label" {pair_attr("Téléchargements", "Downloads")}>Téléchargements</div></div>'
            f'<div class="contrib-stat"><span class="icon">♥</span><span class="num">{fmt_count(tlk)}</span><div class="label" {pair_attr("Likes", "Likes")}>Likes</div></div>'
        )
        is_se = 'salesforce.com' in (email or '')
        role_fr = 'Contributeur · Solution Engineer France' if is_se else 'Contributeur externe'
        role_en = 'Contributor · Solution Engineer France' if is_se else 'External contributor'
        cards_html += f"""
    <article class="contributor">
      <div class="contrib-head">
        <div class="avatar" style="background: {gradient}">{initials_of(author)}</div>
        <div>
          <div class="contrib-name">{html_lib.escape(author)}</div>
          <div class="contrib-role" {pair_attr(role_fr, role_en)}>{role_fr}</div>
        </div>
      </div>
      <div class="contrib-stats">{meta_rows}</div>
      <div class="contrib-list">
        <h4 {pair_attr('Auteur original', 'Original author')}>Auteur original</h4>
        {items}
      </div>
    </article>"""

    body = f"""<div class="container">
  <header class="page-header">
    <h1 {pair_attr('👥 Contributeurs', '👥 Contributors')}>👥 Contributeurs</h1>
    <div class="subtitle" {pair_attr('Les Solution Engineers derrière la librairie. Chaque composant porte un en-tête d’attribution créditant son auteur original.', 'The Solution Engineers behind the library. Every component carries an attribution header crediting its original author.')}>Les Solution Engineers derrière la librairie. Chaque composant porte un en-tête d'attribution créditant son auteur original.</div>
  </header>

  <div class="lead-intro">
    <h2 {pair_attr('Ajoutez votre composant à la librairie', 'Add your component to this library')}>Ajoutez votre composant à la librairie</h2>
    <p {pair_attr('Vous avez construit un composant qui plairait à d’autres SE ? La lib a un chemin de contribution simple avec une revue rapide et un en-tête d’attribution standard — votre nom reste sur le composant pour toujours.', 'Built something for a demo that other SEs might love? The library has a contribution path with a quick review and a standard attribution header — your name stays on the component forever.')}>Vous avez construit un composant qui plairait à d'autres SE ? La lib a un chemin de contribution simple avec une revue rapide et un en-tête d'attribution standard — votre nom reste sur le composant pour toujours.</p>
    <button type="button" class="btn btn-primary" data-mock="submit-component" {pair_attr('Soumettre un composant →', 'Submit a component →')}>Soumettre un composant →</button>
  </div>

  <div class="contributors-grid">
{cards_html}
  </div>
</div>"""
    return html_shell("Contributors — LWC Library SE FR", body,
                      active="contributors", base="", component_count=n_components,
                      search_index=search_index)


# ----------------------------------------------------------------------
# Component previews — scan Drive folder, group by apiName, copy locally
# ----------------------------------------------------------------------
def collect_previews(api_names: set[str], dest_dir: Path) -> dict[str, list[str]]:
    """Look inside SOURCE_PREVIEWS, match files to known apiNames
    (case-insensitive, tolerant to suffixes like `-2`, `-3` and trailing
    human notes). Copy matches into dest_dir, return {api: [filename, …]}
    sorted so the bare `<api>.<ext>` is index 0 (primary preview)."""
    if not SOURCE_PREVIEWS.exists():
        print(f"  ⚠ previews source not found: {SOURCE_PREVIEWS}")
        return {}

    dest_dir.mkdir(parents=True, exist_ok=True)
    api_lookup = {a.lower(): a for a in api_names}

    # Friendly aliases — let the user drop files using natural / legacy names
    # that don't exactly match the apiName (renames over time).
    PREVIEW_ALIASES = {
        "sefrordertaking": "sefrorderentry",
        "sefrcustomerorder": "sefrcustomerorders",  # singular → plural
        "sefrkpitile": "sefrmetrictile",            # legacy → new name
        "sefrrelatedrecord": "sefrrelatedrecordcard",
        "sefrrecordhighlight": "sefrrecordhighlights",  # singular → plural
        "sefrmetricsparkline": "sefrmetrictile",    # legacy from earlier rename
        "sefragentchat": "sefrpromptlauncher",      # legacy from earlier rename
        "sefrcontentmanager": "sefrconsentmanager", # typo: contENT vs consENT
        "sefrsmartrecomendations": "sefrsmartrecommendations",  # typo: missing m
        "sefrfieldsalesdashboard": "sefrfieldrephome",
        "sefrtelesalesdashboard": "sefrtelesalesrephome",
    }

    # Match `<api>` (primary) or `<api>-<n>` (variant); tolerate trailing
    # "(notes)" or "_human readable" — anything before the extension.
    pattern = re.compile(
        r"^seFr-?(?P<rest>[A-Za-z]+?)(?:-(?P<idx>\d+))?(?:[\s_(].*)?$",
        re.IGNORECASE,
    )

    grouped: dict[str, list[tuple[int, Path]]] = {}
    skipped: list[str] = []

    for src in sorted(SOURCE_PREVIEWS.iterdir()):
        if src.name.startswith("."):
            continue
        if src.suffix.lower() not in PREVIEW_EXTS:
            continue
        stem = src.stem
        m = pattern.match(stem)
        if not m:
            skipped.append(src.name + " (cannot parse)")
            continue
        api_lc = ("sefr" + m.group("rest")).lower()
        # Resolve aliases so legacy / typo'd names still find their target component.
        api_lc = PREVIEW_ALIASES.get(api_lc, api_lc)
        if api_lc not in api_lookup:
            skipped.append(src.name + f" (unknown apiName: seFr{m.group('rest')})")
            continue
        api = api_lookup[api_lc]
        idx = int(m.group("idx") or 1)
        grouped.setdefault(api, []).append((idx, src))

    out: dict[str, list[str]] = {}
    for api, items in grouped.items():
        items.sort(key=lambda x: x[0])
        copied: list[str] = []
        for idx, src in items:
            ext = src.suffix.lower()
            target_name = f"{api}.{ext.lstrip('.')}" if idx == 1 else f"{api}-{idx}.{ext.lstrip('.')}"
            dst = dest_dir / target_name
            shutil.copy2(src, dst)
            copied.append(target_name)
        out[api] = copied

    print(f"  Previews: {sum(len(v) for v in out.values())} images for {len(out)} components")
    if skipped:
        for s in skipped:
            print(f"    ⚠ skipped: {s}")
    return out


# ----------------------------------------------------------------------
# Search index (Cmd+K)
# ----------------------------------------------------------------------
def build_search_index(components: list[dict], recipes: list[dict]) -> list[dict]:
    out: list[dict] = []
    for c in sorted(components, key=lambda x: x["apiName"]):
        api = c["apiName"]
        name = (c.get("masterLabel") or api).replace("SE FR - ", "").strip()
        haystack = " ".join([api, name, c.get("tagline","")] + (c.get("personas") or []) + (c.get("chips") or [])).lower()
        out.append({
            "name": name,
            "api": api,
            "tagline": c.get("tagline", ""),
            "href": f"components/{api}.html",
            "haystack": haystack,
        })
    for r in recipes:
        out.append({
            "name": "📖 " + r.get("title", ""),
            "api": "recipe",
            "tagline": r.get("description", ""),
            "href": f"cookbook.html#{r.get('id','')}",
            "haystack": (r.get("title", "") + " " + r.get("description","")).lower(),
        })
    return out


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
def main() -> int:
    global _GLOBAL_I18N, _GLOBAL_INDEX_FR
    if not MANIFEST.exists():
        raise SystemExit(f"{MANIFEST} not found — run build_manifest.py first.")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    components = sorted(manifest["components"], key=lambda c: c["apiName"])
    n = len(components)

    # FR translations (optional). Build a {api: {tagline, chips, keyProps,
    # seBenefit}} dict the JS uses to swap content at runtime.
    if MANIFEST_FR.exists():
        manifest_fr = json.loads(MANIFEST_FR.read_text(encoding="utf-8"))
        for c_fr in manifest_fr.get("components", []):
            api = c_fr.get("apiName")
            if not api:
                continue
            _GLOBAL_I18N[api] = {
                "tagline": c_fr.get("tagline", ""),
                "seBenefit": c_fr.get("seBenefit", ""),
                "chips": c_fr.get("chips") or [],
                "keyProps": c_fr.get("keyProps") or [],
            }
        _GLOBAL_INDEX_FR = build_search_index(
            manifest_fr.get("components", []),
            [],  # recipes already built once in EN below
        )

    # Recipes
    recipes = parse_recipes(RECIPES_YML) if RECIPES_YML.exists() else []
    apis = {c["apiName"] for c in components}
    bad = []
    for r in recipes:
        if r.get("components") == "ALL":
            continue
        for a in (r.get("components") or []):
            if a not in apis:
                bad.append((r.get("id"), a))
    if bad:
        for rid, a in bad:
            print(f"⚠ recipe {rid} references unknown component: {a}", file=sys.stderr)

    # Changelog
    releases = parse_release_notes(RELEASE_NOTES_YML)

    # Reset output dirs
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir(parents=True)
    ASSETS_DIR.mkdir(parents=True)
    COMPONENTS_DIR.mkdir(parents=True)

    # Static assets
    (ASSETS_DIR / "site.css").write_text(CSS, encoding="utf-8")
    (ASSETS_DIR / "site.js").write_text(JS, encoding="utf-8")
    if SOURCE_LOGO_LIB.exists():
        shutil.copy(SOURCE_LOGO_LIB, ASSETS_DIR / "logo-library.png")
    else:
        # fallback to project root logo
        for candidate in [ROOT.parent / "Logo LWC Library transparent.png", ROOT.parent / "Logo LWC Library.png"]:
            if candidate.exists():
                shutil.copy(candidate, ASSETS_DIR / "logo-library.png")
                break
    if SOURCE_LOGO_SEFR.exists():
        shutil.copy(SOURCE_LOGO_SEFR, ASSETS_DIR / "logo-sefr.png")
    else:
        for candidate in [ROOT.parent / "Salesforce SE FR logo.png"]:
            if candidate.exists():
                shutil.copy(candidate, ASSETS_DIR / "logo-sefr.png")
                break
    # Technical user guide (FR) — copied so the Docs page can link to it.
    if SOURCE_USER_GUIDE.exists():
        shutil.copy(SOURCE_USER_GUIDE, ASSETS_DIR / "user-guide-fr.md")

    # Component preview images
    global _GLOBAL_PREVIEWS
    api_names = {c["apiName"] for c in components}
    _GLOBAL_PREVIEWS = collect_previews(api_names, ASSETS_DIR / "previews")

    # Search index — common to every page
    search_index = build_search_index(components, recipes)

    # Pages
    (SITE / "index.html").write_text(
        render_index(components, recipes, n, search_index), encoding="utf-8")
    (SITE / "components.html").write_text(
        render_components_page(components, n, search_index), encoding="utf-8")
    (SITE / "cookbook.html").write_text(
        render_cookbook(components, recipes, n, search_index), encoding="utf-8")
    (SITE / "about.html").write_text(
        render_about(n, search_index), encoding="utf-8")
    (SITE / "docs.html").write_text(
        render_docs(n, search_index), encoding="utf-8")
    (SITE / "whats-new.html").write_text(
        render_whats_new(releases, n, search_index), encoding="utf-8")
    (SITE / "contributors.html").write_text(
        render_contributors(components, n, search_index), encoding="utf-8")

    for c in components:
        (COMPONENTS_DIR / f"{c['apiName']}.html").write_text(
            render_component_detail(c, components, recipes, n, search_index),
            encoding="utf-8",
        )

    print(f"✔ Built _site/ : index, components, {n} component pages, cookbook, about, docs, whats-new, contributors")
    print(f"  Open: file://{(SITE / 'index.html').resolve()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
