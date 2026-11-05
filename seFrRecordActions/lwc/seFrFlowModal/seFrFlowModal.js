import { api } from 'lwc';
import LightningModal from 'lightning/modal';

/**
 * CCO FR — Flow Modal
 *
 * Thin wrapper around `lightning/modal` that embeds a `<lightning-flow>`.
 * Used by seFrRecordActions (and reusable by any other lib component that
 * needs to launch a Screen Flow in a modal). The native lightning/modal
 * component correctly sizes its body to fit the flow and keeps the flow's
 * own footer (Next / Finish buttons) visible — a custom `slds-modal` wrapper
 * clips the flow footer out of the scrollable area.
 */
export default class SeFrFlowModal extends LightningModal {
    @api flowApiName;
    @api recordId;
    @api modalTitle = '';

    get flowInputVariables() {
        return [{ name: 'recordId', type: 'String', value: this.recordId }];
    }

    handleFlowStatusChange(event) {
        const status = event.detail.status;
        if (status === 'FINISHED' || status === 'FINISHED_SCREEN' || status === 'ERROR') {
            this.close({
                status,
                outputVariables: event.detail.outputVariables || []
            });
        }
    }
}
