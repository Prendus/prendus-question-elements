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
} from '../prendus-shared/services/utilities-service';
import {
    getAstObjects,
    compileToHTML
} from '../assessml/assessml';
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
} from '../assessml/assessml.d';
import {
    execute,
    subscribe,
    extendSchema,
    addIsTypeOf
} from '../graphsm/graphsm';
import {
    loadQuestion
} from './services/shared-service';

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

export class PrendusViewQuestion extends Polymer.Element {
    shadowRoot: ShadowRoot;
    componentId: string;
    question: Question;
    questionId: string;
    builtQuestion: BuiltQuestion;
    userToken: string | null;
    loaded: boolean;
    showEmbedCode: boolean;
    checkAnswerResponse: string;
    solutionButtonText: 'Solution' | 'Question';

    static get is() { return 'prendus-view-question'; }
    static get properties() {
        return {
            question: {
                observer: 'questionInfoChanged'
            },
            questionId: {
                observer: 'questionInfoChanged'
            }
        };
    }

    constructor() {
        super();

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
                        question: {
                            text: '',
                            code: ''
                        },
                        questionId: '',
                        solutionButtonText: 'Solution',
                        showSolution: false,
                        showEmbedCode: false,
                        checkAnswerResponse: ''
                    }
                };
            }
        }, this.userToken);
    }

    getThis() {
        return this;
    }

    getQuestionDefined(builtQuestion) {
        return builtQuestion ? builtQuestion.html === '' ? null : builtQuestion.html : null;
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

    async questionInfoChanged(newValue: any, oldValue: any) {
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
            this._question = componentState.question;
            this._questionId = componentState.questionId;
            this.loaded = componentState.loaded;
            this.builtQuestion = componentState.builtQuestion;
            this.showSolution = componentState.showSolution;
            this.showEmbedCode = componentState.showEmbedCode;
            this.checkAnswerResponse = componentState.checkAnswerResponse;
            this.solutionButtonText = componentState.solutionButtonText;

            const contentDiv = this.shadowRoot.querySelector('#contentDiv');
            if (contentDiv) {
                setTimeout(() => {
                    window.renderMathInElement(contentDiv, {
                        delimiters: [
                          {left: "$$", right: "$$", display: false}
                        ]
                    });
                });
            }
            else {
                //TODO this seems to me to be a bad way to do this...the problem is that the contentDiv is not defined, and I do not know how to know when it will be defined. It is inside of a dom-if, and that gets stamped when the loaded property is true
                setTimeout(() => {
                    this.render(state);
                });
            }
        }
    }
}

window.customElements.define(PrendusViewQuestion.is, PrendusViewQuestion);

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
