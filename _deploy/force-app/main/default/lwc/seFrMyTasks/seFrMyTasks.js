import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { updateRecord } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getMyTasks from '@salesforce/apex/SE_FR_AgendaController.getMyTasks';

const GROUP_ORDER = ['overdue', 'today', 'tomorrow', 'thisWeek', 'later', 'noDate', 'completed'];

const LABELS = {
    en: {
        cardTitle: 'My Tasks',
        emptyState: 'No tasks for this filter.',
        newTask: 'New task',
        filter: 'Filter',
        toggleCompletion: 'Toggle completion',
        email: 'Email',
        logACall: 'Log a call',
        viewAll: 'View all',
        toastUpdated: 'Task updated',
        toastCompleted: 'Marked as completed.',
        toastReopened: 'Reopened.',
        toastFailed: 'Update failed',
        toastDefaultError: 'Could not update the task.',
        noSubject: '(No subject)',
        today: 'Today',
        filterToday: 'Today',
        filterMine: 'Mine',
        filterOverdue: 'Overdue',
        filterUpcoming: 'Upcoming',
        filterCompleted: 'Completed',
        groupOverdue: 'Overdue',
        groupToday: 'Today',
        groupTomorrow: 'Tomorrow',
        groupThisWeek: 'This week',
        groupLater: 'Later',
        groupNoDate: 'No date',
        groupCompleted: 'Completed'
    },
    fr: {
        cardTitle: 'Mes tâches',
        emptyState: 'Aucune tâche pour ce filtre.',
        newTask: 'Nouvelle tâche',
        filter: 'Filtre',
        toggleCompletion: 'Changer le statut',
        email: 'E-mail',
        logACall: 'Consigner un appel',
        viewAll: 'Voir tout',
        toastUpdated: 'Tâche mise à jour',
        toastCompleted: 'Marquée comme terminée.',
        toastReopened: 'Rouverte.',
        toastFailed: 'Échec de la mise à jour',
        toastDefaultError: 'Impossible de mettre à jour la tâche.',
        noSubject: '(Sans objet)',
        today: "Aujourd'hui",
        filterToday: "Aujourd'hui",
        filterMine: 'Mes tâches',
        filterOverdue: 'En retard',
        filterUpcoming: 'À venir',
        filterCompleted: 'Terminées',
        groupOverdue: 'En retard',
        groupToday: "Aujourd'hui",
        groupTomorrow: 'Demain',
        groupThisWeek: 'Cette semaine',
        groupLater: 'Plus tard',
        groupNoDate: 'Sans date',
        groupCompleted: 'Terminées'
    }
};

const GROUP_ACCENTS = {
    overdue:   '#d00000',
    today:     '#0176d3',
    tomorrow:  '#747474',
    thisWeek:  '#747474',
    later:     '#747474',
    noDate:    '#c9c9c9',
    completed: '#4bca81'
};

// Built-in filter option keys. Any other value in filterOptionsCsv is passed through verbatim.
const FILTER_KEY_TO_LABEL = {
    en: { Today: 'Today', Mine: 'Mine', Overdue: 'Overdue', Upcoming: 'Upcoming', Completed: 'Completed' }
};

function startOfDay(d) {
    const out = new Date(d);
    out.setHours(0, 0, 0, 0);
    return out;
}

function bucketFor(task, today, tomorrow, endOfWeek) {
    if (task.Status === 'Completed') return 'completed';
    if (!task.ActivityDate) return 'noDate';
    const due = startOfDay(new Date(task.ActivityDate));
    if (due < today) return 'overdue';
    if (due.getTime() === today.getTime()) return 'today';
    if (due.getTime() === tomorrow.getTime()) return 'tomorrow';
    if (due <= endOfWeek) return 'thisWeek';
    return 'later';
}

export default class SeFrMyTasks extends NavigationMixin(LightningElement) {
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:task';
    @api defaultFilter = 'Upcoming';
    @api filterOptionsCsv = 'Today,Mine,Overdue,Upcoming,Completed';
    @api maxTasks = 10;
    @api localeTag = 'fr-FR';
    @api showQuickActions = false;
    @api emptyStateMessage;

    @track currentFilter;
    @track groups = [];
    wiredResult;

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get resolvedEmptyState() { return this.emptyStateMessage || this.labels.emptyState; }

    connectedCallback() {
        if (!this.currentFilter) this.currentFilter = this.defaultFilter;
    }

    // Translate a filter key (e.g. 'Overdue') into the active language's label.
    // Falls back to the key verbatim so user-added custom filters still display.
    translateFilter(key) {
        const k = (key || '').trim();
        const mapKey = 'filter' + k;
        return this.labels[mapKey] || k;
    }

    get currentFilterLabel() {
        return this.translateFilter(this.currentFilter);
    }

    get filterOptions() {
        return (this.filterOptionsCsv || '')
            .split(',').map(s => s.trim()).filter(Boolean)
            .map(key => ({ key, label: this.translateFilter(key) }));
    }

    get hasTasks() {
        return this.groups.some(g => g.items.length > 0);
    }

    @wire(getMyTasks, { filter: '$currentFilter', maxRows: '$maxTasks' })
    wiredTasks(result) {
        this.wiredResult = result;
        if (result.data) {
            this.groups = this.buildGroups(result.data);
        }
    }

    buildGroups(rows) {
        const today = startOfDay(new Date());
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const endOfWeek = new Date(today); endOfWeek.setDate(endOfWeek.getDate() + (6 - today.getDay()));

        const buckets = {};
        for (const t of rows) {
            const bucket = bucketFor(t, today, tomorrow, endOfWeek);
            if (!buckets[bucket]) buckets[bucket] = [];
            buckets[bucket].push(this.shapeTask(t, today));
        }

        return GROUP_ORDER
            .filter(k => buckets[k] && buckets[k].length > 0)
            .map(k => {
                const metaKey = 'group' + k.charAt(0).toUpperCase() + k.slice(1);
                return {
                    key: k,
                    label: this.labels[metaKey] || k,
                    accent: GROUP_ACCENTS[k],
                    headerStyle: `border-left: 3px solid ${GROUP_ACCENTS[k]};`,
                    count: buckets[k].length,
                    items: buckets[k]
                };
            });
    }

    shapeTask(t, today) {
        let dateLabel = '';
        let isToday = false;
        if (t.ActivityDate) {
            const due = new Date(t.ActivityDate);
            const dueDay = startOfDay(due);
            if (dueDay.getTime() === today.getTime()) {
                dateLabel = this.labels.today;
                isToday = true;
            } else {
                dateLabel = due.toLocaleDateString(this.localeTag, { day: '2-digit', month: 'short' });
            }
        }
        const isOverdue = t.ActivityDate && startOfDay(new Date(t.ActivityDate)) < today && t.Status !== 'Completed';
        return {
            id: t.Id,
            subject: t.Subject || this.labels.noSubject,
            whoName: t.Who ? t.Who.Name : '',
            whoId: t.WhoId,
            whatName: t.What ? t.What.Name : '',
            whatId: t.WhatId,
            isUrgent: t.Priority === 'High' || isOverdue,
            isClosed: t.Status === 'Completed',
            dateLabel,
            dateClass: (isToday || isOverdue) ? 'task-date task-date_alert' : 'task-date'
        };
    }

    handleFilterSelect(event) {
        this.currentFilter = event.detail.value;
    }

    async handleToggleComplete(event) {
        const taskId = event.target.dataset.id;
        const wantsCompleted = event.target.checked;
        try {
            await updateRecord({ fields: { Id: taskId, Status: wantsCompleted ? 'Completed' : 'In Progress' } });
            await refreshApex(this.wiredResult);
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.toastUpdated,
                message: wantsCompleted ? this.labels.toastCompleted : this.labels.toastReopened,
                variant: 'success'
            }));
        } catch (e) {
            event.target.checked = !wantsCompleted;
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.toastFailed,
                message: (e && e.body && e.body.message) || this.labels.toastDefaultError,
                variant: 'error'
            }));
        }
    }

    navigateToRecord(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: id, actionName: 'view' }
        });
    }

    navigateToTaskHome() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: { objectApiName: 'Task', actionName: 'home' }
        });
    }

    handleNewTask() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: { objectApiName: 'Task', actionName: 'new' }
        });
    }

    handleLogCall(event) {
        event.stopPropagation();
        const whoId = event.currentTarget.dataset.who;
        const whatId = event.currentTarget.dataset.what;
        this[NavigationMixin.Navigate]({
            type: 'standard__quickAction',
            attributes: { apiName: 'Global.LogACall' },
            state: whoId ? { recordId: whoId } : (whatId ? { recordId: whatId } : {})
        });
    }

    handleEmail(event) {
        event.stopPropagation();
        const whoId = event.currentTarget.dataset.who;
        if (!whoId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__quickAction',
            attributes: { apiName: 'Contact.SendEmail' },
            state: { recordId: whoId }
        });
    }
}
