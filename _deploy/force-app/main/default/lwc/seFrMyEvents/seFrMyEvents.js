import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import getMyEvents from '@salesforce/apex/SE_FR_AgendaController.getMyEvents';

const DEFAULT_TYPE_COLORS = 'Call|#0176d3,Meeting|#4bca81,Demo|#c13975,Training|#f2a900,Other|#747474';
const JOIN_URL_REGEX = /(https?:\/\/[^\s]*(zoom\.us|teams\.microsoft\.com|meet\.google\.com|webex\.com)[^\s<]*)/i;
const DEFAULT_ACCENT = '#0176d3';
const UPCOMING_LIMIT = 3;

const LABELS = {
    en: {
        cardTitle: 'My Day',
        emptyState: 'Nothing scheduled today.',
        allDay: 'All day',
        upcoming: 'Upcoming',
        nowLabel: 'now',
        inMinutes: 'in {n} min',
        tomorrow: 'Tomorrow',
        noSubject: '(No subject)',
        refresh: 'Refresh',
        newEvent: 'New event',
        join: 'Join',
        viewAll: 'View all',
        calendars: 'Calendars',
        noType: 'Other'
    },
    fr: {
        cardTitle: 'Ma journée',
        emptyState: "Rien de prévu aujourd'hui.",
        allDay: 'Journée entière',
        upcoming: 'À venir',
        nowLabel: 'en cours',
        inMinutes: 'dans {n} min',
        tomorrow: 'Demain',
        noSubject: '(Sans objet)',
        refresh: 'Actualiser',
        newEvent: 'Nouvel événement',
        join: 'Rejoindre',
        viewAll: 'Voir tout',
        calendars: 'Calendriers',
        noType: 'Autre'
    }
};

function parseTypeColors(csv) {
    const map = {};
    (csv || '').split(',').forEach(row => {
        const [label, color] = row.split('|').map(s => (s || '').trim());
        if (label) map[label.toLowerCase()] = color || DEFAULT_ACCENT;
    });
    return map;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function formatTime(d, localeTag) {
    return d.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' });
}

function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function minutesBetween(later, earlier) {
    return Math.round((later.getTime() - earlier.getTime()) / 60000);
}

function assignOverlapColumns(events) {
    if (!events.length) return [];
    const sorted = events.slice().sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const columns = [];
    for (const ev of sorted) {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
            if (columns[i] <= ev.startMin) {
                ev.columnIndex = i;
                columns[i] = ev.endMin;
                placed = true;
                break;
            }
        }
        if (!placed) {
            ev.columnIndex = columns.length;
            columns.push(ev.endMin);
        }
    }
    for (const ev of sorted) {
        let maxConcurrent = 1;
        for (const other of sorted) {
            if (other === ev) continue;
            if (other.startMin < ev.endMin && other.endMin > ev.startMin) {
                maxConcurrent = Math.max(maxConcurrent, (other.columnIndex || 0) + 1, (ev.columnIndex || 0) + 1);
            }
        }
        ev.columnCount = maxConcurrent;
    }
    return sorted;
}

export default class SeFrMyEvents extends NavigationMixin(LightningElement) {
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:event';
    @api startHour = 8;
    @api endHour = 20;
    @api daysAhead = 2;
    @api maxEvents = 10;
    @api localeTag = 'fr-FR';
    @api typeColorsCsv = DEFAULT_TYPE_COLORS;
    @api hideNowLine = false;
    @api hideJoinButton = false;
    @api disableAutoTrim = false;
    @api autoTrimPaddingMin = 30;
    @api emptyStateMessage;
    // Comma-separated Event.Type values to keep. Empty = keep all. Useful to hide recurring
    // reminders or Prep/Other entries, and — together with the in-UI toggles — lets the SE
    // pick which "calendars" are displayed.
    @api typesFilterCsv = '';
    // Negated-form prop so the default (`false`) complies with LWC1503 — toggles ON by default.
    @api hideTypeToggles = false;
    get showTypeToggles() { return !this.hideTypeToggles; }

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get resolvedEmptyState() { return this.emptyStateMessage || this.labels.emptyState; }

    get showNowLine() { return !this.hideNowLine; }
    get showJoinButton() { return !this.hideJoinButton; }
    get autoTrim() { return !this.disableAutoTrim; }

    @track nowMinutes;
    @track mutedTypes = new Set(); // lowercase Type values the SE has hidden from the UI
    wiredResult;
    rawEvents = [];
    _tickId;

    connectedCallback() {
        this.refreshNow();
        this._tickId = setInterval(() => this.refreshNow(), 60 * 1000);
    }

    disconnectedCallback() {
        if (this._tickId) clearInterval(this._tickId);
    }

    refreshNow() {
        const n = new Date();
        this.nowMinutes = n.getHours() * 60 + n.getMinutes();
    }

    @wire(getMyEvents, { daysAhead: '$daysAhead', maxRows: '$maxEvents' })
    wiredEvents(result) {
        this.wiredResult = result;
        if (result.data) this.rawEvents = result.data;
    }

    get typeColors() { return parseTypeColors(this.typeColorsCsv); }

    // Parses typesFilterCsv → Set of lowercase tokens. Empty set = "no filter".
    get allowedTypes() {
        const csv = (this.typesFilterCsv || '').trim();
        if (!csv) return null;
        const set = new Set();
        csv.split(',').forEach(s => {
            const k = (s || '').trim().toLowerCase();
            if (k) set.add(k);
        });
        return set.size ? set : null;
    }

    isTypeAllowed(rawType) {
        const key = String(rawType || '').toLowerCase();
        // Prop filter (static) — if set, whitelist wins
        const allow = this.allowedTypes;
        if (allow && !allow.has(key)) return false;
        // In-UI toggles (dynamic) — muted set wins
        if (this.mutedTypes.has(key)) return false;
        return true;
    }

    // Events that belong to today (ignoring the visible hour window).
    // Used as the pool for the timeline AND for the in-UI type toggles.
    get todayCandidates() {
        const { start, end } = this.todayBounds;
        return (this.rawEvents || [])
            .filter(e => !e.IsAllDayEvent)
            .filter(e => this.isTypeAllowed(e.Type))
            .map(e => ({ raw: e, s: new Date(e.StartDateTime), en: new Date(e.EndDateTime) }))
            // Clip the end-of-day edge case: an event ending at 00:00 next day should count as ending at 24:00 today.
            .map(o => {
                // If endDateTime is exactly at or past midnight of the next day, stop it at 23:59:59 of today.
                const midnight = new Date(this.todayBounds.end);
                if (o.en >= midnight) o.en = new Date(midnight.getTime() - 1000);
                return o;
            })
            .filter(o => o.s < end && o.en > start && sameDay(o.s, start));
    }

    // Events that actually overlap the visible hour window [startHour, endHour].
    // This is the list used to compute the auto-trim bounds AND to lay out the timeline.
    get visibleCandidates() {
        const startWindow = this.startHour * 60;
        const endWindow = this.endHour * 60;
        return this.todayCandidates.filter(o => {
            const sMin = o.s.getHours() * 60 + o.s.getMinutes();
            let eMin = o.en.getHours() * 60 + o.en.getMinutes();
            // If endMinutes is 0 (midnight) but the event crosses midnight, treat as 24:00.
            if (eMin === 0 && !sameDay(o.s, o.en)) eMin = 24 * 60;
            return sMin < endWindow && eMin > startWindow;
        });
    }

    // Kept as a named getter for template compatibility — same data as visibleCandidates now.
    get rawTimelineEvents() {
        return this.visibleCandidates;
    }

    get effectiveBounds() {
        const startDefault = this.startHour * 60;
        const endDefault = this.endHour * 60;
        if (!this.autoTrim) return { startMin: startDefault, endMin: endDefault };

        const rows = this.visibleCandidates;
        if (rows.length === 0) return { startMin: startDefault, endMin: startDefault };

        let firstStart = Infinity;
        let lastEnd = -Infinity;
        for (const o of rows) {
            let sMin = o.s.getHours() * 60 + o.s.getMinutes();
            let eMin = o.en.getHours() * 60 + o.en.getMinutes();
            if (eMin === 0 && !sameDay(o.s, o.en)) eMin = 24 * 60;
            // Clamp to the visible window for bounds computation — events that start before 8h
            // shouldn't drag the timeline down to 8h, since only their 8h+ slice will be shown.
            sMin = Math.max(sMin, startDefault);
            eMin = Math.min(eMin, endDefault);
            if (sMin < firstStart) firstStart = sMin;
            if (eMin > lastEnd) lastEnd = eMin;
        }
        const pad = Math.max(0, Number(this.autoTrimPaddingMin) || 0);
        const trimmedStart = Math.max(startDefault, firstStart - pad);
        const trimmedEnd = Math.min(endDefault, lastEnd + pad);
        return { startMin: trimmedStart, endMin: trimmedEnd };
    }

    get dayRangeMinutes() {
        const { startMin, endMin } = this.effectiveBounds;
        return Math.max(60, endMin - startMin);
    }

    get timelineHeight() {
        const px = this.dayRangeMinutes * 1.25;
        return Math.min(Math.max(px, 180), 520);
    }

    get timelineStyle() {
        return `height: ${this.timelineHeight}px;`;
    }

    get hourMarks() {
        const { startMin, endMin } = this.effectiveBounds;
        const marks = [];
        const firstHour = Math.ceil(startMin / 60);
        const lastHour = Math.floor(endMin / 60);
        for (let h = firstHour; h <= lastHour; h++) {
            const topPct = ((h * 60 - startMin) / this.dayRangeMinutes) * 100;
            marks.push({
                key: `h${h}`,
                label: String(h).padStart(2, '0') + ':00',
                style: `top: ${topPct}%;`
            });
        }
        return marks;
    }

    get nowLineStyle() {
        if (!this.showNowLine) return 'display: none;';
        const { startMin, endMin } = this.effectiveBounds;
        if (this.nowMinutes < startMin || this.nowMinutes > endMin) return 'display: none;';
        const topPct = ((this.nowMinutes - startMin) / this.dayRangeMinutes) * 100;
        return `top: ${topPct}%;`;
    }

    get nowLabel() {
        const h = Math.floor(this.nowMinutes / 60);
        const m = this.nowMinutes % 60;
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ' • ' + this.labels.nowLabel;
    }

    get todayBounds() {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 1);
        return { start, end };
    }

    get allDayEvents() {
        const { start, end } = this.todayBounds;
        return (this.rawEvents || [])
            .filter(e => e.IsAllDayEvent)
            .filter(e => new Date(e.StartDateTime) < end && new Date(e.EndDateTime) >= start)
            .map(e => this.shapeAllDay(e));
    }

    get timelineEvents() {
        const { startMin, endMin } = this.effectiveBounds;

        const candidates = this.rawTimelineEvents.map(o => {
            const evStart = o.s.getHours() * 60 + o.s.getMinutes();
            const evEnd = o.en.getHours() * 60 + o.en.getMinutes();
            const visibleStart = clamp(evStart, startMin, endMin);
            const visibleEnd = clamp(evEnd, startMin, endMin);
            if (visibleEnd <= visibleStart) return null;
            return {
                raw: o.raw, s: o.s, en: o.en,
                startMin: visibleStart, endMin: visibleEnd
            };
        }).filter(Boolean);

        const laidOut = assignOverlapColumns(candidates);
        const range = this.dayRangeMinutes;

        return laidOut.map(o => this.shapeTimeline(o, startMin, range));
    }

    shapeTimeline(o, rangeStartMin, range) {
        const topPct = ((o.startMin - rangeStartMin) / range) * 100;
        const heightPct = ((o.endMin - o.startMin) / range) * 100;
        const color = this.colorFor(o.raw.Type);
        const joinUrl = this.showJoinButton ? this.joinUrlFrom(o.raw) : null;

        const columnCount = o.columnCount || 1;
        const columnIndex = o.columnIndex || 0;
        const widthPct = 100 / columnCount;
        const leftPct = columnIndex * widthPct;

        const now = new Date();
        const minsUntil = minutesBetween(o.s, now);
        let nextBadge = null;
        if (minsUntil > 0 && minsUntil <= 30) {
            nextBadge = this.labels.inMinutes.replace('{n}', minsUntil);
        } else if (minsUntil <= 0 && minutesBetween(o.en, now) > 0) {
            nextBadge = this.labels.nowLabel;
        }

        const isCompact = (o.endMin - o.startMin) < 30;

        return {
            id: o.raw.Id,
            subject: o.raw.Subject || this.labels.noSubject,
            timeRange: `${formatTime(o.s, this.localeTag)} – ${formatTime(o.en, this.localeTag)}`,
            whoName: o.raw.Who ? o.raw.Who.Name : '',
            whoId: o.raw.WhoId,
            whatName: o.raw.What ? o.raw.What.Name : '',
            whatId: o.raw.WhatId,
            location: o.raw.Location,
            joinUrl,
            nextBadge,
            isCompact,
            isInColumn: columnCount > 1,
            style: `top: ${topPct}%; height: ${heightPct}%; left: ${leftPct}%; width: ${widthPct}%; border-left: 4px solid ${color}; background-color: ${color}14;`
        };
    }

    get upcomingEvents() {
        const now = new Date();
        const { end } = this.todayBounds;
        return (this.rawEvents || [])
            .filter(e => !e.IsAllDayEvent)
            .filter(e => this.isTypeAllowed(e.Type))
            .map(e => ({ raw: e, s: new Date(e.StartDateTime) }))
            .filter(o => o.s >= end)
            .slice(0, UPCOMING_LIMIT)
            .map(o => this.shapeUpcoming(o, now));
    }

    // ---------- In-UI type toggles ----------

    // Distinct Event.Type values present in the current day's dataset (after the static prop filter).
    get typeToggles() {
        if (!this.showTypeToggles) return [];
        const seen = new Map(); // key (lowercase) → label (original casing)
        const { start, end } = this.todayBounds;
        for (const e of (this.rawEvents || [])) {
            if (e.IsAllDayEvent) continue;
            const allow = this.allowedTypes;
            const key = String(e.Type || '').toLowerCase();
            if (allow && !allow.has(key)) continue;
            const s = new Date(e.StartDateTime);
            if (!(s < end && s >= start)) continue;
            if (!seen.has(key)) seen.set(key, e.Type || this.labels.noType || 'Other');
        }
        const entries = [];
        for (const [key, label] of seen.entries()) {
            entries.push({
                key,
                label,
                active: !this.mutedTypes.has(key),
                chipClass: this.mutedTypes.has(key) ? 'type-chip type-chip_muted' : 'type-chip type-chip_active',
                style: `--chip-color: ${this.colorFor(label)};`
            });
        }
        // Stable alphabetical order so the UI doesn't flicker as data refreshes
        entries.sort((a, b) => a.label.localeCompare(b.label));
        return entries;
    }

    get hasTypeToggles() { return this.typeToggles.length > 1; }

    handleTypeToggle(event) {
        const key = event.currentTarget.dataset.key;
        const next = new Set(this.mutedTypes);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        this.mutedTypes = next;
    }

    get hasAnyEvent() {
        return this.allDayEvents.length + this.timelineEvents.length + this.upcomingEvents.length > 0;
    }

    get hasTimelineEvents() { return this.timelineEvents.length > 0; }
    get hasUpcomingEvents() { return this.upcomingEvents.length > 0; }
    get hasAllDayEvents() { return this.allDayEvents.length > 0; }

    colorFor(type) {
        if (!type) return this.typeColors.other || DEFAULT_ACCENT;
        const key = String(type).toLowerCase();
        return this.typeColors[key] || this.typeColors.other || DEFAULT_ACCENT;
    }

    joinUrlFrom(e) {
        const blob = `${e.Location || ''} ${e.Description || ''}`;
        const m = blob.match(JOIN_URL_REGEX);
        return m ? m[1] : null;
    }

    shapeAllDay(e) {
        const color = this.colorFor(e.Type);
        return {
            id: e.Id,
            subject: e.Subject || this.labels.noSubject,
            style: `border-left: 3px solid ${color};`
        };
    }

    shapeUpcoming(o, now) {
        const { raw, s } = o;
        const end = new Date(raw.EndDateTime);
        const isTomorrow = (() => {
            const t = new Date(); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() + 1);
            return sameDay(s, t);
        })();
        const day = isTomorrow ? this.labels.tomorrow : s.toLocaleDateString(this.localeTag, { weekday: 'short', day: '2-digit', month: 'short' });
        const color = this.colorFor(raw.Type);
        return {
            id: raw.Id,
            subject: raw.Subject || this.labels.noSubject,
            day,
            timeRange: `${formatTime(s, this.localeTag)} – ${formatTime(end, this.localeTag)}`,
            whoName: raw.Who ? raw.Who.Name : '',
            whoId: raw.WhoId,
            style: `border-left: 3px solid ${color};`
        };
    }

    navigateToRecord(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: id, actionName: 'view' }
        });
    }

    navigateToEventHome() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: { objectApiName: 'Event', actionName: 'home' }
        });
    }

    handleNewEvent() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: { objectApiName: 'Event', actionName: 'new' }
        });
    }

    handleJoin(event) {
        event.stopPropagation();
        const url = event.currentTarget.dataset.url;
        if (url) window.open(url, '_blank');
    }

    handleRefresh() {
        if (this.wiredResult) refreshApex(this.wiredResult);
        this.refreshNow();
    }
}
