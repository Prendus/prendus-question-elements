class PrendusVariableTool extends WysiwygTool {
    static get is() { return 'prendus-variable-tool'; }

    execCommand() {
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

        if (!varName.startsWith('var')) {
            alert('Variable name must start with "var"');
            return;
        }

        if (!varName[3]) {
            alert('Variable name must have at least one character after "var"');
            return;
        }

        if (precisionValue < 0 || precisionValue > 20) {
            alert('Decimal precision must be between 0 and 20');
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

        varNameInput.value = 'var';
        varMaxInput.value = '10';
        varMinInput.value = '0';
        precisionInput.value = '0';
    }
}

window.customElements.define(PrendusVariableTool.is, PrendusVariableTool);
