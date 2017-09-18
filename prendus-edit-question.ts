import {createUUID, navigate} from '../prendus-shared/services/utilities-service';
import {Question} from './prendus-question-elements.d';
import {SetComponentPropertyAction} from './prendus-question-elements.d';
import {GQLRequest} from '../prendus-shared/services/graphql-service';
import {User} from './prendus-question-elements.d';
import {RootReducer} from './redux/reducers';
import {Reducer} from './prendus-question-elements.d';
import {parse, getAstObjects} from '../assessml/assessml';
import {AST, Input} from '../assessml/assessml.d';

class PrendusEditQuestion extends Polymer.Element {
    componentId: string;
    _question: Question;
    _questionId: string;
    question: Question;
    questionId: string;
    action: SetComponentPropertyAction;
    userToken: string;
    user: User;
    loaded: boolean;
    selected: number;
    rootReducer: Reducer;
    saving: boolean;
    noSave: boolean;

    static get is() { return 'prendus-edit-question'; }
    static get properties() {
        return {
            question: {
                type: Object,
                observer: 'questionChanged'
            },
            questionId: {
                type: String,
                observer: 'questionIdChanged'
            },
            noSave: {
                type: Boolean,
                observer: 'noSaveChanged'
            },
            user: {
                type: Object,
                observer: 'userChanged'
            },
            userToken: {
                type: String,
                observer: 'userTokenChanged'
            }
        };
    }

    constructor() {
        super();

        this.componentId = createUUID();
        this.rootReducer = RootReducer;
    }

    connectedCallback() {
        super.connectedCallback();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'selected',
            value: 0
        };

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'saving',
            value: false
        };

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };

        setTimeout(() => { //TODO fix this...it would be nice to be able to set the font-size officially through the ace editor web component, and then we wouldn't have to hack. The timeout is to ensure the current task on the event loop completes and the dom template is stamped because of the loaded property before accessing the dom
            this.shadowRoot.querySelector('#codeEditor').shadowRoot.querySelector('#juicy-ace-editor-container').style = 'font-size: calc(40px - 1vw)';
            this.shadowRoot.querySelector('#codeEditor').shadowRoot.querySelector('.ace_gutter').style = 'background: #2a9af2';
        }, 2000);
    }

    async textEditorChanged() {
        if (!this.shadowRoot.querySelector('#textEditor')) {
            return;
        }

        const text = this.shadowRoot.querySelector('#textEditor').value;

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: {
                ...this._question,
                text,
                code: this._question ? this._question.code : ''
            }
        };

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'saving',
            value: true
        };

        await this.save();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'saving',
            value: false
        };

        this.dispatchEvent(new CustomEvent('text-changed', {
            detail: {
                text
            },
            bubbles: false
        }));
    }

    async codeEditorChanged() {
        const code = this.shadowRoot.querySelector('#codeEditor').value;

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: {
                ...this._question,
                text: this._question ? this._question.text : '',
                code
            }
        };

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'saving',
            value: true
        };

        await this.save();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'saving',
            value: false
        };

        this.dispatchEvent(new CustomEvent('code-changed', {
            detail: {
                code
            },
            bubbles: false
        }));
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
            type: 'prendus-edit-question-resize',
            height: document.body.scrollHeight,
            width: document.body.scrollWidth
        }, '*');
    }

    async questionIdChanged() {
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

    noSaveChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'noSave',
            value: this.noSave
        };
    }

    userChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'user',
            value: this.user
        };
    }

    userTokenChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'userToken',
            value: this.userToken
        };
    }

    async loadData() {
        if (!this._question || (this._questionId && this._question.id !== this._questionId)) {
            const data = await GQLRequest(`
                query getQuestion($questionId: ID!) {
                    question: Question(
                        id: $questionId
                    ) {
                        id
                        text
                        code
                    }
                }
            `, {
                questionId: this._questionId
            }, this.userToken, (error: any) => {
                console.log(error);
            });

            if (data.question) {
                this.action = {
                    type: 'SET_COMPONENT_PROPERTY',
                    componentId: this.componentId,
                    key: 'question',
                    value: data.question
                };
            }
            else {
                this.action = {
                    type: 'SET_COMPONENT_PROPERTY',
                    componentId: this.componentId,
                    key: 'question',
                    value: {
                        id: this._questionId,
                        text: 'This question does not exist',
                        code: 'answer = false;'
                    }
                };
            }
        }
    }

    async save() {
        if (this.noSave) {
            return;
        }

        if (!this._questionId) {
            const data = await GQLRequest(`
                mutation createQuestion(
                    $authorId: ID!
                    $text: String!
                    $code: String!
                ) {
                    createQuestion(
                        authorId: $authorId
                        text: $text
                        code: $code
                    ) {
                        id
                    }
                }
            `, {
                authorId: this.user.id,
                text: this._question.text,
                code: this._question.code
            }, this.userToken, (error: any) => {
                console.log(error);
            });

            navigate(`/question/${data.createQuestion.id}/edit`);
        }
        else {
            await GQLRequest(`
                mutation updateQuestion(
                    $questionId: ID!
                    $text: String!
                    $code: String!
                ) {
                    updateQuestion(
                        id: $questionId
                        text: $text
                        code: $code
                    ) {
                        id
                    }
                }
            `, {
                questionId: this._questionId,
                text: this._question.text,
                code: this._question.code
            }, this.userToken, (error: any) => {
                console.log(error);
            });
        }
    }

    getSavingText(saving: boolean) {
        return saving ? 'Saving...' : 'Saved';
    }

    selectedChanged(e: CustomEvent) {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'selected',
            value: e.detail.value
        };
    }

    insertVariable(e: CustomEvent) {
        const { varName, maxValue, minValue, precisionValue } = e.detail;
        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const codeEditor = this.shadowRoot.querySelector('#codeEditor');

        const code = codeEditor.value;

        const newTextNode = document.createTextNode(`[${varName}]`);
        textEditor.range0.insertNode(newTextNode);

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: {
                ...this._question,
                code: insertVariableIntoCode(code, varName, minValue, maxValue, precisionValue)
            }
        };
    }

    insertInput(e: CustomEvent) {
        const ast: AST = parse(this._question.text, () => 5);
        const astInputs: Input[] = getAstObjects(ast, 'INPUT');

        const varName = `input${astInputs.length + 1}`;
        const answer = e.detail.answer;

        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const codeEditor = this.shadowRoot.querySelector('#codeEditor');

        const code = codeEditor.value;

        const newTextNode = document.createTextNode(`[input]`);
        textEditor.range0.insertNode(newTextNode);

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: {
                ...this._question,
                code: insertInputIntoCode(code, varName, answer)
            }
        };
    }

    insertEssay(e: CustomEvent) {
        const ast: AST = parse(this._question.text, () => 5);
        const astEssays: Input[] = getAstObjects(ast, 'ESSAY');

        const varName = `essay${astEssays.length + 1}`;

        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const codeEditor = this.shadowRoot.querySelector('#codeEditor');

        const code = codeEditor.value;

        const newTextNode = document.createTextNode(`[essay]`);
        textEditor.range0.insertNode(newTextNode);

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: {
                ...this._question,
                code: insertEssayIntoCode(code, varName)
            }
        };
    }

    insertRadio(e: CustomEvent) {
        const ast: AST = parse(this._question.text, () => 5);
        const astRadios: Input[] = getAstObjects(ast, 'RADIO');

        const varName = `radio${astRadios.length + 1}`;

        const { content, correct } = e.detail;
        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const codeEditor = this.shadowRoot.querySelector('#codeEditor');

        const code = codeEditor.value;

        const newTextNode = document.createTextNode(`[*]${content}[*]`);
        textEditor.range0.insertNode(newTextNode);

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: {
                ...this._question,
                code: insertRadioOrCheckIntoCode(code, varName, correct)
            }
        };
    }

    insertCheck(e: CustomEvent) {
        const ast: AST = parse(this._question.text, () => 5);
        const astChecks: Input[] = getAstObjects(ast, 'CHECK');

        const varName = `check${astChecks.length + 1}`;

        const { content, correct } = e.detail;
        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const codeEditor = this.shadowRoot.querySelector('#codeEditor');

        const code = codeEditor.value;

        const newTextNode = document.createTextNode(`[x]${content}[x]`);
        textEditor.range0.insertNode(newTextNode);

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: {
                ...this._question,
                code: insertRadioOrCheckIntoCode(code, varName, correct)
            }
        };
    }

    insertMath(e: CustomEvent) {
        const { mathText } = e.detail;
        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const codeEditor = this.shadowRoot.querySelector('#codeEditor');

        const text = textEditor.shadowRoot.querySelector('#layout').querySelector('#content').querySelector('#editable').textContent;

        const newTextNode = document.createTextNode(mathText);
        textEditor.range0.insertNode(newTextNode);
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('question')) this._question = state.components[this.componentId].question;
        if (Object.keys(state.components[this.componentId] || {}).includes('questionId')) this._questionId = state.components[this.componentId].questionId;
        if (Object.keys(state.components[this.componentId] || {}).includes('selected')) this.selected = state.components[this.componentId].selected;
        if (Object.keys(state.components[this.componentId] || {}).includes('saving')) this.saving = state.components[this.componentId].saving;
        if (Object.keys(state.components[this.componentId] || {}).includes('noSave')) this.noSave = state.components[this.componentId].noSave;
        if (Object.keys(state.components[this.componentId] || {}).includes('user')) this.user = state.components[this.componentId].user;
        if (Object.keys(state.components[this.componentId] || {}).includes('userToken')) this.userToken = state.components[this.componentId].userToken;
    }
}

window.customElements.define(PrendusEditQuestion.is, PrendusEditQuestion);

function insertVariableIntoCode(editorCode: string, varName: string, minValue: number, maxValue: number, precisionValue: number) {
    return `${varName}.min = ${minValue};\n${varName}.max = ${maxValue};\n${varName}.precision = ${precisionValue};\n\n${editorCode}`;
}

function insertInputIntoCode(code: string, varName: string, answer: string) {
    return code.replace(/answer\s*=\s*/, `answer = ${varName} === "${answer}" && `);
}

function insertEssayIntoCode(code: string, varName: string) {
    return code.replace(/answer\s*=\s*/, `answer = true && `);
}

function insertRadioOrCheckIntoCode(code: string, varName: string, correct: boolean) {
    return code.replace(/answer\s*=\s*/, `answer = ${varName} === ${correct} && `);
}
