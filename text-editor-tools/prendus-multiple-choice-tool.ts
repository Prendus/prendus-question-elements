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

        contentInput.value = '';
        correctSelect.value = 'true';
    }

    radioCorrectChanged(e: any) {
        const userRadio: UserRadio = {
            varName: e.model.item.varName,
            checked: this.shadowRoot.querySelector(`#${e.model.item.varName}`).value === 'true' ? true : false
        };

        this.dispatchEvent(new CustomEvent('radio-correct-changed', {
            detail: {
                userRadio
            }
        }));
    }
}

window.customElements.define(PrendusMultipleChoiceTool.is, PrendusMultipleChoiceTool);
