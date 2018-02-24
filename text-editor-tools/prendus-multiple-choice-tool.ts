import {UserRadio} from '../prendus-question-elements.d';
import {compileToAssessML, parse} from '../../assessml/assessml';
import {ASTObject} from '../../assessml/assessml.d';

class PrendusMultipleChoiceTool extends WysiwygTool {
    userRadios: UserRadio[];

    static get is() { return 'prendus-multiple-choice-tool'; }

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
            type: 'USER_RADIO',
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

    questionStemChanged() {
        const questionInput = this.shadowRoot.querySelector('#questionStemInput');

        this.dispatchEvent(new CustomEvent('question-stem-changed', {
            detail: {
                questionStem: questionInput.value
            }
        }));
    }

    getQuestionStem(question) {
        const assessMLAST = parse(question.text, () => 5, () => '', () => [], () => []);
        //TODO the .replace(/&nbsp;/g, ' ') might be handled better by truly understanding why the text editor is using html encoding
        return (assessMLAST.ast[0] && assessMLAST.ast[0].type === 'CONTENT' ? assessMLAST.ast[0].content : '').replace(/<p>|<\/p>|<br>/g, '').replace(/&nbsp;/g, ' ');
    }
}

window.customElements.define(PrendusMultipleChoiceTool.is, PrendusMultipleChoiceTool);
