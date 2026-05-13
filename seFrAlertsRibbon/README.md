---
tagline: Configurable alerts ribbon combining declarative record-driven rules with always-on static banners.
categories: [Account 360°]
personas: [Sales, Service]
chips:
  - Rule-driven + static
  - 3 visual variants
  - Sticky-on-scroll
dataMode: mock
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - "`rulesCsv` · field-based rules (Record Page only)"
  - "`staticAlertsCsv` · always-on alerts (any page)"
  - "`visualStyle` · inline / card"
  - "`alertVariant` · banner / solid / minimal"
  - "`density` · comfortable / compact"
  - "`stickyOnScroll`"
seBenefit: Rule-driven mode evaluates a tiny DSL against the current record's fields ("AnnualRevenue<500000|warning|...") — drop on any record page, the right alert pops on the right account, no code.
featured: false
releaseStatus: new
status: active
screenshots: []
---

# CCO FR - Alerts Ribbon (`seFrAlertsRibbon`)

Configurable alerts ribbon. Two complementary sources for the alert list:

- **Rule-driven alerts** (Record Page only) — declarative rules evaluated against the current record's fields.
- **Static alerts** (any page) — always shown, useful for system status banners, demo-mode disclaimers, release announcements.

3 visual variants (banner / solid / minimal), 2 densities (comfortable / compact), 4 severities (info / success / warning / error), optional sticky-on-scroll behavior.

## Targets

- `lightning__RecordPage`
- `lightning__HomePage`
- `lightning__AppPage`

## Quick start

Drop the component on a record page, paste this in **Rule-driven alerts**:

```
AnnualRevenue<500000|warning||Small account — prioritize upsell|Open opportunities|/lightning/o/Opportunity/list
LastActivityDate isBlank|info||No activity logged in the last 30 days||
Industry=Banking|success||Banking — flag for compliance review||
```

You get 3 stacked banners, color-coded.

## Rule grammar

Format (one per line, or comma-separated):

```
<field><op><value>|<severity>|<icon>|<message>|<ctaLabel>|<ctaUrl>
```

| Token | Description |
|---|---|
| `<field>` | API name of a field on the current SObject (e.g. `AnnualRevenue`, `Industry`, `LastActivityDate`) |
| `<op>` | `=` `!=` `>` `<` `>=` `<=` `contains` `startsWith` `endsWith` `isBlank` `isNotBlank` |
| `<value>` | The value to compare against (omitted for `isBlank` / `isNotBlank`) |
| `<severity>` | `info` (default) / `success` / `warning` / `error` |
| `<icon>` | Optional SLDS icon name. Falls back to a severity-default icon when empty |
| `<message>` | The text shown in the banner |
| `<ctaLabel>` | Optional CTA button label |
| `<ctaUrl>` | Optional CTA URL — relative (`/lightning/...`) or absolute (`https://...`) |

## Static alerts

Format (one per line):

```
<severity>|<icon>|<message>|<ctaLabel>|<ctaUrl>
```

Static alerts ignore the record context. Use them on Home / App pages, or to add demo-mode banners on top of rule-driven ones on a Record page.

## Visual variants

| `alertVariant` | Look |
|---|---|
| `banner` (default) | Soft pastel background + accent border-left + saturated icon |
| `solid` | Saturated background, white text — high-contrast attention grabber |
| `minimal` | White background, accent bar only — ultra-sober |

## Density

| `density` | Behavior |
|---|---|
| `comfortable` (default) | Full message, wraps to multiple lines |
| `compact` | Single line, message truncated with ellipsis |

## Sticky on scroll

Set `stickyOnScroll = true` to keep the ribbon pinned to the top of the page on scroll. Useful for warning / error severity that shouldn't scroll out of view.

## Properties

| Property | Default | Description |
|---|---|---|
| `language` | `fr` | `fr` / `en` |
| `rulesCsv` | – | Rule-driven alerts (Record Page only) |
| `staticAlertsCsv` | – | Static alerts (any page) |
| `visualStyle` | `inline` | `inline` (no card chrome) / `card` (wrapped in `lightning-card` with title + count pill) |
| `alertVariant` | `banner` | `banner` / `solid` / `minimal` |
| `density` | `comfortable` | `comfortable` / `compact` |
| `cardTitle` | – | Override (used when `visualStyle = card`) |
| `cardIcon` | `standard:announcement` | SLDS icon name (used when `visualStyle = card`) |
| `hideDismissButton` | `false` | Hide the per-alert dismiss × |
| `maxAlerts` | `0` | Cap (0 = unlimited) |
| `stickyOnScroll` | `false` | Pin the ribbon at the top of the page on scroll |

## SE benefits

- **No Apex required** — rules and static alerts are configured entirely in App Builder.
- **Schema-safe** — fields referenced by rules are queried via LDS; missing fields silently skip the rule.
- **Demo storytelling** — type the right rule and a banner appears the moment the SE opens the right account ("This account is at risk", "Renewal due in 14 days").
