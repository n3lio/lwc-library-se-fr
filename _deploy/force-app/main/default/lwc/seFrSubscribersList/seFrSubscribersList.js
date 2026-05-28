import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getTeamMembers from '@salesforce/apex/SE_FR_SubscribersListController.getTeamMembers';

/* ─── Subtle, professional gradient palette for initials avatars ─── */
const GRADIENT_PALETTE = [
    'linear-gradient(135deg, #4a6cf7 0%, #6366f1 100%)',
    'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
    'linear-gradient(135deg, #0891b2 0%, #3b82f6 100%)',
    'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)',
    'linear-gradient(135deg, #475569 0%, #64748b 100%)',
    'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)'
];

const INITIAL_VISIBLE = 6;

const DICT = {
    fr: {
        cardTitle: 'Equipe du compte',
        emptyState: 'Aucun membre identifié.',
        showMore: 'Voir plus',
        showLess: 'Voir moins',
        subtitleNone: 'Aucun membre',
        subtitleOne: '1 membre',
        subtitleMany: 'membres'
    },
    en: {
        cardTitle: 'Account Team',
        emptyState: 'No team members found.',
        showMore: 'Show more',
        showLess: 'Show less',
        subtitleNone: 'No members',
        subtitleOne: '1 member',
        subtitleMany: 'members'
    }
};

export default class SeFrSubscribersList extends NavigationMixin(LightningElement) {
    @api recordId;
    @api language = 'fr';
    @api cardTitle;
    @api cardSubtitle = '';
    @api cardIcon = 'standard:team_member';

    // Data mode: 'live' (default, uses Apex) or 'mock' (uses pipe-separated props below)
    @api sourceMode = 'live';

    // Mock/override props (used when sourceMode='mock' or as fallback if Apex returns empty)
    @api contactNames = '';
    @api roles = '';
    @api userIds = '';

    // Legacy props — kept for backward compatibility with existing page configurations
    @api avatarMode = 'initials';
    @api channels = '';
    @api subscribedAtRelative = '';
    @api notificationCounts = '';
    @api footerLabel = '';
    @api showFooter = false;

    @track expanded = false;
    @track liveMembers = [];
    @track liveError;
    @track liveLoading = true;

    get dict() { return DICT[this.language] || DICT.fr; }
    get resolvedCardTitle() { return this.cardTitle || this.dict.cardTitle; }

    get isLive() { return this.sourceMode === 'live'; }

    @wire(getTeamMembers, { recordId: '$recordId' })
    wiredTeam({ data, error }) {
        this.liveLoading = false;
        if (data) {
            this.liveMembers = data;
            this.liveError = undefined;
        } else if (error) {
            this.liveError = error.body?.message || 'Error';
            this.liveMembers = [];
        }
    }

    get allRows() {
        if (this.isLive && this.liveMembers.length > 0) {
            return this.liveMembers.map((m, i) => this._buildLiveRow(m, i));
        }
        // Fallback to mock props
        return this._buildMockRows();
    }

    get rows() {
        if (this.expanded) return this.allRows;
        return this.allRows.slice(0, INITIAL_VISIBLE);
    }

    get hasRows() { return this.allRows.length > 0; }
    get isLoading() { return this.isLive && this.liveLoading; }
    get showEmpty() { return !this.isLoading && !this.hasRows; }

    get computedSubtitle() {
        if (this.cardSubtitle) return this.cardSubtitle;
        const n = this.allRows.length;
        if (n === 0) return this.dict.subtitleNone;
        if (n === 1) return this.dict.subtitleOne;
        return `${n} ${this.dict.subtitleMany}`;
    }

    get resolvedEmptyState() { return this.dict.emptyState; }

    get showToggleButton() {
        return this.allRows.length > INITIAL_VISIBLE;
    }
    get toggleButtonLabel() {
        return this.expanded ? this.dict.showLess : this.dict.showMore;
    }
    get toggleButtonIcon() {
        return this.expanded ? 'utility:chevronup' : 'utility:chevrondown';
    }

    handleToggle() {
        this.expanded = !this.expanded;
    }

    handleNameClick(event) {
        const userId = event.currentTarget.dataset.userid;
        if (!userId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: userId, objectApiName: 'User', actionName: 'view' }
        });
    }

    // ─── Row builders ───

    _buildLiveRow(member, idx) {
        const hasPhoto = !!member.photoUrl && !member.photoUrl.includes('/profilephoto/729');
        return {
            key: `live-${member.userId}`,
            name: member.name,
            role: member.role || '',
            hasRole: !!member.role,
            initials: member.initials || this._initials(member.name),
            avatarStyle: hasPhoto ? '' : `background:${this._gradient(member.name)}`,
            hasPhoto,
            photoUrl: hasPhoto ? member.photoUrl : '',
            userId: member.userId,
            isClickable: true
        };
    }

    _buildMockRows() {
        const names = this._split(this.contactNames);
        const roleList = this._split(this.roles);
        const ids = this._split(this.userIds);
        return names.map((name, i) => {
            const userId = ids[i] || '';
            return {
                key: `mock-${i}-${name}`,
                name,
                role: roleList[i] || '',
                hasRole: !!(roleList[i]),
                initials: this._initials(name),
                avatarStyle: `background:${this._gradient(name)}`,
                hasPhoto: false,
                photoUrl: '',
                userId,
                isClickable: !!userId
            };
        });
    }

    // ─── Helpers ───

    _split(s) {
        return (s || '').split('|').map((x) => x.trim()).filter((x) => x.length > 0);
    }

    _initials(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    _gradient(name) {
        let h = 0;
        const n = name || '';
        for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
        return GRADIENT_PALETTE[h % GRADIENT_PALETTE.length];
    }
}
