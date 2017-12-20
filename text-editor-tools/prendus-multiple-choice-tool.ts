import {UserRadio} from '../prendus-question-elements.d';

class PrendusMultipleChoiceTool extends WysiwygTool {
    userRadios: UserRadio[];

    static get is() { return 'prendus-multiple-choice-tool'; }

    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();

        this._setCommand('insertText');
    }

    execCommand() {
        if (this.disabled || !this.range0) {
            return;
        }

        this.shadowRoot.querySelector('#radioDialog').open();
    }

    radioDialogClick(e: Event) {
        e.stopPropagation();
    }

    getIndex(index: number) {
        return index + 1;
    }

    insertClick() {
        const contentInput = this.shadowRoot.querySelector('#contentInput');
        const content = contentInput.value;

        this.dispatchEvent(new CustomEvent('insert-radio', {
            bubbles: false,
            detail: {
                content,
                correct: false
            }
        }));

        contentInput.value = '';
    }

    radioCorrectChanged(e: any) {
        const toggle = this.shadowRoot.querySelector(`#${e.model.item.varName}`);
        const userRadio: UserRadio = {
            varName: e.model.item.varName,
            checked: toggle ? toggle.checked : false
        };

        this.dispatchEvent(new CustomEvent('radio-correct-changed', {
            detail: {
                userRadio
            }
        }));
    }
}

window.customElements.define(PrendusMultipleChoiceTool.is, PrendusMultipleChoiceTool);
