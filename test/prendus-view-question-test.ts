import {html} from '../node_modules/lit-html/lit-html';
import {render} from '../node_modules/lit-html/lib/lit-extended';
import {parse, compileToAssessML, compileToHTML} from '../node_modules/assessml/assessml';
import {GQLMutate, escapeString} from '../services/graphql-service';

const jsc = require('jsverify');
const deepEqual = require('deep-equal');
const prendusQuestionElementsTestUserId = 'cj4oe24w1ei1u0160f2daribf';
const prendusQuestionElementsTestJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE1MDMwMDE3MjAsImNsaWVudElkIjoiY2oyd2lmdnZmM29raTAxNTRtZnN0c2lscCIsInByb2plY3RJZCI6ImNqMzZkZTlxNGRlbTAwMTM0Ymhrd200NHIiLCJwZXJtYW5lbnRBdXRoVG9rZW5JZCI6ImNqNmd3ZjF6NjF2YTYwMTEwbDlra2hwMWIifQ.I-3cxsgRzg1ArFylmkdNTxobkqKiEdpHNZ0_9vQ1kfQ';

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
        test('set question property once with no residual state', [arbQuestion], test1.bind(this));
        test('set question property multiple times with residual state', [arbQuestion], test2.bind(this));
        test('set questionId property once with no residual state', [arbQuestion], test3.bind(this));
        test('set questionId property multiple times with residual state', [arbQuestion], test4.bind(this));
        test('interleave the setting of the question and questionId properties with residual state', [arbQuestion, jsc.bool], test5.bind(this));

        async function test1(rawArbQuestion) {
            resetASTVariables();
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            const prendusViewQuestion = document.createElement('prendus-view-question');
            const {eventPromise, eventListener} = prepareEventListener(questionLoadedListener);
            prendusViewQuestion.addEventListener('question-loaded', eventListener);
            this.shadowRoot.appendChild(prendusViewQuestion);
            prendusViewQuestion.question = arbQuestion;
            await eventPromise;
            const result = verifyQuestionLoaded(prendusViewQuestion, arbQuestion);
            this.shadowRoot.removeChild(prendusViewQuestion);
            return result;

            function questionLoadedListener(event) {
                prendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }
        }

        const setQuestionPropertyMultipleTimesPrendusViewQuestion = document.createElement('prendus-view-question');
        this.shadowRoot.appendChild(setQuestionPropertyMultipleTimesPrendusViewQuestion);
        async function test2(rawArbQuestion) {
            resetASTVariables();
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            const {eventPromise, eventListener} = prepareEventListener(questionLoadedListener);
            setQuestionPropertyMultipleTimesPrendusViewQuestion.addEventListener('question-loaded', eventListener);
            setQuestionPropertyMultipleTimesPrendusViewQuestion.question = arbQuestion;
            await eventPromise;
            const result = verifyQuestionLoaded(setQuestionPropertyMultipleTimesPrendusViewQuestion, arbQuestion);
            return result;

            function questionLoadedListener(event) {
                setQuestionPropertyMultipleTimesPrendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }
        }

        async function test3(rawArbQuestion) {
            resetASTVariables();
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            const data = await createQuestion(prendusQuestionElementsTestUserId, prendusQuestionElementsTestJWT, arbQuestion);
            const questionId = data.createQuestion.id;
            const {eventPromise, eventListener} = prepareEventListener(questionLoadedListener);
            const prendusViewQuestion = document.createElement('prendus-view-question');
            prendusViewQuestion.addEventListener('question-loaded', eventListener);
            this.shadowRoot.appendChild(prendusViewQuestion);
            prendusViewQuestion.questionId = questionId;
            await eventPromise;
            const result = verifyQuestionLoaded(prendusViewQuestion, arbQuestion);
            this.shadowRoot.removeChild(prendusViewQuestion);
            await deleteQuestion(prendusQuestionElementsTestUserId, prendusQuestionElementsTestJWT, questionId);
            return result;

            function questionLoadedListener(event) {
                prendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }
        }

        const setQuestionIdPropertyMultipleTimesPrendusViewQuestion = document.createElement('prendus-view-question');
        this.shadowRoot.appendChild(setQuestionIdPropertyMultipleTimesPrendusViewQuestion);
        async function test4(rawArbQuestion) {
            resetASTVariables();
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            const data = await createQuestion(prendusQuestionElementsTestUserId, prendusQuestionElementsTestJWT, arbQuestion);
            const questionId = data.createQuestion.id;
            const {eventPromise, eventListener} = prepareEventListener(questionLoadedListener);
            setQuestionIdPropertyMultipleTimesPrendusViewQuestion.addEventListener('question-loaded', eventListener);
            setQuestionIdPropertyMultipleTimesPrendusViewQuestion.questionId = questionId;
            await eventPromise;
            const result = verifyQuestionLoaded(setQuestionIdPropertyMultipleTimesPrendusViewQuestion, arbQuestion);
            await deleteQuestion(prendusQuestionElementsTestUserId, prendusQuestionElementsTestJWT, questionId);
            return result;

            function questionLoadedListener(event) {
                setQuestionIdPropertyMultipleTimesPrendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }
        }

        const interleaveQuestionAndQuestionIdPropertyPrendusViewQuestion = document.createElement('prendus-view-question');
        this.shadowRoot.appendChild(interleaveQuestionAndQuestionIdPropertyPrendusViewQuestion);
        async function test5(rawArbQuestion, questionOrQuestionId) {
            resetASTVariables();
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            const data = questionOrQuestionId ? {
                createQuestion: {
                    id: null
                }
            } : await createQuestion(prendusQuestionElementsTestUserId, prendusQuestionElementsTestJWT, arbQuestion);
            const questionId = data.createQuestion.id;
            const {eventPromise, eventListener} = prepareEventListener(questionLoadedListener);
            interleaveQuestionAndQuestionIdPropertyPrendusViewQuestion.addEventListener('question-loaded', eventListener);
            interleaveQuestionAndQuestionIdPropertyPrendusViewQuestion[questionOrQuestionId ? 'question' : 'questionId'] = questionOrQuestionId ? arbQuestion : questionId;
            await eventPromise;
            const result = verifyQuestionLoaded(interleaveQuestionAndQuestionIdPropertyPrendusViewQuestion, arbQuestion);
            questionOrQuestionId && await deleteQuestion(prendusQuestionElementsTestUserId, prendusQuestionElementsTestJWT, questionId);
            return result;

            function questionLoadedListener(event) {
                interleaveQuestionAndQuestionIdPropertyPrendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }
        }
    }

    // stateChange(question) {
    //     render(html`
    //         <prendus-view-question question="${question}"></prendus-view-question>
    //     `, this.shadowRoot || this);
    // }
}

window.customElements.define('prendus-view-question-test', PrendusViewQuestionTest);

function resetASTVariables() {
    numInputs = 1;
    numEssays = 1;
    numChecks = 1;
    numRadios = 1;
}

// necessary preprocessing including changing the arbQuestion ast into text, so that we have an arbitrary AssessML string
function prepareArbQuestion(rawArbQuestion) {
    const arbQuestionIntermediate = {
        ...rawArbQuestion,
        text: compileToAssessML(rawArbQuestion.ast, () => 5)// it doesn't matter what the variables are because AST to AssessML conversion loses variable information
    };
    const {ast, ...arbQuestion} = arbQuestionIntermediate;

    return arbQuestion;
}

function prepareEventListener(eventListener) {
    let _resolve;
    const eventPromise = new Promise((resolve, reject) => {
        _resolve = resolve;
    });

    function augmentedEventListener(event) {
        eventListener(event);
        _resolve();
    }

    return {
        eventPromise,
        eventListener: augmentedEventListener
    };
}

async function createQuestion(prendusQuestionElementsTestUserId: string, prendusQuestionElementsTestJWT: string, arbQuestion) {
    return await GQLMutate(`
        mutation createQuestion($authorId: ID!, $text: String!, $code: String!) {
            createQuestion(
                authorId: $authorId
                text: $text
                code: $code
            ) {
                id
            }
        }
    `, {
        authorId: prendusQuestionElementsTestUserId,
        text: arbQuestion.text,
        code: arbQuestion.code
    }, prendusQuestionElementsTestJWT, () => {});
}

async function deleteQuestion(prendusQuestionElementsTestUserId: string, prendusQuestionElementsTestJWT: string, questionId: string) {
    await GQLMutate(`
        mutation deleteQuestion($questionId: ID!) {
            deleteQuestion(
                id: $questionId
            ) {
                id
            }
        }
    `, {
        questionId
    }, prendusQuestionElementsTestJWT,() => {});
}

function verifyQuestionLoaded(prendusViewQuestion, arbQuestion) {
    const result = (
        deepEqual(prendusViewQuestion._question, arbQuestion) &&
        deepEqual(prendusViewQuestion.loaded, true) &&
        deepEqual(compileToAssessML(prendusViewQuestion.builtQuestion.ast, () => 5), arbQuestion.text) &&
        verifyHTML(parse(arbQuestion.text, (varName: string) => generateVarValue(prendusViewQuestion.builtQuestion.ast, varName)), prendusViewQuestion.builtQuestion.html)
    );

    return result;
}

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
