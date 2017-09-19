import {GQLRequest} from '../prendus-shared/services/graphql-service';
import {SetComponentPropertyAction, Question, BuiltQuestion, Reducer, UserInput, UserVariable, UserCheck, UserRadio, UserEssay} from './prendus-question-elements.d';
import {buildQuestion, checkAnswer} from './services/question-service';
import {createUUID, fireLocalAction} from '../prendus-shared/services/utilities-service';
import {getAstObjects} from '../assessml/assessml';
import {RootReducer} from './redux/reducers';
import {AST, Variable, Input, Essay, Radio, Check, Drag, Drop} from '../assessml/assessml.d';

export class PrendusViewQuestion extends Polymer.Element {
    shadowRoot: ShadowRoot;
    componentId: string;
    action: SetComponentPropertyAction;
    questionId: string;
    question: Question;
    _questionId: string;
    _question: Question;
    builtQuestion: BuiltQuestion;
    userToken: string | null;
    loaded: boolean;
    showEmbedCode: boolean;
    rootReducer: Reducer;
    checkAnswerResponse: string;

    static get is() { return 'prendus-view-question'; }
    static get properties() {
        return {
            question: {
                type: Object,
                observer: 'questionChanged'
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
        this.rootReducer = RootReducer;
    }

    async connectedCallback() {
        super.connectedCallback();
        // this.action = checkForUserToken();
        // this.action = await getAndSetUser();
    }

    showEmbedCodeClick() {
        this.action = fireLocalAction(this.componentId, 'showEmbedCode', !this.showEmbedCode);

        //allow the template with the input to be stamped
        setTimeout(() => {
            this.shadowRoot.querySelector('#embedInput').select();
        }, 0);
    }

    async questionChanged() {
        this.action = fireLocalAction(this.componentId, 'question', this.question);
        this.action = fireLocalAction(this.componentId, 'loaded', false);

        const loadDataResult = await loadData(this._question, null, this.userToken);

        this.action = fireLocalAction(this.componentId, 'question', loadDataResult.question);
        this.action = fireLocalAction(this.componentId, 'builtQuestion', loadDataResult.builtQuestion);
        this.action = fireLocalAction(this.componentId, 'loaded', true);

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

    async questionIdChanged() {
        this.action = fireLocalAction(this.componentId, 'questionId', this.questionId);
        this.action = fireLocalAction(this.componentId, 'loaded', false);

        const loadDataResult = await loadData(null, this._questionId, this.userToken);

        this.action = fireLocalAction(this.componentId, 'question', loadDataResult.question);
        this.action = fireLocalAction(this.componentId, 'builtQuestion', loadDataResult.builtQuestion);
        this.action = fireLocalAction(this.componentId, 'loaded', true);

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

    getSanitizedHTML(html: string) {
        const sanitizedHTML = DOMPurify.sanitize(html, {
            ADD_ATTR: ['contenteditable'],
            SANITIZE_DOM: false // This allows DOMPurify.sanitize to be called multiple times in succession without changing the output (it was removing ids before)
        });

        return sanitizedHTML;
    }

    async checkAnswer() {
        const astVariables: Variable[] = getAstObjects(this.builtQuestion.ast, 'VARIABLE');
        const astInputs: Input[] = getAstObjects(this.builtQuestion.ast, 'INPUT');
        const astEssays: Essay[] = getAstObjects(this.builtQuestion.ast, 'ESSAY');
        const astChecks: Check[] = getAstObjects(this.builtQuestion.ast, 'CHECK');
        const astRadios: Radio[] = getAstObjects(this.builtQuestion.ast, 'RADIO');
        const astDrags: Drag[] = getAstObjects(this.builtQuestion.ast, 'DRAG');
        const astDrops: Drop[] = getAstObjects(this.builtQuestion.ast, 'DROP');

        const userVariables: UserVariable[] = astVariables;
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

        const checkAnswerInfo = await checkAnswer(this._question.code, userVariables, userInputs, userEssays, userChecks, userRadios);

        this.dispatchEvent(new CustomEvent('question-response', {
            bubbles: false,
            detail: {
                userVariables,
                userInputs,
                userEssays,
                userChecks,
                userRadios
            }
        }));

        this.action = fireLocalAction(this.componentId, 'checkAnswerResponse', checkAnswerInfo.answer === true ? 'Correct' : checkAnswerInfo.error ? `This question has errors:\n\n${checkAnswerInfo.error}` : 'Incorrect');

        this.shadowRoot.querySelector('#checkAnswerResponseToast').open();
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('question')) this._question = state.components[this.componentId].question;
        if (Object.keys(state.components[this.componentId] || {}).includes('questionId')) this._questionId = state.components[this.componentId].questionId;
        if (Object.keys(state.components[this.componentId] || {}).includes('builtQuestion')) this.builtQuestion = state.components[this.componentId].builtQuestion;
        if (Object.keys(state.components[this.componentId] || {}).includes('showEmbedCode')) this.showEmbedCode = state.components[this.componentId].showEmbedCode;
        if (Object.keys(state.components[this.componentId] || {}).includes('checkAnswerResponse')) this.checkAnswerResponse = state.components[this.componentId].checkAnswerResponse;
        this.userToken = state.userToken;

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
