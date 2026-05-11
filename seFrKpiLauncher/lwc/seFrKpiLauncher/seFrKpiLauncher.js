import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

// Four presets accessible via App Builder. Each preset seeds labels, sublabels, icons, colors and
// links for the first three tiles. Tiles 4–6 are empty by default across presets — SEs fill them
// only when they need more than 3. Standard is the safest default (Leads / Opps / Accounts on
// standard objects), the others are tailored to the corresponding sales workflow.
const PRESETS = {
    Standard: {
        fr: [
            { label: 'LEADS',       sublabel: 'Nouveaux',        icon: 'standard:lead',        color: '#0176d3', link: '/lightning/o/Lead/list?filterName=Recent',        value: '12' },
            { label: 'OPPORTUNITÉS',sublabel: 'Ouvertes',        icon: 'standard:opportunity', color: '#fe9339', link: '/lightning/o/Opportunity/list?filterName=Recent', value: '7' },
            { label: 'COMPTES',     sublabel: 'Portefeuille',    icon: 'standard:account',     color: '#7f8ceb', link: '/lightning/o/Account/list?filterName=Recent',     value: '34' }
        ],
        en: [
            { label: 'LEADS',         sublabel: 'New',       icon: 'standard:lead',        color: '#0176d3', link: '/lightning/o/Lead/list?filterName=Recent',        value: '12' },
            { label: 'OPPORTUNITIES', sublabel: 'Open',      icon: 'standard:opportunity', color: '#fe9339', link: '/lightning/o/Opportunity/list?filterName=Recent', value: '7' },
            { label: 'ACCOUNTS',      sublabel: 'Portfolio', icon: 'standard:account',     color: '#7f8ceb', link: '/lightning/o/Account/list?filterName=Recent',     value: '34' }
        ]
    },
    FieldSales: {
        fr: [
            { label: 'MA TOURNÉE',  sublabel: 'Visites',    icon: 'standard:address',   color: '#2e844a', link: '/lightning/n/maps__Maps',                          value: '8'   },
            { label: 'PROSPECTION', sublabel: 'Leads',      icon: 'standard:lead',      color: '#0176d3', link: '/lightning/o/Lead/list?filterName=Recent',         value: '12'  },
            { label: 'OBJECTIFS',   sublabel: 'Atteints',   icon: 'standard:dashboard', color: '#7f8ceb', link: '/lightning/o/Dashboard/home',                      value: '85%' }
        ],
        en: [
            { label: 'MY ROUTE',    sublabel: 'Visits',     icon: 'standard:address',   color: '#2e844a', link: '/lightning/n/maps__Maps',                          value: '8'   },
            { label: 'PROSPECTING', sublabel: 'Leads',      icon: 'standard:lead',      color: '#0176d3', link: '/lightning/o/Lead/list?filterName=Recent',         value: '12'  },
            { label: 'GOALS',       sublabel: 'Achieved',   icon: 'standard:dashboard', color: '#7f8ceb', link: '/lightning/o/Dashboard/home',                      value: '85%' }
        ]
    },
    Telesales: {
        // Colours mirror the SLDS standard icon hues so the text matches the icon background.
        //   standard:call   → amber/orange (#fe9339)
        //   standard:case   → magenta/pink (#c13975)
        //   standard:orders → brand blue (#0176d3)
        fr: [
            { label: 'APPELS',      sublabel: 'Aujourd\'hui',icon: 'standard:call',      color: '#fe9339', link: '/lightning/o/VoiceCall/list',                  value: '18' },
            { label: 'CAS OUVERTS', sublabel: 'À traiter',   icon: 'standard:case',      color: '#c13975', link: '/lightning/o/Case/list?filterName=Recent',     value: '6'  },
            { label: 'COMMANDES',   sublabel: 'À valider',   icon: 'standard:orders',    color: '#0176d3', link: '/lightning/o/Order/list?filterName=Recent',    value: '4'  }
        ],
        en: [
            { label: 'CALLS',      sublabel: 'Today',       icon: 'standard:call',   color: '#fe9339', link: '/lightning/o/VoiceCall/list',                  value: '18' },
            { label: 'OPEN CASES', sublabel: 'To handle',   icon: 'standard:case',   color: '#c13975', link: '/lightning/o/Case/list?filterName=Recent',     value: '6'  },
            { label: 'ORDERS',     sublabel: 'To validate', icon: 'standard:orders', color: '#0176d3', link: '/lightning/o/Order/list?filterName=Recent',    value: '4'  }
        ]
    },
    Custom: null   // no seed — SE fills everything
};

const DEFAULT_TITLE = { en: 'Cockpit', fr: 'Cockpit' };

export default class SeFrKpiLauncher extends NavigationMixin(LightningElement) {
    @api language = 'fr';
    @api preset = 'Standard';          // Standard | FieldSales | Telesales | Custom
    @api cardTitle;
    @api cardIcon = 'standard:metrics';

    // Each tile stays individually overridable. When non-Custom preset: blank overrides fall back
    // to the preset value. Custom: overrides *are* the value (no preset seed).
    @api kpi1Label; @api kpi1Value; @api kpi1Sublabel;
    @api kpi1Icon; @api kpi1Color; @api kpi1Link;

    @api kpi2Label; @api kpi2Value; @api kpi2Sublabel;
    @api kpi2Icon; @api kpi2Color; @api kpi2Link;

    @api kpi3Label; @api kpi3Value; @api kpi3Sublabel;
    @api kpi3Icon; @api kpi3Color; @api kpi3Link;

    @api kpi4Label; @api kpi4Value; @api kpi4Sublabel;
    @api kpi4Icon; @api kpi4Color; @api kpi4Link;

    @api kpi5Label; @api kpi5Value; @api kpi5Sublabel;
    @api kpi5Icon; @api kpi5Color; @api kpi5Link;

    @api kpi6Label; @api kpi6Value; @api kpi6Sublabel;
    @api kpi6Icon; @api kpi6Color; @api kpi6Link;

    // Legacy props kept so previously-placed FlexiPages still deploy. Ignored by the new grid logic.
    @api userType;
    @api fieldTile1Label; @api fieldTile1Sub; @api fieldTile1Value;
    @api fieldTile2Label; @api fieldTile2Sub; @api fieldTile2Value;
    @api insideTile1Label; @api insideTile1Sub; @api insideTile1Value;
    @api insideTile2Label; @api insideTile2Sub; @api insideTile2Value;
    @api perfTileLabel; @api perfTileSub; @api perfTileValue;

    get resolvedCardTitle() {
        return this.cardTitle || DEFAULT_TITLE[this.language] || DEFAULT_TITLE.fr;
    }

    // Returns the preset seed for a given tile index (0-based) in the active language, or null
    // if the preset doesn't define that tile (e.g. tiles 4–6, or Custom).
    _presetSeed(index) {
        const preset = PRESETS[this.preset] || PRESETS.Standard;
        if (!preset) return null; // Custom
        const arr = preset[this.language] || preset.en;
        return arr && arr[index] ? arr[index] : null;
    }

    get tiles() {
        return [1, 2, 3, 4, 5, 6].map(i => {
            const seed = this._presetSeed(i - 1) || {};
            const label    = this[`kpi${i}Label`]    || seed.label    || '';
            const value    = this[`kpi${i}Value`]    || seed.value    || '';
            const sublabel = this[`kpi${i}Sublabel`] || seed.sublabel || '';
            const icon     = this[`kpi${i}Icon`]     || seed.icon     || 'standard:default';
            const color    = this[`kpi${i}Color`]    || seed.color    || '#0176d3';
            const link     = this[`kpi${i}Link`]     || seed.link     || '';
            return { id: i, label, value, sublabel, icon, color, link };
        })
        .filter(t => t.label && t.label.trim().length > 0)
        .map(t => ({
            ...t,
            tileStyle: `--tile-color: ${t.color};`,
            isClickable: !!t.link
        }));
    }

    // Force one column per tile so the launcher always fits N tiles on a single row, even in a
    // narrow App Builder column. Tiles scale down instead of wrapping.
    get gridStyle() {
        const n = Math.max(1, this.tiles.length);
        return `grid-template-columns: repeat(${n}, minmax(0, 1fr));`;
    }

    handleTileClick(event) {
        const link = event.currentTarget.dataset.link;
        if (!link) return;
        if (/^https?:\/\//i.test(link)) {
            window.open(link, '_blank');
            return;
        }
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url: link }
        });
    }
}
