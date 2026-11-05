#!/usr/bin/env python3
"""
Rewrite HomePage/AppPage FlexiPages to use template `flexipage:appHomeTemplateTwoColumnsStacked`
with regions region1/region2/region3 instead of header/main/sidebar.
"""
from pathlib import Path
import re

FILES = [
    "CCO_FR_Showcase_Home.flexipage-meta.xml",
    "CCO_FR_Showcase_FieldSales_Home.flexipage-meta.xml",
    "CCO_FR_Showcase_Telesales_Home.flexipage-meta.xml",
    "CCO_FR_Showcase_Territory_Pipeline.flexipage-meta.xml",
    "CCO_FR_Showcase_Marketing.flexipage-meta.xml",
]
BASE = Path("/Users/lionel.braun/Documents/Internal/lwc-library/_deploy/force-app/main/default/flexipages")

RENAME = {"header": "region1", "main": "region2", "sidebar": "region3"}

for name in FILES:
    path = BASE / name
    xml = path.read_text()

    # Fix template name
    xml = xml.replace("flexipage:appHomeTemplateDesktop", "flexipage:appHomeTemplateTwoColumnsStacked")

    # Rename regions header/main/sidebar → region1/region2/region3
    for old, new in RENAME.items():
        xml = re.sub(
            rf"(<name>){old}(</name>\s*<type>Region</type>)",
            rf"\1{new}\2",
            xml,
        )

    path.write_text(xml)
    print(f"✓ {name}")
