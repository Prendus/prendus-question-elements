import {html} from '../node_modules/lit-html/lit-html';
import {render} from '../node_modules/lit-html/lib/lit-extended';
import {parse, compileToAssessML, compileToHTML} from '../node_modules/assessml/assessml';

const jsc = require('jsverify');
const deepEqual = require('deep-equal');

//TODO replace all of these with the imported arbitraries from prendus-shared
const arbContent = jsc.record({
    type: jsc.constant('CONTENT'),
    content: jsc.pair(jsc.nestring, jsc.nestring).smap((x: any) => {
        return x[0].replace(/\[/g, 'd').replace(/\]/g, 'd'); //do not allow ast types to be created in arbitrary content, otherwise it isn't content
    })
});

const arbVariable = jsc.record({
    type: jsc.constant('VARIABLE'),
    varName: jsc.pair(jsc.constant('var'), jsc.nestring).smap((x: any) => { //TODO Figure out the correct way to use smap. I need to make the second function the inverse of the first
        return `${x[0]}${x[1].replace(/\]/g, 'd')}`; //the variable will never have a ] in it because of the Regex...make sure to replace it with something or you could get an empty string
    }, (x: any) => {
        return x;
    }),
    value: jsc.number
});

let numInputs = 1;
const arbInput = jsc.record({
    type: jsc.constant('INPUT'),
    varName: jsc.bless({
        generator: () => {
            return `input${numInputs++}`;
        }
    })
});

let numEssays = 1;
const arbEssay = jsc.record({
    type: jsc.constant('ESSAY'),
    varName: jsc.bless({
        generator: () => {
            return `essay${numEssays++}`;
        }
    })
});

let numChecks = 1;
const arbCheck = jsc.record({
    type: jsc.constant('CHECK'),
    varName: jsc.bless({
        generator: () => {
            return `check${numChecks++}`;
        }
    }),
    content: jsc.tuple([arbContent]) //TODO once we support variables in here this will need to change
});

let numRadios = 1;
const arbRadio = jsc.record({
    type: jsc.constant('RADIO'),
    varName: jsc.bless({
        generator: () => {
            return `radio${numRadios++}`;
        }
    }),
    content: jsc.tuple([arbContent])//TODO once we support variables in here this will need to change
});

const arbAST = jsc.record({
    type: jsc.constant('AST'),
    ast: jsc.array(jsc.oneof([arbContent, arbVariable, arbInput, arbEssay, arbCheck, arbRadio]))
});

const arbQuestion = jsc.record({
    ast: arbAST,
    code: jsc.constant('answer = 5;') //TODO create arbitrary code
});

function generateRandomInteger(min: number, max: number): number {
    //returns a random integer between min (included) and max (included)
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
//TODO replace all of these with the imported arbitraries from prendus-shared

class PrendusViewQuestionTest extends HTMLElement {
    connectedCallback() {
        this.attachShadow({mode: 'open'});
    }

    prepareTests(test: any) {
        test('set question property once no residual state', [arbQuestion], (rawArbQuestion: Question) => {
            return new Promise((resolve, reject) => {
                const arbQuestion = {
                    ...rawArbQuestion,
                    text: compileToAssessML(rawArbQuestion.ast, () => 5) // it doesn't matter what the variables are because AST to AssessML conversion loses variable information
                };

                const prendusViewQuestion = document.createElement('prendus-view-question');
                prendusViewQuestion.addEventListener('loaded', (event) => {
                    const result = (
                        deepEqual(prendusViewQuestion.question, arbQuestion) &&
                        deepEqual(prendusViewQuestion.loaded, true) &&
                        deepEqual(compileToAssessML(prendusViewQuestion.builtQuestion.ast, () => 5), arbQuestion.text) &&
                        verifyHTML(parse(arbQuestion.text, (varName: string) => generateVarValue(prendusViewQuestion.builtQuestion.ast, varName)), prendusViewQuestion.builtQuestion.html)
                    );

                    this.shadowRoot.removeChild(prendusViewQuestion);

                    resolve(result);
                });

                this.shadowRoot.appendChild(prendusViewQuestion);
                prendusViewQuestion.question = arbQuestion;
            });
        });
    }

    // stateChange(question) {
    //     render(html`
    //         <prendus-view-question question="${question}"></prendus-view-question>
    //     `, this.shadowRoot || this);
    // }
}

window.customElements.define('prendus-view-question-test', PrendusViewQuestionTest);

//TODO replace these with exports from AssessML
function generateVarValue(ast: AST, varName: string) {
    const existingVarValue = getVariableValue(ast, varName);
    return existingVarValue === NaN ? generateRandomInteger(0, 100) : existingVarValue;
}

function getVariableValue(ast: AST, varName: string): number {
    const variables: Variable[] = <Variable[]> ast.ast.filter((astObject: ASTObject) => astObject.type === 'VARIABLE' && astObject.varName === varName);
    return variables.length > 0 ? variables[0].value : NaN;
}

// Go through the htmlString and match based on the current astObject. If there is a match, remove it from the string and keep going. You should end up with an empty string at the end
function verifyHTML(ast: AST, htmlString: string) {
    return '' === ast.ast.reduce((result: string, astObject) => {

        if (astObject.type === 'CONTENT') {
            if (result.indexOf(astObject.content) === 0) {
                return result.replace(astObject.content, '');
            }
        }

        if (astObject.type === 'VARIABLE') {
            if (result.indexOf(astObject.value.toString()) === 0) {
                return result.replace(astObject.value.toString(), '');
            }
        }

        if (astObject.type === 'INPUT') {
            const inputString = `<span id="${astObject.varName}" contenteditable="true" style="display: inline-block; min-width: 25px; min-height: 25px; padding: 5px; box-shadow: 0px 0px 1px black;"></span>`;
            if (result.indexOf(inputString) === 0) {
                return result.replace(inputString, '');
            }
        }

        if (astObject.type === 'ESSAY') {
            const essayString = `<textarea id="${astObject.varName}" style="width: 100%; height: 50vh;"></textarea>`;
            if (result.indexOf(essayString) === 0) {
                return result.replace(essayString, '');
            }
        }

        if (astObject.type === 'CHECK') {
            const checkString = `<input id="${astObject.varName}" type="checkbox" style="width: calc(40px - 1vw); height: calc(40px - 1vw);">${compileToHTML({
                type: 'AST',
                ast: astObject.content
            }, (varName) => generateVarValue(ast, varName))}`

            if (result.indexOf(checkString) === 0) {
                return result.replace(checkString, '');
            }
        }

        if (astObject.type === 'RADIO') {
            const radioGroupNameMatch = result.match(/name="((.|\n|\r)+?)"/);
            const radioGroupName = radioGroupNameMatch ? radioGroupNameMatch[1] : '';
            const radioString = `<input id="${astObject.varName}" type="radio" name="${radioGroupName}" style="width: calc(40px - 1vw); height: calc(40px - 1vw);">${compileToHTML({
                type: 'AST',
                ast: astObject.content
            }, (varName) => generateVarValue(ast, varName))}`;

            if (result.indexOf(radioString) === 0) {
                return result.replace(radioString, '');
            }
        }

        return result;
    }, htmlString);
}
//TODO replace these with exports from AssessML
