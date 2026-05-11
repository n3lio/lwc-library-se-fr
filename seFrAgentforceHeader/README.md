---
tagline: Astro-themed Home page header with a search / dictation box that forwards questions to the Agentforce panel.
categories: [Agentforce & AI]
personas: [All]
chips:
  - Astro floating header
  - Voice dictation
  - Triggers Agentforce panel
dataMode: mock
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - Title / subtitle
  - CTA label + URL
  - Astro animation toggle
seBenefit: Speech-to-text via the browser API — speak a question, click "Send", and the transcribed text lands in your clipboard. Paste it into the standard Agentforce panel for a fluid AI demo entry. (No real Agentforce integration — the UI fakes the gesture.)
featured: true
featuredRank: 5
releaseStatus: stable
status: active
screenshots: []
---

# seFrAgentforceHeader

Home-page header with a floating Astro image and a search/dictation box that forwards the user's question to the standard Agentforce / Einstein panel.

## Where to drop it
- **Target:** Lightning Home Page
- **App Builder label:** `SE_FR — Agentforce Header`

## Dependencies
- Static resource named `astro_agentforce` containing the Astro image (PNG).
- The org must have the Agentforce / Einstein utility button available in the app — the component finds the button by its `title` attribute (containing "Agentforce" or "Einstein") and triggers a click.

## Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `speechLocale` | String | `en-US` | BCP 47 locale for the browser's Web Speech Recognition API (`fr-FR`, `es-ES`, `de-DE`, …). |
| `idlePlaceholder` | String | `Ask me a question…` | Input placeholder when idle. |
| `listeningPlaceholder` | String | `Listening…` | Input placeholder while dictating. |

## Install
1. **Create the static resource** (required — otherwise the component fails to compile):
   - Setup → **Static Resources** → *New*.
   - Name: `astro_agentforce`, Cache Control: Public.
   - Upload a PNG of Astro (Salesforce mascot). Save.
2. Unzip `seFrAgentforceHeader.zip`, deploy the LWC bundle.
3. Drop `SE_FR — Agentforce Header` on the Home page.
