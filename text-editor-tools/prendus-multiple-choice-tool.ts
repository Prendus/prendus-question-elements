import {UserRadio, Question} from '../prendus-question-elements.d';
import {compileToAssessML, parse} from 'assessml';
import {ASTObject} from 'assessml/assessml.d';
import {WysiwygTool} from 'wysiwyg-e/wysiwyg-tool.js';
import {html, render} from 'lit-html/lib/lit-extended.js';
import '@polymer/paper-button';
import '@polymer/iron-icon';
import '@polymer/iron-icons';
import '@polymer/paper-tooltip';
import '@polymer/paper-dialog';
import '@polymer/paper-input';
import '@polymer/polymer/lib/elements/dom-repeat.js';

class PrendusMultipleChoiceTool extends WysiwygTool {
    userRadios: UserRadio[];
    shadowRoot: ShadowRoot;
    tooltipPosition: number;
    _question: Question;

    get question(): Question {
        return this._question;
    }

    set question(val: Question) {
        // if (val === this.question) {
        //     return;
        // }

        this._question = val;
        this.render();
    }

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });
        this.render();
    }

    executeTool() {
        this.shadowRoot.querySelector('#radioDialog').open();
    }

    radioDialogClick(e: Event) {
        e.stopPropagation();
    }

    doneClick() {
        this.shadowRoot.querySelector('#radioDialog').close();
    }

    addOptionClick() {
        const contentInput = this.shadowRoot.querySelector('#optionInput');
        const content = contentInput.value;

        this.dispatchEvent(new CustomEvent('insert-radio', {
            detail: {
                content,
                correct: false
            }
        }));

        contentInput.value = '';
        setTimeout(() => {
            contentInput.focus();
        });
    }

    checkForEnter(e: KeyboardEvent) {
        if (e.keyCode === 13) {
            this.addOptionClick();
        }
    }

    radioCorrectChanged(e: any) {
        const toggle = this.shadowRoot.querySelector(`#${e.model.item.varName}-toggle`);
        const userRadio: UserRadio = {
            type: 'USER_RADIO',
            varName: e.model.item.varName,
            checked: toggle ? toggle.checked : false
        };

        this.dispatchEvent(new CustomEvent('radio-correct-changed', {
            detail: {
                userRadio
            }
        }));
    }

    radioContentChanged(e: any) {
        const input = this.shadowRoot.querySelector(`#${e.model.item.varName}-input`);
        const radioContentToChange = {
            varName: e.model.item.varName,
            content: parse(input.value, () => 5, () => '', () => [], () => []) //TODO hook up the correct functions to get good values for variables and such
        };

        this.dispatchEvent(new CustomEvent('radio-content-changed', {
            detail: {
                radioContentToChange
            }
        }));
    }

    getCompiledContent(content: ASTObject[]) {
        return compileToAssessML({
            type: 'AST',
            ast: content
        }, () => 5, () => '', () => [], () => []);
    }

    questionStemChanged() {
        const questionInput = this.shadowRoot.querySelector('#questionStemInput');

        this.dispatchEvent(new CustomEvent('question-stem-changed', {
            detail: {
                questionStem: questionInput.value
            }
        }));
    }

    getQuestionStem(question) {
        const assessMLAST = parse(question.text, () => 5, () => '', () => [], () => []);
        //TODO the .replace(/&nbsp;/g, ' ') might be handled better by truly understanding why the text editor is using html encoding
        return (assessMLAST.ast[0] && assessMLAST.ast[0].type === 'CONTENT' ? assessMLAST.ast[0].content : '').replace(/<p>|<\/p>|<br>/g, '').replace(/&nbsp;/g, ' ');
    }

    render() {
        render(html`
            <paper-button id="button" onclick="${() => this.executeTool()}">
                <iron-icon icon="icons:radio-button-checked"></iron-icon>
            </paper-button>

            <paper-tooltip id="tooltip" for="button" position="${this.tooltipPosition}" offset="5">
    			<span>Multiple choice</span>
    		</paper-tooltip>

            <paper-dialog id="radioDialog" on-click="radioDialogClick">
                <div style="display: flex">
                    <paper-input id="questionStemInput" type="text" label="Question" autofocus oninput="${() => this.questionStemChanged()}" value="${this.question ? this.getQuestionStem(this.question) : ''}"></paper-input>
                </div>

                <paper-dialog-scrollable>
                    ${this.userRadios ? this.userRadios.map((userRadio) => {
                        return html`
                            <div style="display: flex">
                                <paper-input id="${userRadio.varName}-input" type="text" value="${this.getCompiledContent(userRadio.content)}" oninput="${(e: any) => this.radioContentChanged(e)}"></paper-input>
                                <div>Correct:</div>
                                <paper-toggle-button id="${userRadio.varName}-toggle" checked="${userRadio.checked}" on-checked-changed="${(e: any) => this.radioCorrectChanged(e)}"></paper-toggle-button>
                            </div>
                        `;
                    }).join('') : ''}
                </paper-dialog-scrollable>

                <div style="display: flex">
                    <paper-input id="optionInput" type="text" label="Multiple choice option" onkeydown="${(e: KeyboardEvent) => this.checkForEnter(e)}"></paper-input>
                    <paper-button style="margin-top: 8%; margin-left: .5vw" onclick="${() => this.addOptionClick()}" raised>Add</paper-button>
                </div>

                <div style="display: flex">
                    <paper-button style="margin-left: auto" raised onclick="${() => this.doneClick()}">Done</paper-button>
                </div>

            </paper-dialog>
        `, this.shadowRoot);
    }
}

window.customElements.define('prendus-multiple-choice-tool', PrendusMultipleChoiceTool);
