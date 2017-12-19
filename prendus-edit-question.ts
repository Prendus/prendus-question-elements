import {createUUID, navigate, fireLocalAction} from '../prendus-shared/services/utilities-service';
import {Question} from './prendus-question-elements.d';
import {SetComponentPropertyAction} from './prendus-question-elements.d';
import {GQLRequest} from '../prendus-shared/services/graphql-service';
import {User} from './prendus-question-elements.d';
import {RootReducer} from './redux/reducers';
import {Reducer} from './prendus-question-elements.d';
import {parse, getAstObjects} from '../assessml/assessml';
import {AST, Input, Image, Radio, Check, Essay, Code} from '../assessml/assessml.d';
import {insertEssayIntoCode, insertCodeIntoCode, insertInputIntoCode, insertRadioOrCheckIntoCode, insertVariableIntoCode, insertImageIntoCode} from './services/question-service';

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

        this.action = fireLocalAction(this.componentId, 'selected', 0);
        this.action = fireLocalAction(this.componentId, 'saving', false);
        this.action = fireLocalAction(this.componentId, 'loaded', true);

        setTimeout(() => { //TODO fix this...it would be nice to be able to set the font-size officially through the ace editor web component, and then we wouldn't have to hack. The timeout is to ensure the current task on the event loop completes and the dom template is stamped because of the loaded property before accessing the dom
            this.shadowRoot.querySelector('#codeEditor').shadowRoot.querySelector('#juicy-ace-editor-container').style = 'font-size: calc(40px - 1vw)';
            this.shadowRoot.querySelector('#codeEditor').shadowRoot.querySelector('.ace_gutter').style = 'background: #2a9af2';
        }, 2000);
    }

    async textEditorChanged() {
        if (this.textEditorLock) {
            return;
        }

        if (!this.shadowRoot.querySelector('#textEditor')) {
            return;
        }

        this.action = fireLocalAction(this.componentId, 'saving', true);

        debounce(async () => {
            const text = this.shadowRoot.querySelector('#textEditor').value;

            this.action = fireLocalAction(this.componentId, 'question', {
                ...this._question,
                text,
                code: this._question ? this._question.code : ''
            });


            await this.save();

            this.action = fireLocalAction(this.componentId, 'saving', false);

            this.dispatchEvent(new CustomEvent('text-changed', {
                detail: {
                    text
                },
                bubbles: false
            }));
        }, 200);
    }

    async codeEditorChanged() {
        if (this.codeEditorLock) {
            return;
        }

        this.action = fireLocalAction(this.componentId, 'saving', true);

        debounce(async () => {
            const code = this.shadowRoot.querySelector('#codeEditor').value;

            this.action = fireLocalAction(this.componentId, 'question', {
                ...this._question,
                text: this._question ? this._question.text : '',
                code
            });

            await this.save();

            this.action = fireLocalAction(this.componentId, 'saving', false);

            this.dispatchEvent(new CustomEvent('code-changed', {
                detail: {
                    code
                },
                bubbles: false
            }));
        }, 200);
    }

    async questionChanged() {
        this.action = fireLocalAction(this.componentId, 'question', this.question);
        this.action = fireLocalAction(this.componentId, 'loaded', false);

        await this.loadData();

        this.action = fireLocalAction(this.componentId, 'loaded', true);

        //this is so that if the question is being viewed from within an iframe, the iframe can resize itself
        window.parent.postMessage({
            type: 'prendus-edit-question-resize',
            height: document.body.scrollHeight,
            width: document.body.scrollWidth
        }, '*');
    }

    async questionIdChanged() {
        this.action = fireLocalAction(this.componentId, 'questionId', this.questionId);
        this.action = fireLocalAction(this.componentId, 'loaded', false);

        await this.loadData();

        this.action = fireLocalAction(this.componentId, 'loaded', true);
    }

    noSaveChanged() {
        this.action = fireLocalAction(this.componentId, 'noSave', this.noSave);
    }

    userChanged() {
        this.action = fireLocalAction(this.componentId, 'user', this.user);
    }

    userTokenChanged() {
        this.action = fireLocalAction(this.componentId, 'userToken', this.userToken);
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
                this.action = fireLocalAction(this.componentId, 'question', data.question);
            }
            else {
                this.action = fireLocalAction(this.componentId, 'question', {
                    id: this._questionId,
                    text: 'This question does not exist',
                    code: 'answer = false;'
                });
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

    switchEditorClick() {
        this.action = fireLocalAction(this.componentId, 'selected', this.selected === 0 ? 1 : 0);
    }

    async insertVariable(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'textEditorLock', true);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', true);

        const { varName, maxValue, minValue, precisionValue } = e.detail;
        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const codeEditor = this.shadowRoot.querySelector('#codeEditor');

        const code = codeEditor.value;

        const varString = `[${varName}]`;
        const newTextNode = document.createTextNode(varString);
        textEditor.range0.insertNode(newTextNode);
        textEditor.range0.setStart(newTextNode, varString.length);
        textEditor.range0.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(textEditor.range0);

        const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;

        this.action = fireLocalAction(this.componentId, 'question', {
            ...this._question,
            text,
            code: await insertVariableIntoCode(code, varName, minValue, maxValue, precisionValue)
        });

        this.action = fireLocalAction(this.componentId, 'textEditorLock', false);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', false);
    }

    insertInput(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'textEditorLock', true);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', true);

        const ast: AST = parse(this._question.text, () => 5, () => '', () => []);
        const astInputs: Input[] = <Input[]> getAstObjects(ast, 'INPUT');

        const varName = `input${astInputs.length + 1}`;
        const answer = e.detail.answer;

        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const codeEditor = this.shadowRoot.querySelector('#codeEditor');

        const code = codeEditor.value;

        const inputString = `[input]`;
        const newTextNode = document.createTextNode(inputString);
        textEditor.range0.insertNode(newTextNode);
        textEditor.range0.setStart(newTextNode, inputString.length);
        textEditor.range0.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(textEditor.range0);

        const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;

        this.action = fireLocalAction(this.componentId, 'question', {
            ...this._question,
            text,
            code: insertInputIntoCode(code, varName, answer)
        });

        this.action = fireLocalAction(this.componentId, 'textEditorLock', false);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', false);
    }

    insertEssay(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'textEditorLock', true);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', true);

        const ast: AST = parse(this._question.text, () => 5, () => '', () => []);
        const astEssays: Essay[] = <Essay[]> getAstObjects(ast, 'ESSAY');

        const varName = `essay${astEssays.length + 1}`;

        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const codeEditor = this.shadowRoot.querySelector('#codeEditor');

        const code = codeEditor.value;

        const essayString = `[essay]`;
        const newTextNode = document.createTextNode(essayString);
        textEditor.range0.insertNode(newTextNode);
        textEditor.range0.setStart(newTextNode, essayString.length);
        textEditor.range0.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(textEditor.range0);

        const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;

        this.action = fireLocalAction(this.componentId, 'question', {
            ...this._question,
            text,
            code: insertEssayIntoCode(code)
        });

        this.action = fireLocalAction(this.componentId, 'textEditorLock', false);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', false);
    }

    insertCode(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'textEditorLock', true);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', true);

        const ast: AST = parse(this._question.text, () => 5, () => '', () => []);
        const astCodes: Code[] = <Code[]> getAstObjects(ast, 'CODE');

        const varName = `code${astCodes.length + 1}`;

        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const codeEditor = this.shadowRoot.querySelector('#codeEditor');

        const code = codeEditor.value;

        const codeString = `[code]`;
        const newTextNode = document.createTextNode(codeString);
        textEditor.range0.insertNode(newTextNode);
        textEditor.range0.setStart(newTextNode, codeString.length);
        textEditor.range0.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(textEditor.range0);

        const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;

        this.action = fireLocalAction(this.componentId, 'question', {
            ...this._question,
            text,
            code: insertCodeIntoCode(code)
        });

        this.action = fireLocalAction(this.componentId, 'textEditorLock', false);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', false);
    }

    insertRadio(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'textEditorLock', true);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', true);

        const ast: AST = parse(this._question.text, () => 5, () => '', () => [], () => []);
        const astRadios: Radio[] = <Radio[]> getAstObjects(ast, 'RADIO');

        const varName = `radio${astRadios.length + 1}`;

        const { content, correct } = e.detail;
        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const codeEditor = this.shadowRoot.querySelector('#codeEditor');

        const code = codeEditor.value;

        const radioString = `[radio start]${content}[radio end]`;
        const newTextNode = document.createTextNode(radioString);
        textEditor.range0.insertNode(newTextNode);
        textEditor.range0.setStart(newTextNode, radioString.length);
        textEditor.range0.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(textEditor.range0);

        const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;

        this.action = fireLocalAction(this.componentId, 'question', {
            ...this._question,
            text,
            code: insertRadioOrCheckIntoCode(code, varName, correct)
        });

        this.action = fireLocalAction(this.componentId, 'textEditorLock', false);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', false);
    }

    insertCheck(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'textEditorLock', true);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', true);

        const ast: AST = parse(this._question.text, () => 5, () => '', () => [], () => []);
        const astChecks: Check[] = <Check[]> getAstObjects(ast, 'CHECK');

        const varName = `check${astChecks.length + 1}`;

        const { content, correct } = e.detail;
        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const codeEditor = this.shadowRoot.querySelector('#codeEditor');

        const code = codeEditor.value;

        const checkString = `[check start]${content}[check end]`;
        const newTextNode = document.createTextNode(checkString);
        textEditor.range0.insertNode(newTextNode);
        textEditor.range0.setStart(newTextNode, checkString.length);
        textEditor.range0.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(textEditor.range0);

        const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;

        this.action = fireLocalAction(this.componentId, 'question', {
            ...this._question,
            text,
            code: insertRadioOrCheckIntoCode(code, varName, correct)
        });

        this.action = fireLocalAction(this.componentId, 'textEditorLock', false);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', false);
    }

    insertMath(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'textEditorLock', true);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', true);

        const { mathText } = e.detail;
        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const codeEditor = this.shadowRoot.querySelector('#codeEditor');

        const newTextNode = document.createTextNode(mathText);
        textEditor.range0.insertNode(newTextNode);
        textEditor.range0.setStart(newTextNode, mathText.length);
        textEditor.range0.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(textEditor.range0);

        const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;

        this.action = fireLocalAction(this.componentId, 'question', {
            ...this._question,
            text
        });

        this.action = fireLocalAction(this.componentId, 'textEditorLock', false);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', false);
    }

    insertImage(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'textEditorLock', true);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', true);

        const ast: AST = parse(this._question.text, () => 5, () => '', () => [], () => []);
        const { dataUrl } = e.detail;
        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const codeEditor = this.shadowRoot.querySelector('#codeEditor');
        const astImages: Image[] = <Image[]> getAstObjects(ast, 'IMAGE');
        const varName = `img${astImages.length + 1}`;
        const code = codeEditor.value;

        const imageString = `[img${astImages.length + 1}]`;
        const newTextNode = document.createTextNode(imageString);
        textEditor.range0.insertNode(newTextNode);
        textEditor.range0.setStart(newTextNode, imageString.length);
        textEditor.range0.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(textEditor.range0);

        const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;

        this.action = fireLocalAction(this.componentId, 'question', {
            ...this._question,
            text,
            code: insertImageIntoCode(code, varName, dataUrl)
        });

        this.action = fireLocalAction(this.componentId, 'textEditorLock', false);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', false);
    }

    insertGraph(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'textEditorLock', true);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', true);

        const ast: AST = parse(this._question.text, () => 5, () => '', () => [], () => []);
        const textEditor = this.shadowRoot.querySelector('#textEditor');
        const astGraphs: Graph[] = <Graph[]> getAstObjects(ast, 'GRAPH');

        const graphString = `[graph${astGraphs.length + 1}]`;
        const newTextNode = document.createTextNode(graphString);
        textEditor.range0.insertNode(newTextNode);
        textEditor.range0.setStart(newTextNode, graphString.length);
        textEditor.range0.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(textEditor.range0);

        const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;

        this.action = fireLocalAction(this.componentId, 'question', {
            ...this._question,
            text
        });

        this.action = fireLocalAction(this.componentId, 'textEditorLock', false);
        this.action = fireLocalAction(this.componentId, 'codeEditorLock', false);
    }

    getAllowedTagNames() {
        return [
            'br',
			'p',
			'span'
        ];
    }

    clickRadioTool() {
        //TODO This functionality might be better provided as a property, something like radioToolButtonOpen. Querying the property tells you if it is open or closed, and setting it controls it
        this.shadowRoot.querySelector('#prendus-multiple-choice-tool').shadowRoot.querySelector('#button').click();
    }

    clickCheckTool() {
        //TODO This functionality might be better provided as a property, something like radioToolButtonOpen. Querying the property tells you if it is open or closed, and setting it controls it
        this.shadowRoot.querySelector('#prendus-check-tool').shadowRoot.querySelector('#button').click();
    }

    clickInputTool() {
        //TODO This functionality might be better provided as a property, something like radioToolButtonOpen. Querying the property tells you if it is open or closed, and setting it controls it
        this.shadowRoot.querySelector('#prendus-input-tool').shadowRoot.querySelector('#button').click();
    }

    clickEssayTool() {
        //TODO This functionality might be better provided as a property, something like radioToolButtonOpen. Querying the property tells you if it is open or closed, and setting it controls it
        this.shadowRoot.querySelector('#prendus-essay-tool').shadowRoot.querySelector('#button').click();
    }

    clickCodeTool() {
        //TODO This functionality might be better provided as a property, something like radioToolButtonOpen. Querying the property tells you if it is open or closed, and setting it controls it
        this.shadowRoot.querySelector('#prendus-code-tool').shadowRoot.querySelector('#button').click();
    }

    clickVariableTool() {
        //TODO This functionality might be better provided as a property, something like radioToolButtonOpen. Querying the property tells you if it is open or closed, and setting it controls it
        this.shadowRoot.querySelector('#prendus-variable-tool').shadowRoot.querySelector('#button').click();
    }

    clickMathTool() {
        //TODO This functionality might be better provided as a property, something like radioToolButtonOpen. Querying the property tells you if it is open or closed, and setting it controls it
        this.shadowRoot.querySelector('#prendus-math-tool').shadowRoot.querySelector('#button').click();
    }

    clickImageTool() {
        //TODO This functionality might be better provided as a property, something like radioToolButtonOpen. Querying the property tells you if it is open or closed, and setting it controls it
        this.shadowRoot.querySelector('#prendus-image-tool').shadowRoot.querySelector('#button').click();
    }

    clickGraphTool() {
        //TODO This functionality might be better provided as a property, something like radioToolButtonOpen. Querying the property tells you if it is open or closed, and setting it controls it
        this.shadowRoot.querySelector('#prendus-graph-tool').shadowRoot.querySelector('#button').click();
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
        if (Object.keys(state.components[this.componentId] || {}).includes('textEditorLock')) this.textEditorLock = state.components[this.componentId].textEditorLock;
        if (Object.keys(state.components[this.componentId] || {}).includes('codeEditorLock')) this.codeEditorLock = state.components[this.componentId].codeEditorLock;
    }
}

window.customElements.define(PrendusEditQuestion.is, PrendusEditQuestion);

let currentTimeoutId: any;
function debounce(func: () => any, delay: number) {
    clearTimeout(currentTimeoutId);
    currentTimeoutId = setTimeout(func, delay);
}
