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
        const mathText = e.currentTarget.getAttribute('math-text');
        const finalMathTextInput = this.shadowRoot.querySelector('#finalMathTextInput');
        const finalMathText = finalMathTextInput.value || '';
        const newFinalMathText = finalMathText + mathText;
        const finalMathTextPreview = this.shadowRoot.querySelector('#finalMathTextPreview');

        finalMathTextInput.value = newFinalMathText;
        finalMathTextPreview.innerHTML = `$$${newFinalMathText}$$`;

        window.renderMathInElement(finalMathTextPreview, {
            delimiters: [
              {left: "$$", right: "$$", display: false}
            ]
        });

    }

    insertClick() {
        const finalMathTextInput = this.shadowRoot.querySelector('#finalMathTextInput');
        const mathText = `$$$${finalMathTextInput.value}$$$`;

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
