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
        this.finalTex = this.tex.replace(`{${e.target.id}}`, `{${e.detail.value}}`);
    }
}

window.customElements.define(PrendusMathSymbol.is, PrendusMathSymbol);
