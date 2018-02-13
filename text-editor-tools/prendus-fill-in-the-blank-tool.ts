import {UserInput} from '../prendus-question-elements.d';
import {getUserASTObjectValue} from '../services/question-service';

class PrendusFillInTheBlankTool extends WysiwygTool {
    static get is() { return 'prendus-fill-in-the-blank-tool'; }

    connectedCallback() {
        super.connectedCallback();

        this._setCommand('insertText');
    }

    execCommand() {
        if (this.disabled || !this.range0) {
            return;
        }

        this.shadowRoot.querySelector('#inputDialog').open();
    }

    inputDialogClick(e: Event) {
        e.stopPropagation();
    }

    doneClick() {
        this.shadowRoot.querySelector('#inputDialog').close();
    }

    addBlankAnswerClick(e: Event) {
        const blankAnswerInput = this.shadowRoot.querySelector('#blankAnswerInput');
        const answer = blankAnswerInput.value;

        this.dispatchEvent(new CustomEvent('insert-input', {
            detail: {
                answer
            }
        }));

        blankAnswerInput.value = '';
    }

    inputAnswerChanged(e: CustomEvent) {
        const input = this.shadowRoot.querySelector(`#${e.model.item.varName}-input`);
        const userInput: UserInput = {
            type: 'USER_INPUT',
            varName: e.model.item.varName,
            value: input.value
        };

        this.dispatchEvent(new CustomEvent('input-answer-changed', {
            detail: {
                userInput
            }
        }));
    }

    getInputAnswer(userInput: UserInput) {
        return getUserASTObjectValue(this.question.code, userInput);
    }
}

window.customElements.define(PrendusFillInTheBlankTool.is, PrendusFillInTheBlankTool);
