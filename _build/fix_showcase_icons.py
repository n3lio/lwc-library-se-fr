#!/usr/bin/env python3
"""
Replace invalid SLDS icon names (utility: AND standard:) in the CCO_FR_Showcase FlexiPages.

Rule for the future MCP server: only use SLDS icons that render in a plain dev-edition
org. The two proven-safe sets below are the icons actually used by components inside
this lib — if an icon isn't on either list, we substitute it with a semantically-close
one that IS.

Historical catches:
- utility:milestone, utility:activity, utility:chart, utility:route, utility:cart, …
  → fixed by the SUBS map below (2026-10)
- standard:kpi (used on seFrKpiLauncher cardIcon in CCO_FR_Showcase_Territory_Pipeline)
  → fixed to standard:metrics (2026-11-03) — screenshot showed the icon missing next
  to "Indicateurs clés". `standard:kpi` is NOT in the SLDS sprite.
"""
from pathlib import Path
import re

DEPLOY = Path("/Users/lionel.braun/Documents/Internal/lwc-library/_deploy/force-app/main/default/flexipages")

# Icons we observed in the lib's HTML/JS (empirically known to render).
SAFE_ICONS = {
    "action_list_component", "add", "approval", "arrow_right", "arrowdown", "bot",
    "builder", "call", "case", "chat", "checkin", "chevrondown", "chevronleft",
    "chevronright", "chevronup", "clear", "clock", "close", "collapse_all",
    "company", "contract_alt", "copy", "currency", "dashboard", "delete", "down",
    "download", "edit", "edit_form", "einstein", "email", "error", "event",
    "expand_all", "expand_alt", "filter", "flag", "hide", "identity", "image",
    "info", "info_alt", "lead", "link", "location", "magicwand", "money", "new",
    "new_window", "note", "notification", "opportunity", "preview", "print",
    "record", "refresh", "rocket", "routing_offline", "search", "send", "share",
    "shield", "sparkles", "stop", "success", "summarydetail", "sync", "task",
    "trending", "unmuted", "up", "upload", "user_role", "warning",
    # Common SLDS icons also known to render but not currently used by lib:
    "announcement", "kanban",  # verified via docs
    # Icons the LWCs use that are plain SLDS utility names, not false positives:
    "apps", "back", "cart", "check", "date_time", "forward", "photo", "play",
    "priority", "save", "undo",
}

# Substitutions for the icons I used in contextualize_showcase_components.py
# that are NOT proven-safe. Keyed by old → new.
SUBS = {
    "utility:milestone":            "utility:flag",
    "utility:activity":             "utility:task",
    "utility:segments":             "utility:filter",
    "utility:chart":                "utility:dashboard",
    "utility:route":                "utility:routing_offline",
    "utility:cart":                 "utility:currency",
    "utility:orders":               "utility:note",
    "utility:contract":             "utility:contract_alt",
    "utility:file":                 "utility:note",
    "utility:strategy":             "utility:dashboard",
    "utility:summary":              "utility:summarydetail",
    "utility:user":                 "utility:user_role",
    "utility:voice":                "utility:unmuted",
    "utility:star":                 "utility:magicwand",
    "utility:flow":                 "utility:refresh",
    "utility:priority":             "utility:warning",
    "utility:signpost":             "utility:magicwand",
    "utility:date_input":           "utility:event",
    "utility:privately_shared":     "utility:shield",
    "utility:photo":                "utility:image",
    "utility:heart":                "utility:success",
    "utility:einstein_analytics":   "utility:dashboard",
    "utility:resource_absence":     "utility:info_alt",
    # standard: substitutions (card icons on <lightning-card> and FlexiPage components).
    "standard:kpi":                 "standard:metrics",
    "standard:visit":               "standard:event",          # not in sprite — close enough
    "standard:store":               "standard:merchandising",  # not in sprite
    "standard:voice_call":          "standard:call",           # not in sprite
    "standard:scorecard":           "standard:performance",    # SLDS deprecated this one
}

# SLDS standard icons known to render in a dev-edition org. Keep this list in sync with
# https://www.lightningdesignsystem.com/icons/#standard — this is the subset actually
# used by this lib and verified. Residual scan below flags anything not on this list.
SAFE_STANDARD = {
    "account", "activations", "address", "announcement", "approval", "article",
    "bot", "brand", "call", "case", "chart", "contact", "currency", "dashboard",
    "default", "document", "event", "file", "goals", "groups", "identity",
    "kanban", "lead", "lead_insights", "location", "log_a_call", "merchandising",
    "metrics", "note", "opportunity", "order_item", "orders", "performance",
    "person_account", "planogram", "product", "product_consumed", "product_item",
    "reward", "service_contract", "settings", "task", "task2", "team_member",
    "timesheet", "trailhead", "user", "user_role",
}

CCO_FILES = sorted(DEPLOY.glob("CCO_FR_Showcase_*.flexipage-meta.xml"))
# For the residual scan we go wider: ALL FlexiPages in the deploy folder, plus LWC
# templates that reference icon names. Catches the MCP builder before it ships a bad
# icon in a non-Showcase page.
ALL_FLEXIPAGES = sorted(DEPLOY.glob("*.flexipage-meta.xml"))
LWC_SOURCES = sorted(
    (DEPLOY.parent / "lwc").rglob("*.html")
) + sorted(
    (DEPLOY.parent / "lwc").rglob("*.js")
)

total_subs = 0
for path in CCO_FILES:
    content = path.read_text()
    orig = content
    file_subs = {}
    for old, new in SUBS.items():
        if old in content:
            n = content.count(old)
            content = content.replace(old, new)
            file_subs[f"{old} → {new}"] = n
    if content != orig:
        path.write_text(content)
        print(f"✓ {path.name}  ({sum(file_subs.values())} subs)")
        for sub, n in file_subs.items():
            print(f"    {sub}  (×{n})")
        total_subs += sum(file_subs.values())

# Also scan for any remaining icons not on the safe lists — flag only.
print("\n--- Residual icon scan — ALL FlexiPages + LWC sources ---")
# Only match icons inside quotes or XML text, so comments like
# "// standard:store doesn't exist" don't trigger false positives.
util_rx = re.compile(r'["\'>]utility:([a-z_]+)')
std_rx = re.compile(r'["\'>]standard:([a-z0-9_]+)')
residuals = 0
for path in list(ALL_FLEXIPAGES) + list(LWC_SOURCES):
    try:
        content = path.read_text()
    except (OSError, UnicodeDecodeError):
        continue
    bad_util = sorted(set(util_rx.findall(content)) - SAFE_ICONS)
    bad_std = sorted(set(std_rx.findall(content)) - SAFE_STANDARD)
    if bad_util or bad_std:
        rel = path.relative_to(DEPLOY.parent.parent)
        print(f"  {rel}:")
        if bad_util: print(f"      utility:  {bad_util}")
        if bad_std:  print(f"      standard: {bad_std}")
        residuals += len(bad_util) + len(bad_std)

print(f"\n═════ TOTAL: {total_subs} auto-fixed · {residuals} residual flags ═════")
if residuals:
    print("↳ If a flagged icon actually renders in the org, add it to SAFE_ICONS / SAFE_STANDARD.")
    print("↳ If it does NOT render (sprite returns 404), add a SUBS entry mapping it to a close valid icon.")
