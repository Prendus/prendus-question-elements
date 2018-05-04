import {html, render} from 'lit-html/lib/lit-extended.js';
import {WysiwygTool} from 'wysiwyg-e/wysiwyg-tool.js';
import {createStore} from 'redux';
import '@polymer/paper-button';
import '@polymer/paper-tooltip';
import '@polymer/iron-icon';
import '@polymer/iron-icons';

interface State {
    varNameInputValue: string;
    varMaxInputValue: string;
    varMinInputValue: string;
    precisionInputValue: string;
}

interface Action {
    type: string;
}

interface SetLocalStateAction extends Action {
    type: 'SET_LOCAL_STATE';
    key: string;
    value: any;
}

const InitialState: State = {
    varNameInputValue: 'var',
    varMaxInputValue: '10',
    varMinInputValue: '0',
    precisionInputValue: '0'
};
const RootReducer = (state: State = InitialState, action: Action): State => {
    if (action.type === 'SET_LOCAL_STATE') {
        const _action = <SetLocalStateAction> action;
        return {
            ...state,
            [_action.key]: _action.value
        };
    }

    if (action.type === 'RESET_STATE') {
        return InitialState;
    }

    return state;
};
const Store = createStore(RootReducer);

class PrendusVariableTool extends (<new () => HTMLElement> WysiwygTool) {
    tooltipPosition: number; //TODO remove this once we have types for WysiwygTool

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });

        Store.subscribe(() => render(this.render(Store.getState()), this.shadowRoot || this));
        Store.dispatch({ type: 'DEFAULT_ACTION' });
    }

    executeTool() {
        (<any> (this.shadowRoot || this).querySelector('#variableDialog')).open();
    }

    variableDialogClick(e: Event) {
        e.stopPropagation();
    }

    insertClick() {
        const varNameInput: any = (this.shadowRoot || this).querySelector('#varNameInput');
        const varMaxInput: any = (this.shadowRoot || this).querySelector('#varMaxInput');
        const varMinInput: any = (this.shadowRoot || this).querySelector('#varMinInput');
        const precisionInput: any = (this.shadowRoot || this).querySelector('#precisionInput');

        if (varNameInput.invalid) {
            varNameInput.focus();
            return;
        }

        if (varMaxInput.invalid) {
            varMaxInput.focus();
            return;
        }

        if (varMinInput.invalid) {
            varMinInput.focus();
            return;
        }

        if (precisionInput.invalid) {
            precisionInput.focus();
            return;
        }

        const state = Store.getState();

        this.dispatchEvent(new CustomEvent('insert-variable', {
            bubbles: false,
            detail: {
                varName: state.varNameInputValue,
                maxValue: parseInt(state.varMaxInputValue),
                minValue: parseInt(state.varMinInputValue),
                precisionValue: parseInt(state.precisionInputValue)
            }
        }));
        (<any> (this.shadowRoot || this).querySelector('#variableDialog')).close();

        Store.dispatch({
            type: 'RESET_STATE'
        });
    }

    inputChanged(e: CustomEvent) {
        Store.dispatch({
            type: 'SET_LOCAL_STATE',
            key: `${(<HTMLInputElement> e.target).id}Value`,
            value: (<HTMLInputElement> e.target).value
        });
    }

    render(state: State) {
        return html`
            <paper-button id="button" onclick="${() => this.executeTool()}">
                <iron-icon icon="icons:cancel"></iron-icon>
            </paper-button>

            <paper-tooltip id="tooltip" for="button" position="${this.tooltipPosition}" offset="5">
                <span>Variable</span>
            </paper-tooltip>

            <paper-dialog id="variableDialog" on-click="variableDialogClick">
                <div>
                    <paper-input id="varNameInput" type="text" value="${state.varNameInputValue}" oninput="${(e: CustomEvent) => this.inputChanged(e)}" label="Variable name (var1, var2, etc)" autofocus auto-validate pattern="var((.|\n|\r)+?)" error-message='Must start with "var" follwed by at least one character'></paper-input>
                </div>

                <div>
                    <paper-input id="varMaxInput" type="text" value="${state.varMaxInputValue}" oninput="${(e: CustomEvent) => this.inputChanged(e)}" label="Max value" auto-validate pattern="[-.0-9]+" required error-message="Must be a number">
                </div>

                <div>
                    <paper-input id="varMinInput" type="text" value="${state.varMinInputValue}" oninput="${(e: CustomEvent) => this.inputChanged(e)}" label="Min value" auto-validate pattern="[-.0-9]+" required error-message="Must be a number"></paper-input
                </div>

                <div>
                    <paper-input id="precisionInput" type="text" value="${state.precisionInputValue}" oninput="${(e: CustomEvent) => this.inputChanged(e)}" label="Decimal precision" auto-validate pattern="[0-1]?[0-9]|20" required error-message="Must be an integer between 0 and 20"></paper-input>
                </div>

                <div style="display: flex">
                    <paper-button style="margin-left: auto" onclick="${() => this.insertClick()}" raised noink>Insert</paper-button>
                </div>
            </paper-dialog>
        `;
    }
}

window.customElements.define('prendus-variable-tool', PrendusVariableTool);
