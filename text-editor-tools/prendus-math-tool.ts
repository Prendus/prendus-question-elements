import {createUUID} from '../../prendus-shared/services/utilities-service';

class PrendusMathTool extends WysiwygTool {
    componentId: string;
    selected: number;
    finalMathText: string;

    static get is() { return 'prendus-math-tool'; }

    constructor() {
        super();

        this.componentId = createUUID();
    }

    connectedCallback() {
        super.connectedCallback();

        this._setCommand('insertText');
        
        this.action = fireLocalAction(this.componentId, 'selected', 0);
    }

    selectedChanged(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'selected', e.detail.value);
    }

    execCommand() {
        if (this.disabled || !this.range0) {
            return;
        }

        this.shadowRoot.querySelector('#dialog').open();
    }

    dialogClick(e: Event) {
        e.stopPropagation();
    }

    mathSymbolClick(e: Event) {
        const mathText = e.currentTarget.finalTex;
        this.action = fireLocalAction(this.componentId, 'finalMathText', (this.finalMathText || '') + mathText);
    }

    finalMathTextInputChanged(e: CustomEvent) {
        const finalMathText = e.detail.value;
        this.action = fireLocalAction(this.componentId, 'finalMathText', finalMathText);
    }

    insertClick() {
        const mathText = `$$${this.finalMathText}$$`;

        this.dispatchEvent(new CustomEvent('insert-math', {
            bubbles: false,
            detail: {
                mathText
            }
        }));

        this.shadowRoot.querySelector('#dialog').close();

        this.action = fireLocalAction(this.componentId, 'finalMathText', '');
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        if (state.components[this.componentId]) this.selected = state.components[this.componentId].selected;
        if (state.components[this.componentId]) this.finalMathText = state.components[this.componentId].finalMathText;

        const finalMathTextPreview = this.shadowRoot.querySelector('#finalMathTextPreview');
        window.renderMathInElement(finalMathTextPreview, {
            delimiters: [
              {left: "$$", right: "$$", display: false}
            ]
        });
    }
}

window.customElements.define(PrendusMathTool.is, PrendusMathTool);

function fireLocalAction(componentId: string, key: string, value: any) {
    return {
        type: 'SET_COMPONENT_PROPERTY',
        componentId,
        key,
        value
    };
}
