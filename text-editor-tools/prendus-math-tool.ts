// import {createUUID} from '../../prendus-shared/services/utilities-service';
// import {extendSchema, execute, subscribe} from '../../graphsm/graphsm';

const PRENDUS_MATH_TOOL = 'PrendusMathTool';
extendSchema(`
    type ${PRENDUS_MATH_TOOL} implements ComponentState {
        componentId: String!
        componentType: String!
        selected: Int!
        finalMathText: String!
    }
`);

class PrendusMathTool extends WysiwygTool {
    componentId: string;
    selected: number;
    finalMathText: string;

    static get is() { return 'prendus-math-tool'; }

    constructor() {
        super();

        this.componentId = createUUID();
        subscribe(this.render.bind(this));
        execute(`
            mutation initialSetup($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            initialSetup: (previousResult: any) => {
                return {
                    componentId: this.componentId,
                    props: {
                        componentType: PRENDUS_MATH_TOOL,
                        selected: 0
                    }
                };
            }
        }, null);
        this._setCommand('insertText');
    }

    async selectedChanged(e: CustomEvent) {
        await execute(`
            mutation setSelected($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            setSelected: (previousResult: any) => {
                return {
                    componentId: this.componentId,
                    props: {
                        selected: e.detail.value
                    }
                };
            }
        }, null);
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

    async mathSymbolClick(e: Event) {
        await execute(`
            mutation setFinalMathText($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            setFinalMathText: (previousResult: any) => {
                const mathText = e.currentTarget.finalTex;
                return {
                    componentId: this.componentId,
                    props: {
                        finalMathText: (this.finalMathText || '') + mathText
                    }
                };
            }
        }, null);
    }

    async finalMathTextInputChanged(e: CustomEvent) {
        await execute(`
            mutation setFinalMathText($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            setFinalMathText: (previousResult: any) => {
                const finalMathText = e.detail.value;
                return {
                    componentId: this.componentId,
                    props: {
                        finalMathText
                    }
                };
            }
        }, null);
    }

    async insertClick() {
        const mathText = `$$${this.finalMathText}$$`;
        await execute(`
            mutation setFinalMathText($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            setFinalMathText: (previousResult: any) => {
                return {
                    componentId: this.componentId,
                    props: {
                        finalMathText: ''
                    }
                };
            }
        }, null);

        this.dispatchEvent(new CustomEvent('insert-math', {
            detail: {
                mathText
            }
        }));

        this.shadowRoot.querySelector('#dialog').close();
    }

    render(state: any) {
        const componentState = state.components[this.componentId];
        if (componentState) {
            this.selected = componentState.selected;
            this.finalMathText = componentState.finalMathText;
        }

        const finalMathTextPreview = this.shadowRoot.querySelector('#finalMathTextPreview');
        window.renderMathInElement(finalMathTextPreview, {
            delimiters: [
              {left: "$$", right: "$$", display: false}
            ]
        });
    }
}

window.customElements.define(PrendusMathTool.is, PrendusMathTool);
