class PrendusEssayTool extends WysiwygTool {
    static get is() { return 'prendus-essay-tool'; }

    connectedCallback() {
        super.connectedCallback();

        this._setCommand('insertText');
    }

    execCommand() {
        if (this.disabled || !this.range0) {
            return;
        }

        this.dispatchEvent(new CustomEvent('insert-essay', {
            bubbles: false
        }));
    }
}

window.customElements.define(PrendusEssayTool.is, PrendusEssayTool);
