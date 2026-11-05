#!/usr/bin/env python3
"""
Rewrite `cardIcon` prop values from `utility:X` to `standard:Y` in the CCO FR Showcase
FlexiPages.

Why: every component in the lib defaults `cardIcon` to a `standard:` sprite (colored square
icon that <lightning-card icon-name> is designed for). Overriding with `utility:X` can render
blank or inconsistently in the header, because <lightning-card> styling expects standard:/custom:
sprites, not monochrome utility icons.

Rule for the future MCP server: `cardIcon` must be a `standard:` sprite (or `custom:`). Keep
`utility:X` only for props like `primaryActionIcon`, `gauge*Icon`, inline icons inside the body.
"""
from pathlib import Path
import re

DEPLOY = Path("/Users/lionel.braun/Documents/Internal/lwc-library/_deploy/force-app/main/default/flexipages")

# Semantic utility → standard mapping for CARD HEADER icons only.
# These are the ones <lightning-card icon-name> renders. Picked for visual coherence
# with the lib defaults (seFrMetricTile=standard:metrics, seFrMyTasks=standard:task,
# seFrEngagementHistory=standard:activations etc.).
U2S = {
    "utility:flag":              "standard:process_sequence",   # timelines / cycle de vente
    "utility:task":              "standard:task",
    "utility:filter":            "standard:channel_program_members",  # segments
    "utility:dashboard":         "standard:dashboard",
    "utility:routing_offline":   "standard:service_territory",
    "utility:currency":          "standard:currency",
    "utility:note":              "standard:note",
    "utility:contract_alt":      "standard:service_contract",
    "utility:summarydetail":     "standard:article",
    "utility:unmuted":           "standard:voice_call",
    "utility:magicwand":         "standard:bot",             # was standard:einstein — doesn't exist in SLDS 2.264 (2026-10-22)
    "utility:refresh":           "standard:data_streams",
    "utility:warning":           "standard:case",               # alerts/escalations
    "utility:event":             "standard:event",
    "utility:shield":            "standard:settings",
    "utility:image":             "standard:file",
    "utility:success":           "standard:approval",
    "utility:info_alt":          "standard:article",
    "utility:einstein":          "standard:bot",             # was standard:einstein — doesn't exist in SLDS 2.264 (2026-10-22)
    "utility:money":             "standard:performance",
    "utility:opportunity":       "standard:opportunity",
    "utility:approval":          "standard:approval",
    "utility:user_role":         "standard:user_role",
    "utility:bot":               "standard:bot",
    "utility:company":           "standard:account",
    "utility:call":              "standard:call_history",
    "utility:email":             "standard:email",
    "utility:checkin":           "standard:location",
    "utility:location":          "standard:location",
    "utility:chat":              "standard:live_chat",
    "utility:case":              "standard:case",
    "utility:lead":              "standard:lead",
    "utility:identity":          "standard:person_account",
    "utility:builder":           "standard:custom_notification",
    "utility:info":              "standard:article",
    "utility:send":              "standard:email",
    "utility:new_window":        "standard:link",
    "utility:sparkles":          "standard:bot",             # was standard:einstein — doesn't exist in SLDS 2.264 (2026-10-22)
    "utility:announcement":      "standard:announcement",
    "utility:add":               "standard:task",
    "utility:download":          "standard:file",
    "utility:upload":            "standard:file",
    "utility:print":             "standard:document",
    "utility:preview":           "standard:article",
    "utility:search":            "standard:search_folder",
    "utility:share":             "standard:social",
    "utility:trending":          "standard:metrics",
    "utility:clock":             "standard:timesheet",
}


# Match a <componentInstanceProperties> block for `cardIcon` whose value starts with `utility:`.
# This is deliberately strict — we only touch cardIcon, never gauge*Icon / primaryActionIcon
# / fallbackIcon / icon-name inside the body.
RX = re.compile(
    r'(<name>cardIcon</name>\s*<value>)(utility:[a-z_]+)(</value>)'
)


def convert(match):
    old = match.group(2)
    new = U2S.get(old)
    if not new:
        print(f"  ! no mapping for {old}, keeping it")
        return match.group(0)
    return f"{match.group(1)}{new}{match.group(3)}"


total = 0
for path in sorted(DEPLOY.glob("CCO_FR_Showcase_*.flexipage-meta.xml")):
    content = path.read_text()
    new_content, n = RX.subn(convert, content)
    if n:
        path.write_text(new_content)
        print(f"✓ {path.name}  ({n} cardIcon converted utility→standard)")
        total += n

# Residual scan — any cardIcon still utility:?
print("\n--- Residual utility: cardIcons ---")
leftover = re.compile(r'<name>cardIcon</name>\s*<value>(utility:[a-z_]+)</value>')
for p in sorted(DEPLOY.glob("CCO_FR_Showcase_*.flexipage-meta.xml")):
    hits = leftover.findall(p.read_text())
    if hits:
        print(f"  {p.name}: {hits}")

print(f"\n═════ TOTAL: {total} cardIcon props switched to standard: ═════")
