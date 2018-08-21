import {UserInput, Question} from '../prendus-question-elements.d';
import {getUserASTObjectValue} from '../services/question-service';
import {html, render} from 'lit-html/lib/lit-extended.js';
import {WysiwygTool} from 'wysiwyg-e/wysiwyg-tool.js';
import {createStore} from 'redux';
import '@polymer/paper-button';
import '@polymer/paper-tooltip';
import '@polymer/iron-icon';
import '@polymer/iron-icons';
import '@polymer/paper-dialog';
import '@polymer/paper-dialog-scrollable';

interface State {
    userInputs: UserInput[];
}

interface Action {
    type: string;
}

const InitialState: State = {
    userInputs: []
};
const RootReducer = (state: State = InitialState, action: Action): State => state;
const Store = createStore(RootReducer);

class PrendusFillInTheBlankTool extends (<new () => HTMLElement> WysiwygTool) {
    tooltipPosition: number; //TODO remove this once we have types for WysiwygTool

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });

        Store.subscribe(() => render(this.render(Store.getState()), this.shadowRoot || this));
        Store.dispatch({ type: 'DEFAULT_ACTION' });
    }

    executeTool() {
        (<any> (this.shadowRoot || this).querySelector('#inputDialog')).open();
    }

    inputDialogClick(e: Event) {
        e.stopPropagation();
    }

    doneClick() {
        (<any> (this.shadowRoot || this).querySelector('#inputDialog')).close();
    }

    addBlankAnswerClick() {
        const blankAnswerInput = this.shadowRoot.querySelector('#blankAnswerInput');
        const answer = blankAnswerInput.value;

        this.dispatchEvent(new CustomEvent('insert-input', {
            detail: {
                answer
            }
        }));

        blankAnswerInput.value = '';
        setTimeout(() => {
            blankAnswerInput.focus()
        });
    }

    checkForEnter(e: KeyboardEvent) {
        if (e.keyCode === 13) {
            this.addBlankAnswerClick();
        }
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

    render(state: State) {
        return html``;
    }
}

window.customElements.define('prendus-fill-in-the-blank-tool', PrendusFillInTheBlankTool);
