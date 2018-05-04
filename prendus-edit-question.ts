import {
    createUUID,
    navigate,
    asyncReduce
} from 'prendus-shared/services/utilities-service.ts';
import {
    Question,
    User,
    UserCheck,
    UserRadio,
    UserInput
} from './prendus-question-elements.d';
import {GQLRequest} from 'prendus-shared/services/graphql-service.ts';
import {
    parse,
    getAstObjects,
    compileToAssessML
} from 'assessml';
import {
    AST,
    Input,
    Image,
    Radio,
    Check,
    Essay,
    Code,
    ASTObject
} from 'assessml/assessml.d';
import {
    insertEssayIntoCode,
    insertCodeIntoCode,
    insertInputIntoCode,
    insertRadioOrCheckIntoCode,
    insertVariableIntoCode,
    insertImageIntoCode,
    getUserASTObjectsFromAnswerAssignment,
    nullifyUserASTObjectInAnswerAssignment,
    setUserASTObjectValue,
    setUserASTObjectIdentifierNameInAnswerAssignment,
    decrementUserASTObjectVarNamesInAnswerAssignment,
    removeImageFromCode,
    getPropertyValue
} from './services/question-service';
import {
    execute,
    subscribe,
    extendSchema,
    addIsTypeOf
} from 'graphsm';
import {
    loadQuestion
} from './services/shared-service';
import './state/init-state-management.ts';
import {render, html} from 'lit-html/lib/lit-extended.js';
import './prendus-view-question';
import 'wysiwyg-e';
import esprima from 'esprima-es-module';
import '@polymer/paper-button';
import '@polymer/paper-tooltip';
import '@polymer/iron-icon';
import '@polymer/iron-icons';
import '@polymer/iron-pages';
import './text-editor-tools/prendus-code-tool';
import './text-editor-tools/prendus-essay-tool';
import './text-editor-tools/prendus-multiple-choice-tool';
import './text-editor-tools/prendus-graph-tool';
import './text-editor-tools/prendus-reset-tool';
import './text-editor-tools/prendus-variable-tool';
import './text-editor-tools/prendus-image-tool';
import 'juicy-ace-editor';
import 'ace-builds/src-noconflict/mode-javascript.js';

const PRENDUS_EDIT_QUESTION = 'PrendusEditQuestion';
extendSchema(`
    type ${PRENDUS_EDIT_QUESTION} implements ComponentState {
        componentId: String!
        componentType: String!
        loaded: Boolean!
        question: Question!
        questionId: String!
        selected: Int!
        saving: Boolean!
        noSave: Boolean!
        user: Any
        userToken: String
        textEditorLock: Boolean!
        codeEditorLock: Boolean!
        userRadiosFromCode: Any
        userChecksFromCode: Any
        userInputsFromCode: Any
    }
`);
addIsTypeOf('ComponentState', PRENDUS_EDIT_QUESTION, (value: any) => {
    return value.componentType === PRENDUS_EDIT_QUESTION;
});

class PrendusEditQuestion extends HTMLElement {
    componentId: string;
    _question: Question | null;
    _questionId: string | null;
    userToken: string;
    user: User;
    loaded: boolean;
    selected: number;
    saving: boolean;
    noSave: boolean;
    userRadiosFromCode: UserRadio[];
    userChecksFromCode: UserCheck[];
    userInputsFromCode: UserInput[];
    shadowRoot: ShadowRoot;
    multipleChoiceTool: boolean;
    multipleSelectTool: boolean;
    fillInTheBlankTool: boolean;
    essayTool: boolean;
    codeTool: boolean;
    variableTool: boolean;
    mathTool: boolean;
    imageTool: boolean;
    graphTool: boolean;
    resetTool: boolean;

    static get observedAttributes() {
        return [
            'no-save',
            'user-token',
            'multiple-choice-tool',
            'multiple-select-tool',
            'fill-in-the-blank-tool',
            'essay-tool',
            'code-tool',
            'variable-tool',
            'math-tool',
            'image-tool',
            'graph-tool',
            'reset-tool'
        ];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'no-save') {
            this.noSave = newValue === 'false' ? false : true;
            return;
        }

        if (name === 'user-token') {
            this.userToken = newValue;
            return;
        }

        if (name === 'multiple-choice-tool') {
            this.multipleChoiceTool = newValue === 'false' ? false : true;
            return;
        }

        if (name === 'multiple-select-tool') {
            this.multipleSelectTool = newValue === 'false' ? false : true;
            return;
        }

        if (name === 'fill-in-the-blank-tool') {
            this.fillInTheBlankTool = newValue === 'false' ? false : true;
            return;
        }

        if (name === 'essay-tool') {
            this.essayTool = newValue === 'false' ? false : true;
            return;
        }

        if (name === 'code-tool') {
            this.codeTool = newValue === 'false' ? false : true;
            return;
        }

        if (name === 'variable-tool') {
            this.variableTool = newValue === 'false' ? false : true;
            return;
        }

        if (name === 'math-tool') {
            this.mathTool = newValue === 'false' ? false : true;
            return;
        }

        if (name === 'image-tool') {
            this.imageTool = newValue === 'false' ? false : true;
            return;
        }

        if (name === 'graph-tool') {
            this.graphTool = newValue === 'false' ? false : true;
            return;
        }

        if (name === 'reset-tool') {
            this.resetTool = newValue === 'false' ? false : true;
            return;
        }
    }

    get question(): Question | null {
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

    get questionId(): string | null {
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
                        componentType: PRENDUS_EDIT_QUESTION,
                        loaded: true,
                        question: null,
                        questionId: null,
                        selected: 0,
                        saving: false,
                        noSave: false,
                        textEditorLock: false,
                        codeEditorLock: false,
                    }
                };
            }
        }, this.userToken);
    }

    connectedCallback() {
        setTimeout(() => { //TODO fix this...it would be nice to be able to set the font-size officially through the ace editor web component, and then we wouldn't have to hack. The timeout is to ensure the current task on the event loop completes and the dom template is stamped because of the loaded property before accessing the dom
            this.shadowRoot.querySelector('#codeEditor').shadowRoot.querySelector('#juicy-ace-editor-container').style = 'font-size: calc(40px - 1vw)';
            this.shadowRoot.querySelector('#codeEditor').shadowRoot.querySelector('.ace_gutter').style = 'background: #2a9af2';
        }, 2000);
    }

    async questionInfoChanged() {
        if (!this.question && !this.questionId) {
            return;
        }

        await loadQuestion(this.componentId, PRENDUS_EDIT_QUESTION, this.question, this.questionId, this.userToken);

        //TODO this causes issues with the secureEval messaging, probably won't be hard to fix
        //this is so that if the question is being viewed from within an iframe, the iframe can resize itself
        // window.parent.postMessage({
        //     type: 'prendus-edit-question-resize',
        //     height: document.body.scrollHeight,
        //     width: document.body.scrollWidth
        // }, '*');

        this.dispatchEvent(new CustomEvent('question-loaded'));
    }

    async textEditorChanged() {
        if (this.textEditorLock) {
            return;
        }

        if (!this.shadowRoot.querySelector('#textEditor')) {
            return;
        }

        debounce(async () => {
            const text = this.shadowRoot.querySelector('#textEditor').value;

            await execute(`
                mutation prepareToSaveText($componentId: String!, $props: Any) {
                    updateComponentState(componentId: $componentId, props: $props)
                }

                # Put in the mutation to actually save the question remotely if necessary
                # This is where the await this.save() would be

                mutation textSaved($componentId: String!, $props: Any) {
                    updateComponentState(componentId: $componentId, props: $props)
                }
            `, {
                prepareToSaveText: async (previousResult: any) => {

                    //TODO this all handles tag deletion and insertion. We might want to abstract this somehow
                    const originalUserRadioASTObjects = getUserASTObjectsFromAnswerAssignment(this._question ? this._question.text : '', this._question ? this._question.code : '', 'RADIO');
                    const currentUserRadioASTObjects = getUserASTObjectsFromAnswerAssignment(text, this._question ? this._question.code : '', 'RADIO');
                    const deletedUserRadioASTObjects = originalUserRadioASTObjects.filter((originalUserRadioASTObject) => {
                        return currentUserRadioASTObjects.filter((currentUserRadioASTObject) => {
                            return originalUserRadioASTObject.varName === currentUserRadioASTObject.varName;
                        }).length === 0;
                    });
                    const insertedUserRadioASTObjects = currentUserRadioASTObjects.filter((currentUserRadioASTObject) => {
                        return originalUserRadioASTObjects.filter((originalUserRadioASTObject) => {
                            return currentUserRadioASTObject.varName === originalUserRadioASTObject.varName;
                        }).length === 0;
                    });
                    const radiosDeletedCode = deletedUserRadioASTObjects.reduce((result, deletedUserRadioASTObject) => {
                        return nullifyUserASTObjectInAnswerAssignment(result, deletedUserRadioASTObject);
                    }, this._question ? this._question.code : '');
                    const radiosInsertedCode = insertedUserRadioASTObjects.reduce((result, insertedUserRadioAstObject) => {
                        return insertRadioOrCheckIntoCode(result, insertedUserRadioAstObject.varName, false);
                    }, radiosDeletedCode);

                    const originalUserCheckASTObjects = getUserASTObjectsFromAnswerAssignment(this._question ? this._question.text : '', this._question ? this._question.code : '', 'CHECK');
                    const currentUserCheckASTObjects = getUserASTObjectsFromAnswerAssignment(text, this._question ? this._question.code : '', 'CHECK');
                    const deletedUserCheckASTObjects = originalUserCheckASTObjects.filter((originalUserCheckASTObject) => {
                        return currentUserCheckASTObjects.filter((currentUserCheckASTObject) => {
                            return originalUserCheckASTObject.varName === currentUserCheckASTObject.varName;
                        }).length === 0;
                    });
                    const insertedUserCheckASTObjects = currentUserCheckASTObjects.filter((currentUserCheckASTObject) => {
                        return originalUserCheckASTObjects.filter((originalUserCheckASTObject) => {
                            return currentUserCheckASTObject.varName === originalUserCheckASTObject.varName;
                        }).length === 0;
                    });
                    const checksDeletedCode = deletedUserCheckASTObjects.reduce((result, deletedUserCheckASTObject) => {
                        return nullifyUserASTObjectInAnswerAssignment(result, deletedUserCheckASTObject);
                    }, radiosInsertedCode);
                    const checksInsertedCode = insertedUserCheckASTObjects.reduce((result, insertedUserCheckAstObject) => {
                        return insertRadioOrCheckIntoCode(result, insertedUserCheckAstObject.varName, false);
                    }, checksDeletedCode);

                    const originalUserInputASTObjects = getUserASTObjectsFromAnswerAssignment(this._question ? this._question.text : '', this._question ? this._question.code : '', 'INPUT');
                    const currentUserInputASTObjects = getUserASTObjectsFromAnswerAssignment(text, this._question ? this._question.code : '', 'INPUT');
                    const deletedUserInputASTObjects = originalUserInputASTObjects.filter((originalUserInputASTObject) => {
                        return currentUserInputASTObjects.filter((currentUserInputASTObject) => {
                            return originalUserInputASTObject.varName === currentUserInputASTObject.varName;
                        }).length === 0;
                    });
                    const insertedUserInputASTObjects = currentUserInputASTObjects.filter((currentUserInputASTObject) => {
                        return originalUserInputASTObjects.filter((originalUserInputASTObject) => {
                            return currentUserInputASTObject.varName === originalUserInputASTObject.varName;
                        }).length === 0;
                    });
                    const inputsDeletedCode = deletedUserInputASTObjects.reduce((result, deletedUserInputASTObject) => {
                        return nullifyUserASTObjectInAnswerAssignment(result, deletedUserInputASTObject);
                    }, checksInsertedCode);
                    const inputsInsertedCode = insertedUserInputASTObjects.reduce((result, insertedUserInputAstObject) => {
                        return insertInputIntoCode(result, insertedUserInputAstObject.varName, '');
                    }, inputsDeletedCode);

                    const originalUserImageASTObjects = getAstObjects(parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []), 'IMAGE');
                    const currentUserImageASTObjects = getAstObjects(parse(text, () => 5, () => '', () => [], () => []), 'IMAGE');
                    const userImageASTObjectsToRemove = originalUserImageASTObjects.filter((originalUserImageASTObject) => {
                        return currentUserImageASTObjects.filter((currentUserImageASTObject) => {
                            return originalUserImageASTObject.varName === currentUserImageASTObject.varName;
                        }).length === 0;
                    });
                    const jsAst = esprima.parse(inputsDeletedCode);
                    const amlAst = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
                    const imagesDeletedCode = await asyncReduce(userImageASTObjectsToRemove, async (result, userImageASTObjectToRemove) => {
                        const imageSrc = await getPropertyValue(jsAst, amlAst, userImageASTObjectToRemove.varName, 'src', '');
                        return removeImageFromCode(result, userImageASTObjectToRemove.varName, imageSrc);
                    }, inputsInsertedCode);
                    //TODO this all handles tag deletion and insertion. We might want to abstract this somehow

                    const newQuestion = {
                        ...this._question,
                        text,
                        code: imagesDeletedCode
                    };

                    return {
                        componentId: this.componentId,
                        props: {
                            saving: true,
                            question: newQuestion,
                            userRadiosFromCode: getUserASTObjectsFromAnswerAssignment(newQuestion.text, newQuestion.code, 'RADIO'),
                            userChecksFromCode: getUserASTObjectsFromAnswerAssignment(newQuestion.text, newQuestion.code, 'CHECK'),
                            userInputsFromCode: getUserASTObjectsFromAnswerAssignment(newQuestion.text, newQuestion.code, 'INPUT')
                        }
                    };
                },
                textSaved: (previousResult) => {
                    return {
                        componentId: this.componentId,
                        props: {
                            saving: false
                        }
                    };
                }
            }, this.userToken);
        }, 200);
    }

    async codeEditorChanged() {
        if (this.codeEditorLock) {
            return;
        }

        debounce(async () => {
            const code = this.shadowRoot.querySelector('#codeEditor').value;

            await execute(`
                mutation prepareToSaveCode($componentId: String!, $props: Any) {
                    updateComponentState(componentId: $componentId, props: $props)
                }

                # Put in the mutation to actually save the question remotely if necessary
                # This is where the await this.save() would be

                mutation codeSaved($componentId: String!, $props: Any) {
                    updateComponentState(componentId: $componentId, props: $props)
                }
            `, {
                prepareToSaveCode: (previousResult) => {
                    const newQuestion = {
                        ...this._question,
                        text: this._question ? this._question.text : '',
                        code
                    };
                    return {
                        componentId: this.componentId,
                        props: {
                            saving: true,
                            question: newQuestion,
                            userRadiosFromCode: getUserASTObjectsFromAnswerAssignment(newQuestion.text, newQuestion.code, 'RADIO'),
                            userChecksFromCode: getUserASTObjectsFromAnswerAssignment(newQuestion.text, newQuestion.code, 'CHECK'),
                            userInputsFromCode: getUserASTObjectsFromAnswerAssignment(newQuestion.text, newQuestion.code, 'INPUT')
                        }
                    };
                },
                codeSaved: (previousResult) => {
                    return {
                        componentId: this.componentId,
                        props: {
                            saving: false
                        }
                    };
                }
            }, this.userToken);
        }, 200);
    }

    // async save() {
    //     if (this.noSave) {
    //         return;
    //     }
    //
    //     if (!this._questionId) {
    //         const data = await GQLRequest(`
    //             mutation createQuestion(
    //                 $authorId: ID!
    //                 $text: String!
    //                 $code: String!
    //             ) {
    //                 createQuestion(
    //                     authorId: $authorId
    //                     text: $text
    //                     code: $code
    //                 ) {
    //                     id
    //                 }
    //             }
    //         `, {
    //             authorId: this.user.id,
    //             text: this._question.text,
    //             code: this._question.code
    //         }, this.userToken, (error: any) => {
    //             console.log(error);
    //         });
    //
    //         navigate(`/question/${data.createQuestion.id}/edit`);
    //     }
    //     else {
    //         await GQLRequest(`
    //             mutation updateQuestion(
    //                 $questionId: ID!
    //                 $text: String!
    //                 $code: String!
    //             ) {
    //                 updateQuestion(
    //                     id: $questionId
    //                     text: $text
    //                     code: $code
    //                 ) {
    //                     id
    //                 }
    //             }
    //         `, {
    //             questionId: this._questionId,
    //             text: this._question.text,
    //             code: this._question.code
    //         }, this.userToken, (error: any) => {
    //             console.log(error);
    //         });
    //     }
    // }

    async switchEditorClick() {
        await execute(`
            mutation setSelected($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            setSelected: (previousResult) => {
                return {
                    componentId: this.componentId,
                    props: {
                        selected: this.selected === 0 ? 1 : 0
                    }
                };
            }
        }, this.userToken);
    }

    async insertVariable(e: CustomEvent) {
        await execute(`
            mutation prepareToInsertVariable($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }

            mutation insertVariable($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            prepareToInsertVariable: (previousResult: any) => {
                return {
                    componentId: this.componentId,
                    props: {
                        textEditorLock: true,
                        codeEditorLock: true
                    }
                };
            },
            insertVariable: async (previousResult: any) => {
                const { varName, maxValue, minValue, precisionValue } = e.detail;
                const textEditor = this.shadowRoot.querySelector('#textEditor');
                const codeEditor = this.shadowRoot.querySelector('#codeEditor');

                const currentCode = codeEditor.value;

                const varString = `[${varName}]`;
                const newTextNode = document.createTextNode(varString);
                textEditor.range0.insertNode(newTextNode);
                textEditor.range0.setStart(newTextNode, varString.length);
                textEditor.range0.collapse(true);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(textEditor.range0);

                const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;
                const code = await insertVariableIntoCode(currentCode, varName, minValue, maxValue, precisionValue);

                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            text,
                            code
                        },
                        textEditorLock: false,
                        codeEditorLock: false
                    }
                };
            }
        }, this.userToken);
    }

    async insertInput(e: CustomEvent) {
        await execute(`
            mutation prepareToInsertInput($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }

            mutation insertInput($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            prepareToInsertInput: (previousResult: any) => {
                return {
                    componentId: this.componentId,
                    props: {
                        textEditorLock: true,
                        codeEditorLock: true
                    }
                };
            },
            insertInput: async (previousResult: any) => {
                const ast: AST = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
                const astInputs: Input[] = <Input[]> getAstObjects(ast, 'INPUT');

                const varName = `input${determineFreeVariableNumber(astInputs)}`;

                const answer = e.detail.answer || '';
                const textEditor = this.shadowRoot.querySelector('#textEditor');

                textEditor.range0.selectNodeContents(textEditor.range0.endContainer);
                textEditor.range0.collapse();

                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(textEditor.range0);
                selection.collapseToEnd();

                const inputString = `[${varName}]`;
                document.execCommand('insertText', false, inputString);

                await wait(); //this wait is necessary to get the correct value from the textEditor (https://github.com/miztroh/wysiwyg-e/issues/202)
                const text = textEditor.value;

                const codeEditor = this.shadowRoot.querySelector('#codeEditor');
                const code = codeEditor.value;

                const newQuestion = {
                    ...this._question,
                    text,
                    code: insertInputIntoCode(code, varName, answer)
                };

                return {
                    componentId: this.componentId,
                    props: {
                        question: newQuestion,
                        textEditorLock:  false,
                        codeEditorLock: false,
                        userInputsFromCode: getUserASTObjectsFromAnswerAssignment(newQuestion.text, newQuestion.code, 'INPUT')
                    }
                };
            }
        }, this.userToken);
    }

    async insertEssay(e: CustomEvent) {
        await execute(`
            mutation prepareToInsertEssay($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }

            mutation insertEssay($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            prepareToInsertEssay: (previousResult: any) => {
                return {
                    componentId: this.componentId,
                    props: {
                        textEditorLock: true,
                        codeEditorLock: true
                    }
                };
            },
            insertEssay: (previousResult: any) => {
                const ast: AST = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
                const astEssays: Essay[] = <Essay[]> getAstObjects(ast, 'ESSAY');

                const varName = `essay${determineFreeVariableNumber(astEssays)}`;

                const textEditor = this.shadowRoot.querySelector('#textEditor');
                const codeEditor = this.shadowRoot.querySelector('#codeEditor');

                const code = codeEditor.value;

                const essayString = `[${varName}]`;
                const newTextNode = document.createTextNode(essayString);
                textEditor.range0.insertNode(newTextNode);
                textEditor.range0.setStart(newTextNode, essayString.length);
                textEditor.range0.collapse(true);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(textEditor.range0);

                const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;

                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            text,
                            code: insertEssayIntoCode(code)
                        },
                        textEditorLock: false,
                        codeEditorLock: false
                    }
                };
            }
        }, this.userToken);
    }

    async insertCode(e: CustomEvent) {
        await execute(`
            mutation prepareToInsertCode($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }

            mutation insertCode($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            prepareToInsertCode: (previousResult: any) => {
                return {
                    componentId: this.componentId,
                    props: {
                        textEditorLock: true,
                        codeEditorLock: true
                    }
                };
            },
            insertCode: (previousResult: any) => {
                const ast: AST = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
                const astCodes: Code[] = <Code[]> getAstObjects(ast, 'CODE');

                const varName = `code${determineFreeVariableNumber(astCodes)}`;

                const textEditor = this.shadowRoot.querySelector('#textEditor');
                const codeEditor = this.shadowRoot.querySelector('#codeEditor');

                const code = codeEditor.value;

                const codeString = `[${varName}]`;
                const newTextNode = document.createTextNode(codeString);
                textEditor.range0.insertNode(newTextNode);
                textEditor.range0.setStart(newTextNode, codeString.length);
                textEditor.range0.collapse(true);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(textEditor.range0);

                const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;

                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            text,
                            code: insertCodeIntoCode(code)
                        },
                        textEditorLock: false,
                        codeEditorLock: false
                    }
                };
            }
        }, this.userToken);
    }

    async insertRadio(e: CustomEvent) {
        await execute(`
            mutation prepareToInsertRadio($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }

            mutation insertRadio($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            prepareToInsertRadio: (previousResult: any) => {
                return {
                    componentId: this.componentId,
                    props: {
                        textEditorLock: true,
                        codeEditorLock: true
                    }
                };
            },
            insertRadio: async (previousResult: any) => {
                const ast: AST = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
                const astRadios: Radio[] = <Radio[]> getAstObjects(ast, 'RADIO');

                const varName = `radio${determineFreeVariableNumber(astRadios)}`;

                const { content, correct } = e.detail;
                const textEditor = this.shadowRoot.querySelector('#textEditor');

                textEditor.range0.selectNodeContents(textEditor.range0.endContainer);
                textEditor.range0.collapse();

                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(textEditor.range0);
                selection.collapseToEnd();

                const radioString = `[${varName}]${content || ''}[${varName}]`;
                document.execCommand('insertHTML', false, '<p><br></p>');
                document.execCommand('insertText', false, radioString);

                await wait(); //this wait is necessary to get the correct value from the textEditor (https://github.com/miztroh/wysiwyg-e/issues/202)
                const text = textEditor.value;

                const codeEditor = this.shadowRoot.querySelector('#codeEditor');
                const code = codeEditor.value;

                const newQuestion = {
                    ...this._question,
                    text,
                    code: insertRadioOrCheckIntoCode(code, varName, correct)
                };

                return {
                    componentId: this.componentId,
                    props: {
                        question: newQuestion,
                        userRadiosFromCode: getUserASTObjectsFromAnswerAssignment(newQuestion.text, newQuestion.code, 'RADIO'),
                        textEditorLock: false,
                        codeEditorLock: false
                    }
                };
            }
        }, this.userToken);
    }

    async insertCheck(e: CustomEvent) {
        await execute(`
            mutation prepareToInsertCheck($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }

            mutation insertCheck($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            prepareToInsertCheck: (previousResult: any) => {
                return {
                    componentId: this.componentId,
                    props: {
                        textEditorLock: true,
                        codeEditorLock: true
                    }
                };
            },
            insertCheck: async (previousResult: any) => {
                const ast: AST = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
                const astChecks: Check[] = <Check[]> getAstObjects(ast, 'CHECK');

                const varName = `check${determineFreeVariableNumber(astChecks)}`;

                const { content, correct } = e.detail;
                const textEditor = this.shadowRoot.querySelector('#textEditor');

                textEditor.range0.selectNodeContents(textEditor.range0.endContainer);
                textEditor.range0.collapse();

                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(textEditor.range0);
                selection.collapseToEnd();

                const radioString = `[${varName}]${content || ''}[${varName}]`;
                document.execCommand('insertHTML', false, '<p><br></p>');
                document.execCommand('insertText', false, radioString);

                await wait(); //this wait is necessary to get the correct value from the textEditor (https://github.com/miztroh/wysiwyg-e/issues/202)
                const text = textEditor.value;

                const codeEditor = this.shadowRoot.querySelector('#codeEditor');
                const code = codeEditor.value;

                const newQuestion = {
                    ...this._question,
                    text,
                    code: insertRadioOrCheckIntoCode(code, varName, correct)
                };

                return {
                    componentId: this.componentId,
                    props: {
                        question: newQuestion,
                        userChecksFromCode: getUserASTObjectsFromAnswerAssignment(newQuestion.text, newQuestion.code, 'CHECK'),
                        textEditorLock: false,
                        codeEditorLock: false
                    }
                };
            }
        }, this.userToken);
    }

    async insertMath(e: CustomEvent) {
        await execute(`
            mutation prepareToInsertMath($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }

            mutation insertMath($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            prepareToInsertMath: (previousResult: any) => {
                return {
                    componentId: this.componentId,
                    props: {
                        textEditorLock: true,
                        codeEditorLock: true
                    }
                };
            },
            insertMath: (previousResult: any) => {
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

                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            text,
                            code: this._question ? this._question.code : ''
                        },
                        textEditorLock: false,
                        codeEditorLock: false
                    }
                }
            }
        }, this.userToken);
    }

    async insertImage(e: CustomEvent) {
        await execute(`
            mutation prepareToInsertImage($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }

            mutation insertImage($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            prepareToInsertImage: (previousResult: any) => {
                return {
                    componentId: this.componentId,
                    textEditorLock: true,
                    codeEditorLock: true
                };
            },
            insertImage: (previousResult: any) => {
                const ast: AST = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
                const { dataUrl } = e.detail;
                const textEditor = this.shadowRoot.querySelector('#textEditor');
                const codeEditor = this.shadowRoot.querySelector('#codeEditor');
                const astImages: Image[] = <Image[]> getAstObjects(ast, 'IMAGE');
                const varName = `img${determineFreeVariableNumber(astImages)}`;
                const code = codeEditor.value;

                const imageString = `[${varName}]`;
                const newTextNode = document.createTextNode(imageString);
                textEditor.range0.insertNode(newTextNode);
                textEditor.range0.setStart(newTextNode, imageString.length);
                textEditor.range0.collapse(true);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(textEditor.range0);

                const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;

                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            text,
                            code: insertImageIntoCode(code, varName, dataUrl)
                        },
                        textEditorLock: false,
                        codeEditorLock: false
                    }
                };
            }
        }, this.userToken);
    }

    async insertGraph(e: CustomEvent) {
        await execute(`
            mutation prepareToInsertGraph($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }

            mutation insertGraph($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            prepareToInsertGraph: (previousResult: any) => {
                return {
                    componentId: this.componentId,
                    props: {
                        textEditorLock: true,
                        codeEditorLock: true
                    }
                };
            },
            insertGraph: (previousResult: any) => {
                const ast: AST = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
                const textEditor = this.shadowRoot.querySelector('#textEditor');
                const astGraphs: Graph[] = <Graph[]> getAstObjects(ast, 'GRAPH');

                const graphString = `[graph${determineFreeVariableNumber(astGraphs)}]`;
                const newTextNode = document.createTextNode(graphString);
                textEditor.range0.insertNode(newTextNode);
                textEditor.range0.setStart(newTextNode, graphString.length);
                textEditor.range0.collapse(true);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(textEditor.range0);

                const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;

                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            text
                        },
                        textEditorLock: false,
                        codeEditorLock: false
                    }
                };
            }
        }, this.userToken);
    }

    async radioCorrectChanged(e: CustomEvent) {
        await execute(`
            mutation changeRadioCorrect($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            changeRadioCorrect: (previousResult: any) => {
                const userRadio: UserRadio = e.detail.userRadio;
                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            code: setUserASTObjectValue(this._question.code, userRadio)
                        }
                    }
                };
            }
        }, this.usertoken);
    }

    async radioContentChanged(e: CustomEvent) {
        await execute(`
            mutation changeRadioContent($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            changeRadioContent: (previousResult: any) => {
                const radioContentToChange = e.detail.radioContentToChange;
                const assessMLAST = parse(this._question.text, () => 5, () => '', () => [], () => []);
                const newAssessMLAST = {
                    ...assessMLAST,
                    ast: assessMLAST.ast.map((astObject: ASTObject) => {
                        if (astObject.varName === radioContentToChange.varName) {
                            return {
                                ...astObject,
                                content: radioContentToChange.content.ast
                            };
                        }

                        return astObject;
                    })
                };

                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            text: compileToAssessML(newAssessMLAST, () => 5, () => '', () => [], () => [])
                        }
                    }
                };
            }
        }, this.usertoken);
    }

    async checkCorrectChanged(e: CustomEvent) {
        await execute(`
            mutation changeCheckCorrect($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            changeCheckCorrect: (previousResult: any) => {
                const userCheck: UserCheck = e.detail.userCheck;
                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            code: setUserASTObjectValue(this._question.code, userCheck)
                        }
                    }
                };
            }
        }, this.usertoken);
    }

    //TODO I might be able to combine all of the check and radio content and correct changed methods
    async checkContentChanged(e: CustomEvent) {
        await execute(`
            mutation changeCheckContent($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            changeCheckContent: (previousResult: any) => {
                const checkContentToChange = e.detail.checkContentToChange;
                const assessMLAST = parse(this._question.text, () => 5, () => '', () => [], () => []);
                const newAssessMLAST = {
                    ...assessMLAST,
                    ast: assessMLAST.ast.map((astObject: ASTObject) => {
                        if (astObject.varName === checkContentToChange.varName) {
                            return {
                                ...astObject,
                                content: checkContentToChange.content.ast
                            };
                        }

                        return astObject;
                    })
                };

                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            text: compileToAssessML(newAssessMLAST, () => 5, () => '', () => [], () => [])
                        }
                    }
                };
            }
        }, this.usertoken);
    }

    async insertQuestionStem(e: CustomEvent) {
        await execute(`
            mutation insertQuestionStem($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            insertQuestionStem: (previousResult: any) => {
                const questionStem = e.detail.questionStem;

                const newContent = {
                    type: 'CONTENT',
                    varName: 'content',
                    content: `${questionStem}<p><br></p>`
                };
                const assessMLAst = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
                const newAssessMLAST = assessMLAst.ast[0] && assessMLAst.ast[0].type === 'CONTENT' ? {
                    ...assessMLAst,
                    ast: [newContent, ...assessMLAst.ast.slice(1)]
                } : {
                    ...assessMLAst,
                    ast: [newContent, ...assessMLAst.ast]
                };

                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            text: compileToAssessML(newAssessMLAST, () => 5, () => '', () => [], () => []),
                            code: this._question ? this._question.code : ''
                        }
                    }
                };
            }
        }, this.userToken);
    }

    async inputAnswerChanged(e: CustomEvent) {
        await execute(`
            mutation changeInputAnswer($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            changeInputAnswer: (previousResult: any) => {
                const userInput: UserInput = e.detail.userInput;
                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            code: setUserASTObjectValue(this._question.code, userInput)
                        }
                    }
                };
            }
        }, this.usertoken);
    }

    async resetTextAndCode() {
        await execute(`
            mutation resetTextAndCode($componentId: String!, $props: Any) {
                updateComponentState(componentId: $componentId, props: $props)
            }
        `, {
            resetTextAndCode: (previousResult: any) => {
                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            text: '',
                            code: ''
                        }
                    }
                };
            }
        }, this.usertoken);
    }

    render(state) {
        const componentState = state.components[this.componentId];
        if (componentState) {

            //TODO is the render function the appropriate place to put these events? I think a Redux middleware would probably be best
            if (this._question && componentState.question && this._question.text !== componentState.question.text) {
                this.dispatchEvent(new CustomEvent('text-changed', {
                    detail: {
                        text: componentState.question.text
                    }
                }));
            }

            //TODO is the render function the appropriate place to put these events? I think a Redux middleware would probably be best
            if (this._question && componentState.question && this._question.code !== componentState.question.code) {
                this.dispatchEvent(new CustomEvent('code-changed', {
                    detail: {
                        code: componentState.question.code
                    }
                }));
            }

            this._question = componentState.question;
            this.loaded = componentState.loaded;
            this.selected = componentState.selected;
            this.noSave = componentState.noSave;
            this.saving = componentState.saving;
            this.user = componentState.user;
            this.userToken = componentState.userToken;
            this.textEditorLock = componentState.textEditorLock;
            this.codeEditorLock = componentState.codeEditorLock;
            this.userRadiosFromCode = componentState.userRadiosFromCode;
            this.userChecksFromCode = componentState.userChecksFromCode;
            this.userInputsFromCode = componentState.userInputsFromCode;
        }

        render(html`
            <style>
                .previewContainer {
                    box-shadow: 0px 0px 3px grey;
                    padding: 25px;
                    margin-top: 25px;
                }

                .editorContainer {
                    position: relative;
                }

                .editor {
                    width: 100%;
                    height: 50vh;
                    box-shadow: 0px 0px 3px grey;
                    margin: 0 auto;
                }

                .switchEditorToJavaScriptIcon {
                    position: absolute;
                    right: -5px;
                    top: 40px;
                    cursor: pointer;
                    z-index: 1;
                }

                .switchEditorToAssessMLIcon {
                    position: absolute;
                    right: -5px;
                    top: 0px;
                    cursor: pointer;
                    z-index: 1;
                    background-color: grey;
                    color: white;
                }

                #textEditor {
                    --wysiwyg-font: Ubuntu;
                    font-size: calc(40px - 1vw);
                }

                .savingText {
                    color: grey;
                    position: absolute;
                    right: 20px;
                    bottom: 15px;
                }
            </style>

            <iron-pages selected="${this.selected}">
                <div class="editorContainer">
                    <paper-button id="switchEditorToJavaScriptIcon" class="switchEditorToJavaScriptIcon" onclick="${() => this.switchEditorClick()}">
                        <iron-icon icon="icons:tab"></iron-icon>
                    </paper-button>

                    <paper-tooltip for="switchEditorToJavaScriptIcon" offset="5">
                        <span>JavaScript</span>
                    </paper-tooltip>

                    <wysiwyg-e id="textEditor" value="${this._question ? this._question.text : ''}" class="editor" on-value-changed="${() => this.textEditorChanged()}">
                        ${this.multipleChoiceTool ? html`<prendus-multiple-choice-tool id="prendus-multiple-choice-tool" on-insert-radio="${(e: CustomEvent) => this.insertRadio(e)}" userRadios="${this.userRadiosFromCode}" on-radio-correct-changed="${(e: CustomEvent) => this.radioCorrectChanged(e)}" on-radio-content-changed="${(e: CustomEvent) => this.radioContentChanged(e)}" on-question-stem-changed="${(e: CustomEvent) => this.insertQuestionStem(e)}" question="${this._question}"></prendus-multiple-choice-tool>` : ''}
                        ${this.multipleSelectTool ? html`<prendus-code-tool id="prendus-code-tool" on-insert-code="${(e: CustomEvent) => this.insertCode(e)}"></prendus-code-tool>` : ''}
                        ${this.fillInTheBlankTool ? html`<prendus-code-tool id="prendus-code-tool" on-insert-code="${(e: CustomEvent) => this.insertCode(e)}"></prendus-code-tool>` : ''}
                        ${this.essayTool ? html`<prendus-essay-tool id="prendus-essay-tool" on-insert-essay="${(e: CustomEvent) => this.insertEssay(e)}"></prendus-essay-tool>` : ''}
                        ${this.codeTool ? html`<prendus-code-tool id="prendus-code-tool" on-insert-code="${(e: CustomEvent) => this.insertCode(e)}"></prendus-code-tool>` : ''}
                        ${this.variableTool ? html`<prendus-variable-tool id="prendus-variable-tool" on-insert-variable="${(e: CustomEvent) => this.insertVariable(e)}"></prendus-variable-tool>` : ''}
                        ${this.mathTool ? html`<prendus-code-tool id="prendus-code-tool" on-insert-code="${(e: CustomEvent) => this.insertCode(e)}"></prendus-code-tool>` : ''}
                        ${this.imageTool ? html`<prendus-image-tool id="prendus-image-tool" on-insert-image="${(e: CustomEvent) => this.insertImage(e)}"></prendus-image-tool>` : ''}
                        ${this.graphTool ? html`<prendus-graph-tool id="prendus-graph-tool" on-insert-graph="${(e: CustomEvent) => this.insertGraph(e)}"></prendus-graph-tool>` : ''}
                        ${this.resetTool ? html`<prendus-reset-tool id="prendus-reset-tool" on-reset-text-and-code="${() => this.resetTextAndCode()}"></prendus-reset-tool>` : ''}
                    </wysiwyg-e>

                    <div class="savingText">${this.saving ? 'Saving...' : 'Saved'}</div>
                </div>

                <div class="editorContainer">
                    <paper-button id="switchEditorToAssessMLIcon" class="switchEditorToAssessMLIcon" onclick="${() => this.switchEditorClick()}">
                        <iron-icon icon="icons:tab"></iron-icon>
                    </paper-button>

                    <paper-tooltip for="switchEditorToAssessMLIcon" offset="5">
                        <span>AssessML</span>
                    </paper-tooltip>

                    <juicy-ace-editor id="codeEditor" class="editor" value="${this._question ? this._question.code : ''}" onchange="${() => this.codeEditorChanged()}"></juicy-ace-editor>

                    <div class="savingText">${this.saving ? 'Saving...' : 'Saved'}</div>
                </div>
            </iron-pages>

            <div class="previewContainer">
                <prendus-view-question question="${this._question}"></prendus-view-question>
            </div>
        `, this.shadowRoot);
    }
}

window.customElements.define('prendus-edit-question', PrendusEditQuestion);

let currentTimeoutId: any;
function debounce(func: () => any, delay: number) {
    clearTimeout(currentTimeoutId);
    currentTimeoutId = setTimeout(func, delay);
}

function wait(milliseconds: number = 0) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, milliseconds);
    });
}

function determineFreeVariableNumber(astObjects: ASTObject[]) {
    const numbers = new Array(astObjects.length + 1).fill(0).map((x, i) => i + 1);
    return numbers.reduce((result, number) => {
        if (result.numberFound) {
            return result;
        }

        const numberInAstObjectsVarNames = astObjects.filter((astObject: ASTObject) => {
            const varNameContainsNumber = astObject.varName.indexOf(number.toString()) !== -1;
            return varNameContainsNumber;
        }).length !== 0;

        if (numberInAstObjectsVarNames) {
            return {
                ...result,
                numberFound: false,
                number: number + 1
            };
        }
        else {
            return {
                ...result,
                numberFound: true,
                number
            };
        }
    }, {
        numberFound: false,
        number: 1
    }).number;
}
