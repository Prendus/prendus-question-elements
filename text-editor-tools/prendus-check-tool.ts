class PrendusCheckTool extends WysiwygTool {
    static get is() { return 'prendus-check-tool'; }

    connectedCallback() {
        super.connectedCallback();

        this._setCommand('insertText');
    }

    execCommand() {
        if (this.disabled || !this.range0) {
            return;
        }

        this.shadowRoot.querySelector('#checkDialog').open();
    }

    checkDialogClick(e: Event) {
        e.stopPropagation();
    }

    insertClick() {
        const contentInput = this.shadowRoot.querySelector('#contentInput');
        const correctSelect = this.shadowRoot.querySelector('#correctSelect');

        const content = contentInput.value;
        const correct = correctSelect.value === 'true' ? true : false;

        this.dispatchEvent(new CustomEvent('insert-check', {
            bubbles: false,
            detail: {
                content,
                correct
            }
        }));
        this.shadowRoot.querySelector('#checkDialog').close();

        contentInput.value = '';
        correctSelect.value = 'true';
    }
}

window.customElements.define(PrendusCheckTool.is, PrendusCheckTool);
