import {html, render} from 'lit-html/lib/lit-extended.js';

class PrendusCodeTool extends WysiwygTool {
    constructor() {
        super();

        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        super.connectedCallback();

        this._setCommand('insertText');
    }

    execCommand() {
        if (this.disabled || !this.range0) {
            return;
        }

        this.dispatchEvent(new CustomEvent('insert-code', {
            bubbles: false
        }));
    }

    render() {
        render(html`
            
        `, this.shadowRoot);
    }
}

window.customElements.define('prendus-code-tool', PrendusCodeTool);
