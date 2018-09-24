// import {html, render} from 'lit-html/lib/lit-extended.js';
// import {WysiwygTool} from 'wysiwyg-e/wysiwyg-tool.js';
// import {createStore} from 'redux';
// import '@polymer/paper-button';
// import '@polymer/paper-tooltip';
// import '@polymer/iron-icon';
// import '@polymer/iron-icons';

interface State {

}

interface Action {
    type: string;
}

const InitialState: State = {};
const RootReducer = (state: State = InitialState, action: Action): State => state;
const Store = createStore(RootReducer);

class PrendusEssayTool extends (<new () => HTMLElement> WysiwygTool) {
    tooltipPosition: number; //TODO remove this once we have types for WysiwygTool

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });

        Store.subscribe(() => render(this.render(Store.getState()), this.shadowRoot || this));
        Store.dispatch({ type: 'DEFAULT_ACTION' });
    }

    executeTool() {
        this.dispatchEvent(new CustomEvent('insert-essay'));
    }

    render(state: State) {
        return html`
            <paper-button id="button" onclick="${() => this.executeTool()}">
                <iron-icon icon="icons:assignment"></iron-icon>
            </paper-button>

            <paper-tooltip id="tooltip" for="button" position="${this.tooltipPosition}" offset="5">
                <span>Essay</span>
            </paper-tooltip>
        `;
    }
}

window.customElements.define('prendus-essay-tool', PrendusEssayTool);
