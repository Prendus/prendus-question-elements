import {
    createUUID,
    navigate
} from '../prendus-shared/services/utilities-service';
import {Question} from './prendus-question-elements.d';
import {GQLRequest} from '../prendus-shared/services/graphql-service';
import {User} from './prendus-question-elements.d';
import {
    UserCheck,
    UserRadio
} from './prendus-question-elements.d';
import {
    parse,
    getAstObjects,
    compileToAssessML
} from '../assessml/assessml';
import {
    AST,
    Input,
    Image,
    Radio,
    Check,
    Essay,
    Code,
    ASTObject
} from '../assessml/assessml.d';
import {
    insertEssayIntoCode,
    insertCodeIntoCode,
    insertInputIntoCode,
    insertRadioOrCheckIntoCode,
    insertVariableIntoCode,
    insertImageIntoCode,
    getUserASTObjects,
    setUserASTObjectValue
} from './services/question-service';
import {
    execute,
    subscribe,
    extendSchema,
    addIsTypeOf
} from '../graphsm/graphsm';
import {
    loadQuestion
} from './services/shared-service';

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
    }
`);
addIsTypeOf('ComponentState', PRENDUS_EDIT_QUESTION, (value: any) => {
    return value.componentType === PRENDUS_EDIT_QUESTION;
});

class PrendusEditQuestion extends Polymer.Element {
    componentId: string;
    _question: Question;
    _questionId: string;
    question: Question;
    questionId: string;
    userToken: string;
    user: User;
    loaded: boolean;
    selected: number;
    saving: boolean;
    noSave: boolean;
    userRadiosFromCode: UserRadio[];
    userChecksFromCode: UserCheck[];

    static get is() { return 'prendus-edit-question'; }
    static get properties() {
        return {
            question: {
                type: Object,
                observer: 'questionInfoChanged'
            },
            questionId: {
                type: String,
                observer: 'questionInfoChanged'
            },
            noSave: {
                type: Boolean
            },
            user: {
                type: Object
            },
            userToken: {
                type: String
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
                        componentType: PRENDUS_EDIT_QUESTION,
                        loaded: true,
                        question: {
                            text: '',
                            code: ''
                        },
                        questionId: '',
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
        super.connectedCallback();

        setTimeout(() => { //TODO fix this...it would be nice to be able to set the font-size officially through the ace editor web component, and then we wouldn't have to hack. The timeout is to ensure the current task on the event loop completes and the dom template is stamped because of the loaded property before accessing the dom
            this.shadowRoot.querySelector('#codeEditor').shadowRoot.querySelector('#juicy-ace-editor-container').style = 'font-size: calc(40px - 1vw)';
            this.shadowRoot.querySelector('#codeEditor').shadowRoot.querySelector('.ace_gutter').style = 'background: #2a9af2';
        }, 2000);
    }

    async questionInfoChanged(newValue: any, oldValue: any) {
        if (!this.question && !this.questionId) {
            return;
        }

        await loadQuestion(this.componentId, PRENDUS_EDIT_QUESTION, this.question, this.questionId, this.userToken);

        //this is so that if the question is being viewed from within an iframe, the iframe can resize itself
        window.parent.postMessage({
            type: 'prendus-edit-question-resize',
            height: document.body.scrollHeight,
            width: document.body.scrollWidth
        }, '*');

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
                prepareToSaveText: (previousResult) => {
                    const newQuestion = {
                        ...this._question,
                        text,
                        code: this._question ? this._question.code : ''
                    };
                    return {
                        componentId: this.componentId,
                        props: {
                            saving: true,
                            question: newQuestion,
                            userRadiosFromCode: getUserASTObjects(newQuestion.text, newQuestion.code, 'RADIO'),
                            userChecksFromCode: getUserASTObjects(newQuestion.text, newQuestion.code, 'CHECK')
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

            this.dispatchEvent(new CustomEvent('text-changed', {
                detail: {
                    text
                }
            }));
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
                            userRadiosFromCode: getUserASTObjects(newQuestion.text, newQuestion.code, 'RADIO'),
                            userChecksFromCode: getUserASTObjects(newQuestion.text, newQuestion.code, 'CHECK')
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

            this.dispatchEvent(new CustomEvent('code-changed', {
                detail: {
                    code
                }
            }));
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

    getSavingText(saving: boolean) {
        return saving ? 'Saving...' : 'Saved';
    }

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

                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            text,
                            code: await insertVariableIntoCode(code, varName, minValue, maxValue, precisionValue)
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
            insertInput: (previousResult: any) => {
                const ast: AST = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
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

                return {
                    componentId: this.componentId,
                    props: {
                        question: {
                            ...this._question,
                            text,
                            code: insertInputIntoCode(code, varName, answer)
                        },
                        textEditorLock:  false,
                        codeEditorLock: false
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

    // async insertRadio(e: CustomEvent) {
    //     this.action = fireLocalAction(this.componentId, 'textEditorLock', true);
    //     this.action = fireLocalAction(this.componentId, 'codeEditorLock', true);
    //
    //     const ast: AST = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
    //     const astRadios: Radio[] = <Radio[]> getAstObjects(ast, 'RADIO');
    //
    //     const varName = `radio${astRadios.length + 1}`;
    //
    //     const { content, correct } = e.detail;
    //     const textEditor = this.shadowRoot.querySelector('#textEditor');
    //     const codeEditor = this.shadowRoot.querySelector('#codeEditor');
    //
    //     const code = codeEditor.value;
    //
    //     const selection = window.getSelection();
    //     selection.removeAllRanges();
    //     selection.addRange(textEditor.range0);
    //
    //     const radioString = `[radio start]${content || ''}[radio end]`;
    //     document.execCommand('insertText', false, radioString);
    //     document.execCommand('insertHTML', false, '<br>');
    //
    //     textEditor.range0.setStart(textEditor.range0.startContainer, textEditor.range0.startContainer.innerHTML.length - 1);
    //
    //     // textEditor.range0.collapse(true);
    //
    //
    //     // const selection2 = window.getSelection();
    //     // selection2.removeAllRanges();
    //     // selection2.addRange(textEditor.range0);
    //     //
    //     // document.execCommand('insertHTML', false, '<br>');
    //
    //     // textEditor.range0.setStart(textEditor.range0.startContainer, radioString.length);
    //     // textEditor.range0.collapse(true);
    //
    //     await wait(); //this wait is necessary to get the correct value from the textEditor (https://github.com/miztroh/wysiwyg-e/issues/202)
    //     const text = textEditor.value;
    //     // const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;
    //
    //     this.action = fireLocalAction(this.componentId, 'question', {
    //         ...this._question,
    //         text,
    //         code: insertRadioOrCheckIntoCode(code, varName, correct)
    //     });
    //
    //     this.action = fireLocalAction(this.componentId, 'userRadiosFromCode', getUserASTObjects(this._question.text, this._question.code, 'RADIO'));
    //
    //     this.action = fireLocalAction(this.componentId, 'textEditorLock', false);
    //     this.action = fireLocalAction(this.componentId, 'codeEditorLock', false);
    // }

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
            insertCheck: (previousResult: any) => {
                const ast: AST = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
                const astChecks: Check[] = <Check[]> getAstObjects(ast, 'CHECK');

                const varName = `check${astChecks.length + 1}`;

                const { content, correct } = e.detail;
                const textEditor = this.shadowRoot.querySelector('#textEditor');
                const codeEditor = this.shadowRoot.querySelector('#codeEditor');

                const code = codeEditor.value;

                const checkString = `[check start]${content || ''}[check end]`;
                const newTextNode = document.createTextNode(checkString);
                textEditor.range0.insertNode(newTextNode);
                textEditor.range0.setStart(newTextNode, checkString.length);
                textEditor.range0.collapse(true);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(textEditor.range0);

                const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;

                const newQuestion = {
                    ...this._question,
                    text,
                    code: insertRadioOrCheckIntoCode(code, varName, correct)
                };

                return {
                    componentId: this.componentId,
                    props: {
                        question: newQuestion,
                        userChecksFromCode: getUserASTObjects(newQuestion.text, newQuestion.code, 'CHECK'),
                        textEditorLock: false,
                        codeEditorLock: false
                    }
                };
            }
        }, this.userToken);
    }

    // insertMath(e: CustomEvent) {
    //     this.action = fireLocalAction(this.componentId, 'textEditorLock', true);
    //     this.action = fireLocalAction(this.componentId, 'codeEditorLock', true);
    //
    //     const { mathText } = e.detail;
    //     const textEditor = this.shadowRoot.querySelector('#textEditor');
    //     const codeEditor = this.shadowRoot.querySelector('#codeEditor');
    //
    //     const newTextNode = document.createTextNode(mathText);
    //     textEditor.range0.insertNode(newTextNode);
    //     textEditor.range0.setStart(newTextNode, mathText.length);
    //     textEditor.range0.collapse(true);
    //     const selection = window.getSelection();
    //     selection.removeAllRanges();
    //     selection.addRange(textEditor.range0);
    //
    //     const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;
    //
    //     this.action = fireLocalAction(this.componentId, 'question', {
    //         ...this._question,
    //         text,
    //         code: this._question ? this._question.code : ''
    //     });
    //
    //     this.action = fireLocalAction(this.componentId, 'textEditorLock', false);
    //     this.action = fireLocalAction(this.componentId, 'codeEditorLock', false);
    // }

    // insertImage(e: CustomEvent) {
    //     this.action = fireLocalAction(this.componentId, 'textEditorLock', true);
    //     this.action = fireLocalAction(this.componentId, 'codeEditorLock', true);
    //
    //     const ast: AST = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
    //     const { dataUrl } = e.detail;
    //     const textEditor = this.shadowRoot.querySelector('#textEditor');
    //     const codeEditor = this.shadowRoot.querySelector('#codeEditor');
    //     const astImages: Image[] = <Image[]> getAstObjects(ast, 'IMAGE');
    //     const varName = `img${astImages.length + 1}`;
    //     const code = codeEditor.value;
    //
    //     const imageString = `[img${astImages.length + 1}]`;
    //     const newTextNode = document.createTextNode(imageString);
    //     textEditor.range0.insertNode(newTextNode);
    //     textEditor.range0.setStart(newTextNode, imageString.length);
    //     textEditor.range0.collapse(true);
    //     const selection = window.getSelection();
    //     selection.removeAllRanges();
    //     selection.addRange(textEditor.range0);
    //
    //     const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;
    //
    //     this.action = fireLocalAction(this.componentId, 'question', {
    //         ...this._question,
    //         text,
    //         code: insertImageIntoCode(code, varName, dataUrl)
    //     });
    //
    //     this.action = fireLocalAction(this.componentId, 'textEditorLock', false);
    //     this.action = fireLocalAction(this.componentId, 'codeEditorLock', false);
    // }

    // insertGraph(e: CustomEvent) {
    //     this.action = fireLocalAction(this.componentId, 'textEditorLock', true);
    //     this.action = fireLocalAction(this.componentId, 'codeEditorLock', true);
    //
    //     const ast: AST = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
    //     const textEditor = this.shadowRoot.querySelector('#textEditor');
    //     const astGraphs: Graph[] = <Graph[]> getAstObjects(ast, 'GRAPH');
    //
    //     const graphString = `[graph${astGraphs.length + 1}]`;
    //     const newTextNode = document.createTextNode(graphString);
    //     textEditor.range0.insertNode(newTextNode);
    //     textEditor.range0.setStart(newTextNode, graphString.length);
    //     textEditor.range0.collapse(true);
    //     const selection = window.getSelection();
    //     selection.removeAllRanges();
    //     selection.addRange(textEditor.range0);
    //
    //     const text = textEditor.shadowRoot.querySelector('#editable').innerHTML;
    //
    //     this.action = fireLocalAction(this.componentId, 'question', {
    //         ...this._question,
    //         text
    //     });
    //
    //     this.action = fireLocalAction(this.componentId, 'textEditorLock', false);
    //     this.action = fireLocalAction(this.componentId, 'codeEditorLock', false);
    // }

    // radioCorrectChanged(e: CustomEvent) {
    //     const userRadio: UserRadio = e.detail.userRadio;
    //     this.action = fireLocalAction(this.componentId, 'question', {
    //         ...this._question,
    //         code: setUserASTObjectValue(this._question.code, userRadio)
    //     });
    // }

    // radioContentChanged(e: CustomEvent) {
    //     const radioContentToChange = e.detail.radioContentToChange;
    //
    //     const assessMLAST = parse(this._question.text, () => 5, () => '', () => [], () => []);
    //     const newAssessMLAST = {
    //         ...assessMLAST,
    //         ast: assessMLAST.ast.map((astObject: ASTObject) => {
    //             if (astObject.varName === radioContentToChange.varName) {
    //                 return {
    //                     ...astObject,
    //                     content: radioContentToChange.content.ast
    //                 };
    //             }
    //
    //             return astObject;
    //         })
    //     };
    //
    //     this.action = fireLocalAction(this.componentId, 'question', {
    //         ...this._question,
    //         text: compileToAssessML(newAssessMLAST, () => 5, () => '', () => [], () => [])
    //     });
    // }

    // checkCorrectChanged(e: CustomEvent) {
    //     const userCheck: UserCheck = e.detail.userCheck;
    //     this.action = fireLocalAction(this.componentId, 'question', {
    //         ...this._question,
    //         code: setUserASTObjectValue(this._question.code, userCheck)
    //     });
    // }

    // questionStemChanged(e: CustomEvent) {
    //     const questionStem = e.detail.questionStem;
    //
    //     const newContent = {
    //         type: 'CONTENT',
    //         varName: 'content',
    //         content: questionStem
    //     };
    //     const assessMLAST = parse(this._question ? this._question.text : '', () => 5, () => '', () => [], () => []);
    //     const newAssessMLAST = assessMLAST.ast[0] && assessMLAST.ast[0].type === 'CONTENT' ? {
    //         ...assessMLAST,
    //         ast: [newContent, ...assessMLAST.ast.slice(1)]
    //     } : {
    //         ...assessMLAST,
    //         ast: [newContent, ...assessMLAST.ast]
    //     };
    //
    //     this.action = fireLocalAction(this.componentId, 'question', {
    //         ...this._question,
    //         text: compileToAssessML(newAssessMLAST, () => 5, () => '', () => [], () => []),
    //         code: this._question ? this._question.code : ''
    //     });
    // }

    getAllowedTagNames() {
        return [
            'br',
			'p',
			'span'
        ];
    }

    render(state) {
        const componentState = state.components[this.componentId];
        if (componentState) {
            this._question = componentState.question;
            this.loaded = componentState.loaded;
            this.selected = componentState.selected;
            this.noSave = componentState.noSave;
            this.saving = componentState.saving;
            this.user = componentState.user;
            this.userToken = componentState.userToken;
        }
    }
}

window.customElements.define(PrendusEditQuestion.is, PrendusEditQuestion);

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
