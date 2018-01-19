import {GQLRequest} from '../prendus-shared/services/graphql-service';
import {
    SetComponentPropertyAction,
    Question,
    BuiltQuestion,
    Reducer,
    UserInput,
    UserVariable,
    UserCheck,
    UserRadio,
    UserEssay
} from './prendus-question-elements.d';
import {buildQuestion, checkAnswer} from './services/question-service';
import {createUUID, fireLocalAction} from '../prendus-shared/services/utilities-service';
import {getAstObjects, compileToHTML} from '../assessml/assessml';
import {RootReducer} from './redux/reducers';
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

export class PrendusViewQuestion extends Polymer.Element {
    shadowRoot: ShadowRoot;
    componentId: string;
    action: SetComponentPropertyAction;
    questionId: string;
    _questionId: string;
    _question: Question;
    builtQuestion: BuiltQuestion;
    userToken: string | null;
    loaded: boolean;
    showEmbedCode: boolean;
    rootReducer: Reducer;
    checkAnswerResponse: string;
    solutionButtonText: 'Solution' | 'Question';

    static get is() { return 'prendus-view-question'; }
    static get properties() {
        return {
            question: {
                type: Object,
                observer: 'questionChanged',
                value: null
            },
            questionId: {
                type: String,
                observer: 'questionIdChanged'
            }

        };
    }

    constructor() {
        super();

        this.componentId = createUUID();
        extendSchema(`
            type PrendusViewQuestion implements ComponentState {
                componentId: String!
                componentType: String!
                loaded: Boolean
                question: Any
                builtQuestion: Any
                showSolution: Boolean
            }
        `);
        addIsTypeOf('ComponentState', 'PrendusViewQuestion', (value) => {
            return value.componentType === 'PrendusViewQuestion';
        });
        subscribe(this.render.bind(this));

        execute(`
            mutation($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            componentId: this.componentId,
            props: {
                componentType: 'PrendusViewQuestion'
            }
        });

        this.rootReducer = RootReducer;
    }

    connectedCallback() {
        super.connectedCallback();
        this.action = fireLocalAction(this.componentId, 'solutionButtonText', 'Solution');
    }

    getThis() {
        return this;
    }

    showEmbedCodeClick() {
        this.action = fireLocalAction(this.componentId, 'showEmbedCode', !this.showEmbedCode);

        //allow the template with the input to be stamped
        setTimeout(() => {
            this.shadowRoot.querySelector('#embedInput').select();
        }, 0);
    }

    async questionChangedGraphSM() {
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
                            question
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
            prepareForQuestionQuery: (variables) => {
                return {
                    componentId: this.componentId,
                    props: {
                        question: this.question,
                        loaded: false
                    }
                };
            },
            getLocalQuestion: (variables) => {
                return {
                    componentId: this.componentId
                };
            },
            getRemoteQuestion: (variables) => {
                return {
                    questionId: this.questionId
                };
            },
            questionPrepared: async (variables) => {
                return {
                    componentId: this.componentId,
                    props: {
                        question: variables.question,
                        builtQuestion: await buildQuestion(variables.question.text, variables.question.code)
                    }
                };
            }
        });
    }

    async questionChanged() {
        console.log(this.question)

        await execute(`
            mutation update1($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }

            mutation update2($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            componentId: this.componentId,
            props: {
                question: this.question,
                loaded: false
            }
        }).then((result) => {
            console.log('result', result)
        });

        // this.action = fireLocalAction(this.componentId, 'question', this.question);
        // this.action = fireLocalAction(this.componentId, 'loaded', false);

        const loadDataResult = await loadData(this.question, null, this.userToken);

        console.log('loadDataResult', loadDataResult);

        await execute(`
            mutation($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            componentId: this.componentId,
            props: {
                question: loadDataResult.question,
                builtQuestion: loadDataResult.builtQuestion,
                showSolution: this.builtQuestion ? getAstObjects(this.builtQuestion.ast, 'SOLUTION').length > 0 : false,
                loaded: true
            }
        });

        // this.action = fireLocalAction(this.componentId, 'question', loadDataResult.question);
        // this.action = fireLocalAction(this.componentId, 'builtQuestion', loadDataResult.builtQuestion);
        // this.action = fireLocalAction(this.componentId, 'showSolution', this.builtQuestion ? getAstObjects(this.builtQuestion.ast, 'SOLUTION').length > 0 : false);
        // this.action = fireLocalAction(this.componentId, 'loaded', true);

        //this is so that if the question is being viewed from within an iframe, the iframe can resize itself
        window.parent.postMessage({
            type: 'prendus-view-question-resize',
            height: document.body.scrollHeight,
            width: document.body.scrollWidth
        }, '*');

        this.dispatchEvent(new CustomEvent('question-loaded', {
            bubbles: false
        }));
    }

    // async questionIdChanged() {
    //     this.action = fireLocalAction(this.componentId, 'questionId', this.questionId);
    //     this.action = fireLocalAction(this.componentId, 'loaded', false);
    //
    //     const loadDataResult = await loadData(null, this._questionId, this.userToken);
    //
    //     this.action = fireLocalAction(this.componentId, 'question', loadDataResult.question);
    //     this.action = fireLocalAction(this.componentId, 'builtQuestion', loadDataResult.builtQuestion);
    //     this.action = fireLocalAction(this.componentId, 'showSolution', getAstObjects(this.builtQuestion.ast, 'SOLUTION').length > 0);
    //     this.action = fireLocalAction(this.componentId, 'loaded', true);
    //
    //     //this is so that if the question is being viewed from within an iframe, the iframe can resize itself
    //     window.parent.postMessage({
    //         type: 'prendus-view-question-resize',
    //         height: document.body.scrollHeight,
    //         width: document.body.scrollWidth
    //     }, '*');
    //
    //     this.dispatchEvent(new CustomEvent('question-loaded', {
    //         bubbles: false
    //     }));
    // }

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

        this.action = fireLocalAction(this.componentId, 'checkAnswerResponse', checkAnswerInfo.answer === true ? 'Correct' : checkAnswerInfo.error ? `This question has errors:\n\n${checkAnswerInfo.error}` : 'Incorrect');

        this.shadowRoot.querySelector('#checkAnswerResponseToast').open();
    }

    async showSolutionClick() {
        const solutionTemplate = <HTMLTemplateElement> this.shadowRoot.querySelector('#solution1');
        if (solutionTemplate) {
            this.action = fireLocalAction(this.componentId, 'builtQuestion', {
                ...this.builtQuestion,
                html: `${solutionTemplate.innerHTML}<template>${this._question.text}</template>`
            });
            this.action = fireLocalAction(this.componentId, 'solutionButtonText', 'Question');
        }
        else {
            this.action = fireLocalAction(this.componentId, 'builtQuestion', {
                ...this.builtQuestion,
                html: compileToHTML(this.builtQuestion.ast, () => NaN, () => '')
            });
            this.action = fireLocalAction(this.componentId, 'solutionButtonText', 'Solution');
        }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        // if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        // if (Object.keys(state.components[this.componentId] || {}).includes('question')) this._question = state.components[this.componentId].question;
        if (Object.keys(state.components[this.componentId] || {}).includes('questionId')) this._questionId = state.components[this.componentId].questionId;
        // if (Object.keys(state.components[this.componentId] || {}).includes('builtQuestion')) this.builtQuestion = state.components[this.componentId].builtQuestion;
        if (Object.keys(state.components[this.componentId] || {}).includes('showEmbedCode')) this.showEmbedCode = state.components[this.componentId].showEmbedCode;
        if (Object.keys(state.components[this.componentId] || {}).includes('checkAnswerResponse')) this.checkAnswerResponse = state.components[this.componentId].checkAnswerResponse;
        // if (Object.keys(state.components[this.componentId] || {}).includes('showSolution')) this.showSolution = state.components[this.componentId].showSolution;
        if (Object.keys(state.components[this.componentId] || {}).includes('solutionButtonText')) this.solutionButtonText = state.components[this.componentId].solutionButtonText;
        this.userToken = state.userToken;
    }

    async render() {
        const result = await execute(`
            query($componentId: String!) {
                componentState(componentId: $componentId) {
                    ... on PrendusViewQuestion {
                        question
                        loaded
                        builtQuestion
                        showSolution
                    }
                }
            }
        `, {
            componentId: this.componentId
        });

        console.log(result.data.componentState);
        const componentState = result.data.componentState;
        if (componentState) {
            this._question = componentState.question;
            this.loaded = componentState.loaded;
            this.builtQuestion = componentState.builtQuestion;
            this.showSolution = componentState.showSolution;

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

async function loadData(question: Question | null, questionId: string | null, userToken: string | null) {
    if (question) {
        return {
            question,
            builtQuestion: await buildQuestion(question.text, question.code)
        };
    }
    else if (questionId) {
        const data = await GQLRequest(`
            query getQuestion($questionId: ID!) {
                question: Question(
                    id: $questionId
                ) {
                    text
                    code
                }
            }
        `, {
            questionId
        }, userToken, (error: any) => {
            console.log(error);
        });

        if (data.question) {
            return {
                question: data.question,
                builtQuestion: await buildQuestion(data.question.text, data.question.code)
            };
        }
        else {
            return await createNotFoundQuestion(questionId);
        }
    }
    else {
        return {
            text: '',
            code: ''
        };
    }
}

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
