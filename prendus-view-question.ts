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

extendSchema(`
    type Question {
        text: String!
        code: String!
    }

    type PrendusViewQuestion implements ComponentState {
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
addIsTypeOf('ComponentState', 'PrendusViewQuestion', (value) => {
    return value.componentType === 'PrendusViewQuestion';
});

export class PrendusViewQuestion extends Polymer.Element {
    shadowRoot: ShadowRoot;
    componentId: string;
    questionId: string;
    _questionId: string;
    _question: Question;
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
                        componentType: 'PrendusViewQuestion',
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
        });
    }

    getThis() {
        return this;
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
        });

        //allow the template with the input to be stamped
        setTimeout(() => {
            this.shadowRoot.querySelector('#embedInput').select();
        }, 0);
    }

    async questionInfoChanged() {
        if (!this.question && !this.questionId) {
            return;
        }

        await execute(`
            mutation prepareForQuestionQuery(
                $componentId: String!
                $props: Any
            ) {
                updateComponentState(componentId: $componentId, props: $props)
            }

            ${this.question ? `
                query getLocalQuestion($componentId: String!) {
                    componentState(componentId: $componentId) {
                        ... on PrendusViewQuestion {
                            question {
                                text
                                code
                            }
                        }
                    }
                }
            ` : `
                query getRemoteQuestion($questionId: ID!) {
                    question: Question(
                        id: $questionId
                    ) {
                        text
                        code
                    }
                }
            `}

            mutation questionPrepared(
                $componentId: String!
                $props: Any
            ) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            prepareForQuestionQuery: (previousResult) => {
                return {
                    componentId: this.componentId,
                    props: {
                        question: this.question,
                        loaded: false
                    }
                };
            },
            getLocalQuestion: (previousResult) => {
                return {
                    componentId: this.componentId
                };
            },
            getRemoteQuestion: (previousResult) => {
                return {
                    questionId: this.questionId
                };
            },
            questionPrepared: async (previousResult) => {
                const question = previousResult.data.componentState.question;
                return {
                    componentId: this.componentId,
                    props: {
                        question,
                        builtQuestion: await buildQuestion(question.text, question.code),
                        showSolution: this.builtQuestion ? getAstObjects(this.builtQuestion.ast, 'SOLUTION').length > 0 : false,
                        loaded: true
                    }
                };
            }
        });

        //TODO the resize is causing problems with the buildQuestion function with injecting variables for some reason, this happend after the switch to GraphSM
        //this is so that if the question is being viewed from within an iframe, the iframe can resize itself
        // window.parent.postMessage({
        //     type: 'prendus-view-question-resize',
        //     height: document.body.scrollHeight,
        //     width: document.body.scrollWidth
        // }, '*');

        this.dispatchEvent(new CustomEvent('question-loaded', {
            bubbles: false
        }));
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

        this.dispatchEvent(new CustomEvent('question-response', {
            bubbles: false,
            detail: {
                userVariables,
                userInputs,
                userEssays,
                userChecks,
                userRadios,
                userCodes
            }
        }));

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
        });

        this.shadowRoot.querySelector('#checkAnswerResponseToast').open();
    }

    async showSolutionClick() {
        const solutionTemplate = <HTMLTemplateElement> this.shadowRoot.querySelector('#solution1');
        if (solutionTemplate) {
            await execute(`
                mutation solutionTemplateExists($componentId: String!, $props: Any) {
                    updateComponentState(componentId: $componentId, props: $props)
                }
            `, {
                solutionTemplateExists: (previousResult) => {
                    return {
                        componentId: this.componentId,
                        props: {
                            builtQuestion: {
                                ...this.builtQuestion,
                                html: `${solutionTemplate.innerHTML}<template>${this._question.text}</template>`
                            },
                            solutionButtonText: 'Question'
                        }
                    };
                }
            });
        }
        else {
            await execute(`
                mutation solutionTemplateDoesNotExist($componentId: String!, $props: Any) {
                    updateComponentState(componentId: $componentId, props: $props)
                }
            `, {
                solutionTemplateDoesNotExist: (previousResult) => {
                    return {
                        componentId: this.componentId,
                        props: {
                            builtQuestion: {
                                ...this.builtQuestion,
                                html: compileToHTML(this.builtQuestion.ast, () => NaN, () => '')
                            },
                            solutionButtonText: 'Solution'
                        }
                    };
                }
            });
        }
    }

    async render() {
        const result = await execute(`
            query render($componentId: String!) {
                componentState(componentId: $componentId) {
                    ... on PrendusViewQuestion {
                        question {
                            text
                            code
                        }
                        loaded
                        builtQuestion
                        showSolution
                        questionId
                        showEmbedCode
                        checkAnswerResponse
                        solutionButtonText
                    }
                }
            }
        `, {
            render: (previousResult) => {
                return {
                    componentId: this.componentId
                };
            }
        });

        if (result.errors) {
            throw result.errors;
        }

        const componentState = result.data.componentState;
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
                    this.render();
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
