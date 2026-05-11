#!/usr/bin/env python3
"""Run every build step in dependency order.

Order matters:
  1. build_zips.py          → refreshes _zips/ + dependencies.detected.yaml
  2. build_manifest.py      → reads READMEs + meta.xml + deps.yaml → manifest.json
  3. everything else        → consumes manifest.json
"""

from __future__ import annotations
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

STEPS = [
    ("build_zips.py", ["--yes"]),
    ("build_manifest.py", []),
    ("build_root_readme.py", []),
    ("build_deck.py", []),
    ("build_apps_script.py", []),
    # build_site.py MUST run before build_knowledge_pdf.py — the KB
    # extracts the EN content of About / Docs from the rendered _site/.
    ("build_site.py", []),
    ("build_knowledge_pdf.py", []),
    ("sync_zips_to_drive.py", []),
]


def main() -> int:
    for script, args in STEPS:
        path = ROOT / script
        if not path.exists():
            print(f"⚠ skip: {script} not found", file=sys.stderr)
            continue
        print(f"\n── {script} {' '.join(args)}")
        result = subprocess.run([sys.executable, str(path), *args])
        if result.returncode != 0:
            print(f"✗ {script} exited {result.returncode}", file=sys.stderr)
            return result.returncode
    print("\n✔ All build steps completed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
