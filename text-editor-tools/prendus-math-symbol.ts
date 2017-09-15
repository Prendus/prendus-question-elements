declare var Polymer: any;

class PrendusMathSymbol extends Polymer.Element {
    tex: string;
    finalTex: string;

    static get is() { return 'prendus-math-symbol'; }
    static get properties() {
        return {
            tex: {
                observer: 'texChanged'
            },
            params: {
                observer: 'paramsChanged'
            }
        };
    }

    connectedCallback() {
        this.addEventListener('click', (e: Event) => {
            e.stopPropagation();
        });
    }

    texChanged() {
        this.finalTex = this.tex;
        window.renderMathInElement(this.shadowRoot, {
            delimiters: [
              {left: "$$", right: "$$", display: false}
            ]
        });
    }

    paramsChanged() {
        this.paramsArray = this.params.replace(/\s/g, '').split(',');
    }

    paperInputClick(e: CustomEvent) {
        e.stopPropagation();
    }

    paperInputValueChanged(e: CustomEvent) {
        this.finalTex = this.paramsArray.reduce((result, paramName) => {
            const paramInput = this.shadowRoot.querySelector(`#${paramName}Input`);
            if (paramInput.value) {
                return result.replace(`{${paramName}}`, `{${paramInput.value}}`).replace(`[${paramName}]`, `[${paramInput.value}]`);
            }
            else {
                return result;
            }
        }, this.tex);
    }
}

window.customElements.define(PrendusMathSymbol.is, PrendusMathSymbol);
