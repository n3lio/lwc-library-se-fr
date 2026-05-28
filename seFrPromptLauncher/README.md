---
tagline: Configurable AI panel running Salesforce Prompt Templates via Invocable Actions, with auto-filled record context.
categories: [Productivity]
personas: [All]
chips:
  - Pill switcher per prompt
  - Auto-fills record context
  - Save as Note
  - HTML-formatted output
dataMode: live
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - "`promptsJson` · catalogue (apiName, label, icon, objects[], userInputs[], extraInputs)"
  - Auto record-type filtering (Account → Account summary, Home → free-text prompts)
  - Auto-detect HTML / Markdown response · dynamic height
  - "`autoRunFirstPrompt` · trigger AI on page load"
  - "`resultAccent` · blue / purple / green · `maxHeight` · optional cap"
  - "`namedCredential` · default `Agentforce_API`"
seBenefit: Default catalogue covers Account / Contact / Opportunity / Lead / Case summaries + free-text Summarize/Refine — drop on any record page, the right prompt shows up automatically. Save as Note attaches the AI output to the record in one click.
featured: true
featuredRank: 4
releaseStatus: new
status: active
screenshots: []
---

# CCO FR - Prompt Launcher (`seFrPromptLauncher`)

> ⚠️ The bundle is still named `seFrPromptLauncher` for backward compatibility with FlexiPages that already reference it. The component itself is now a **Prompt Launcher**: the chat surface was retired because the Agent API isn't provisioned on most demo orgs.

A configurable AI panel that runs Salesforce **Prompt Templates** via the Invocable Actions endpoint. The SE picks which prompts to expose, the user clicks one, the response renders inline with HTML formatting.

## Targets

- `lightning__AppPage`
- `lightning__HomePage`
- `lightning__RecordPage`

## What it does

1. Shows a **pill switcher** at the top — one button per applicable prompt.
2. The component **filters** prompts to those compatible with the host record type (`objects` array in the config). On a Home Page, prompts with an empty `objects` array show.
3. If the active prompt requires user inputs (e.g. "Text to summarize"), they appear as a small form. **Record context is auto-filled** — you don't ask the user to type the recordId.
4. Click **Run**, the response renders in a colored panel with copy + save-as-Note actions.
5. **Re-run** with the same inputs in one click.
6. **Save as Note** persists the AI response on the current record (only on Record Pages).

## Quick start

Drop on a **Record Page** (Account, Contact, Opportunity, Lead, Case) — the default catalogue auto-detects the record type and shows the right summary prompt.

Drop on a **Home Page** — the default catalogue shows "Summarize text" and "Refine text" (input-driven prompts that don't need a record).

For a custom catalogue, paste a JSON array in the **Prompts catalogue (JSON)** property.

## Default catalogue

The component ships with a default catalogue covering the common SDO-shipped prompt templates:

| Prompt API name | Visible label | Available on |
|---|---|---|
| `einstein_gpt__summarizeAccountDefault` | Account summary | Account record pages |
| `einstein_gpt__summarizeContact` | Contact summary | Contact record pages |
| `einstein_gpt__summarizeDeal` | Deal summary | Opportunity record pages |
| `einstein_gpt__summarizeLead` | Lead summary | Lead record pages |
| `svc_emp_intelligence__SummarizeRecord` | Case summary | Case record pages |
| `einstein_gpt__summarizeText` | Summarize text | Anywhere (free-text input) |
| `einstein_gpt__refineText` | Refine text | Anywhere (free-text input) |

To override, paste your own JSON array in the **Prompts catalogue (JSON)** property.

## Prompt config — JSON shape

```json
[
    {
        "apiName": "einstein_gpt__summarizeAccountDefault",
        "label": "Account summary",
        "icon": "utility:summarydetail",
        "objects": ["Account"],
        "recordInputName": "Input:Account"
    },
    {
        "apiName": "my_custom_template__competitorAnalysis",
        "label": "Competitor analysis",
        "icon": "utility:opportunity",
        "objects": ["Account"],
        "recordInputName": "Input:Account",
        "userInputs": [
            { "name": "competitor", "label": "Main competitor", "type": "text", "required": true }
        ]
    },
    {
        "apiName": "einstein_gpt__refineText",
        "label": "Refine text",
        "icon": "utility:magicwand",
        "objects": [],
        "userInputs": [
            { "name": "textToRephrase", "label": "Text to refine", "type": "textarea", "required": true }
        ]
    }
]
```

| Field | Required | Description |
|---|---|---|
| `apiName` | yes | Prompt template DeveloperName (with namespace if any) |
| `label` | yes | Visible button label |
| `icon` | no | SLDS icon. Defaults to `utility:einstein` if omitted |
| `objects` | no | Array of host SObject API names. Empty/omitted → always show |
| `recordInputName` | no | Input name auto-filled with the host record's Id (e.g. `Input:Account`). Omit on Home Page prompts |
| `userInputs` | no | Array of business-level inputs the user types in. See below |

**`userInputs[]` shape**:

```json
{
    "name": "competitor",          // input name as expected by the prompt template
    "label": "Main competitor",    // visible label
    "type": "text",                // text | textarea | number | picklist
    "required": true,              // optional, defaults to false
    "placeholder": "Microsoft",    // optional
    "options": ["A", "B", "C"]     // for type=picklist only
}
```

The component **only asks for business-level inputs**. Technical inputs the prompt template expects (record id, prompt version id, internal flags) are filled automatically or omitted.

## How to find available prompt templates on your org

```bash
sf apex run --target-org <your-org-alias> --apex-code 'HttpRequest req = new HttpRequest();
req.setEndpoint("callout:Agentforce_API/services/data/v62.0/actions/custom/generatePromptResponse");
req.setMethod("GET");
req.setHeader("Accept", "application/json");
HttpResponse res = new Http().send(req);
System.debug(res.getBody());'
```

The body lists every prompt template accessible to the user. Look at the `name` field for the `apiName` to plug into the JSON.

## Properties

| Property | Default | Description |
|---|---|---|
| `language` | `fr` | `fr` / `en` |
| `cardTitle` | – | Override |
| `cardIcon` | `standard:einstein` | SLDS icon |
| `namedCredential` | `Agentforce_API` | Routes the Invocable Action callout |
| `promptsJson` | – (uses default catalogue) | JSON array as documented above |
| `autoRunFirstPrompt` | `false` | When ON, the first applicable prompt runs automatically as soon as the page loads |
| `resultAccent` | `blue` | Result panel accent: `blue` / `purple` / `green` |
| `height` | `480` | Component height in pixels |

## Named Credential setup

The component calls `callout:Agentforce_API/services/data/v62.0/actions/custom/generatePromptResponse/...`. The Named Credential injects OAuth.

If `Agentforce_API` doesn't exist in your org, create it via Setup → Named Credentials. See the audit doc or any of the related Salesforce setup guides for the OAuth dance — same setup as for any Apex callout to the Salesforce REST API.

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Prompt config is invalid` | JSON syntax error in `promptsJson` | Check the JSON in App Builder; the component validates and shows the parser message |
| `No prompt configured for this record type` | Host page object isn't covered by any catalogue entry | Add an entry with `objects: ["YourObject"]` or set `objects: []` |
| `HTTP 404` in the result panel | Prompt API name wrong, or template not deployed on the org | List templates with the SOQL command above and copy the exact `name` |
| `HTTP 401 / 403` | Named Credential / OAuth issue | Re-authorize the Named Credential in Setup |
| `Named Credential not found` | NC missing | Create it (see above) |

## SE benefits

- **Real AI responses** on demo orgs that don't have full Agentforce API enabled — leverages the standard Invocable Action endpoint that's available everywhere Einstein is.
- **Auto-detection of record context** — drop on an Account record page, the right summary prompt shows up. No per-page config needed for the common cases.
- **Multi-prompt switcher** — pose 1 component on a record page, the user has 2-3 AI buttons available without you needing 2-3 components.
- **Save as Note** — one click to attach the AI output to the current record. Demos the platform's content storage without leaving the page.
- **HTML rendering** — Salesforce's prompt templates often return rich text (links, bold, lists). The component renders them properly via `lwc:dom="manual"` (same pattern as Contact Card's prompt summary).
