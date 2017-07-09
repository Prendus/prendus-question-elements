import {GQLQuery} from './services/graphql-service';
import {SetComponentPropertyAction} from './typings/actions';
import {Question} from './typings/question';
import {BuiltQuestion} from './typings/built-question';
import {buildQuestion, checkAnswer} from './services/question-service';
import {createUUID} from './services/utilities-service';
import {compileToHTML, parse, getAstObjects} from '../assessml/assessml';
import {RootReducer} from './redux/reducers';
import {Reducer} from './typings/reducer';
import {AST} from 'assessml';

class PrendusViewQuestion extends Polymer.Element {
    componentId: string;
    action: SetComponentPropertyAction;
    questionId: string;
    question: Question;
    builtQuestion: BuiltQuestion;
    userToken: string | null;
    loaded: boolean;
    showEmbedCode: boolean;
    rootReducer: Reducer;

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
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'showEmbedCode',
            value: !this.showEmbedCode
        };

        //allow the template with the input to be stamped
        setTimeout(() => {
            this.shadowRoot.querySelector('#embedInput').select();
        });
    }

    async questionChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: this.question
        };

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: false
        };

        await this.loadData();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };

        //this is so that if the question is being viewed from within an iframe, the iframe can resize itself
        window.parent.postMessage({
            type: 'prendus-view-question-resize',
            height: document.body.scrollHeight,
            width: document.body.scrollWidth
        }, '*');
    }

    async questionIdChanged() {
        //TODO should I check to see if questionId is defined?

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'questionId',
            value: this.questionId
        };

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: false
        };

        await this.loadData();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
    }

    async loadData() {
        if (!this.question) {
            await GQLQuery(`
                query {
                    question: Question(id: "${this.questionId}") {
                        text
                        code
                    }
                }
            `, this.userToken, (key: string, value: any) => {
                this.action = {
                    type: 'SET_COMPONENT_PROPERTY',
                    componentId: this.componentId,
                    key,
                    value
                };
            }, (error: any) => {
                console.log(error);
            });
        }

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'builtQuestion',
            value: await buildQuestion(this.question.text, this.question.code)
        };
    }

    getSanitizedHTML(html: string) {
        const sanitizedHTML = DOMPurify.sanitize(html, {
            ADD_ATTR: ['contenteditable'],
            SANITIZE_DOM: false // This allows DOMPurify.sanitize to be called multiple times in succession without changing the output (it was removing ids before)
        });

        return sanitizedHTML;
    }

    async checkAnswer() {
        const astVariables = getAstObjects(this.builtQuestion.ast, 'VARIABLE');
        const astInputs = getAstObjects(this.builtQuestion.ast, 'INPUT');
        const astEssays = getAstObjects(this.builtQuestion.ast, 'ESSAY');
        const astChecks = getAstObjects(this.builtQuestion.ast, 'CHECK');
        const astRadios = getAstObjects(this.builtQuestion.ast, 'RADIO');
        const astDrags = getAstObjects(this.builtQuestion.ast, 'DRAG');
        const astDrops = getAstObjects(this.builtQuestion.ast, 'DROP');

        const userVariables = astVariables;
        const userInputs = astInputs.map((astInput) => {
            return {
                varName: astInput.varName,
                value: this.shadowRoot.querySelector(`#${astInput.varName}`).textContent
            };
        });
        const userEssays = astEssays.map((astEssay) => {
            return {
                varName: astEssay.varName,
                value: this.shadowRoot.querySelector(`#${astEssay.varName}`).value
            };
        });
        const userChecks = astChecks.map((astCheck) => {
            return {
                varName: astCheck.varName,
                checked: this.shadowRoot.querySelector(`#${astCheck.varName}`).checked
            };
        });
        const userRadios = astRadios.map((astRadio) => {
            return {
                varName: astRadio.varName,
                checked: this.shadowRoot.querySelector(`#${astRadio.varName}`).checked
            };
        });

        const checkAnswerInfo = await checkAnswer(this.question.code, userVariables, userInputs, userEssays, userChecks, userRadios);

        alert(checkAnswerInfo.answer === true ? 'Correct' : checkAnswerInfo.error ? `This question has errors:\n\n${checkAnswerInfo.error}` :'Incorrect');
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('question')) this.question = state.components[this.componentId].question;
        if (Object.keys(state.components[this.componentId] || {}).includes('builtQuestion')) this.builtQuestion = state.components[this.componentId].builtQuestion;
        if (Object.keys(state.components[this.componentId] || {}).includes('showEmbedCode')) this.showEmbedCode = state.components[this.componentId].showEmbedCode;
        this.userToken = state.userToken;
    }
}

window.customElements.define(PrendusViewQuestion.is, PrendusViewQuestion);
