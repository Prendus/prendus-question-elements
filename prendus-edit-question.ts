import {createUUID, navigate} from './services/utilities-service';
import {Question} from './prendus-question-elements.d';
import {SetComponentPropertyAction} from './prendus-question-elements.d';
import {GQLMutate, GQLQuery, escapeString} from './services/graphql-service';
import {User} from './prendus-question-elements.d';
import {RootReducer} from './redux/reducers';
import {Reducer} from './prendus-question-elements.d';

class PrendusEditQuestion extends Polymer.Element {
    componentId: string;
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

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: {
                ...this.question,
                text: this.shadowRoot.querySelector('#textEditor').value,
                code: this.question ? this.question.code : ''
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
    }

    async codeEditorChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: {
                ...this.question,
                text: this.question ? this.question.text : '',
                code: this.shadowRoot.querySelector('#codeEditor').value
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

    noSaveChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'noSave',
            value: this.noSave
        };
    }

    async loadData() {
        if (!this.question || this.question.id !== this.questionId) {
            await GQLQuery(`
                query {
                    question: Question(id: "${this.questionId}") {
                        id
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
    }

    async save() {
        if (this.noSave) {
            return;
        }

        if (!this.questionId) {
            const data = await GQLMutate(`
                mutation {
                    createQuestion(
                        authorId: "${escapeString(this.user.id)}"
                        text: "${escapeString(this.question.text)}"
                        code: "${escapeString(this.question.code)}"
                    ) {
                        id
                    }
                }
            `, this.userToken, (error: any) => {
                console.log(error);
            });

            navigate(`/question/${data.createQuestion.id}/edit`);
        }
        else {
            await GQLMutate(`
                mutation {
                    updateQuestion(
                        id: "${escapeString(this.questionId)}"
                        text: "${escapeString(this.question.text)}"
                        code: "${escapeString(this.question.code)}"
                    ) {
                        id
                    }
                }
            `, this.userToken, (error: any) => {
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

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('question')) this.question = state.components[this.componentId].question;
        if (Object.keys(state.components[this.componentId] || {}).includes('questionId')) this.questionId = state.components[this.componentId].questionId;
        if (Object.keys(state.components[this.componentId] || {}).includes('selected')) this.selected = state.components[this.componentId].selected;
        if (Object.keys(state.components[this.componentId] || {}).includes('saving')) this.saving = state.components[this.componentId].saving;
        if (Object.keys(state.components[this.componentId] || {}).includes('noSave')) this.noSave = state.components[this.componentId].noSave;

        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusEditQuestion.is, PrendusEditQuestion);
