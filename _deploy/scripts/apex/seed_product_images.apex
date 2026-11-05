/*
 * Seed product images via FILES (ContentDocumentLink) — no CSP, served from the
 * Salesforce domain itself. Idempotent: skips products that already have a file.
 *
 * Strategy:
 *   - For each active Product2 without an attached file, generate a colored SVG tile
 *     (background from a palette hashed on product keyword, initials in the center)
 *   - Insert ContentVersion (binary = SVG bytes), then ContentDocumentLink to the Product2
 *
 * Also wipes any Product2.DisplayUrl that still points to the deprecated
 * images.unsplash.com fallback so the LWC falls back to the attached file.
 */

// ---- 1. Clear bad external URLs so the Shepherd URL takes over ----
List<Product2> toClearUrl = new List<Product2>();
for (Product2 p : [
    SELECT Id, DisplayUrl FROM Product2
    WHERE DisplayUrl != null AND DisplayUrl LIKE 'https://images.unsplash.com%'
]) {
    p.DisplayUrl = null;
    toClearUrl.add(p);
}
if (!toClearUrl.isEmpty()) update toClearUrl;
System.debug('Cleared Unsplash DisplayUrl on ' + toClearUrl.size() + ' products.');

// ---- 2. Detect which products already have a file ----
List<Id> allPids = new List<Id>();
for (Product2 p : [SELECT Id FROM Product2 WHERE IsActive = true LIMIT 200]) allPids.add(p.Id);

Set<Id> withFile = new Set<Id>();
for (ContentDocumentLink cdl : [
    SELECT LinkedEntityId FROM ContentDocumentLink WHERE LinkedEntityId IN :allPids
]) withFile.add(cdl.LinkedEntityId);

// ---- 3. Palette : background + ink per keyword (hashed) ----
List<String> PALETTE = new List<String>{
    '#003da5|#ffffff', // SF blue
    '#2e844a|#ffffff', // green
    '#8a3fde|#ffffff', // purple
    '#c23934|#ffffff', // red
    '#f2b600|#16325c', // amber
    '#005fb2|#ffffff', // navy
    '#36a3a3|#ffffff', // teal
    '#b8541f|#ffffff', // bronze
    '#4a4a4a|#ffffff', // slate
    '#1a3a7e|#ffffff'  // deep blue
};

// ---- 4. Build + insert ContentVersions for products without a file ----
List<Product2> targets = [
    SELECT Id, Name, ProductCode FROM Product2
    WHERE IsActive = true AND Id NOT IN :withFile
];

List<ContentVersion> cvs = new List<ContentVersion>();
Map<Integer, Id> idxToProductId = new Map<Integer, Id>();
Integer idx = 0;
for (Product2 p : targets) {
    String name = (p.Name == null ? 'P' : p.Name);
    // Initials: first letter of each of the first 2 words
    List<String> parts = name.split(' ');
    String initials = '';
    for (Integer i = 0; i < parts.size() && initials.length() < 2; i++) {
        if (parts[i].length() > 0) initials += parts[i].substring(0, 1).toUpperCase();
    }
    if (initials.length() == 0) initials = 'P';

    // Palette : stable hash on first 3 chars of ProductCode (fallback = Name)
    String seed = (p.ProductCode != null && p.ProductCode.length() > 0 ? p.ProductCode : name);
    Integer h = 0;
    List<Integer> codes = seed.getChars();
    for (Integer cp : codes) h = (h * 31 + cp) & 2147483647;
    List<String> pair = PALETTE[Math.mod(h, PALETTE.size())].split('\\|');
    String bg = pair[0];
    String ink = pair[1];

    // SVG — 240x240 tile, initials centered on colored background, product code at bottom
    String svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">'
        + '<rect width="240" height="240" fill="' + bg + '"/>'
        + '<text x="120" y="130" font-family="Inter, Helvetica, Arial, sans-serif" font-size="92" font-weight="700" fill="' + ink + '" text-anchor="middle" dominant-baseline="central">' + initials.escapeXml() + '</text>'
        + (p.ProductCode == null ? '' :
            '<text x="120" y="210" font-family="Inter, Helvetica, Arial, sans-serif" font-size="18" fill="' + ink + '" fill-opacity="0.8" text-anchor="middle">' + p.ProductCode.escapeXml() + '</text>'
          )
        + '</svg>';

    ContentVersion cv = new ContentVersion();
    cv.Title = 'Product image — ' + name;
    cv.PathOnClient = 'product-' + (p.ProductCode == null ? String.valueOf(idx) : p.ProductCode) + '.svg';
    cv.VersionData = Blob.valueOf(svg);
    cv.FirstPublishLocationId = p.Id; // auto-creates ContentDocument + ContentDocumentLink
    cvs.add(cv);
    idxToProductId.put(idx, p.Id);
    idx++;
}

if (!cvs.isEmpty()) {
    insert cvs;
    System.debug('Inserted ' + cvs.size() + ' product image files (ContentVersion).');
} else {
    System.debug('No products needed seeding — all active products already have a file.');
}
