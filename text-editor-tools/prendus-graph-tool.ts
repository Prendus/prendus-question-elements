class PrendusGraphTool extends WysiwygTool {
    static get is() { return 'prendus-graph-tool'; }

    connectedCallback() {
        super.connectedCallback();

        this._setCommand('insertText');
    }

    execCommand() {
        if (this.disabled || !this.range0) {
            return;
        }

        this.dispatchEvent(new CustomEvent('insert-graph', {
            bubbles: false
        }));
    }
}

window.customElements.define(PrendusGraphTool.is, PrendusGraphTool);
