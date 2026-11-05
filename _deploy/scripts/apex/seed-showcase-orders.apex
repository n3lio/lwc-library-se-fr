// =============================================================================
// CCO FR Showcase — Enrichissement commandes historiques
// =============================================================================
// Lance APRÈS seed-showcase-data.apex. Idempotent.
//   - Upsert d'un catalogue CPG 15 SKU + PricebookEntries sur le standard pricebook
//   - Désactive les Products par défaut (GenWatt / SLA / Installation)
//   - Insère 4-5 commandes historiques par Account sur les 11 derniers mois avec
//     des OrderItems — mix Draft / Activated. Marker "[seed:historical]" dans
//     Description pour éviter les doublons.
//
// Run :
//   sf apex run -o cco-fr-de -f _deploy/scripts/apex/seed-showcase-orders.apex
// =============================================================================

Id runningUserId = UserInfo.getUserId();

// Accounts à cibler — déjà seedés par seed-showcase-data.apex.
Set<String> accNames = new Set<String>{'Carrefour FR', 'Monoprix', 'Franprix'};
Map<String, Id> accIdByName = new Map<String, Id>();
for (Account a : [SELECT Id, Name FROM Account WHERE Name IN :accNames]) {
    accIdByName.put(a.Name, a.Id);
}
if (accIdByName.isEmpty()) {
    System.debug('Accounts manquants - lance seed-showcase-data.apex d abord. Abandon.');
    return;
}

// ---------- CPG Products catalog -------------------------------------------
List<Object> CPG_CATALOG = new List<Object>{
    new List<String>{'Nutella Pate a tartiner 400g'  , 'NUT400' , 'Epicerie'   , '4.99'  },
    new List<String>{'Evian Eau minerale 1,5L'       , 'EVI15'  , 'Boissons'   , '1.49'  },
    new List<String>{'Coca-Cola Original 1,5L'       , 'CC15'   , 'Boissons'   , '2.19'  },
    new List<String>{'Pringles Original 165g'        , 'PRIN165', 'Snacks'     , '3.49'  },
    new List<String>{'Haribo Dragibus 300g'          , 'DRA300' , 'Confiserie' , '2.99'  },
    new List<String>{'Perrier Citron 1L'             , 'PER1C'  , 'Boissons'   , '1.89'  },
    new List<String>{'President Camembert 250g'      , 'CAM250' , 'Frais'      , '3.69'  },
    new List<String>{'Danone Activia 4x125g'         , 'DAN4'   , 'Frais'      , '3.29'  },
    new List<String>{'Barilla Spaghetti n5 500g'     , 'BAR500' , 'Epicerie'   , '1.59'  },
    new List<String>{'Lustucru Riz long grain 1kg'   , 'LUS1K'  , 'Epicerie'   , '2.49'  },
    new List<String>{'MandMs Peanut 250g'            , 'MMP250' , 'Confiserie' , '4.49'  },
    new List<String>{'Kinder Bueno x30'              , 'KBX30'  , 'Confiserie' , '15.90' },
    new List<String>{'Lavazza Qualita Rossa 1kg'     , 'LAV1K'  , 'Cafe'       , '12.90' },
    new List<String>{'St-Yorre eau petillante 1,25L' , 'SY125'  , 'Boissons'   , '1.19'  },
    new List<String>{'Ricard 70cl'                   , 'RIC70'  , 'Alcool'     , '22.90' }
};
Set<String> cpgCodes = new Set<String>();
for (Object rowObj : CPG_CATALOG) {
    List<String> row = (List<String>) rowObj;
    cpgCodes.add(row[1]);
}

Map<String, Product2> existingProductsByCode = new Map<String, Product2>();
for (Product2 p : [SELECT Id, Name, ProductCode, Family, IsActive FROM Product2 WHERE ProductCode IN :cpgCodes]) {
    existingProductsByCode.put(p.ProductCode, p);
}
List<Product2> productsToInsert = new List<Product2>();
List<Product2> productsToUpdate = new List<Product2>();
for (Object rowObj : CPG_CATALOG) {
    List<String> row = (List<String>) rowObj;
    String pname = row[0]; String pcode = row[1]; String pfam = row[2];
    if (existingProductsByCode.containsKey(pcode)) {
        Product2 p = existingProductsByCode.get(pcode);
        if (!p.IsActive || p.Name != pname || p.Family != pfam) {
            p.IsActive = true; p.Name = pname; p.Family = pfam;
            productsToUpdate.add(p);
        }
    } else {
        productsToInsert.add(new Product2(Name = pname, ProductCode = pcode, Family = pfam, IsActive = true));
    }
}
if (!productsToInsert.isEmpty()) insert productsToInsert;
if (!productsToUpdate.isEmpty()) update productsToUpdate;

Map<String, Id> prodIdByCode = new Map<String, Id>();
for (Product2 p : [SELECT Id, ProductCode FROM Product2 WHERE ProductCode IN :cpgCodes]) {
    prodIdByCode.put(p.ProductCode, p.Id);
}
System.debug('CPG Products ready: ' + prodIdByCode.size() + ' (new: ' + productsToInsert.size() + ', upd: ' + productsToUpdate.size() + ')');

Pricebook2 stdPb = [SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1];

Map<Id, PricebookEntry> existingPbeByProductId = new Map<Id, PricebookEntry>();
for (PricebookEntry pbe : [SELECT Id, Product2Id, UnitPrice, IsActive FROM PricebookEntry WHERE Pricebook2Id = :stdPb.Id AND Product2Id IN :prodIdByCode.values()]) {
    existingPbeByProductId.put(pbe.Product2Id, pbe);
}
List<PricebookEntry> pbesToInsert = new List<PricebookEntry>();
List<PricebookEntry> pbesToUpdate = new List<PricebookEntry>();
for (Object rowObj : CPG_CATALOG) {
    List<String> row = (List<String>) rowObj;
    Id pid = prodIdByCode.get(row[1]);
    if (pid == null) continue;
    Decimal price = Decimal.valueOf(row[3]);
    if (existingPbeByProductId.containsKey(pid)) {
        PricebookEntry pbe = existingPbeByProductId.get(pid);
        if (!pbe.IsActive || pbe.UnitPrice != price) {
            pbe.IsActive = true; pbe.UnitPrice = price;
            pbesToUpdate.add(pbe);
        }
    } else {
        pbesToInsert.add(new PricebookEntry(Pricebook2Id = stdPb.Id, Product2Id = pid, UnitPrice = price, IsActive = true, UseStandardPrice = false));
    }
}
if (!pbesToInsert.isEmpty()) insert pbesToInsert;
if (!pbesToUpdate.isEmpty()) update pbesToUpdate;

Map<Id, PricebookEntry> pbeByProductId = new Map<Id, PricebookEntry>();
for (PricebookEntry pbe : [SELECT Id, Product2Id, UnitPrice FROM PricebookEntry WHERE Pricebook2Id = :stdPb.Id AND Product2Id IN :prodIdByCode.values() AND IsActive = true]) {
    pbeByProductId.put(pbe.Product2Id, pbe);
}
System.debug('PBE ready: ' + pbeByProductId.size() + ' (new: ' + pbesToInsert.size() + ', upd: ' + pbesToUpdate.size() + ')');


// Images produits : SVG du static resource cpg_products (champ Product2.Image_URL__c).
if (Schema.SObjectType.Product2.fields.getMap().containsKey('image_url__c')) {
    List<Product2> withImg = new List<Product2>();
    for (Product2 p : [SELECT Id, ProductCode FROM Product2 WHERE ProductCode IN :cpgCodes]) {
        p.put('Image_URL__c', '/resource/cpg_products/' + p.ProductCode + '.svg');
        withImg.add(p);
    }
    if (!withImg.isEmpty()) update withImg;
    System.debug('Product images set: ' + withImg.size());
}

// Désactive les Products par défaut Dev Edition.
List<Product2> toHide = new List<Product2>();
for (Product2 p : [SELECT Id, IsActive FROM Product2 WHERE IsActive = true AND (ProductCode LIKE 'GC%' OR ProductCode LIKE 'IN70%' OR ProductCode LIKE 'SL90%')]) {
    p.IsActive = false;
    toHide.add(p);
}
if (!toHide.isEmpty()) update toHide;
System.debug('Deactivated default dev products: ' + toHide.size());

// ---------- Historical Orders + OrderItems ---------------------------------
// Idempotency marker : les commandes historiques ont des OrderItems. On compte le
// nombre d'Orders qui ont au moins 1 OrderItem par Account — si >=4, on skip.
String SEED_MARKER = '[seed:historical]';

Set<Id> orderIdsWithItems = new Set<Id>();
for (AggregateResult ar : [
    SELECT OrderId oid FROM OrderItem WHERE Order.AccountId IN :accIdByName.values() GROUP BY OrderId
]) {
    orderIdsWithItems.add((Id) ar.get('oid'));
}
Map<Id, Integer> histOrderCountByAcc = new Map<Id, Integer>();
for (Order o : [SELECT Id, AccountId FROM Order WHERE AccountId IN :accIdByName.values() AND Id IN :orderIdsWithItems]) {
    Integer n = histOrderCountByAcc.get(o.AccountId);
    histOrderCountByAcc.put(o.AccountId, (n == null ? 1 : n + 1));
}

// Plan par account — monthsAgo, activate, lines[(code, qty)]
Map<String, List<Object>> ordersByAcc = new Map<String, List<Object>>();

ordersByAcc.put('Carrefour FR', new List<Object>{
    new Map<String, Object>{'monthsAgo' => 11, 'activate' => true,  'lines' => new List<Object>{
        new List<String>{'NUT400','96'}, new List<String>{'CC15','120'}, new List<String>{'EVI15','120'}, new List<String>{'PRIN165','72'} }},
    new Map<String, Object>{'monthsAgo' => 9,  'activate' => true,  'lines' => new List<Object>{
        new List<String>{'CAM250','60'}, new List<String>{'DAN4','96'}, new List<String>{'BAR500','72'}, new List<String>{'LUS1K','48'}, new List<String>{'LAV1K','24'} }},
    new Map<String, Object>{'monthsAgo' => 6,  'activate' => true,  'lines' => new List<Object>{
        new List<String>{'KBX30','36'}, new List<String>{'MMP250','60'}, new List<String>{'DRA300','72'}, new List<String>{'RIC70','24'} }},
    new Map<String, Object>{'monthsAgo' => 3,  'activate' => true,  'lines' => new List<Object>{
        new List<String>{'NUT400','72'}, new List<String>{'EVI15','144'}, new List<String>{'SY125','96'}, new List<String>{'PER1C','72'} }},
    new Map<String, Object>{'monthsAgo' => 1,  'activate' => false, 'lines' => new List<Object>{
        new List<String>{'CC15','96'}, new List<String>{'PRIN165','48'}, new List<String>{'DAN4','60'}, new List<String>{'CAM250','48'} }}
});

ordersByAcc.put('Monoprix', new List<Object>{
    new Map<String, Object>{'monthsAgo' => 10, 'activate' => true,  'lines' => new List<Object>{
        new List<String>{'LAV1K','36'}, new List<String>{'NUT400','48'}, new List<String>{'PER1C','72'}, new List<String>{'DAN4','60'} }},
    new Map<String, Object>{'monthsAgo' => 7,  'activate' => true,  'lines' => new List<Object>{
        new List<String>{'CAM250','36'}, new List<String>{'KBX30','24'}, new List<String>{'MMP250','36'}, new List<String>{'BAR500','48'} }},
    new Map<String, Object>{'monthsAgo' => 4,  'activate' => true,  'lines' => new List<Object>{
        new List<String>{'EVI15','96'}, new List<String>{'SY125','72'}, new List<String>{'LUS1K','48'}, new List<String>{'DRA300','36'} }},
    new Map<String, Object>{'monthsAgo' => 2,  'activate' => false, 'lines' => new List<Object>{
        new List<String>{'NUT400','48'}, new List<String>{'LAV1K','24'}, new List<String>{'DAN4','60'} }}
});

ordersByAcc.put('Franprix', new List<Object>{
    new Map<String, Object>{'monthsAgo' => 10, 'activate' => true,  'lines' => new List<Object>{
        new List<String>{'CC15','72'}, new List<String>{'EVI15','96'}, new List<String>{'PRIN165','36'} }},
    new Map<String, Object>{'monthsAgo' => 6,  'activate' => true,  'lines' => new List<Object>{
        new List<String>{'DAN4','48'}, new List<String>{'CAM250','24'}, new List<String>{'BAR500','36'}, new List<String>{'LUS1K','24'} }},
    new Map<String, Object>{'monthsAgo' => 3,  'activate' => true,  'lines' => new List<Object>{
        new List<String>{'MMP250','36'}, new List<String>{'DRA300','48'}, new List<String>{'KBX30','18'}, new List<String>{'RIC70','12'} }},
    new Map<String, Object>{'monthsAgo' => 1,  'activate' => false, 'lines' => new List<Object>{
        new List<String>{'NUT400','36'}, new List<String>{'CC15','48'}, new List<String>{'PER1C','36'} }}
});

List<Order> histOrdersToInsert = new List<Order>();
List<Map<String, Object>> plansByOrderIdx = new List<Map<String, Object>>();
for (String accName : ordersByAcc.keySet()) {
    Id accId = accIdByName.get(accName);
    if (accId == null) continue;
    if (histOrderCountByAcc.get(accId) != null && histOrderCountByAcc.get(accId) >= 4) continue;
    for (Object planObj : ordersByAcc.get(accName)) {
        Map<String, Object> plan = (Map<String, Object>) planObj;
        Integer m = (Integer) plan.get('monthsAgo');
        Order ord = new Order(
            AccountId = accId,
            Pricebook2Id = stdPb.Id,
            EffectiveDate = Date.today().addMonths(-m).addDays(-3),
            Status = 'Draft',
            Description = accName + ' - commande historique ' + SEED_MARKER,
            OwnerId = runningUserId
        );
        histOrdersToInsert.add(ord);
        plansByOrderIdx.add(plan);
    }
}

if (!histOrdersToInsert.isEmpty()) {
    insert histOrdersToInsert;
    List<OrderItem> histItems = new List<OrderItem>();
    for (Integer i = 0; i < histOrdersToInsert.size(); i++) {
        Order ord = histOrdersToInsert[i];
        Map<String, Object> plan = plansByOrderIdx[i];
        for (Object lineObj : (List<Object>) plan.get('lines')) {
            List<String> line = (List<String>) lineObj;
            Id pid = prodIdByCode.get(line[0]);
            PricebookEntry pbe = pid == null ? null : pbeByProductId.get(pid);
            if (pbe == null) continue;
            histItems.add(new OrderItem(
                OrderId = ord.Id, Product2Id = pid, PricebookEntryId = pbe.Id,
                Quantity = Decimal.valueOf(line[1]), UnitPrice = pbe.UnitPrice
            ));
        }
    }
    if (!histItems.isEmpty()) insert histItems;

    // Activate — en 2 passages pour éviter MIXED_DML.
    List<Order> toActivate = new List<Order>();
    for (Integer i = 0; i < histOrdersToInsert.size(); i++) {
        Boolean shouldActivate = (Boolean) plansByOrderIdx[i].get('activate');
        if (shouldActivate == true) {
            toActivate.add(new Order(Id = histOrdersToInsert[i].Id, Status = 'Activated'));
        }
    }
    if (!toActivate.isEmpty()) {
        try { update toActivate; } catch (Exception e) {
            System.debug('Could not activate orders: ' + e.getMessage());
        }
    }
    System.debug('Historical orders: ' + histOrdersToInsert.size() + ' (items: ' + histItems.size() + ', activated: ' + toActivate.size() + ')');
} else {
    System.debug('Historical orders: already seeded, nothing to do.');
}

System.debug('=== SEED ORDERS ENRICHMENT RÉCAP ===');
System.debug('CPG Products active: ' + [SELECT COUNT() FROM Product2 WHERE ProductCode IN :cpgCodes AND IsActive = true]);
System.debug('Orders total: ' + [SELECT COUNT() FROM Order WHERE AccountId IN :accIdByName.values()]);
System.debug('OrderItems total: ' + [SELECT COUNT() FROM OrderItem WHERE Order.AccountId IN :accIdByName.values()]);
