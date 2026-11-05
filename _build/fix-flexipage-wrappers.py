#!/usr/bin/env python3
"""
Fix FlexiPage XML : each <componentInstance> must be wrapped in its own
<itemInstances> element. The naive multi-componentInstance-per-itemInstances
structure is invalid.
"""
import re
import sys
from pathlib import Path

FILES = [
    "CCO_FR_Showcase_Home.flexipage-meta.xml",
    "CCO_FR_Showcase_FieldSales_Home.flexipage-meta.xml",
    "CCO_FR_Showcase_Telesales_Home.flexipage-meta.xml",
    "CCO_FR_Showcase_Territory_Pipeline.flexipage-meta.xml",
    "CCO_FR_Showcase_Marketing.flexipage-meta.xml",
    "CCO_FR_Showcase_Account.flexipage-meta.xml",
    "CCO_FR_Showcase_Contact.flexipage-meta.xml",
    "CCO_FR_Showcase_Opportunity.flexipage-meta.xml",
    "CCO_FR_Showcase_Case.flexipage-meta.xml",
    "CCO_FR_Showcase_Lead.flexipage-meta.xml",
    "CCO_FR_Showcase_Order.flexipage-meta.xml",
    "CCO_FR_Showcase_Visit.flexipage-meta.xml",
]

BASE = Path("/Users/lionel.braun/Documents/Internal/lwc-library/_deploy/force-app/main/default/flexipages")

for name in FILES:
    path = BASE / name
    xml = path.read_text()
    # Replace the pattern: </componentInstance> ... <componentInstance>  (same parent region)
    # with: </componentInstance></itemInstances><itemInstances><componentInstance>
    # The pattern between two adjacent componentInstance tags is pure whitespace.
    new_xml = re.sub(
        r"</componentInstance>\s+<componentInstance>",
        "</componentInstance>\n            </itemInstances>\n            <itemInstances>\n                <componentInstance>",
        xml,
    )
    if new_xml != xml:
        path.write_text(new_xml)
        count = xml.count("</componentInstance>")
        print(f"✓ {name}: {count} componentInstance(s) wrapped")
    else:
        print(f"○ {name}: no change needed")
