# How to use `AppsScript_GenerateSlides.gs`

A 5-minute walkthrough to turn the deck content into a real Google Slides file you can edit.

## What this gives you

A new Google Slides presentation in your Drive root, named `SE FR Component Library — Draft`, with 47 slides. Each slide has:

- A **title** (e.g. `Contact Card  [seFrContactCard]`)
- A **body** with structured plain-text content (tagline, configurable settings, SE benefit, targets, objects, apex, data mode)
- **Speaker notes** (where applicable)

**No styling.** Slides uses the default `TITLE_AND_BODY` layout. The script is meant to give you editable text in real Slides shapes — you re-style each slide manually using your branded template.

## Step-by-step

### 1. Open Apps Script

Go to <https://script.google.com> and click **New project**.

### 2. Paste the script

- Open `_deck/AppsScript_GenerateSlides.gs` (this folder)
- Select all content (`Cmd+A`), copy
- In Apps Script, replace the default `Code.gs` content with the paste
- `Cmd+S` to save → name the project `SE FR Deck Generator` (or whatever)

### 3. Run it

- Top of the editor, you see a function dropdown — pick **`generateDeck`**
- Click ▶ **Run**
- First run: Google asks you to authorize the script:
    - "This app isn't verified" → click `Advanced` → `Go to SE FR Deck Generator (unsafe)`
    - It's your own script, so safe — Google flags every unverified Apps Script the same way
    - Accept the requested scopes (Drive + Slides write)
- Wait ~30 seconds. The bottom **Execution log** shows:
    ```
    Done. Open: https://docs.google.com/presentation/d/<ID>/edit
    ```

### 4. Open the generated deck

Click the URL in the log. You'll see 47 slides, plain default style.

### 5. Re-style with your template

Three options, ordered from fastest to most polished:

**Option A — Import the generated deck's slides INTO your template (recommended)**

This is the most efficient way to combine the generated content + your branded template:

1. Open your branded template gSlides (the `2025 SF Corporate Template` one in the SE FR Drive)
2. Save a copy of it: `File → Make a copy → Entire presentation` → name it `SE FR Component Library — Final`
3. In this copy, go to `File → Import slides`
4. Pick the generated deck (`SE FR Component Library — Draft`)
5. Select all 49 slides → make sure **"Keep original theme"** is **UNCHECKED** (so the slides adopt your template's theme on import)
6. Click `Import slides`
7. The slides land in your branded template, restyled with your master layouts

You'll likely have to manually pick the right layout per slide afterwards (right-click → `Apply layout`) because the auto-mapping is approximate. But the text content + structure is preserved, you save 90% of the work.

**Option B — Copy-paste body text into a duplicated template (most surgical control)**

1. Duplicate your template
2. For each component slide in the generated deck:
    - Copy the body text
    - Open the matching slide in your duplicated template (or insert a new one with the right master)
    - Paste in the body placeholder
3. Delete the generated draft when done

**Option C — Keep both decks separate**

Use the generated deck for content review with your team (plain-text is good for that), then build the branded slides manually once content is locked. Slower but no risk of layout weirdness.

**My recommendation**: try **Option A** first. If `Import slides` produces messy results (sometimes does, depending on the templates' master compatibility), fall back to **Option B**.

## What's in the script

- **DECK array** (top of file) — 47 entries, one per slide. Each entry has `title`, `body` (plain text with newlines), `notes`. Edit any of these to change the content before running.
- **`componentSlide(c)`** — helper that builds a uniform body block for component slides (tagline + settings + SE benefit + metadata). 25 of the 47 slides use it.
- **`generateDeck()`** — the function you run. Creates a new presentation, removes the default first slide, then iterates `DECK` and appends one slide each.

## Re-running the script

Each run creates a **new** presentation (named `SE FR Component Library — Draft`). It doesn't update an existing file. If you want to iterate on content, edit the `DECK` array, run again → new draft. Delete the old one when you're happy.

## Limits & gotchas

| Limit | Workaround |
|---|---|
| Default layout only (`TITLE_AND_BODY`) | Re-apply your branded master in the generated deck (Option A) or copy-paste into a duplicated template (Option B) |
| No images / screenshots inserted programmatically | Add screenshots manually after re-styling |
| No tables (the audit table slide uses plain text) | Convert to a real table in Slides if you prefer |
| No animations / transitions | Configure in Slides UI per slide if needed |
| Bullet hierarchy via 2-space indent doesn't always render as nested bullets in Slides | Check each slide and re-tab manually if you want true sub-bullets |
| Apps Script execution time is capped at 6 minutes — way more than enough for 47 slides | Not an issue here |
| Script needs Drive + Slides scopes — first run prompts for OAuth | One-time setup |

## What if I want to edit content quickly without re-running?

Once the draft is generated, treat it like any Slides file. Edit titles / bodies directly. The script is only needed to bootstrap the 47 slides; after that, edit in Slides.

## What's the next step after this?

When the deck is content-validated:
1. Add screenshots + GIFs to each component slide
2. Apply your branded master across all slides (one-time effort)
3. Share the polished deck via Drive
4. Optionally: PDF export → SE-internal newsletter
