import {UserCheck} from '../prendus-question-elements.d';
import {compileToAssessML, parse} from '../../assessml/assessml';
import {ASTObject} from '../../assessml/assessml.d';

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

    doneClick() {
        this.shadowRoot.querySelector('#checkDialog').close();
    }

    addOptionClick() {
        const contentInput = this.shadowRoot.querySelector('#optionInput');
        const content = contentInput.value;

        this.dispatchEvent(new CustomEvent('insert-check', {
            detail: {
                content,
                correct: false
            }
        }));

        contentInput.value = '';
        setTimeout(() => {
            contentInput.focus();
        });
    }

    checkForEnter(e: KeyboardEvent) {
        if (e.keyCode === 13) {
            this.addOptionClick();
        }
    }

    checkCorrectChanged(e: any) {
        const toggle = this.shadowRoot.querySelector(`#${e.model.item.varName}-toggle`);
        const userCheck: UserCheck = {
            type: 'USER_CHECK',
            varName: e.model.item.varName,
            checked: toggle ? toggle.checked : false
        };

        this.dispatchEvent(new CustomEvent('check-correct-changed', {
            detail: {
                userCheck
            }
        }));
    }

    checkContentChanged(e: any) {
        const input = this.shadowRoot.querySelector(`#${e.model.item.varName}-input`);
        const checkContentToChange = {
            varName: e.model.item.varName,
            content: parse(input.value, () => 5, () => '', () => [], () => []) //TODO hook up the correct functions to get good values for variables and such
        };

        this.dispatchEvent(new CustomEvent('check-content-changed', {
            detail: {
                checkContentToChange
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

window.customElements.define(PrendusMultipleSelectTool.is, PrendusMultipleSelectTool);
