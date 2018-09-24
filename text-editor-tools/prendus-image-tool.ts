// import {html, render} from 'lit-html/lib/lit-extended.js';
// import {WysiwygTool} from 'wysiwyg-e/wysiwyg-tool.js';
// import {createStore} from 'redux';
// import '@polymer/paper-button';
// import '@polymer/paper-tooltip';
// import '@polymer/iron-icon';
// import '@polymer/iron-icons/image-icons';

interface State {
    showFileInput: boolean;
}

interface Action {
    type: string;
}

const InitialState: State = {
    showFileInput: true
};
const RootReducer = (state: State = InitialState, action: Action): State => {
    if (action.type === 'TOGGLE_SHOW_FILE_INPUT') {
        return {
            ...state,
            showFileInput: !state.showFileInput
        };
    }

    return state;
};
const Store = createStore(RootReducer);

class PrendusImageTool extends (<new () => HTMLElement> WysiwygTool) {
    tooltipPosition: number; //TODO remove this once we have types for WysiwygTool

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });

        Store.subscribe(() => render(this.render(Store.getState()), this.shadowRoot || this));
        Store.dispatch({ type: 'DEFAULT_ACTION' });
    }

    executeTool() {
        (<any> (this.shadowRoot || this).querySelector('#imageInput')).click();
    }

    imageInputChange(e: Event) {
        //TODO validate the file
        const file = (<any> e.target).files[0];
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            this.dispatchEvent(new CustomEvent('insert-image', {
                detail: {
                    dataUrl: reader.result
                }
            }));
        });
        reader.readAsDataURL(file);

        Store.dispatch({
            type: 'TOGGLE_SHOW_FILE_INPUT'
        });

        Store.dispatch({
            type: 'TOGGLE_SHOW_FILE_INPUT'
        });
    }

    render(state: State) {
        return html`
            <paper-button id="button" onclick="${() => this.executeTool()}">
                <iron-icon icon="image:image"></iron-icon>
            </paper-button>

            <paper-tooltip id="tooltip" for="button" position="${this.tooltipPosition}" offset="5">
                <span>Image</span>
            </paper-tooltip>

            <div id="imageInputContainer">
                ${state.showFileInput ? html`<input hidden id="imageInput" type="file" accept="image/*" oninput="${(e: Event) => this.imageInputChange(e)}">` : ''}
            </div>
        `;
    }
}

window.customElements.define('prendus-image-tool', PrendusImageTool);
