# Plan portage Retail Execution — DIM → lib CCO FR

**Date** : 2026-10-21
**Source** : archive `~/Documents/Clients/DBI/2026-10-21 Archive org/`

## Mapping DIM → lib

| DIM composant | Lib existante | Décision |
|---|---|---|
| `dimAccountActions` | ✅ `seFrRecordActions` | déjà porté (10-15) |
| `dimStartVisit` | ✅ via Flow `CCO_FR_Start_Visit` | déjà couvert (10-16) |
| `dimVoiceNote` | ≈ `seFrVoiceNoteTaker` | **à comparer** (dim fait du prompt action aussi — enrichir ?) |
| `dimOrderHistory` | ≈ `seFrCustomerOrders` | déjà couvert |
| `dimQuickOrder` | ≈ `seFrOrderEntry` | déjà couvert |
| `dimStoreMap` | ≈ `seFrNearbyAccountsMap` | déjà couvert |
| `dimFieldDashboard` | ≈ `seFrFieldRepHome` | déjà couvert |
| `dimProductsKpi` | ≈ `seFrMetricTile` composable | déjà couvert |
| `dimAgentDnv` | ❌ | niche (Day & Night Visitor, retail-spé) → PAS porter |
| `dimManagerDashboard` | ❌ | niche manager retail → PAS porter |
| **`dimVisitSummaryAI`** | ❌ | ⭐ **PORTER** → `seFrVisitSummaryAI` (universal, Event-based) |
| **`dimShelfSpace`** | ❌ | ⭐ **PORTER** → `seFrShelfCompliance` (universal, photo + metadata) |

## Flows DIM

| Flow | Lib ? | Décision |
|---|---|---|
| `DIM_CheckIn_Visite` | ❌ | couvert par `CCO_FR_Start_Visit` (créer Event = check-in) |
| `DIM_Terminer_Visite` | ❌ | ⭐ **PORTER** → `CCO_FR_End_Visit` (clôture Event + optionnel VisitSummaryAI auto-launch) |
| `DIM_Retour_Produit` | ❌ | PAS porter — dépendant d'un sObject `Return__c` DIM |

## Priorités (ordre d'exécution)

**Pivot 2026-10-21** : la 1ère itération ciblait `Event` (zero schema) mais on perdait le vrai pattern retail exec (lifecycle Planned → In Progress → Completed). Nouveau socle : **la lib ship son propre `Visit__c`** (bundle `seFrRetailExecSchema`). Nom plat sans préfixe lib ; les composants retail exec ciblent `Visit__c`. Compatible avec le managed Retail Execution via cloning (cf. README du schema).

1. ✅ **`seFrRetailExecSchema`** (2026-10-21) — socle
   - CustomObject `Visit__c` (AutoNumber V-{0000})
   - 9 fields : `Account__c`, `VisitState__c` (Planned/In Progress/Completed/Cancelled), `PlannedStart/EndDateTime__c`, `CheckIn/OutDateTime__c`, `Location__c`, `Notes__c`, `Summary__c`
   - PermSet `CCO_FR_Retail_Exec` (full CRUD + FLS)

2. ✅ **`seFrVisitSummaryAI`** (2026-10-21) — rebranché Visit__c
   - Target : `Visit__c` RecordPage
   - Apex `SE_FR_VisitSummaryController.summarizeVisit` (SOQL Visit__c `WITH USER_MODE`)
   - PromptTemplate Flex optional (`Input:Visit__c`)
   - Fallback : summary from State + Account + duration + check-in/out + notes

3. ✅ **`CCO_FR_Start_Visit`** v5 (2026-10-21) — rebranché Visit__c
   - Flow shipped par `seFrRecordActions`
   - Crée un `Visit__c` (status Planned) depuis une page Account → navigate vers la Visit__c
   - inputAssignments : Account__c, VisitState__c=Planned, PlannedStart/EndDateTime__c, Location__c, Notes__c

4. **`seFrVisitCheckIn`** (futur) — composant check-in sur Visit__c
   - Bouton "Check-in" → stamp `CheckInDateTime__c = NOW`, flip `VisitState__c` → In Progress
   - Bouton "Check-out" → stamp `CheckOutDateTime__c = NOW`, flip `VisitState__c` → Completed, optional auto-launch VisitSummaryAI

5. **`seFrVisitShelfCompliance`** (futur) — upload photo rayon depuis Visit__c
   - `lightning-file-upload` → ContentDocument lié à Visit__c
   - Agentforce vision prompt template (optionnel) pour analyse planogramme

6. **`seFrVisitKanban`** (futur) — vue Kanban sur Account page
   - 4 colonnes = 4 VisitState__c values, cards = Visit__c records de l'Account courant
   - Drag-and-drop updates VisitState__c

## Dépendances / compliance

- ✅ Zero managed-package : la lib ship son propre `Visit__c`. L'admin **doit** déployer `seFrRetailExecSchema` avant d'utiliser `seFrVisitSummaryAI` et le Flow `CCO_FR_Start_Visit`.
- ✅ Compatible org managed Retail Execution : cloner `seFrVisit*` et remplacer `Visit__c` → `Visit` (field names à mapper).
- ✅ Pas de préfixe lib sur le sObject (`Visit__c` plat, choix produit 2026-10-21).
- ✅ Agentforce / Einstein via `ConnectApi.EinsteinLLMGenerations` (soft-fail + fallback texte brut).

## Archive de référence (lecture seule)

- `~/Documents/Clients/DBI/2026-10-21 Archive org/retrieve/unpackaged/lwc/dim*/`
- `~/Documents/Clients/DBI/2026-10-21 Archive org/retrieve/unpackaged/flows/DIM_*.flow-meta.xml`
- `~/Documents/Clients/DBI/2026-10-21 Archive org/retrieve/unpackaged/classes/DIM_*`
