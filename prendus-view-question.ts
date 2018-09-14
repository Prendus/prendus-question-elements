import DOMPurify from 'dompurify';
import {html, render} from 'lit-html/lib/lit-extended.js';
import {unsafeHTML} from 'lit-html/lib/unsafe-html.js';
import {TemplateResult} from 'lit-html';
import {
    Question,
    BuiltQuestion,
    UserInput,
    UserVariable,
    UserCheck,
    UserRadio,
    UserEssay,
    UserImage,
    UserGraph,
    UserCode,
    State
} from './prendus-question-elements.d';
import {
    buildQuestion,
    checkAnswer,
    getUserASTObjectsFromAnswerAssignment
} from './services/question-service';
import {
    createUUID
} from 'prendus-shared/services/utilities-service.ts';
import {
    getAstObjects,
    compileToHTML
} from 'assessml/assessml.ts';
import {
    AST,
    Variable,
    Input,
    Essay,
    Radio,
    Check,
    Drag,
    Drop,
    Image,
    Code,
    Graph
} from 'assessml';
import {
    loadQuestion
} from './services/shared-service';
import '@polymer/paper-toast';
import 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.8.3/katex.min.js';
import {Store} from './state/store';

class PrendusViewQuestion extends HTMLElement {
    componentId: string; //TODO figure out how to get rid of this mutation

    get question(): Question | null | undefined {
        return Store.getState().components[this.componentId].question;
    }

    set question(question: Question | null | undefined) {
        Store.dispatch({
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: question
        });

        if (question === null || question === undefined) {
            return;
        }

        this.buildQuestion(question);
    }

    constructor() {
        super();

        this.componentId = createUUID();
        Store.subscribe(() => render(this.render(Store.getState(), this.componentId), this));
    }

    connectedCallback() {
        Store.dispatch({
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: null
        });

        Store.dispatch({
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'solutionButtonText',
            value: 'Solution'
        });

        Store.dispatch({
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'showSolution',
            value: true
        });

        Store.dispatch({
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'showEmbedCode',
            value: false
        });

        Store.dispatch({
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'checkAnswerResponse',
            value: ''
        });
    }

    async buildQuestion(question: Question) {
        const builtQuestion = await buildQuestion(question.assessML, question.javaScript);
        const showSolution = builtQuestion ? getAstObjects(builtQuestion.ast, 'SOLUTION').length > 0 : false;
        const userRadiosFromCode = getUserASTObjectsFromAnswerAssignment(question.assessML, question.javaScript, 'RADIO');
        const userChecksFromCode = getUserASTObjectsFromAnswerAssignment(question.assessML, question.javaScript, 'CHECK');
        const userInputsFromCode = getUserASTObjectsFromAnswerAssignment(question.assessML, question.javaScript, 'INPUT');

        Store.dispatch({
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'builtQuestion',
            value: builtQuestion
        });

        this.dispatchEvent(new CustomEvent('question-built'));

        //TODO this causes issues with the secureEval messaging, probably won't be hard to fix (I think it is fixed, just need to try again)
        //this is so that if the question is being viewed from within an iframe, the iframe can resize itself
        // window.parent.postMessage({
        //     type: 'prendus-view-question-resize',
        //     height: document.body.scrollHeight,
        //     width: document.body.scrollWidth
        // }, '*');
    }

    getSanitizedHTML(html: string) {
        const sanitizedHTML = DOMPurify.sanitize(html, {
            ADD_ATTR: ['contenteditable', 'fontsize', 'data'],
            ADD_TAGS: ['juicy-ace-editor', 'function-plot'],
            SANITIZE_DOM: false // This allows DOMPurify.sanitize to be called multiple times in succession without changing the output (it was removing ids before)
        });
        return sanitizedHTML;
    }

    showSolutionClick(componentState) {
        const solutionTemplate = <HTMLTemplateElement> this.querySelector('#solution1');

        if (solutionTemplate) {
            const builtQuestion = {
                ...componentState.builtQuestion,
                html: `${solutionTemplate.innerHTML}<template>${componentState.question.text}</template>`
            };

            const solutionButtonText = 'Question';

            Store.dispatch({
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key: 'builtQuestion',
                value: builtQuestion
            });

            Store.dispatch({
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key: 'solutionButtonText',
                value: solutionButtonText
            });
        }
        else {
            const builtQuestion = {
                ...componentState.builtQuestion,
                html: compileToHTML(componentState.builtQuestion.ast, () => NaN, () => '')
            };

            const solutionButtonText = 'Solution';

            Store.dispatch({
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key: 'builtQuestion',
                value: builtQuestion
            });

            Store.dispatch({
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key: 'solutionButtonText',
                value: solutionButtonText
            });
        }
    }

    async checkAnswer(componentId: string, question: Question, builtQuestion: BuiltQuestion) {
        const astVariables: Variable[] = getAstObjects(builtQuestion.ast, 'VARIABLE', ['SOLUTION']);
        const astInputs: Input[] = getAstObjects(builtQuestion.ast, 'INPUT', ['SOLUTION']);
        const astEssays: Essay[] = getAstObjects(builtQuestion.ast, 'ESSAY', ['SOLUTION']);
        const astCodes: Code[] = getAstObjects(builtQuestion.ast, 'CODE', ['SOLUTION']);
        const astChecks: Check[] = getAstObjects(builtQuestion.ast, 'CHECK', ['SOLUTION']);
        const astRadios: Radio[] = getAstObjects(builtQuestion.ast, 'RADIO', ['SOLUTION']);
        const astDrags: Drag[] = getAstObjects(builtQuestion.ast, 'DRAG', ['SOLUTION']);
        const astDrops: Drop[] = getAstObjects(builtQuestion.ast, 'DROP', ['SOLUTION']);
        const astImages: Image[] = getAstObjects(builtQuestion.ast, 'IMAGE', ['SOLUTION']);
        const astGraphs: Graph[] = getAstObjects(builtQuestion.ast, 'GRAPH', ['SOLUTION']);

        const userVariables: UserVariable[] = astVariables.map((astVariable: Variable) => {
            const userVariable: UserVariable = {
                ...astVariable,
                type: 'USER_VARIABLE'
            };
            return userVariable;
        });
        const userImages: UserImage[] = astImages.map((astImage: Image) => {
            const userImage: UserImage = {
                ...astImage,
                type: 'USER_IMAGE'
            };
            return userImage;
        });
        const userGraphs: UserGraph[] = astGraphs.map((astGraph: Graph) => {
            const userGraph: UserGraph = {
                ...astGraph,
                type: 'USER_GRAPH'
            };
            return userGraph;
        });
        const userInputs: UserInput[] = astInputs.map((astInput: Input) => {
            const input: HTMLInputElement | null = <HTMLInputElement | null> this.querySelector(`#${astInput.varName}`);
            const userInput: UserInput = {
                ...astInput,
                type: 'USER_INPUT',
                value: input ? input.textContent || '' : `${astInput.varName} was not found`
            };
            return userInput;
        });
        const userEssays: UserEssay[] = astEssays.map((astEssay: Essay) => {
            const textarea: HTMLTextAreaElement | null = <HTMLTextAreaElement | null> this.querySelector(`#${astEssay.varName}`);
            const userEssay: UserEssay = {
                ...astEssay,
                type: 'USER_ESSAY',
                value: textarea ? textarea.value : `${astEssay.varName} was not found`
            };
            return userEssay;
        });
        const userCodes: UserCode[] = astCodes.map((astCode: Code) => {
            //TODO the type here should be the type of the code editor custom element, and change the variable name as well
            const textarea: HTMLTextAreaElement | null = <HTMLTextAreaElement | null> this.querySelector(`#${astCode.varName}`);
            const userCode: UserCode = {
                ...astCode,
                type: 'USER_CODE',
                value: textarea ? textarea.value : `${astCode.varName} was not found`
            };
            return userCode;
        });
        const userChecks: UserCheck[] = astChecks.map((astCheck: Check) => {
            const check: HTMLInputElement | null = <HTMLInputElement | null> this.querySelector(`#${astCheck.varName}`);
            const userCheck: UserCheck = {
                ...astCheck,
                type: 'USER_CHECK',
                checked: check ? check.checked : false
            };
            return userCheck;
        });
        const userRadios: UserRadio[] = astRadios.map((astRadio: Radio) => {
            const radio: HTMLInputElement | null = <HTMLInputElement | null> this.querySelector(`#${astRadio.varName}`);
            const userRadio: UserRadio = {
                ...astRadio,
                type: 'USER_RADIO',
                checked: radio ? radio.checked : false
            };
            return userRadio;
        });

        const checkAnswerInfo = await checkAnswer(question.javaScript, builtQuestion.originalVariableValues, userVariables, userInputs, userEssays, userCodes, userChecks, userRadios, userImages, userGraphs);

        // Store.dispatch({
        //     type: 'SET_COMPONENT_PROPERTY',
        //     componentId,
        //     key: 'checkAnswerResponse',
        //     value: checkAnswerInfo.answer === true ? 'Correct' : checkAnswerInfo.error ? `This question has errors:\n\n${checkAnswerInfo.error}` : 'Incorrect'
        // });

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

        const checkAnswerResponseToast: any = this.querySelector('#checkAnswerResponseToast');
        if (checkAnswerResponseToast) {
            const checkAnswerResponse = checkAnswerInfo.answer === true ? 'Correct' : checkAnswerInfo.error ? `This question has errors:\n\n${checkAnswerInfo.error}` : 'Incorrect';
            checkAnswerResponseToast.text = checkAnswerResponse;
            checkAnswerResponseToast.open();
        }
    }

    render(state: State, componentId: string): TemplateResult {
        const componentState = state.components[this.componentId];

        if (componentState === null || componentState === undefined) {
            return html`No question set`;
        }

        const mathRenderedHTML = this.getSanitizedHTML(componentState.builtQuestion ? componentState.builtQuestion.html : '').replace(/\$\$.*\$\$/g, (replacement: string) => {
            return window.katex.renderToString(replacement.replace(/\$/g, ''));
        });

        return html`
            <style>
                .mainContainer {
                    position: relative;
                }

                .questionPreviewPlaceholder {
                    color: rgba(1, 1, 1, .25);
                    text-align: center;
                }

                .bottomButtons {
                    display: flex;
                    flex-direction: row;
                    text-align: center;
                    cursor: pointer;
                    color: grey;
                }

                .checkButton {
                    flex: 1;
                }

                #checkAnswerResponseToast {
                    z-index: 1000;
                }
            </style>

            <div class="mainContainer" hidden="${!componentState.builtQuestion}">
                <div id="contentDiv">
                    ${unsafeHTML(mathRenderedHTML)}
                </div>

                <div class="bottomButtons">
                    <div onclick="${() => this.checkAnswer(componentId, componentState.question, componentState.builtQuestion)}" class="checkButton">Submit</div>
                    ${componentState.showSolution ? html`<div onclick="${() => this.showSolutionClick(componentState)}" class="checkButton">${componentState.solutionButtonText}</div>` : ''}
                </div>

                <paper-toast id="checkAnswerResponseToast" text="${componentState.checkAnswerResponse}" duration="1500" fitInto="${this}" horizontal-align="right"></paper-toast>
            </div>

            <div class="questionPreviewPlaceholder" hidden="${componentState.builtQuestion}">
                Question preview will appear here
            </div>
        `;
    }
}

window.customElements.define('prendus-view-question', PrendusViewQuestion);

// async showEmbedCodeClick() {
//     await execute(`
//         mutation setShowEmbedCode($componentId: String!, $props: Any) {
//             updateComponentState(componentId: $componentId, props: $props)
//         }
//     `, {
//         setShowEmbedCode: (previousResult) => {
//             return {
//                 componentId: this.componentId,
//                 props: {
//                     showEmbedCode: !this.showEmbedCode
//                 }
//             };
//         }
//     }, this.userToken);
//
//     //allow the template with the input to be stamped
//     setTimeout(() => {
//         this.querySelector('#embedInput').select();
//     }, 0);
// }

// async showSolutionClick() {
    // await execute(`
    //     mutation setSolutionTemplateInfo($componentId: String!, $props: Any) {
    //         updateComponentState(componentId: $componentId, props: $props)
    //     }
    // `, {
    //     setSolutionTemplateInfo: (previousResult) => {
    //         const solutionTemplate = <HTMLTemplateElement> this.querySelector('#solution1');
    //         const props = solutionTemplate ? {
    //             builtQuestion: {
    //                 ...this.builtQuestion,
    //                 html: `${solutionTemplate.innerHTML}<template>${this._question.text}</template>`
    //             },
    //             solutionButtonText: 'Question'
    //         } : {
    //             builtQuestion: {
    //                 ...this.builtQuestion,
    //                 html: compileToHTML(this.builtQuestion.ast, () => NaN, () => '')
    //             },
    //             solutionButtonText: 'Solution'
    //         };
    //
    //         return {
    //             componentId: this.componentId,
    //             props
    //         };
    //     }
    // }, this.userToken);
// }
