import {html, render} from 'lit-html/lib/lit-extended.js';
import {WysiwygTool} from 'wysiwyg-e/wysiwyg-tool.js';
import '@polymer/paper-button';
import '@polymer/paper-tooltip';
import '@polymer/iron-icon';
import '@polymer/iron-icons';

class PrendusCodeTool extends WysiwygTool {
    shadowRoot: ShadowRoot;
    tooltipPosition: number;

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });
        this.render();
    }

    insertCode() {
        this.dispatchEvent(new CustomEvent('insert-code', {
            bubbles: false
        }));
    }

    render() {
        render(html`
            <paper-button id="button" onclick="${() => this.insertCode()}">
                <iron-icon icon="icons:code"></iron-icon>
            </paper-button>

            <paper-tooltip id="tooltip" for="button" position="${this.tooltipPosition}" offset="5">
    			<span>Code</span>
    		</paper-tooltip>
        `, this.shadowRoot);
    }
}

window.customElements.define('prendus-code-tool', PrendusCodeTool);
