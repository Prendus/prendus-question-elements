class PrendusCodeTool extends WysiwygTool {
    static get is() { return 'prendus-code-tool'; }

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
}

window.customElements.define(PrendusCodeTool.is, PrendusCodeTool);
