class PrendusInputTool extends WysiwygTool {
    static get is() { return 'prendus-input-tool'; }

    execCommand() {
        this.shadowRoot.querySelector('#inputDialog').open();
    }

    inputDialogClick(e: Event) {
        e.stopPropagation();
    }

    insertClick() {
        const answerInput = this.shadowRoot.querySelector('#answerInput');
        const answer = answerInput.value;

        this.dispatchEvent(new CustomEvent('insert-input', {
            bubbles: false,
            detail: {
                answer
            }
        }));
        this.shadowRoot.querySelector('#inputDialog').close();
    }
}

window.customElements.define(PrendusInputTool.is, PrendusInputTool);
