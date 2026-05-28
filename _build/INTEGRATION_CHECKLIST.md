# Component Integration Checklist

Checklist for integrating a new contributor component into the CCO FR library.
Run through **every item** before marking a component as "done".

---

## 1. Naming & Structure

- [ ] LWC folder: `seFr<PascalName>/lwc/seFr<PascalName>/`
- [ ] Apex class (if any): `SE_FR_<PascalName>Controller.cls`
- [ ] masterLabel: `CCO FR - <Human Name>`
- [ ] Folder at repo root level (next to existing components)

## 2. Bilingual (FR / EN)

- [ ] Internal `DICT` object with `fr` and `en` keys for ALL user-facing strings
- [ ] `@api language = 'fr'` — defaults to French
- [ ] Default values in XML meta must be in **FR** (matches default language prop)
- [ ] If types/categories exist as keys (TYPE_META maps, etc.), support **both** FR and EN keys, plus accent-safe FR variants for XML defaults

## 3. Icon & Visual

- [ ] `cardIcon` must be a **valid SLDS icon** (test it renders in App Builder before deploy)
- [ ] Verify icon is visible in both wide and narrow (column) layouts
- [ ] Border-radius: `12px` on card root (library standard)

## 4. Default Values — Demo-Ready

- [ ] All pipe-separated defaults must be **varied** (illustrate all types/states the component supports)
- [ ] Minimum 6-8 default rows for list components (enough to fill a card)
- [ ] Use realistic-sounding FR data (emails, names, dates in French format)
- [ ] Never have all defaults be the same type/value — defeats the demo purpose

## 5. Layout Robustness

- [ ] Test in narrow column layout (1/3 page width) — no overflow/overlap
- [ ] Search bars, filters, toolbars: place **inside card body** (never in `slot="actions"` which overlaps title in narrow layouts)
- [ ] Long text: truncate with ellipsis or wrap gracefully
- [ ] Test on mobile viewport if `mobileReady: true`

## 6. Pagination / Progressive Disclosure

- [ ] If list can exceed 5-6 items: implement "Show more / Show less" pattern
- [ ] Default visible count: **6 items**
- [ ] Pre-fill **8 values** in defaults (so toggle button appears out of the box)
- [ ] Toggle button label bilingual (Voir plus / Show more)

## 7. Ready-to-Use (Zero Custom Fields by Default)

- [ ] Component must work **immediately** on any SDO without custom object/field creation
- [ ] If original design uses custom fields → implement **hybrid Apex** (dynamic SOQL with `Schema.SObjectType.*.fields.getMap()`)
- [ ] Standard mode = standard fields only. Full mode = auto-detected custom fields
- [ ] Document both modes in README with data seeding instructions for Full mode
- [ ] Mock components (zero Apex): all data from App Builder props = always works

## 8. README Frontmatter

- [ ] All required keys present: `tagline`, `categories`, `personas`, `chips`, `dataMode`, `mobileReady`, `originalAuthor`, `originalAuthorEmail`, `maintainedBy`, `libraryIntegrationDate`, `keyProps`, `seBenefit`, `releaseStatus`, `status`, `screenshots`
- [ ] Category from allowed list (check `build_manifest.py` ALLOWED_CATEGORIES)
- [ ] Personas from allowed list (no spaces in compound names: `FieldSales` not `Field Sales`)

## 9. XML Meta

- [ ] apiVersion: current (62.0+)
- [ ] `isExposed: true`
- [ ] Targets include `lightning__RecordPage` + appropriate objects
- [ ] All `@api` props have corresponding `<property>` entries with labels and descriptions
- [ ] **No `&` in description** — use "and" (XML parse error)
- [ ] Default values use safe characters (no accented chars in XML attribute values if they can be avoided — provide accent-free alternatives in JS)

## 10. Deploy & Test

- [ ] Deploy to `se_fr_sdo` showcase org
- [ ] **DO NOT modify page layouts** — contributor adds manually
- [ ] Test in App Builder: icon visible, defaults render, bilingual toggle works
- [ ] Test narrow column: no overflow, search doesn't overlap title
- [ ] Test "Show more" button appears with default values

---

## Quick Reference: Common Pitfalls

| Pitfall | Fix |
|---|---|
| `standard:share` icon invisible | Use `standard:activations`, `standard:team_member`, `standard:groups`. **Always test visually before deploy!** |
| `standard:social` invisible | Same — many `standard:*` icons simply don't render. Stick to known-working ones (see list below) |
| Search bar in `slot="actions"` overlaps title | Use a **round icon button** (`lightning-button-icon variant="border-filled" size="small"`) that toggles inline search below the header |
| `lightning-button` for "show more" | Library standard = **`lightning-button-icon`** with `variant="border-filled"`, `size="small"`, chevron icon. Round buttons, not text buttons. |
| All defaults same type | Vary to showcase all supported types. First 6 visible items must cover max variety. |
| Custom fields required to render | Hybrid Apex with runtime schema detection |
| Accented chars in XML defaults | Use accent-free variants + map both forms in JS |
| 20+ rows visible at once | Cap at 6 + round chevron button toggle |
| EN defaults when language=fr | Match defaults to default language prop |
| `@api dataMode` | LWC reserves `data*` prefixes. Use `sourceMode` instead |
| Removing XML properties after deploy | Once a property is used on a Lightning page, it CANNOT be removed from the XML. Keep deprecated props with "(legacy)" label. |
| Props starting with `data` | LWC1503 — `data*` is reserved for HTML `data-*` attributes. Use a different prefix. |

## Known-Working SLDS Icons (tested on SDO)

**Standard icons that render correctly:**
- `standard:account`, `standard:contact`, `standard:opportunity`, `standard:lead`, `standard:case`
- `standard:service_contract`, `standard:team_member`, `standard:groups`
- `standard:activations`, `standard:task`, `standard:event`
- `standard:dashboard`, `standard:report`, `standard:record`

**Standard icons that DON'T render (invisible):**
- `standard:share` ❌
- `standard:social` ❌

**Utility icons (always work):**
- All `utility:*` icons work reliably inside components
