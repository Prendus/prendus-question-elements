import {html} from '../node_modules/lit-html/lit-html';
import {render} from '../node_modules/lit-html/lib/lit-extended';
import {parse, compileToAssessML, compileToHTML} from '../node_modules/assessml/assessml';
import {AST} from '../node_modules/assessml/assessml.d';
import {GQLMutate, escapeString} from '../services/graphql-service';
import {arbAST, verifyHTML, generateVarValue, resetNums} from '../node_modules/assessml/test-utilities';
import {arbQuestion} from '../test-utilities';
import {UserCheck, UserRadio, UserInput, UserEssay} from '../prendus-question-elements.d';

const jsc = require('jsverify');
const deepEqual = require('deep-equal');
const prendusQuestionElementsTestUserId = 'cj4oe24w1ei1u0160f2daribf';
const prendusQuestionElementsTestJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE1MDMwMDE3MjAsImNsaWVudElkIjoiY2oyd2lmdnZmM29raTAxNTRtZnN0c2lscCIsInByb2plY3RJZCI6ImNqMzZkZTlxNGRlbTAwMTM0Ymhrd200NHIiLCJwZXJtYW5lbnRBdXRoVG9rZW5JZCI6ImNqNmd3ZjF6NjF2YTYwMTEwbDlra2hwMWIifQ.I-3cxsgRzg1ArFylmkdNTxobkqKiEdpHNZ0_9vQ1kfQ';

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
        test('user inputs correct answer', [arbQuestion], test6.bind(this));

        async function test1(rawArbQuestion) {
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            resetNums();
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
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            resetNums();
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
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            resetNums();
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
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            resetNums();
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
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            resetNums();
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

        async function test6(rawArbQuestion) {
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            resetNums();
            const prendusViewQuestion = document.createElement('prendus-view-question');
            let {eventPromise, eventListener} = prepareEventListener(questionLoadedListener);
            prendusViewQuestion.addEventListener('question-loaded', eventListener);
            this.shadowRoot.appendChild(prendusViewQuestion);
            prendusViewQuestion.question = arbQuestion;
            await eventPromise;

            // act as the user and set all of the inputs
            rawArbQuestion.codeInfo.userChecks.forEach((userCheck: UserCheck) => {
                prendusViewQuestion.shadowRoot.querySelector(`#${userCheck.varName}`).checked = userCheck.checked;
            });

            rawArbQuestion.codeInfo.userRadios.forEach((userRadio: UserRadio) => {
                prendusViewQuestion.shadowRoot.querySelector(`#${userRadio.varName}`).checked = userRadio.checked;
            });

            rawArbQuestion.codeInfo.userInputs.forEach((userInput: UserInput) => {
                prendusViewQuestion.shadowRoot.querySelector(`#${userInput.varName}`).textContent = userInput.value;
            });

            rawArbQuestion.codeInfo.userEssays.forEach((userEssay: UserEssay) => {
                prendusViewQuestion.shadowRoot.querySelector(`#${userEssay.varName}`).value = userEssay.value;
            });

            const prepareEventListenerResult = prepareEventListener(_questionResponseListener);
            prendusViewQuestion.addEventListener('question-response', prepareEventListenerResult.eventListener);
            prendusViewQuestion.checkAnswer();
            await prepareEventListenerResult.eventPromise;

            const result = prendusViewQuestion.checkAnswerResponse === 'Correct';

            this.shadowRoot.removeChild(prendusViewQuestion);

            return result;

            function questionLoadedListener(event) {
                prendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }

            function _questionResponseListener(event) {
                prendusViewQuestion.removeEventListener('question-response', prepareEventListenerResult.eventListener);
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

function prepareArbQuestion(rawArbQuestion) {
    const {codeInfo, ...tempArbQuestion} = rawArbQuestion;
    const arbQuestion = {
        ...tempArbQuestion,
        code: codeInfo.code
    };
    return arbQuestion;
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
