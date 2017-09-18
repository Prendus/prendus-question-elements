class PrendusRadioTool extends WysiwygTool {
    static get is() { return 'prendus-radio-tool'; }

    execCommand() {
        this.shadowRoot.querySelector('#radioDialog').open();
    }

    radioDialogClick(e: Event) {
        e.stopPropagation();
    }

    insertClick() {
        const contentInput = this.shadowRoot.querySelector('#contentInput');
        const correctSelect = this.shadowRoot.querySelector('#correctSelect');

        const content = contentInput.value;
        const correct = correctSelect.value === 'true' ? true : false;

        this.dispatchEvent(new CustomEvent('insert-radio', {
            bubbles: false,
            detail: {
                content,
                correct
            }
        }));
        this.shadowRoot.querySelector('#radioDialog').close();

        contentInput.value = '';
        correctSelect.value = 'true';
    }
}

window.customElements.define(PrendusRadioTool.is, PrendusRadioTool);
