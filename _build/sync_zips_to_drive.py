#!/usr/bin/env python3
"""Sync the freshly built component zips into the Google Drive folder
'LWC Library SE FR/Sources/' on the local Drive desktop mount.

The local path is the Google Drive Desktop mirror — Drive desktop syncs
the change to drive.google.com automatically in the background.

Behavior:
- Copies every _zips/<api>.zip → <DRIVE_SOURCES>/<api>.zip if its content
  changed (compared by md5).
- Removes any *.zip in the Drive Sources folder that no longer has a
  matching source (e.g. zip of a renamed / deprecated component).
- Leaves non-zip files in the Sources folder alone (in case Lionel keeps
  notes there).
"""

from __future__ import annotations
import hashlib
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_ZIPS = ROOT / "_zips"
# Override the destination with the CCO_FR_SOURCES_DIR env var. Default
# falls back to the maintainer's Google Drive Desktop mount.
_sources_env = os.environ.get("CCO_FR_SOURCES_DIR")
DRIVE_SOURCES = Path(_sources_env) if _sources_env else Path(
    Path.home(),
    "Library/CloudStorage/GoogleDrive-<owner>@example.com/Mon Drive/"
    "LWC Library SE FR/Sources",
)


def md5_of(p: Path) -> str:
    h = hashlib.md5()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    if not SRC_ZIPS.exists():
        print(f"✗ {SRC_ZIPS} not found — run build_zips.py first", file=sys.stderr)
        return 1
    if not DRIVE_SOURCES.exists():
        print(f"✗ Drive folder not found: {DRIVE_SOURCES}", file=sys.stderr)
        print("  Check that Google Drive Desktop is running and the path is correct.", file=sys.stderr)
        return 1

    src_zips = sorted(SRC_ZIPS.glob("*.zip"))
    dst_zips = {p.name: p for p in DRIVE_SOURCES.glob("*.zip")}

    copied = 0
    skipped = 0
    removed = 0

    for src in src_zips:
        dst = DRIVE_SOURCES / src.name
        if dst.exists() and md5_of(src) == md5_of(dst):
            skipped += 1
            continue
        shutil.copy2(src, dst)
        copied += 1
        print(f"  ↑ {src.name}")

    # Remove orphan zips on Drive (zip removed from sources)
    src_names = {p.name for p in src_zips}
    for name, dst in dst_zips.items():
        if name not in src_names:
            dst.unlink()
            removed += 1
            print(f"  ✗ removed orphan: {name}")

    print(f"\n✔ Sync done: {copied} uploaded · {skipped} unchanged · {removed} removed")
    print(f"  Source : {SRC_ZIPS.relative_to(ROOT)}/")
    print(f"  Target : {DRIVE_SOURCES}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
