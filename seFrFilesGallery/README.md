---
tagline: Visual gallery of files attached to any record with image thumbnails, doctype icons and drag-and-drop upload.
categories: [Transverse]
personas: [Sales, FieldSales, Telesales, Service, Marketing]
chips:
  - Image thumbs + doctype icons
  - Drag & drop upload
  - Click-to-preview
dataMode: live
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - Max files, visible count in carousel
  - Show / hide upload + delete buttons
seBenefit: Real image thumbnails (not just generic doctype icons) — pull product photos, brand assets, contracts. Drag-drop upload zone is custom-built (not the native `lightning-file-upload`) so the layout looks clean in narrow sidebar columns.
featured: true
featuredRank: 2
releaseStatus: new
status: active
screenshots: []
---

# seFrFilesGallery (Files Gallery)

**B2B / B2C** — Visual gallery of the files linked to the current record. Image thumbnails (via the standard Salesforce rendition endpoint), doctype icons for non-images (PDF, Word, Excel…), click-to-preview and a drag-and-drop upload area. Bilingual EN / FR.

## Where to drop it
- **Target:** Lightning Record Page
- **Objects:** any record type — the component queries `ContentDocumentLink` by `LinkedEntityId`.
- **App Builder label:** `SE FR - Files Gallery`

## Apex dependency
`SE_FR_FilesGalleryController.getFiles(recordId, limitCount)`. Queries the latest `ContentVersion` for each document linked to the record.

## Properties
| Name | Default | Description |
|---|---|---|
| `language` | `en` | `en` or `fr`. |
| `cardTitle` | — | Override the default. |
| `limitCount` | 20 | Server-side LIMIT (1–100). |
| `hideUploadButton` | `false` | |

## Install
1. Deploy `classes/SE_FR_FilesGalleryController.cls`.
2. Unzip `seFrFilesGallery.zip`, deploy the LWC bundle.
3. Drop `SE FR - Files Gallery` on any record page.

## Data enrichment prerequisites
- The record must have **at least one `ContentDocumentLink`** attached. On a fresh SDO, most records have none — the component shows an empty state.
- **Images** (PNG / JPG / GIF / WEBP) display as thumbnails via the rendition endpoint. Non-images show a doctype icon and the filename — the thumbnail slot is not used.
- **Preview** uses the standard `filePreview` named page; behaviour matches Salesforce Files.
