#!/usr/bin/env python3
"""Refresh the Agentforce knowledge base after the library changed.

One command, idempotent. To be called by the validation MCP server (or by hand)
after a component was added / updated / removed, a recipe or release note changed.

    python3 _build/refresh_agent_kb.py              # rebuild site + KB PDF, re-upload, smoke test
    python3 _build/refresh_agent_kb.py --no-upload  # build the PDF only (_doc/SE_FR_Library_KnowledgeBase.pdf)
    python3 _build/refresh_agent_kb.py --skip-build # PDF + upload from the current _site/ and manifest

Steps
  1. build_manifest.py + build_site.py   (the KB extracts About/Docs from the rendered _site/)
  2. build_knowledge_pdf.py              -> _doc/SE_FR_Library_KnowledgeBase.html
  3. HTML -> PDF with Playwright         -> _doc/SE_FR_Library_KnowledgeBase.pdf
  4. Data Library SE_FR_Library_Knowledge (org cco-fr-de): delete the old file, add the new one,
     wait until INDEXED  (a same-name file cannot be added twice -> delete first)
  5. Smoke test: ask the live agent about every NEW component (Agent API through the Heroku
     proxy) and check the answer cites its apiName. Fails loudly otherwise.

Needs: sf CLI authenticated on ORG, `uv` (Playwright), network. No secret is read or stored here.
The agent script itself (_agent/LWC_Library_Agent.yaml) does NOT need republishing for new
components: it retrieves from the Data Library at answer time.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "_build"
HTML = ROOT / "_doc" / "SE_FR_Library_KnowledgeBase.html"
PDF = ROOT / "_doc" / "SE_FR_Library_KnowledgeBase.pdf"
ORG = "cco-fr-de"
LIBRARY_ID = "1JDgK000009Lm1FWAS"  # Data Library SE_FR_Library_Knowledge
SITE_URL = "https://lwc-library-se-fr-9ccd5bd44381.herokuapp.com"
MANIFEST = BUILD / "manifest.json"


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    print("  $", " ".join(str(c) for c in cmd))
    return subprocess.run(cmd, text=True, capture_output=True, **kw)


def sf_json(args: list[str]) -> dict:
    r = run(["sf", *args, "--json"])
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        raise SystemExit(f"sf {' '.join(args)} failed:\n{r.stdout}\n{r.stderr}")


def api_names() -> set[str]:
    return {c["apiName"] for c in json.loads(MANIFEST.read_text())["components"]}


def build() -> None:
    for script in ("build_manifest.py", "build_site.py", "build_knowledge_pdf.py"):
        print(f"── {script}")
        r = subprocess.run([sys.executable, str(BUILD / script)])
        if r.returncode:
            raise SystemExit(f"{script} failed ({r.returncode})")


def to_pdf() -> None:
    print("── HTML -> PDF")
    code = (
        "import sys\nfrom playwright.sync_api import sync_playwright\n"
        "src,out=sys.argv[1],sys.argv[2]\n"
        "with sync_playwright() as p:\n"
        "    b=p.chromium.launch();pg=b.new_page();pg.goto('file://'+src,wait_until='load');pg.wait_for_timeout(2000)\n"
        "    pg.pdf(path=out,format='A4',print_background=True,margin={'top':'15mm','bottom':'15mm','left':'12mm','right':'12mm'});b.close()\n"
    )
    r = subprocess.run(["uv", "run", "--with", "playwright", "python", "-c", code, str(HTML), str(PDF)])
    if r.returncode or not PDF.exists():
        raise SystemExit("PDF generation failed (first time: `uv run --with playwright playwright install chromium`)")
    print(f"   {PDF.name}: {PDF.stat().st_size // 1024} KB")


def upload() -> None:
    print(f"── Data Library {LIBRARY_ID} on {ORG}")
    files = sf_json(["agent", "adl", "file", "list", "-o", ORG, "-i", LIBRARY_ID])["result"]["files"]
    for f in files:
        if f["fileName"] == PDF.name:
            print(f"   delete old {f['fileId']}")
            sf_json(["agent", "adl", "file", "delete", "-o", ORG, "-i", LIBRARY_ID, "--file-id", f["fileId"]])
    # Library can be briefly "not ready" right after a delete: retry the add.
    for attempt in range(1, 9):
        r = run(["sf", "agent", "adl", "file", "add", "-o", ORG, "-i", LIBRARY_ID, "-f", str(PDF), "--json"])
        if r.returncode == 0:
            break
        print(f"   add attempt {attempt} failed, retrying in 30 s: {(r.stdout or r.stderr)[:160]}")
        time.sleep(30)
    else:
        raise SystemExit("could not add the PDF to the Data Library")
    print("   waiting for indexing…")
    for _ in range(60):  # up to ~15 min
        files = sf_json(["agent", "adl", "file", "list", "-o", ORG, "-i", LIBRARY_ID])["result"]["files"]
        st = [f["status"] for f in files if f["fileName"] == PDF.name]
        if st and st[0] == "INDEXED":
            print("   INDEXED")
            return
        if st and st[0] in ("FAILED", "ERROR"):
            raise SystemExit(f"indexing failed: {st[0]}")
        time.sleep(15)
    raise SystemExit("indexing timeout (check `sf agent adl status`)")


def ask(message: str) -> str:
    req = urllib.request.Request(
        f"{SITE_URL}/api/agent/message", data=json.dumps({"message": message}).encode(),
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read()).get("text", "")


def smoke(new: list[str]) -> None:
    print("── Smoke test (live agent)")
    bad = []
    for api in new:
        text = ask(f"Détaille le composant {api}")
        ok = api.lower() in text.lower() and "n'ai trouvé aucun" not in text.lower()
        print(f"   {'OK ' if ok else 'KO '} {api}")
        if not ok:
            bad.append(api)
    if bad:
        raise SystemExit(f"agent does not know: {', '.join(bad)} "
                         "(indexing lag? retry in a few min; otherwise check the PDF contains them)")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--skip-build", action="store_true")
    ap.add_argument("--no-upload", action="store_true")
    ap.add_argument("--check", nargs="*", metavar="seFrXxx",
                    help="components to verify with the live agent (default: none)")
    a = ap.parse_args()
    if not a.skip_build:
        build()
    to_pdf()
    if a.no_upload:
        return 0
    upload()
    if a.check:
        smoke(a.check)
    print("✔ Knowledge base refreshed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
