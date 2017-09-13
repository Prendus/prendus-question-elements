class PrendusVariableTool extends WysiwygTool {
    static get is() { return 'prendus-variable-tool'; }

    execCommand() {
        this.shadowRoot.querySelector('#variableDialog').open();
    }

    variableDialogClick(e: Event) {
        e.stopPropagation();
    }

    insertClick() {
        const varName = this.shadowRoot.querySelector('#varNameInput').value;
        const maxValue = this.shadowRoot.querySelector('#varMaxInput').value;
        const minValue = this.shadowRoot.querySelector('#varMinInput').value;
        const precisionValue = this.shadowRoot.querySelector('#sigFigInput').value;

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
    }
}

window.customElements.define(PrendusVariableTool.is, PrendusVariableTool);
