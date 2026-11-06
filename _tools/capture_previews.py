#!/usr/bin/env python3
"""Capture _previews/<api>.png for showcase components, straight from the cco-fr-de org.

Usage (from repo root, one-time: `uv run --with playwright playwright install chromium`):
  uv run --with playwright python _tools/capture_previews.py [seFrFoo seFrBar ...]

Logs in via `sf org open --url-only` (frontdoor — the link is single-use and short-lived, so a
fresh one is generated per page), opens the page hosting each component, clicks through the
tabsets until the component's custom element is visible, then screenshots that element.
NB: Playwright's bundled Chromium is used on purpose — system Chrome crashes on Lightning pages.
"""
import json, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ORG = "cco-fr-de"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_previews"

ACC = "/lightning/r/Account/001gK00001fydfuQAA/view"
VISIT = "/lightning/r/Visit__c/a00gK00001TYmc6QAD/view"
OPP = "/lightning/r/Opportunity/006gK00000QxdO9QAJ/view"
RETAIL = "/lightning/n/CCO_FR_RetailExec_Home"

PAGES = {
    ACC: ["seFrRecordActions", "seFrVisitKanban"],
    OPP: ["seFrTimelinePhases"],
    RETAIL: ["seFrBusinessCardScanner", "seFrLeadFirstTouch"],
    VISIT: ["seFrVisitCheckIn", "seFrVisitPlan", "seFrVisitProductCheck",
            "seFrVisitShelfCompliance", "seFrVisitShelfSpace", "seFrVisitSummaryAI"],
}


def kebab(api):
    return "c-" + "".join(("-" + ch.lower()) if ch.isupper() and i else ch.lower() for i, ch in enumerate(api))


def frontdoor(path):
    r = subprocess.run(["sf", "org", "open", "-o", ORG, "--url-only", "--path", path, "--json"],
                       capture_output=True, text=True, check=True)
    return json.loads(r.stdout)["result"]["url"]


def visible(page, tag):
    loc = page.locator(tag).first
    try:
        if loc.count() and loc.is_visible():
            bb = loc.bounding_box()
            return loc if bb and bb["width"] > 80 and bb["height"] > 40 else None
    except Exception:
        pass
    return None


def main():
    wanted = set(sys.argv[1:])
    report = {}
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        for path, comps in PAGES.items():
            comps = [x for x in comps if not wanted or x in wanted]
            if not comps:
                continue
            page = b.new_page(viewport={"width": 1600, "height": 1500})
            page.goto(frontdoor(path), wait_until="load", timeout=90000)
            time.sleep(14)
            pending = {x: kebab(x) for x in comps}
            tabs = [None] + [t.inner_text().strip() for t in page.locator("[role=tab]").all()]
            seen = set()
            for tab in tabs:
                if tab in seen:
                    continue
                seen.add(tab)
                if tab:
                    try:
                        page.locator("[role=tab]", has_text=tab).first.click(timeout=8000, force=True)
                        time.sleep(5)
                    except Exception:
                        continue
                for api, tag in list(pending.items()):
                    loc = visible(page, tag)
                    if loc:
                        loc.scroll_into_view_if_needed()
                        time.sleep(2)
                        dest = OUT / f"{api}.png"
                        loc.screenshot(path=str(dest))
                        report[api] = f"ok ({tab or 'page'}) {dest.stat().st_size // 1024} KB"
                        del pending[api]
                if not pending:
                    break
            for api in pending:
                report[api] = "NOT FOUND on " + path
            page.close()
        b.close()
    for k, v in report.items():
        print(f"{k:28s} {v}")


if __name__ == "__main__":
    main()
