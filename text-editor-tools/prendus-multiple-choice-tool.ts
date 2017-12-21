import {UserRadio} from '../prendus-question-elements.d';
import {compileToAssessML, parse} from '../../assessml/assessml';
import {ASTObject} from '../../assessml/assessml.d';

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

    doneClick() {
        this.shadowRoot.querySelector('#radioDialog').close();
    }

    addOptionClick() {
        const contentInput = this.shadowRoot.querySelector('#optionInput');
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
        const toggle = this.shadowRoot.querySelector(`#${e.model.item.varName}-toggle`);
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

    radioContentChanged(e: any) {
        const input = this.shadowRoot.querySelector(`#${e.model.item.varName}-input`);
        const radioContentToChange = {
            varName: e.model.item.varName,
            content: parse(input.value, () => 5, () => '', () => [], () => []) //TODO hook up the correct functions to get good values for variables and such
        };

        this.dispatchEvent(new CustomEvent('radio-content-changed', {
            detail: {
                radioContentToChange
            }
        }));
    }

    getCompiledContent(content: ASTObject[]) {
        return compileToAssessML({
            type: 'AST',
            ast: content
        }, () => 5, () => '', () => [], () => []);
    }
}

window.customElements.define(PrendusMultipleChoiceTool.is, PrendusMultipleChoiceTool);
