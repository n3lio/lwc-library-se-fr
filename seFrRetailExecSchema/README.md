# CCO FR — Retail Execution Schema (`seFrRetailExecSchema`)

**Socle de données du pattern Retail Execution de la lib.**

Un `CustomObject` `Visit__c` + fields + permset. Rien d'autre. Ce bundle n'a pas de LWC — c'est le prérequis schema sur lequel les composants `seFrVisit*` (et le Flow `CCO_FR_Start_Visit` quand il crée des visites) s'appuient.

## Pourquoi un sObject custom ?

Le pattern Retail Execution DIM / CGC s'appuie sur le sObject **standard** `Visit` du managed package **Retail Execution** (Consumer Goods Cloud / Industries). Mais la lib CCO FR est **zero managed-package dep** (rule 10.14). On ship donc notre propre `Visit__c` identique dans l'esprit (lifecycle, dates planned / check-in / check-out).

**Si vous êtes sur une org qui a déjà le managed package Retail Execution**, ne déployez pas ce bundle : pointez les composants `seFrVisit*` sur `Visit` à la place (modifier `<object>Visit__c</object>` → `<object>Visit</object>` dans les js-meta.xml).

**Si vous êtes sur une org qui a déjà son propre `Visit__c`**, ne déployez pas ce bundle non plus — adaptez les field API names dans les controllers Apex si besoin.

## Contenu

```
seFrRetailExecSchema/
├── README.md
├── objects/
│   └── Visit__c/
│       ├── Visit__c.object-meta.xml            — AutoNumber "V-{0000}", Public RW, Activities + Feeds + History ON
│       └── fields/
│           ├── Account__c.field-meta.xml       — Lookup(Account), SetNull
│           ├── VisitState__c.field-meta.xml    — Picklist (Planned / In Progress / Completed / Cancelled)
│           ├── PlannedStartDateTime__c.field-meta.xml
│           ├── PlannedEndDateTime__c.field-meta.xml
│           ├── CheckInDateTime__c.field-meta.xml
│           ├── CheckOutDateTime__c.field-meta.xml
│           ├── Location__c.field-meta.xml      — Text(255)
│           ├── Notes__c.field-meta.xml         — LongTextArea
│           └── Summary__c.field-meta.xml       — LongTextArea (résumé IA)
└── permissionsets/
    └── CCO_FR_Retail_Exec.permissionset-meta.xml  — Full CRUD on Visit__c + all fields
```

## Déploiement

```bash
sf project deploy start -d seFrRetailExecSchema/objects -d seFrRetailExecSchema/permissionsets -o <alias>
sf org assign permset -n "CCO_FR_Retail_Exec" -o <alias>
```

## Composants qui en dépendent

- `seFrVisitSummaryAI` — résumé IA sur un record Visit__c
- *(à venir)* `seFrVisitKanban` — vue lifecycle Planned → In Progress → Completed sur Account
- *(à venir)* `seFrVisitShelfCompliance` — upload photo rayon + analyse IA (depuis page Visit__c)
- *(à venir)* `seFrVisitQuickOrder` — prise de commande rapide (depuis page Visit__c)
- Flow `CCO_FR_Start_Visit` (shipped par `seFrAccountActions`) — crée un `Visit__c` et navigue dessus

## Lifecycle visité (convention)

| État | Déclencheur | Composants actifs |
|---|---|---|
| `Planned` | Création via Flow `CCO_FR_Start_Visit` | infos (`PlannedStart/EndDateTime`) |
| `In Progress` | Check-in utilisateur (manuel ou geoloc) → stamp `CheckInDateTime__c` | all retail-exec LWCs |
| `Completed` | Check-out utilisateur → stamp `CheckOutDateTime__c` → optionnel : auto-résumé IA | `seFrVisitSummaryAI` affiche le résumé final |
| `Cancelled` | Manuel | read-only |
