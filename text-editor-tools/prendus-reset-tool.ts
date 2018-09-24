// import {html, render} from 'lit-html/lib/lit-extended.js';
// import {WysiwygTool} from 'wysiwyg-e/wysiwyg-tool.js';
// import {createStore} from 'redux';
// import '@polymer/paper-button';
// import '@polymer/paper-tooltip';
// import '@polymer/iron-icon';
// import '@polymer/iron-icons';
// import '@polymer/paper-dialog';

interface State {

}

interface Action {
    type: string;
}

const InitialState: State = {};
const RootReducer = (state: State = InitialState, action: Action): State => state;
const Store = createStore(RootReducer);

class PrendusResetTool extends (<new () => HTMLElement> WysiwygTool) {
    tooltipPosition: number; //TODO remove this once we have types for WysiwygTool

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });

        Store.subscribe(() => render(this.render(Store.getState()), this.shadowRoot || this));
        Store.dispatch({ type: 'DEFAULT_ACTION' });
    }

    executeTool() {
        (<any> (this.shadowRoot || this).querySelector('#sureDialog')).open();
    }

    sureDialogClick(e: Event) {
        e.stopPropagation();
    }

    yesClick() {
        this.dispatchEvent(new CustomEvent('reset-text-and-code'));
        (<any> (this.shadowRoot || this).querySelector('#sureDialog')).close();
    }

    noClick() {
        (<any> (this.shadowRoot || this).querySelector('#sureDialog')).close();
    }

    render(state: State) {
        return html`
            <paper-button id="button" onclick="${() => this.executeTool()}">
                <iron-icon icon="icons:autorenew"></iron-icon>
            </paper-button>

            <paper-tooltip id="tooltip" for="button" position="${this.tooltipPosition}" offset="5">
                <span>Reset text and code</span>
            </paper-tooltip>

            <paper-dialog id="sureDialog" onclick="${(e: Event) => this.sureDialogClick(e)}">
                <h2>Are you sure you want to reset the text and code?</h2>
                <div style="display: flex">
                    <div style="margin-left: auto">
                        <paper-button onclick="${() => this.noClick()}" dialog-dismiss>No</paper-button>
                        <paper-button onclick="${() => this.yesClick()}" dialog-confirm raised>Yes</paper-button>
                    </div>
                </div>
            </paper-dialog>
        `;
    }
}

window.customElements.define('prendus-reset-tool', PrendusResetTool);
