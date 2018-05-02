import DOMPurify from 'dompurify';
import {html, render} from 'lit-html/lib/lit-extended.js';
import {unsafeHTML} from 'lit-html/lib/unsafe-html.js';
import './state/init-state-management.ts';
import {
    Question,
    BuiltQuestion,
    UserInput,
    UserVariable,
    UserCheck,
    UserRadio,
    UserEssay
} from './prendus-question-elements.d';
import {
    buildQuestion,
    checkAnswer
} from './services/question-service';
import {
    createUUID
} from 'prendus-shared/services/utilities-service.ts';
import {
    getAstObjects,
    compileToHTML
} from 'assessml';
import {
    AST,
    Variable,
    Input,
    Essay,
    Radio,
    Check,
    Drag,
    Drop,
    Image
} from 'assessml';
import {
    execute,
    subscribe,
    extendSchema,
    addIsTypeOf
} from 'graphsm';
import {
    loadQuestion
} from './services/shared-service';
import '@polymer/paper-toast';
import 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.8.3/katex.min.js';

const PRENDUS_VIEW_QUESTION = 'PrendusViewQuestion';
extendSchema(`
    type ${PRENDUS_VIEW_QUESTION} implements ComponentState {
        componentId: String!
        componentType: String!
        loaded: Boolean
        question: Question!
        questionId: String!
        builtQuestion: Any
        showSolution: Boolean!
        showEmbedCode: Boolean!
        checkAnswerResponse: String!
        solutionButtonText: String!
    }
`);
addIsTypeOf('ComponentState', PRENDUS_VIEW_QUESTION, (value: any) => {
    return value.componentType === PRENDUS_VIEW_QUESTION;
});

export class PrendusViewQuestion extends HTMLElement {
    shadowRoot: ShadowRoot;
    componentId: string;
    _question: Question;
    _questionId: string;
    builtQuestion: BuiltQuestion;
    userToken: string | null;
    loaded: boolean;
    showEmbedCode: boolean;
    checkAnswerResponse: string;
    solutionButtonText: 'Solution' | 'Question';
    showSolution: boolean;

    get question(): Question {
        //TODO return this from the global state store
        return this._question;
    }

    set question(val) {
        if (val === this.question) {
            return;
        }

        //TODO set this on the global state store
        this._question = val;
        this._questionId = null; //TODO bad
        this.questionInfoChanged();
    }

    get questionId(): string {
        //TODO return this from the global state store
        return this._questionId;
    }

    set questionId(val) {
        if (val === this.questionId) {
            return;
        }

        //TODO set this on the global state store
        this._question = null; //TODO bad
        this._questionId = val;
        this.questionInfoChanged();
    }

    constructor() {
        super();

        this.attachShadow({mode: 'open'});

        this.componentId = createUUID();
        subscribe(this.render.bind(this));
        execute(`
            mutation initialSetup($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            initialSetup: (previousResult) => {
                return {
                    componentId: this.componentId,
                    props: {
                        componentType: PRENDUS_VIEW_QUESTION,
                        question: null,
                        questionId: null,
                        solutionButtonText: 'Solution',
                        showSolution: false,
                        showEmbedCode: false,
                        checkAnswerResponse: ''
                    }
                };
            }
        }, this.userToken);
    }

    async showEmbedCodeClick() {
        await execute(`
            mutation setShowEmbedCode($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            setShowEmbedCode: (previousResult) => {
                return {
                    componentId: this.componentId,
                    props: {
                        showEmbedCode: !this.showEmbedCode
                    }
                };
            }
        }, this.userToken);

        //allow the template with the input to be stamped
        setTimeout(() => {
            this.shadowRoot.querySelector('#embedInput').select();
        }, 0);
    }

    async questionInfoChanged() {
        if (!this.question && !this.questionId) {
            return;
        }

        await loadQuestion(this.componentId, PRENDUS_VIEW_QUESTION, this.question, this.questionId, this.userToken);

        //TODO this causes issues with the secureEval messaging, probably won't be hard to fix
        //this is so that if the question is being viewed from within an iframe, the iframe can resize itself
        // window.parent.postMessage({
        //     type: 'prendus-view-question-resize',
        //     height: document.body.scrollHeight,
        //     width: document.body.scrollWidth
        // }, '*');

        this.dispatchEvent(new CustomEvent('question-loaded'));
    }

    getSanitizedHTML(html: string) {
        const sanitizedHTML = DOMPurify.sanitize(html, {
            ADD_ATTR: ['contenteditable', 'fontsize', 'data'],
            ADD_TAGS: ['juicy-ace-editor', 'function-plot'],
            SANITIZE_DOM: false // This allows DOMPurify.sanitize to be called multiple times in succession without changing the output (it was removing ids before)
        });
        return sanitizedHTML;
    }

    async checkAnswer() {
        const astVariables: Variable[] = getAstObjects(this.builtQuestion.ast, 'VARIABLE', ['SOLUTION']);
        const astInputs: Input[] = getAstObjects(this.builtQuestion.ast, 'INPUT', ['SOLUTION']);
        const astEssays: Essay[] = getAstObjects(this.builtQuestion.ast, 'ESSAY', ['SOLUTION']);
        const astCodes: Code[] = getAstObjects(this.builtQuestion.ast, 'CODE', ['SOLUTION']);
        const astChecks: Check[] = getAstObjects(this.builtQuestion.ast, 'CHECK', ['SOLUTION']);
        const astRadios: Radio[] = getAstObjects(this.builtQuestion.ast, 'RADIO', ['SOLUTION']);
        const astDrags: Drag[] = getAstObjects(this.builtQuestion.ast, 'DRAG', ['SOLUTION']);
        const astDrops: Drop[] = getAstObjects(this.builtQuestion.ast, 'DROP', ['SOLUTION']);
        const astImages: Image[] = getAstObjects(this.builtQuestion.ast, 'IMAGE', ['SOLUTION']);
        const astGraphs: Graph[] = getAstObjects(this.builtQuestion.ast, 'GRAPH', ['SOLUTION']);

        const userVariables: UserVariable[] = astVariables;
        const userImages: UserImage[] = astImages;
        const userGraphs: UserGraph[] = astGraphs;
        const userInputs: UserInput[] = astInputs.map((astInput) => {
            return {
                varName: astInput.varName,
                value: this.shadowRoot.querySelector(`#${astInput.varName}`).textContent
            };
        });
        const userEssays: UserEssay[] = astEssays.map((astEssay) => {
            return {
                varName: astEssay.varName,
                value: this.shadowRoot.querySelector(`#${astEssay.varName}`).value
            };
        });
        const userCodes: UserCode[] = astCodes.map((astCode) => {
            return {
                varName: astCode.varName,
                value: this.shadowRoot.querySelector(`#${astCode.varName}`).value
            };
        });
        const userChecks: UserCheck[] = astChecks.map((astCheck) => {
            return {
                varName: astCheck.varName,
                checked: this.shadowRoot.querySelector(`#${astCheck.varName}`).checked
            };
        });
        const userRadios: UserRadio[] = astRadios.map((astRadio) => {
            return {
                varName: astRadio.varName,
                checked: this.shadowRoot.querySelector(`#${astRadio.varName}`).checked
            };
        });

        const checkAnswerInfo = await checkAnswer(this._question.code, this.builtQuestion.originalVariableValues, userVariables, userInputs, userEssays, userCodes, userChecks, userRadios, userImages, userGraphs);

        await execute(`
            mutation setCheckAnswerResponse($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            setCheckAnswerResponse: (previousResult) => {
                return {
                    componentId: this.componentId,
                    props: {
                        checkAnswerResponse: checkAnswerInfo.answer === true ? 'Correct' : checkAnswerInfo.error ? `This question has errors:\n\n${checkAnswerInfo.error}` : 'Incorrect'
                    }
                };
            }
        }, this.userToken);

        this.dispatchEvent(new CustomEvent('question-response', {
            detail: {
                userVariables,
                userInputs,
                userEssays,
                userChecks,
                userRadios,
                userCodes
            }
        }));

        this.shadowRoot.querySelector('#checkAnswerResponseToast').open();
    }

    async showSolutionClick() {
        await execute(`
            mutation setSolutionTemplateInfo($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            setSolutionTemplateInfo: (previousResult) => {
                const solutionTemplate = <HTMLTemplateElement> this.shadowRoot.querySelector('#solution1');
                const props = solutionTemplate ? {
                    builtQuestion: {
                        ...this.builtQuestion,
                        html: `${solutionTemplate.innerHTML}<template>${this._question.text}</template>`
                    },
                    solutionButtonText: 'Question'
                } : {
                    builtQuestion: {
                        ...this.builtQuestion,
                        html: compileToHTML(this.builtQuestion.ast, () => NaN, () => '')
                    },
                    solutionButtonText: 'Solution'
                };

                return {
                    componentId: this.componentId,
                    props
                };
            }
        }, this.userToken);
    }

    render(state) {
        const componentState = state.components[this.componentId];
        if (componentState) {
            // this._question = componentState.question;
            // this._questionId = componentState.questionId;
            this.loaded = componentState.loaded;
            this.builtQuestion = componentState.builtQuestion;
            this.showSolution = componentState.showSolution;
            this.showEmbedCode = componentState.showEmbedCode;
            this.checkAnswerResponse = componentState.checkAnswerResponse;
            this.solutionButtonText = componentState.solutionButtonText;
        }

        const mathRenderedHTML = this.getSanitizedHTML(this.builtQuestion ? this.builtQuestion.html : '').replace(/\$\$.*\$\$/g, (replacement) => {
            return window.katex.renderToString(replacement.replace(/\$/g, ''));
        });

        render(html`
            <style>
                .mainContainer {
                    position: relative;
                }

                .questionPreviewPlaceholder {
                    color: rgba(1, 1, 1, .25);
                    text-align: center;
                }

                .bottomButtons {
                    display: flex;
                    flex-direction: row;
                    text-align: center;
                    cursor: pointer;
                    color: grey;
                }

                .checkButton {
                    flex: 1;
                }

                #checkAnswerResponseToast {
                    z-index: 1000;
                }
            </style>

            <div class="mainContainer" hidden="${!this.builtQuestion}">
                <div id="contentDiv">
                    ${unsafeHTML(mathRenderedHTML)}
                </div>

                <div class="bottomButtons">
                    <div onclick="${() => this.checkAnswer()}" class="checkButton">Check</div>
                    ${this.showSolution ? html`<div onclick="${() => this.showSolutionClick()}" class="checkButton">${this.solutionButtonText}</div>` : ''}
                </div>

                <paper-toast id="checkAnswerResponseToast" text="${this.checkAnswerResponse}" duration="1500" fitInto="${this}" horizontal-align="right"></paper-toast>
            </div>

            <div class="questionPreviewPlaceholder" hidden="${this.builtQuestion}">
                Question preview will appear here
            </div>
        `, this.shadowRoot);
    }
}

window.customElements.define('prendus-view-question', PrendusViewQuestion);

async function createNotFoundQuestion(questionId: string) {
    const notFoundQuestion = {
        id: questionId,
        text: 'This question does not exist',
        code: 'answer = false;'
    };

    return {
        question: notFoundQuestion,
        builtQuestion: await buildQuestion(notFoundQuestion.text, notFoundQuestion.code)
    };
}
