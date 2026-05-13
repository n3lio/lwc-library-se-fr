#!/usr/bin/env python3
"""
Build a single self-contained HTML file aggregating the CCO FR Library docs
for upload as a Data Library knowledge source.

Output: _doc/SE_FR_Library_KnowledgeBase.html

To turn it into a PDF:
    1. open the .html in Chrome
    2. Cmd+P → Destination: Save as PDF → Save
    3. upload that PDF to the org's Data Library

The KB is EN-only. The Library Agent translates to French at answer time
when needed. We deliberately avoid duplicating content across sections —
each fact lives in a single place so the RAG retrieval is unambiguous:

  1. Canonical component table   (single source of truth, manifest.json)
  2. Cookbook recipes             (recipes.yml)
  3. Release notes                (release_notes.yml)
  4. Contributors                 (manifest, originalAuthor)
  5. Library standards & install  (extracted from _site/docs.html EN)
  6. About — design principles    (extracted from _site/about.html EN)
  7. Per-component prose pages    (each README composant, frontmatter-stripped)
"""

from __future__ import annotations
import json
import re
import sys
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_doc" / "SE_FR_Library_KnowledgeBase.html"
MANIFEST = ROOT / "_build" / "manifest.json"
RECIPES_YML = ROOT / "_build" / "recipes.yml"
RELEASE_NOTES_YML = ROOT / "_build" / "release_notes.yml"
SITE_ABOUT = ROOT / "_site" / "about.html"
SITE_DOCS = ROOT / "_site" / "docs.html"
SITE_CONTRIBUTORS = ROOT / "_site" / "contributors.html"

COMPONENT_READMES = sorted([
    p / "README.md"
    for p in ROOT.iterdir()
    if p.is_dir() and p.name.startswith("seFr") and (p / "README.md").exists()
])

FRONTMATTER_STRIP = re.compile(r"\A---\s*\n.*?\n---\s*\n", re.DOTALL)


# ----------------------------------------------------------------------
# Tiny Markdown -> HTML for component README prose
# ----------------------------------------------------------------------
def md_to_html(src: str) -> str:
    s = src

    def fence(m):
        return "<pre><code>" + m.group(1).replace("<", "&lt;").replace(">", "&gt;") + "</code></pre>"
    s = re.sub(r"```(?:\w+)?\n(.*?)\n```", fence, s, flags=re.DOTALL)
    # Inline code: escape <, >, & inside the backticks so placeholders
    # like `<field>` don't become real (broken) HTML tags.
    def inline_code(m):
        inner = m.group(1).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        return f"<code>{inner}</code>"
    s = re.sub(r"`([^`]+)`", inline_code, s)

    for level in range(6, 0, -1):
        s = re.sub(rf"^{'#' * level}\s+(.+)$", rf"<h{level}>\1</h{level}>", s, flags=re.MULTILINE)

    s = re.sub(r"\*\*([^*]+?)\*\*", r"<strong>\1</strong>", s)
    # Italic: require text on both sides without `<` or `>` so we don't
    # match `<code>gauge2*</code>` etc.
    s = re.sub(r"(?<!\*)\*([^*\n<>]+?)\*(?!\*)", r"<em>\1</em>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)

    def split_md_cells(row: str) -> list[str]:
        # By the time table_block runs, inline_code has already turned
        # `xxx` into <code>xxx</code>. Split on `|` that are not escaped
        # AND not inside <code>…</code>.
        s = row.strip().strip("|")
        cells, buf, in_code = [], [], False
        i = 0
        while i < len(s):
            if s[i:i+6].lower() == "<code>":
                in_code = True
                buf.append(s[i:i+6])
                i += 6
                continue
            if s[i:i+7].lower() == "</code>":
                in_code = False
                buf.append(s[i:i+7])
                i += 7
                continue
            ch = s[i]
            if ch == "\\" and i + 1 < len(s) and s[i + 1] == "|":
                buf.append("|")
                i += 2
                continue
            if ch == "|" and not in_code:
                cells.append("".join(buf).strip())
                buf = []
            else:
                buf.append(ch)
            i += 1
        cells.append("".join(buf).strip())
        return cells

    def table_block(m):
        block = m.group(0).strip()
        rows = block.splitlines()
        header = split_md_cells(rows[0])
        body_rows = [split_md_cells(r) for r in rows[2:]]
        out = ["<table>", "<thead><tr>"]
        out += [f"<th>{h}</th>" for h in header]
        out += ["</tr></thead>", "<tbody>"]
        for body_row in body_rows:
            out.append("<tr>" + "".join(f"<td>{c}</td>" for c in body_row) + "</tr>")
        out += ["</tbody></table>"]
        return "\n".join(out)
    s = re.sub(
        r"(^\|.+\|\n\|[\s\-:|]+\|\n(?:\|.+\|\n?)+)",
        table_block,
        s,
        flags=re.MULTILINE,
    )

    lines = s.split("\n")
    out_lines = []
    in_ul = in_ol = False

    def close_lists():
        nonlocal in_ul, in_ol
        if in_ul:
            out_lines.append("</ul>")
            in_ul = False
        if in_ol:
            out_lines.append("</ol>")
            in_ol = False

    for line in lines:
        ul = re.match(r"^\s*[-*]\s+(.+)$", line)
        ol = re.match(r"^\s*\d+\.\s+(.+)$", line)
        if ul:
            if not in_ul:
                close_lists()
                out_lines.append("<ul>")
                in_ul = True
            out_lines.append(f"<li>{ul.group(1)}</li>")
        elif ol:
            if not in_ol:
                close_lists()
                out_lines.append("<ol>")
                in_ol = True
            out_lines.append(f"<li>{ol.group(1)}</li>")
        else:
            close_lists()
            out_lines.append(line)
    close_lists()
    s = "\n".join(out_lines)

    blocks = re.split(r"\n{2,}", s)
    wrapped = []
    block_tag = re.compile(r"^\s*<(h[1-6]|ul|ol|pre|blockquote|table)\b", re.IGNORECASE)
    for block in blocks:
        stripped = block.strip()
        if not stripped:
            continue
        if block_tag.match(stripped):
            wrapped.append(stripped)
        else:
            wrapped.append("<p>" + stripped.replace("\n", "<br>") + "</p>")
    out = "\n".join(wrapped)

    # Final pass: any <foo> that is not a recognised HTML tag is treated
    # as a placeholder (e.g. raw email autolinks `<charly@x.com>`, custom
    # placeholders like `<your-alias>`) and escaped to plain text so it
    # doesn't break the document structure downstream.
    known = {"a", "br", "code", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
             "hr", "img", "li", "ol", "p", "pre", "span", "strong", "sub", "sup",
             "table", "tbody", "td", "th", "thead", "tr", "ul", "blockquote",
             "section", "article", "header", "footer", "nav", "main", "aside",
             "dd", "dl", "dt", "i", "b", "u"}

    def _escape_unknown(m):
        full = m.group(0)
        name = m.group(1).lower()
        if name in known:
            return full
        return full.replace("<", "&lt;").replace(">", "&gt;")

    # Match opening, closing, or self-closing tags
    out = re.sub(r"</?\s*([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*/?>", _escape_unknown, out)
    return out


# ----------------------------------------------------------------------
# Safe inline HTML — keeps tags from a small editorial whitelist and
# escapes everything else. Used to sanitize the EN values pulled out of
# data-i18n-pair attributes in site pages.
# ----------------------------------------------------------------------
_INLINE_WHITELIST = {"code", "strong", "em", "br", "a", "span", "ul", "ol", "li", "p"}


def _safe_inline_html(s: str) -> str:
    # First escape every < and >, then re-allow the whitelisted tags.
    out = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    for tag in _INLINE_WHITELIST:
        # Open tag, possibly with attributes
        out = re.sub(
            rf"&lt;{tag}(\s[^&]*?)?&gt;",
            lambda m, t=tag: f"<{t}{(m.group(1) or '').replace('&quot;', chr(34)).replace('&amp;', '&')}>",
            out,
        )
        # Close tag
        out = out.replace(f"&lt;/{tag}&gt;", f"</{tag}>")
    return out


# ----------------------------------------------------------------------
# Site HTML extractor — pulls the <main> content out of a generated site
# page, resolves data-i18n-pair to its EN value, and strips lang switches
# / mock buttons / scripts so the RAG only sees the editorial substance.
# ----------------------------------------------------------------------
class SitePageExtractor(HTMLParser):
    """Parse a _site/*.html, capture the <main class="container"> body
    in EN, drop nav/footer/agent/scripts."""

    SKIP_CLASSES = {
        "nav", "footer-inner", "footer-bottom", "agent", "agent-button",
        "lang-switch", "cmd-k", "modal-mask", "search-modal", "toast-host",
        "card-link", "preview-arrow", "preview-dots",
    }
    SKIP_TAGS = {"script", "style", "header", "footer", "nav", "aside"}

    def __init__(self):
        # convert_charrefs=False so &lt;alias&gt; inside <pre> stays escaped
        # in the output. Otherwise those would become real `<alias>` tags
        # that the browser tries to parse, breaking the layout downstream.
        super().__init__(convert_charrefs=False)
        self.depth = 0
        self.capture_depth = -1  # depth at which capture started
        self.skip_depth = -1     # if > -1 we are inside a skip block
        self.buf: list[str] = []
        self.tag_stack: list[str] = []

    def _tag_should_skip(self, tag: str, attrs: list[tuple[str, str]]) -> bool:
        if tag in self.SKIP_TAGS:
            return True
        attr_dict = dict(attrs)
        cls = attr_dict.get("class", "") or ""
        for c in cls.split():
            if c in self.SKIP_CLASSES:
                return True
        # Skip the modal/toast etc that the static site doesn't render
        if attr_dict.get("data-mock"):
            return True
        return False

    def handle_starttag(self, tag, attrs):
        self.depth += 1
        attr_dict = dict(attrs)

        # Start capturing at the first top-level <div class="container">
        # which always wraps the editorial content of a page.
        if self.capture_depth < 0 and tag == "div":
            cls = (attr_dict.get("class") or "").split()
            if "container" in cls or "container-narrow" in cls:
                self.capture_depth = self.depth
                self.tag_stack.append(tag)
                self.buf.append(f"<{tag}>")
                return

        if self.capture_depth < 0:
            return

        # Inside <main>: filter elements we don't want
        if self.skip_depth < 0 and self._tag_should_skip(tag, attrs):
            self.skip_depth = self.depth
            return
        if self.skip_depth >= 0:
            return

        # Resolve data-i18n-pair to EN
        i18n_pair = attr_dict.get("data-i18n-pair")
        i18n = attr_dict.get("data-i18n")
        if i18n_pair:
            try:
                m = json.loads(i18n_pair)
                en = m.get("en") or m.get("fr") or ""
                # The browser already decoded HTML entities in the
                # attribute value, so any `&lt;alias&gt;` placeholder is
                # now a literal `<alias>` that would break the document.
                # Re-escape any tag that's not in our small whitelist.
                en = _safe_inline_html(en)
                # Build clean tag without data-i18n* / event handlers
                self.buf.append(self._reconstruct_tag(tag, attrs, replace_inner=en))
                self.skip_depth = self.depth  # eat the original FR text
                return
            except Exception:
                pass
        if i18n:
            # data-i18n keys point to UI dictionary; we don't have the EN
            # value here. Render a placeholder readable by the agent.
            self.buf.append(self._reconstruct_tag(tag, attrs, replace_inner="…"))
            self.skip_depth = self.depth
            return

        # Normal tag — keep but strip the data-* attributes
        cleaned = self._reconstruct_tag(tag, attrs)
        self.buf.append(cleaned)
        self.tag_stack.append(tag)

    def _reconstruct_tag(self, tag: str, attrs: list[tuple[str, str]], replace_inner: str | None = None) -> str:
        keep = []
        for k, v in attrs:
            if k.startswith("data-"):
                continue
            if k.startswith("on"):
                continue
            if k in ("style",):
                continue
            keep.append((k, v))
        attrs_str = " ".join(f'{k}="{v}"' for k, v in keep)
        sep = " " if attrs_str else ""
        if replace_inner is not None:
            return f"<{tag}{sep}{attrs_str}>{replace_inner}</{tag}>"
        return f"<{tag}{sep}{attrs_str}>"

    def handle_endtag(self, tag):
        if self.skip_depth >= 0:
            if self.depth == self.skip_depth:
                self.skip_depth = -1
            self.depth -= 1
            return
        if self.capture_depth >= 0:
            if self.depth == self.capture_depth:
                self.buf.append(f"</{tag}>")
                self.capture_depth = -2  # done
            else:
                self.buf.append(f"</{tag}>")
                if self.tag_stack and self.tag_stack[-1] == tag:
                    self.tag_stack.pop()
        self.depth -= 1

    def handle_startendtag(self, tag, attrs):
        # self-closing (img, br, hr, …)
        if self.capture_depth < 0 or self.skip_depth >= 0:
            return
        attr_dict = dict(attrs)
        if self._tag_should_skip(tag, attrs) or attr_dict.get("data-mock"):
            return
        self.buf.append(self._reconstruct_tag(tag, attrs).rstrip(">") + " />")

    def handle_data(self, data):
        if self.capture_depth < 0 or self.skip_depth >= 0:
            return
        self.buf.append(data)

    def handle_entityref(self, name):
        # Preserve &amp; &lt; &gt; &quot; &nbsp; etc. as-is in output
        if self.capture_depth < 0 or self.skip_depth >= 0:
            return
        self.buf.append(f"&{name};")

    def handle_charref(self, name):
        # Preserve &#39; &#x27; etc. as-is
        if self.capture_depth < 0 or self.skip_depth >= 0:
            return
        self.buf.append(f"&#{name};")

    def html(self) -> str:
        # Light cleanup: normalize whitespace
        out = "".join(self.buf)
        out = re.sub(r"\n{3,}", "\n\n", out)
        return out


def extract_site_main(path: Path) -> str:
    """Extract the <main> content of a generated site page in EN, with
    data-i18n-pair resolved to EN values and nav/footer/lang switcher
    stripped. Returns just the inner HTML."""
    if not path.exists():
        return f"<p><em>{path.name} not generated yet — run build_site.py first.</em></p>"
    raw = path.read_text(encoding="utf-8")
    parser = SitePageExtractor()
    parser.feed(raw)
    body = parser.html()
    # Strip the outermost <div> wrapper itself for cleaner injection
    body = re.sub(r"^\s*<div[^>]*>", "", body)
    body = re.sub(r"</div>\s*$", "", body)
    return body.strip()


# ----------------------------------------------------------------------
# Tiny YAML readers (subset already used elsewhere)
# ----------------------------------------------------------------------
def parse_recipes(path: Path) -> list[dict]:
    if not path.exists():
        return []
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


def parse_release_notes(path: Path) -> list[dict]:
    if not path.exists():
        return []
    out: list[dict] = []
    cur: dict = {}
    sub_key: str | None = None
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
        key, val = m.group(2), m.group(3).strip()
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
# Section renderers
# ----------------------------------------------------------------------
def section_wrap(title: str, anchor: str, body_html: str) -> str:
    return (
        f'<section id="{anchor}" class="component-section">\n'
        f'  <h1 class="section-title">{title}</h1>\n'
        f'  <div class="section-body">{body_html}</div>\n'
        "</section>"
    )


def render_canonical_table(manifest: dict) -> str:
    rows = ["<table>", "<thead><tr>"]
    headers = [
        "API name", "Master label", "Tagline", "Categories", "Personas",
        "Surfaces", "Objects", "Data mode", "Mobile-ready", "Release status",
        "Apex deps", "Original author",
    ]
    rows += [f"<th>{h}</th>" for h in headers] + ["</tr></thead>", "<tbody>"]
    for c in manifest["components"]:
        deps = ", ".join(c.get("apexDeps", []) + [
            f"{x} (shared)" for x in c.get("sharedApexDeps", [])
        ]) or "—"
        cells = [
            f"<code>{c['apiName']}</code>",
            c.get("masterLabel") or "—",
            c.get("tagline") or "—",
            ", ".join(c.get("categories", [])),
            ", ".join(c.get("personas", [])),
            ", ".join(c.get("surfaces", [])),
            ", ".join(c.get("objects", [])) or "Any",
            c.get("dataMode") or "—",
            "yes" if c.get("mobileReady") else "no",
            c.get("releaseStatus") or "stable",
            deps,
            c.get("originalAuthor") or "Lionel Braun",
        ]
        rows.append("<tr>" + "".join(f"<td>{x}</td>" for x in cells) + "</tr>")
    rows += ["</tbody></table>"]

    note = (
        "<p><strong>How to read this table:</strong> every row is a real "
        "component. Names follow the <code>seFr*</code> convention and are "
        "the only valid component identifiers — anything else (e.g. "
        "&quot;Account 360°&quot;, &quot;Performance&quot;) is a category "
        "or persona heading, not a component. When asked &quot;what "
        "components are there?&quot;, list rows from this table.</p>"
        "<p><strong>Per-component details</strong> (full prose, key props, "
        "edge-cases, install steps, data prereqs) live further down in "
        "this document under the &quot;Component &middot; <code>seFrXxx</code>&quot; sections.</p>"
    )

    return note + "".join(rows)


def render_cookbook(recipes: list[dict], manifest: dict) -> str:
    by_api = {c["apiName"]: c for c in manifest["components"]}

    def label(api: str) -> str:
        c = by_api.get(api)
        if not c:
            return api
        return (c.get("masterLabel") or api).replace("CCO FR - ", "").strip()

    out = [
        "<p>Pre-built component bundles for typical demo scenarios. Each "
        "recipe groups components that work well together on the same page "
        "or persona context.</p>"
    ]
    for r in recipes:
        comps = r.get("components") or []
        if comps == "ALL":
            comps_list = list(by_api.keys())
            comp_html = f"<em>Every component in the library ({len(comps_list)} total).</em>"
        else:
            items = "".join(
                f'<li><code>{a}</code> — {label(a)}</li>' for a in comps
            )
            comp_html = f"<ul>{items}</ul>"
        out.append(
            f'<h3>{r.get("emoji","📦")} {r.get("title","")}</h3>'
            f'<p>{r.get("description","")}</p>'
            f'<p><strong>Primary persona:</strong> {r.get("primaryPersona","All")}</p>'
            f'{comp_html}'
        )
    return "\n".join(out)


def render_releases(releases: list[dict]) -> str:
    out = ["<p>Curated release history. Newest first.</p>"]
    for r in releases:
        title = r.get("title") or {}
        body = r.get("body") or {}
        title_en = title.get("en") if isinstance(title, dict) else str(title or "")
        body_en = body.get("en") if isinstance(body, dict) else str(body or "")
        out.append(
            f'<h3>v{r.get("version","")} — {r.get("date","")}</h3>'
            f'<p><strong>{title_en or ""}</strong></p>'
            f'<p>{body_en or ""}</p>'
        )
    return "\n".join(out)


def render_contributors(manifest: dict) -> str:
    by_author: dict[str, list[dict]] = {}
    for c in manifest["components"]:
        a = c.get("originalAuthor") or "Lionel Braun"
        by_author.setdefault(a, []).append(c)

    out = [
        "<p>SEs who authored or contributed components to the library. "
        "Lionel Braun is the maintainer; external contributors keep the "
        "<em>original author</em> credit on their components.</p>"
    ]
    # Maintainer first
    lionel = by_author.pop("Lionel Braun", None)
    if lionel:
        items = "".join(
            f'<li><code>{c["apiName"]}</code> — {(c.get("masterLabel") or c["apiName"]).replace("CCO FR - ","").strip()}</li>'
            for c in sorted(lionel, key=lambda x: x["apiName"])
        )
        out.append(
            f'<h3>Lionel Braun — Maintainer</h3>'
            f'<p>{len(lionel)} components.</p>'
            f'<ul>{items}</ul>'
        )
    for author, comps in by_author.items():
        sample = comps[0]
        email = sample.get("originalAuthorEmail") or ""
        joined = sample.get("libraryIntegrationDate") or ""
        items = "".join(
            f'<li><code>{c["apiName"]}</code> — {(c.get("masterLabel") or c["apiName"]).replace("CCO FR - ","").strip()}</li>'
            for c in comps
        )
        meta_bits = []
        if email:
            meta_bits.append(email)
        if joined:
            meta_bits.append(f"integrated {joined}")
        meta = f' ({", ".join(meta_bits)})' if meta_bits else ""
        out.append(
            f'<h3>{author}{meta}</h3>'
            f'<ul>{items}</ul>'
        )
    return "\n".join(out)


def render_component_section(readme: Path, manifest_by_api: dict) -> str:
    api = readme.parent.name
    md = readme.read_text(encoding="utf-8")
    md = FRONTMATTER_STRIP.sub("", md)
    body = md_to_html(md)

    # Add a small lead from the canonical record so the agent can match
    # the prose to a specific component without re-running the table.
    c = manifest_by_api.get(api, {})
    name = (c.get("masterLabel") or api).replace("CCO FR - ", "").strip()
    cats = ", ".join(c.get("categories", [])) or "—"
    surfaces = ", ".join(c.get("surfaces", [])) or "—"
    objects = ", ".join(c.get("objects", [])) or "Any"
    apex_deps = (c.get("apexDeps") or []) + [
        f"{x} (shared)" for x in (c.get("sharedApexDeps") or [])
    ]
    apex_str = ", ".join(apex_deps) or "none"
    lead = (
        f'<p class="kb-comp-lead"><strong>API name:</strong> <code>{api}</code> · '
        f'<strong>Categories:</strong> {cats} · '
        f'<strong>Surfaces:</strong> {surfaces} · '
        f'<strong>Objects:</strong> {objects} · '
        f'<strong>Data mode:</strong> {c.get("dataMode","mock")} · '
        f'<strong>Mobile-ready:</strong> {"yes" if c.get("mobileReady") else "no"} · '
        f'<strong>Apex:</strong> {apex_str}</p>'
    )

    return (
        f'<section id="{api}" class="component-section">\n'
        f'  <h1 class="section-title">Component · {name} (<code>{api}</code>)</h1>\n'
        f'  <div class="section-body">{lead}{body}</div>\n'
        "</section>"
    )


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
def main() -> None:
    if not MANIFEST.exists():
        raise SystemExit(f"Manifest not found at {MANIFEST}. Run build_manifest.py first.")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest_by_api = {c["apiName"]: c for c in manifest["components"]}
    recipes = parse_recipes(RECIPES_YML)
    releases = parse_release_notes(RELEASE_NOTES_YML)

    sections: list[tuple[str, str, str]] = []  # (anchor, title, html)

    sections.append((
        "canonical-table",
        "Canonical component table",
        render_canonical_table(manifest),
    ))

    sections.append((
        "cookbook",
        "Cookbook recipes",
        render_cookbook(recipes, manifest),
    ))

    sections.append((
        "release-notes",
        "Release notes",
        render_releases(releases),
    ))

    sections.append((
        "contributors",
        "Contributors",
        render_contributors(manifest),
    ))

    sections.append((
        "about",
        "About — design principles, reading a component page",
        extract_site_main(SITE_ABOUT),
    ))

    sections.append((
        "docs",
        "Library standards, install methods, configuration, data setup",
        extract_site_main(SITE_DOCS),
    ))

    # Per-component prose pages (32)
    for readme in COMPONENT_READMES:
        sections.append((
            readme.parent.name,
            f"Component · {readme.parent.name}",
            "",  # placeholder, real HTML built below
        ))

    # Stitch the file
    html_head = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CCO FR Library — Knowledge Base</title>
<style>
  @page {{ size: A4; margin: 18mm 16mm; }}
  body {{
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #181818;
    max-width: 920px;
    margin: 0 auto;
    padding: 24px 28px;
  }}
  h1.section-title {{
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 22pt;
    color: #032D60;
    border-bottom: 2px solid #0176D3;
    padding-bottom: 6px;
    margin-top: 36px;
    page-break-before: always;
  }}
  h1.section-title:first-of-type {{ page-break-before: auto; }}
  h1, h2, h3, h4 {{
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #032D60;
    line-height: 1.25;
  }}
  h2 {{ font-size: 16pt; margin-top: 22px; }}
  h3 {{ font-size: 13pt; margin-top: 18px; color: #0176D3; }}
  h4 {{ font-size: 11.5pt; margin-top: 14px; }}
  p {{ margin: 0 0 8px 0; }}
  ul, ol {{ margin: 6px 0 10px 22px; padding: 0; }}
  li {{ margin: 2px 0; }}
  code {{
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 10pt;
    background: #F4F6F9;
    padding: 1px 5px;
    border-radius: 3px;
  }}
  pre {{
    background: #F4F6F9;
    padding: 10px 12px;
    border-radius: 4px;
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 9.5pt;
    line-height: 1.4;
    overflow-x: auto;
    page-break-inside: avoid;
  }}
  pre code {{ background: transparent; padding: 0; }}
  table {{
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0 14px 0;
    font-size: 10.5pt;
    page-break-inside: avoid;
  }}
  th, td {{
    border: 1px solid #E5E5E5;
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
  }}
  th {{
    background: #F4F6F9;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 9.5pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #5C5C5C;
  }}
  a {{ color: #0176D3; text-decoration: none; }}
  a:hover {{ text-decoration: underline; }}
  .cover {{
    text-align: center;
    padding: 30vh 0 0 0;
    page-break-after: always;
  }}
  .cover h1 {{
    font-size: 36pt;
    margin: 0;
    color: #032D60;
    border: none;
  }}
  .cover .sub {{
    font-size: 13pt;
    color: #5C5C5C;
    margin-top: 16px;
  }}
  .cover .meta {{
    font-size: 10pt;
    color: #8C8C8C;
    margin-top: 36px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }}
  .toc {{ page-break-after: always; }}
  .toc h2 {{ border-bottom: 2px solid #0176D3; padding-bottom: 4px; }}
  .toc ul {{ list-style: none; margin: 0; padding: 0; }}
  .toc li {{ margin: 4px 0; font-size: 11pt; }}
  .toc a {{ color: #032D60; }}
  .kb-comp-lead {{
    background: #F4F6F9;
    border-left: 3px solid #0176D3;
    padding: 10px 14px;
    border-radius: 0 4px 4px 0;
    font-size: 10.5pt;
  }}
  /* Hide site-only widgets that may slip through the extractor */
  .lang-switch, .nav, footer, .agent, .agent-button,
  .modal-mask, .search-modal, .toast-host, .cmd-k {{ display: none !important; }}
</style>
</head>
<body>

<div class="cover">
  <h1>CCO FR Component Library</h1>
  <div class="sub">Knowledge base — for the LWC_Library_Agent</div>
  <div class="meta">Generated {date.today().isoformat()} · Solution Engineering France</div>
</div>

<div class="toc">
  <h2>Table of contents</h2>
  <ul>
"""

    # TOC for top sections + per-component nested
    top_anchors = [s for s in sections if not s[0].startswith("seFr")]
    comp_anchors = [s for s in sections if s[0].startswith("seFr")]
    toc_items = "".join(
        f'    <li><a href="#{a}">{t}</a></li>\n' for a, t, _ in top_anchors
    )
    toc_items += '    <li><strong>Per-component pages</strong><ul>\n'
    toc_items += "".join(
        f'      <li><a href="#{a}">{a}</a></li>\n' for a, t, _ in comp_anchors
    )
    toc_items += '    </ul></li>\n'

    rendered_sections: list[str] = []
    for anchor, title, body_html in sections:
        if anchor.startswith("seFr"):
            readme = next((r for r in COMPONENT_READMES if r.parent.name == anchor), None)
            if readme:
                rendered_sections.append(render_component_section(readme, manifest_by_api))
        else:
            rendered_sections.append(section_wrap(title, anchor, body_html))

    html = html_head + toc_items + """  </ul>
</div>

""" + "\n\n".join(rendered_sections) + "\n</body>\n</html>\n"

    OUT.write_text(html, encoding="utf-8")
    size_kb = OUT.stat().st_size // 1024
    print(f"✔ Wrote {OUT.relative_to(ROOT)} ({size_kb} KB, {len(sections)} sections)")
    print()
    print("Next step:")
    print(f"  1. open '{OUT}' in Chrome")
    print("  2. Cmd+P → Destination: Save as PDF → Save")
    print("  3. upload the PDF to the Data Library `LWC_Library_Data_Library`")


if __name__ == "__main__":
    main()
