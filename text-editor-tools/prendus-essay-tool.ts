class PrendusEssayTool extends WysiwygTool {
    static get is() { return 'prendus-essay-tool'; }

    execCommand() {
        this.dispatchEvent(new CustomEvent('insert-essay', {
            bubbles: false
        }));
    }
}

window.customElements.define(PrendusEssayTool.is, PrendusEssayTool);
