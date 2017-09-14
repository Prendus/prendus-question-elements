class PrendusMathTool extends WysiwygTool {
    static get is() { return 'prendus-math-tool'; }

    connectedCallback() {
        super.connectedCallback();

        const mathDiv = this.shadowRoot.querySelector('#mathDiv');
        window.renderMathInElement(mathDiv, {
            delimiters: [
              {left: "$$", right: "$$", display: false}
            ]
        });
    }

    execCommand() {
        this.shadowRoot.querySelector('#dialog').open();
    }

    dialogClick(e: Event) {
        e.stopPropagation();
    }

    mathSymbolClick(e) {
        const mathText = e.target.innerHTML;

        this.dispatchEvent(new CustomEvent('insert-math', {
            bubbles: false,
            detail: {
                mathText
            }
        }));
        this.shadowRoot.querySelector('#dialog').close();
    }
}

window.customElements.define(PrendusMathTool.is, PrendusMathTool);
