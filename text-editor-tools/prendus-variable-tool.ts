class PrendusVariableTool extends WysiwygTool {
    static get is() { return 'prendus-variable-tool'; }

    connectedCallback() {
        super.connectedCallback();

        this._setCommand('insertText');
    }

    execCommand() {
        if (this.disabled || !this.range0) {
            return;
        }

        this.shadowRoot.querySelector('#variableDialog').open();
    }

    variableDialogClick(e: Event) {
        e.stopPropagation();
    }

    insertClick() {
        const varNameInput = this.shadowRoot.querySelector('#varNameInput');
        const varMaxInput = this.shadowRoot.querySelector('#varMaxInput');
        const varMinInput = this.shadowRoot.querySelector('#varMinInput');
        const precisionInput = this.shadowRoot.querySelector('#precisionInput');

        const varName = varNameInput.value;
        const maxValue = +varMaxInput.value;
        const minValue = +varMinInput.value;
        const precisionValue = +precisionInput.value;

        if (varNameInput.invalid) {
            varNameInput.focus();
            return;
        }

        if (varMaxInput.invalid) {
            varMaxInput.focus();
            return;
        }

        if (varMinInput.invalid) {
            varMinInput.focus();
            return;
        }

        if (precisionInput.invalid) {
            precisionInput.focus();
            return;
        }

        this.dispatchEvent(new CustomEvent('insert-variable', {
            bubbles: false,
            detail: {
                varName,
                maxValue,
                minValue,
                precisionValue
            }
        }));
        this.shadowRoot.querySelector('#variableDialog').close();

        varNameInput.value = 'var1';
        varMaxInput.value = '10';
        varMinInput.value = '0';
        precisionInput.value = '0';
    }
}

window.customElements.define(PrendusVariableTool.is, PrendusVariableTool);
