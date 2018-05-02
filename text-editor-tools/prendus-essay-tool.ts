import {html, render} from 'lit-html/lib/lit-extended.js';
import {WysiwygTool} from 'wysiwyg-e/wysiwyg-tool.js';
import {createStore} from 'redux';
import '@polymer/paper-button';
import '@polymer/paper-tooltip';
import '@polymer/iron-icon';
import '@polymer/iron-icons';

interface State {

}

interface Action {
    type: string;
}

const InitialState: State = {};
const RootReducer = (state: State = InitialState, action: Action): State => state;
const Store = createStore(RootReducer);

class PrendusEssayTool extends WysiwygTool {
    constructor() {
        super();

        this.attachShadow({ mode: 'open' });

        Store.subscribe(() => render(this.render(Store.getState()), this.shadowRoot));
        Store.dispatch({ type: 'DEFAULT_ACTION' });
    }

    execCommand() {
        if (this.disabled || !this.range0) {
            return;
        }

        this.dispatchEvent(new CustomEvent('insert-essay', {
            bubbles: false
        }));
    }

    render(state: State) {
        return html`
            <paper-button id="button" disabled="[[disabled]]">
                <iron-icon icon="icons:assignment"></iron-icon>
            </paper-button>

            <paper-tooltip id="tooltip" for="button" position="[[tooltipPosition]]" offset="5">
                <span>Essay</span>
            </paper-tooltip>
        `;
    }
}

window.customElements.define('prendus-essay-tool', PrendusEssayTool);
