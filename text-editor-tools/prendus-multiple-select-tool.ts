import {UserCheck} from '../prendus-question-elements.d';

class PrendusMultipleSelectTool extends WysiwygTool {
    userChecks: UserCheck[];

    static get is() { return 'prendus-multiple-select-tool'; }

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

    getIndex(index: number) {
        return index + 1;
    }

    insertClick() {
        const contentInput = this.shadowRoot.querySelector('#contentInput');
        const content = contentInput.value;

        this.dispatchEvent(new CustomEvent('insert-check', {
            bubbles: false,
            detail: {
                content,
                correct: false
            }
        }));

        contentInput.value = '';
    }

    checkCorrectChanged(e: any) {
        const toggle = this.shadowRoot.querySelector(`#${e.model.item.varName}`);
        const userCheck: UserCheck = {
            varName: e.model.item.varName,
            checked: toggle ? toggle.checked : false
        };

        this.dispatchEvent(new CustomEvent('check-correct-changed', {
            detail: {
                userCheck
            }
        }));
    }
}

window.customElements.define(PrendusMultipleSelectTool.is, PrendusMultipleSelectTool);
