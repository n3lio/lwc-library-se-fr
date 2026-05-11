import { LightningElement, api, wire, track } from 'lwc';
import getNearbyAccounts from '@salesforce/apex/SE_FR_NearbyAccountsController.getNearbyAccounts';

const PIN_SVG = 'M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z';
const DEFAULT_PIN = '#2e844a';
const PRIORITY_PIN = '#ba0517';
const ORIGIN_PIN = '#0176d3';

const LABELS = {
    en: {
        cardTitle: 'Nearby Customers',
        listSubtitle: 'Accounts',
        originLabel: 'My location',
        useMyLocation: 'Use my location',
        geoAuto: 'Live location',
        geoManual: 'Manual',
        geoFallback: 'Fallback (permission denied)',
        geoResolving: 'Locating…',
        km: 'km'
    },
    fr: {
        cardTitle: 'Clients à proximité',
        listSubtitle: 'Comptes',
        originLabel: 'Ma position',
        useMyLocation: 'Utiliser ma position',
        geoAuto: 'Position en direct',
        geoManual: 'Position manuelle',
        geoFallback: 'Fallback (permission refusée)',
        geoResolving: 'Localisation…',
        km: 'km'
    }
};

// Haversine — distance in km between two lat/lon points. Used to sort accounts by proximity.
function haversineKm(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const R = 6371;
    const toRad = v => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default class SeFrNearbyAccountsMap extends LightningElement {
    @api language = 'fr';
    @api cardTitle;
    @api listSubtitle;
    @api limitCount = 10;
    @api recordTypeName = '';

    // Origin mode. 'auto' = browser geolocation with a fallback to the lat/lng below.
    // 'manual' = always use the lat/lng below.
    @api originMode = 'auto';
    @api originLatitude = '48.859215';
    @api originLongitude = '2.379175';
    @api originLabel;
    @api priorityFirstMarker = false;
    @api zoomLevel = 13;

    @track mapMarkers = [];
    @track resolvedLat;
    @track resolvedLon;
    // 'resolving' | 'auto' | 'manual' | 'fallback'
    @track geoStatus = 'resolving';

    // @track so assignments in wiredAccounts trigger a reactive re-render via the getters.
    @track _accountsData = [];

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get resolvedListSubtitle() { return this.listSubtitle || this.labels.listSubtitle; }
    get resolvedOriginLabel() { return this.originLabel || this.labels.originLabel; }

    connectedCallback() {
        this.resolveOrigin();
    }

    resolveOrigin() {
        const fallbackLat = parseFloat(this.originLatitude);
        const fallbackLon = parseFloat(this.originLongitude);

        if (this.originMode !== 'auto' || !navigator.geolocation) {
            this.resolvedLat = fallbackLat;
            this.resolvedLon = fallbackLon;
            this.geoStatus = 'manual';
            this.rebuildMarkers();
            return;
        }

        this.geoStatus = 'resolving';
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.resolvedLat = pos.coords.latitude;
                this.resolvedLon = pos.coords.longitude;
                this.geoStatus = 'auto';
                this.rebuildMarkers();
            },
            () => {
                this.resolvedLat = fallbackLat;
                this.resolvedLon = fallbackLon;
                this.geoStatus = 'fallback';
                this.rebuildMarkers();
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
        );
    }

    // Manual re-trigger for the "Use my location" button. maximumAge=0 forces a fresh read,
    // so the SE can validate the widget reacts to a new position during the demo.
    refreshGeolocation() {
        if (!navigator.geolocation) return;
        this.geoStatus = 'resolving';
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.resolvedLat = pos.coords.latitude;
                this.resolvedLon = pos.coords.longitude;
                this.geoStatus = 'auto';
                this.rebuildMarkers();
            },
            () => { this.geoStatus = 'fallback'; },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }

    get originLat() {
        return (typeof this.resolvedLat === 'number') ? this.resolvedLat : parseFloat(this.originLatitude);
    }
    get originLon() {
        return (typeof this.resolvedLon === 'number') ? this.resolvedLon : parseFloat(this.originLongitude);
    }

    get mapCenter() {
        return { location: { Latitude: this.originLat, Longitude: this.originLon } };
    }

    get originMarker() {
        return {
            location: { Latitude: this.originLat, Longitude: this.originLon },
            title: this.resolvedOriginLabel,
            icon: 'standard:user',
            mapIcon: {
                path: PIN_SVG,
                fillColor: ORIGIN_PIN,
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: '#ffffff',
                scale: 1.5,
                anchor: { x: 12, y: 22 }
            }
        };
    }

    // lightning-map auto-appends the marker count — so we return just the label.
    get markersTitle() { return this.resolvedListSubtitle; }

    @wire(getNearbyAccounts, { limitCount: '$limitCount', recordTypeName: '$recordTypeName' })
    wiredAccounts({ data, error }) {
        if (data) {
            this._accountsData = data;
            this.rebuildMarkers();
        } else if (error) {
            // eslint-disable-next-line no-console
            console.error('[seFrNearbyAccountsMap] getNearbyAccounts error:', error);
        }
    }

    rebuildMarkers() {
        const originLat = this.originLat;
        const originLon = this.originLon;

        // Pre-compute distance per account so we can sort by proximity (nulls last).
        const enriched = (this._accountsData || []).map(acc => {
            const hasCoords = acc.BillingLatitude != null && acc.BillingLongitude != null;
            const distance = hasCoords ? haversineKm(originLat, originLon, acc.BillingLatitude, acc.BillingLongitude) : null;
            return { acc, distance, hasCoords };
        });
        enriched.sort((a, b) => {
            if (a.distance == null && b.distance == null) return 0;
            if (a.distance == null) return 1;
            if (b.distance == null) return -1;
            return a.distance - b.distance;
        });
        // Apex returns a large geo-pool so the proximity sort actually finds the nearest accounts.
        // Keep only the `limitCount` closest for display.
        const max = Math.max(1, Number(this.limitCount) || 10);
        const trimmed = enriched.slice(0, max);

        const accountMarkers = trimmed.map((e, index) => {
            const { acc, distance, hasCoords } = e;
            const pinColor = (this.priorityFirstMarker && index === 0) ? PRIORITY_PIN : DEFAULT_PIN;
            const distanceLine = distance != null ? ` — ${distance.toFixed(1)} ${this.labels.km}` : '';

            // Prefer Lat/Lng when we have them — skips server-side geocoding. Fall back to the
            // address fields otherwise so accounts without geocoded coordinates still display.
            const location = hasCoords
                ? { Latitude: acc.BillingLatitude, Longitude: acc.BillingLongitude }
                : {
                    Street: acc.BillingStreet,
                    City: acc.BillingCity,
                    PostalCode: acc.BillingPostalCode,
                    Country: acc.BillingCountry
                };

            return {
                location,
                title: acc.Name + distanceLine,
                icon: 'standard:location',
                mapIcon: {
                    path: PIN_SVG,
                    fillColor: pinColor,
                    fillOpacity: 1,
                    strokeWeight: 1,
                    strokeColor: '#ffffff',
                    scale: 1.5,
                    anchor: { x: 12, y: 22 }
                }
            };
        });

        this.mapMarkers = [this.originMarker, ...accountMarkers];
    }

    // ---------- Status badge (visible hint: is the position auto/manual/fallback) ----------

    get geoStatusLabel() {
        const l = this.labels;
        switch (this.geoStatus) {
            case 'auto':     return l.geoAuto;
            case 'manual':   return l.geoManual;
            case 'fallback': return l.geoFallback;
            case 'resolving':return l.geoResolving;
            default:         return '';
        }
    }
    get geoStatusClass() {
        const base = 'geo-badge';
        switch (this.geoStatus) {
            case 'auto':     return base + ' geo-badge_auto';
            case 'manual':   return base + ' geo-badge_manual';
            case 'fallback': return base + ' geo-badge_fallback';
            case 'resolving':return base + ' geo-badge_resolving';
            default:         return base;
        }
    }
    get showRefreshButton() { return this.originMode === 'auto' && navigator.geolocation; }
}
