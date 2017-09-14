import {createUUID} from '../../prendus-shared/services/utilities-service';

class PrendusMathTool extends WysiwygTool {
    componentId: string;
    selected: number;

    static get is() { return 'prendus-math-tool'; }

    constructor() {
        super();

        this.componentId = createUUID();
    }

    connectedCallback() {
        super.connectedCallback();

        this.action = fireLocalAction(this.componentId, 'selected', 0);
    }

    selectedChanged(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'selected', e.detail.value);
    }

    execCommand() {
        this.shadowRoot.querySelector('#dialog').open();
    }

    dialogClick(e: Event) {
        e.stopPropagation();
    }

    mathSymbolClick(e) {
        const mathText = e.currentTarget.finalTex;
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

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        if (state.components[this.componentId]) this.selected = state.components[this.componentId].selected;
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
