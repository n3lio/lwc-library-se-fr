#!/usr/bin/env python3
"""
Resync _deploy from the lib-root bundle sources.

Each lib bundle `<Name>/` contains subfolders like `lwc/`, `classes/`,
`staticresources/`, `flows/`. Each contains sub-items (e.g. `lwc/<Name>/`,
`classes/<ClassName>.cls`+`.cls-meta.xml`, `staticresources/<ResName>.png`+`.resource-meta.xml`).

This script merges each bundle's subfolders into _deploy's corresponding dirs,
overwriting individual items. It never deletes top-level _deploy dirs.
"""
from pathlib import Path
import shutil

LIB_ROOT = Path("/Users/lionel.braun/Documents/Internal/lwc-library")
DEPLOY_DEFAULT = LIB_ROOT / "_deploy/force-app/main/default"

SKIP_DIRS = {
    "_agent", "_build", "_deck", "_deploy", "_doc", "_migrations",
    "_previews", "_retrieve-tmp", "_shared_apex", "_site", "_staging",
    "_tools", "_zips", "backups", "node_modules", "original-assets",
    "paris3d", "scripts",
}

# Each lib bundle subfolder name → destination inside _deploy/force-app/main/default/
SUBFOLDER_TO_DEPLOY = {
    "lwc": "lwc",
    "classes": "classes",
    "staticresources": "staticresources",
    "flows": "flows",
}

synced_count = 0
items_copied = []

for bundle in sorted(LIB_ROOT.iterdir()):
    if not bundle.is_dir():
        continue
    if bundle.name in SKIP_DIRS or bundle.name.startswith("."):
        continue
    if not bundle.name.startswith("seFr"):
        continue

    for sub_name, deploy_sub in SUBFOLDER_TO_DEPLOY.items():
        src_sub = bundle / sub_name
        if not src_sub.is_dir():
            continue
        dst_sub = DEPLOY_DEFAULT / deploy_sub
        dst_sub.mkdir(parents=True, exist_ok=True)

        for item in src_sub.iterdir():
            dst = dst_sub / item.name
            if item.is_dir():
                if dst.exists():
                    shutil.rmtree(dst)
                shutil.copytree(item, dst)
            else:
                shutil.copy2(item, dst)
            items_copied.append(f"{bundle.name}/{sub_name}/{item.name}")

    synced_count += 1

print(f"Synced {synced_count} bundles, {len(items_copied)} items copied.")
print("\nSample:")
for i in items_copied[:15]:
    print(f"  ✓ {i}")
if len(items_copied) > 15:
    print(f"  ... and {len(items_copied) - 15} more")
