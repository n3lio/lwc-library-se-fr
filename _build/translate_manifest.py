#!/usr/bin/env python3
"""Translate the editorial fields of manifest.json into French via the
Anthropic API, producing _build/manifest.fr.json that the site consumes
for FR rendering.

Translated fields per component:
  - tagline
  - chips[]
  - keyProps[]
  - seBenefit
  - description (meta.xml description)

Untouched fields: apiName, masterLabel (Salesforce-side identifier),
properties[].* (technical), categories / personas / surfaces (canonical
identifiers, the site translates labels separately).

Manual overrides: anything in _build/manifest_fr_overrides.yml is
applied AFTER the API call, letting Lionel fix specific phrasings.

Usage:
  export ANTHROPIC_API_KEY=sk-ant-...
  python3 _build/translate_manifest.py [--force] [--dry-run]

Without --force, components already present in manifest.fr.json with the
same source content are skipped (cheap re-runs).

Without --dry-run, you need the `anthropic` Python SDK installed:
  pip install anthropic
"""

from __future__ import annotations
import argparse
import hashlib
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_EN = ROOT / "_build" / "manifest.json"
MANIFEST_FR = ROOT / "_build" / "manifest.fr.json"
OVERRIDES_YML = ROOT / "_build" / "manifest_fr_overrides.yml"

MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """You translate technical UI copy from English to French
for a Salesforce demo-component library used by Solution Engineers in
France. Tone: technical but punchy, peer-to-peer, no marketing fluff.

Conventions:
- Keep code spans (`like-this`) verbatim, do NOT translate identifiers
  or property names inside backticks.
- Keep brand / product names verbatim: Salesforce, Lightning, Apex, App
  Builder, Agentforce, Einstein, Prompt Template, SObject, Record Page,
  Home Page, App Page, Account, Contact, Opportunity, Case, Lead, Order,
  Task, Event, Service, Sales, Field Sales, Telesales, Marketing, Mock,
  Live, Hybrid.
- Keep emoji and symbols (·, &, +, /, etc.) untouched.
- Keep HTML tags (<code>, <strong>, <em>, <br>, <a>) verbatim.
- Translate "SE" / "SEs" as "SE" / "SE" (singular only — French uses
  it loanword).
- Idioms: "schema-safe" → "schema-safe" (technical, keep), "out of the
  box" → "prêt à l'emploi", "drag and drop" → "drag-and-drop",
  "wow moment" / "wow effect" → "effet Waouh" (Salesforce FR convention),
  "demo-ready" → "prêt pour la démo".
- Keep the same number of items in arrays. Don't merge or split.
- Length budget: roughly the same length as the source.

Output format: JSON object with the same keys as the input. No prose
outside the JSON. No code fences. No comments.
"""

# ----------------------------------------------------------------------
# Tiny YAML reader for manifest_fr_overrides.yml
# Format:
#   seFrAccountHealth:
#     tagline: "Texte traduit à la main."
#     chips:
#       - "Item 1"
#       - "Item 2"
# ----------------------------------------------------------------------
def parse_overrides(path: Path) -> dict:
    if not path.exists():
        return {}
    out: dict = {}
    current_api: str | None = None
    current_field: str | None = None
    is_list = False
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        # Top-level api key (no indent, ends with ':')
        m = re.match(r"^([A-Za-z][A-Za-z0-9_]+)\s*:\s*$", line)
        if m:
            current_api = m.group(1)
            out[current_api] = {}
            current_field = None
            is_list = False
            continue
        # 2-space indent: field
        m = re.match(r"^  ([a-zA-Z]+)\s*:\s*(.*)$", line)
        if m and current_api is not None:
            field, val = m.group(1), m.group(2).strip()
            current_field = field
            if val == "":
                out[current_api][field] = []
                is_list = True
            else:
                if val.startswith('"') and val.endswith('"'):
                    val = val[1:-1]
                out[current_api][field] = val
                is_list = False
            continue
        # 4-space list item under a field
        m = re.match(r"^    -\s+(.*)$", line)
        if m and current_api and current_field and is_list:
            v = m.group(1).strip()
            if v.startswith('"') and v.endswith('"'):
                v = v[1:-1]
            out[current_api][current_field].append(v)
    return out


def hash_source(c: dict) -> str:
    """Hash the EN source fields so we can detect what changed."""
    blob = json.dumps({
        "tagline": c.get("tagline", ""),
        "chips": c.get("chips") or [],
        "keyProps": c.get("keyProps") or [],
        "seBenefit": c.get("seBenefit", ""),
        "description": c.get("description", ""),
    }, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]


def call_claude(client, payload: dict) -> dict:
    """Call the Anthropic API with the given EN payload, return FR payload."""
    user_prompt = (
        "Translate these editorial fields to French following the rules. "
        "Return only the JSON.\n\n"
        + json.dumps(payload, indent=2, ensure_ascii=False)
    )
    msg = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = "".join(b.text for b in msg.content if hasattr(b, "text"))
    # Strip code fences if any
    text = re.sub(r"^```(?:json)?\s*\n", "", text.strip())
    text = re.sub(r"\n```\s*$", "", text.strip())
    return json.loads(text)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true",
                    help="Re-translate even unchanged components")
    ap.add_argument("--dry-run", action="store_true",
                    help="Show what would be translated without calling the API")
    args = ap.parse_args()

    if not MANIFEST_EN.exists():
        raise SystemExit(f"{MANIFEST_EN} not found — run build_manifest.py first.")
    en = json.loads(MANIFEST_EN.read_text(encoding="utf-8"))

    existing: dict = {}
    if MANIFEST_FR.exists():
        try:
            existing = json.loads(MANIFEST_FR.read_text(encoding="utf-8"))
        except Exception:
            existing = {}
    existing_components = {c["apiName"]: c for c in existing.get("components", [])}

    overrides = parse_overrides(OVERRIDES_YML)

    fr_components: list[dict] = []
    to_translate: list[dict] = []

    for c in en["components"]:
        api = c["apiName"]
        h = hash_source(c)
        prev = existing_components.get(api)

        # If we have a translation with matching source hash and not --force, reuse it.
        # Refresh non-translated fields (masterLabel, apiName) from EN source —
        # they may have changed (e.g. SE FR → CCO FR rebrand) without affecting
        # the translation hash.
        if not args.force and prev and prev.get("_sourceHash") == h:
            prev["masterLabel"] = c.get("masterLabel", prev.get("masterLabel", ""))
            fr_components.append(prev)
            continue

        # Otherwise mark for translation.
        payload = {
            "apiName": api,
            "tagline": c.get("tagline", ""),
            "chips": c.get("chips") or [],
            "keyProps": c.get("keyProps") or [],
            "seBenefit": c.get("seBenefit", ""),
            "description": c.get("description", ""),
        }
        to_translate.append((c, payload, h))

    print(f"Total: {len(en['components'])} components")
    print(f"  reused from cache: {len(fr_components)}")
    print(f"  to translate     : {len(to_translate)}")

    if args.dry_run:
        for _, payload, _ in to_translate:
            print(f"  - {payload['apiName']}: tagline={payload['tagline'][:60]}…")
        return 0

    if to_translate:
        try:
            import anthropic
        except ImportError:
            print("ERROR: pip install anthropic", file=sys.stderr)
            return 1
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            print("ERROR: set ANTHROPIC_API_KEY env var", file=sys.stderr)
            return 1
        client = anthropic.Anthropic(api_key=api_key)

        for src, payload, h in to_translate:
            api = payload["apiName"]
            print(f"  translating {api}…")
            try:
                fr = call_claude(client, payload)
            except Exception as e:
                print(f"    ✗ failed: {e}", file=sys.stderr)
                # Fall back to copying EN — better than missing.
                fr = payload
            # Merge back into the full component record (technical fields untouched).
            merged = dict(src)
            for k in ("tagline", "chips", "keyProps", "seBenefit", "description"):
                if k in fr:
                    merged[k] = fr[k]
            merged["_sourceHash"] = h
            fr_components.append(merged)

    # Apply manual overrides on top of the translated set.
    by_api = {c["apiName"]: c for c in fr_components}
    for api, fields in overrides.items():
        if api not in by_api:
            print(f"⚠ override for unknown component: {api}", file=sys.stderr)
            continue
        c = by_api[api]
        for k, v in fields.items():
            c[k] = v

    out = {
        "generatedAt": en.get("generatedAt"),
        "componentCount": len(fr_components),
        "components": fr_components,
    }
    MANIFEST_FR.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n✔ Wrote {MANIFEST_FR.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
