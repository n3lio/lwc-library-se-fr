---
tagline: Drop business card photos, get editable lead cards pre-filled by a simulated OCR, then bulk-create the leads.
categories: [Sales]
personas: [Sales, FieldSales, Retail, Marketing]
chips:
  - Drag and drop business cards
  - Simulated OCR extraction
  - Editable lead cards
  - Bulk lead creation
  - Bilingual FR/EN
dataMode: mock
requiresEinstein: optional
mobileReady: true
originalAuthor: Yann Jourdain
originalAuthorEmail: null
maintainedBy: Lionel Braun
libraryIntegrationDate: 2026-10-23
keyProps:
  - language - 'fr' (default) or 'en'
  - cardTitle / cardIcon - override title and standard:* icon
  - simulatedDelayMs - fake OCR latency (default 1200)
  - maxCards - cap on cards in the list (default 10)
  - autoCreate - pulse the create button once a card is ready
seBenefit: Demo the "card to lead" capture story at a trade show or in a store visit on any dev org, with no Apex, no prompt template and no setup.
featured: true
featuredRank: 7
releaseStatus: new
status: active
screenshots: []
---

# CCO FR - Business Card Scanner

**Original source:** Yann Jourdain, "Cartes de visite -> Leads" (cvCapture / cvDropZone / cvLeadCard + Apex + Agentforce prompt)
**Ported to library by:** Lionel Braun
**Library-integrated:** 2026-10-23

Consolidated into a single bundle. The original three LWCs are inlined, and the Apex, Flow, GenAI prompt template and custom labels are removed.

## How it works

1. Empty state shows a dashed dropzone. Drop images or click to select (hidden `input type=file`, `image/*`, multiple).
2. Each file becomes a card tile with a base64 preview (FileReader) and a "processing" skeleton.
3. After `simulatedDelayMs`, the tile is filled with one of 4 rotating fake personas (Dubois, Moreau, Lefebvre, Petit). Non-image files end in an error state with a Retry button.
4. Fields (first name, last name, company, title, email, mobile, phone) are editable. Last name and company are required for a card to count as ready.
5. "Create N leads" waits 1 second, shows a success toast, and removes the created cards. No record is actually created.

## Mock mode

No Apex, no callouts, no custom labels. Renders on any dev-edition org. To go real, replace the timer in `_startOcr` with the original Agentforce OCR call and the timer in `handleCreate` with a Lead insert.

## Properties

| Property | Default | Notes |
|---|---|---|
| language | fr | fr or en |
| cardTitle | (dictionary) | Title override |
| cardIcon | standard:lead | Must be a standard:* icon |
| simulatedDelayMs | 1200 | Fake OCR latency |
| maxCards | 10 | Extra files are ignored with a warning toast |
| autoCreate | false | Pulses the create button when a card is ready |
