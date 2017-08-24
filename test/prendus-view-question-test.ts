import {html} from '../node_modules/lit-html/lit-html';
import {render} from '../node_modules/lit-html/lib/lit-extended';
import {parse, compileToAssessML, compileToHTML} from '../node_modules/assessml/assessml';
import {AST, ASTObject} from '../node_modules/assessml/assessml.d';
import {GQLMutate, escapeString} from '../services/graphql-service';
import {arbAST, verifyHTML, generateVarValue, resetNums} from '../node_modules/assessml/test-utilities';
import {generateArbQuestion} from '../test-utilities';
import {UserCheck, UserRadio, UserInput, UserEssay, Question} from '../prendus-question-elements.d';
import * as JSVerify from 'jsverify';
import {PrendusViewQuestion} from '../node_modules/prendus-question-elements/prendus-view-question';

const jsc = require('jsverify');
const deepEqual = require('deep-equal');
const prendusQuestionElementsTestUserId = 'cj4oe24w1ei1u0160f2daribf';
const prendusQuestionElementsTestJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE1MDMwMDE3MjAsImNsaWVudElkIjoiY2oyd2lmdnZmM29raTAxNTRtZnN0c2lscCIsInByb2plY3RJZCI6ImNqMzZkZTlxNGRlbTAwMTM0Ymhrd200NHIiLCJwZXJtYW5lbnRBdXRoVG9rZW5JZCI6ImNqNmd3ZjF6NjF2YTYwMTEwbDlra2hwMWIifQ.I-3cxsgRzg1ArFylmkdNTxobkqKiEdpHNZ0_9vQ1kfQ';

class PrendusViewQuestionTest extends HTMLElement {
    shadowRoot: ShadowRoot;

    connectedCallback() {
        this.attachShadow({mode: 'open'});
    }

    prepareTests(test: any) {
        test('set question property once with no residual state', [generateArbQuestion(jsc.sampler(jsc.nat, 10)())], test1.bind(this));
        test('set question property multiple times with residual state', [generateArbQuestion(jsc.sampler(jsc.nat, 10)())], test2.bind(this));
        test('set questionId property once with no residual state', [generateArbQuestion(jsc.sampler(jsc.nat, 10)())], test3.bind(this));
        test('set questionId property multiple times with residual state', [generateArbQuestion(jsc.sampler(jsc.nat, 10)())], test4.bind(this));
        test('interleave the setting of the question and questionId properties with residual state', [generateArbQuestion(jsc.sampler(jsc.nat, 10)()), jsc.bool], test5.bind(this));
        test('user inputs correct answer with no residual state', [generateArbQuestion(jsc.sampler(jsc.nat, 10)())], test6.bind(this));
        test('user inputs correct answer with residual state', [generateArbQuestion(jsc.sampler(jsc.nat, 10)())], test7.bind(this));
        test('user inputs incorrect answer with no residual state', [generateArbQuestion(jsc.sampler(jsc.nat, 10)())], test8.bind(this));
        test('user inputs incorrect answer with residual state', [generateArbQuestion(jsc.sampler(jsc.nat, 10)())], test9.bind(this));
        test('variable min and max', [generateArbQuestion(jsc.sampler(jsc.nat, 10)())], test10.bind(this));

        async function test1(rawArbQuestion: JSVerify.Arbitrary<Question>) {
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            resetNums();
            const prendusViewQuestion = new PrendusViewQuestion();
            const {eventPromise, eventListener} = prepareEventListener(questionLoadedListener);
            prendusViewQuestion.addEventListener('question-loaded', eventListener);
            this.shadowRoot.appendChild(prendusViewQuestion);
            prendusViewQuestion.question = arbQuestion;
            await eventPromise;
            const result = verifyQuestionLoaded(prendusViewQuestion, arbQuestion);
            this.shadowRoot.removeChild(prendusViewQuestion);
            return result;

            function questionLoadedListener(event: Event) {
                prendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }
        }

        const setQuestionPropertyMultipleTimesPrendusViewQuestion = new PrendusViewQuestion();
        this.shadowRoot.appendChild(setQuestionPropertyMultipleTimesPrendusViewQuestion);
        async function test2(rawArbQuestion: JSVerify.Arbitrary<Question>) {
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            resetNums();
            const {eventPromise, eventListener} = prepareEventListener(questionLoadedListener);
            setQuestionPropertyMultipleTimesPrendusViewQuestion.addEventListener('question-loaded', eventListener);
            setQuestionPropertyMultipleTimesPrendusViewQuestion.question = arbQuestion;
            await eventPromise;
            const result = verifyQuestionLoaded(setQuestionPropertyMultipleTimesPrendusViewQuestion, arbQuestion);
            return result;

            function questionLoadedListener(event: Event) {
                setQuestionPropertyMultipleTimesPrendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }
        }

        async function test3(rawArbQuestion: JSVerify.Arbitrary<Question>) {
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            resetNums();
            const data = await createQuestion(prendusQuestionElementsTestUserId, prendusQuestionElementsTestJWT, arbQuestion);
            const questionId = data.createQuestion.id;
            const {eventPromise, eventListener} = prepareEventListener(questionLoadedListener);
            const prendusViewQuestion = new PrendusViewQuestion();
            prendusViewQuestion.addEventListener('question-loaded', eventListener);
            this.shadowRoot.appendChild(prendusViewQuestion);
            prendusViewQuestion.questionId = questionId;
            await eventPromise;
            const result = verifyQuestionLoaded(prendusViewQuestion, arbQuestion);
            this.shadowRoot.removeChild(prendusViewQuestion);
            await deleteQuestion(prendusQuestionElementsTestUserId, prendusQuestionElementsTestJWT, questionId);
            return result;

            function questionLoadedListener(event: Event) {
                prendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }
        }

        const setQuestionIdPropertyMultipleTimesPrendusViewQuestion = new PrendusViewQuestion();
        this.shadowRoot.appendChild(setQuestionIdPropertyMultipleTimesPrendusViewQuestion);
        async function test4(rawArbQuestion: JSVerify.Arbitrary<Question>) {
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

            function questionLoadedListener(event: Event) {
                setQuestionIdPropertyMultipleTimesPrendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }
        }

        const interleaveQuestionAndQuestionIdPropertyPrendusViewQuestion = new PrendusViewQuestion();
        this.shadowRoot.appendChild(interleaveQuestionAndQuestionIdPropertyPrendusViewQuestion);
        async function test5(rawArbQuestion: JSVerify.Arbitrary<Question>, questionOrQuestionId: JSVerify.Arbitrary<boolean>) {
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

            function questionLoadedListener(event: Event) {
                interleaveQuestionAndQuestionIdPropertyPrendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }
        }

        async function test6(rawArbQuestion: JSVerify.Arbitrary<Question>) {
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            resetNums();
            const prendusViewQuestion = new PrendusViewQuestion();
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

            function questionLoadedListener(event: Event) {
                prendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }

            function _questionResponseListener(event: Event) {
                prendusViewQuestion.removeEventListener('question-response', prepareEventListenerResult.eventListener);
            }
        }

        const userInputsCorrectAnswerPrendusViewQuestion = new PrendusViewQuestion();
        this.shadowRoot.appendChild(userInputsCorrectAnswerPrendusViewQuestion);
        async function test7(rawArbQuestion: JSVerify.Arbitrary<Question>) {
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            resetNums();
            let {eventPromise, eventListener} = prepareEventListener(questionLoadedListener);
            userInputsCorrectAnswerPrendusViewQuestion.addEventListener('question-loaded', eventListener);
            userInputsCorrectAnswerPrendusViewQuestion.question = arbQuestion;
            await eventPromise;

            // act as the user and set all of the inputs
            rawArbQuestion.codeInfo.userChecks.forEach((userCheck: UserCheck) => {
                userInputsCorrectAnswerPrendusViewQuestion.shadowRoot.querySelector(`#${userCheck.varName}`).checked = userCheck.checked;
            });

            rawArbQuestion.codeInfo.userRadios.forEach((userRadio: UserRadio) => {
                userInputsCorrectAnswerPrendusViewQuestion.shadowRoot.querySelector(`#${userRadio.varName}`).checked = userRadio.checked;
            });

            rawArbQuestion.codeInfo.userInputs.forEach((userInput: UserInput) => {
                userInputsCorrectAnswerPrendusViewQuestion.shadowRoot.querySelector(`#${userInput.varName}`).textContent = userInput.value;
            });

            rawArbQuestion.codeInfo.userEssays.forEach((userEssay: UserEssay) => {
                userInputsCorrectAnswerPrendusViewQuestion.shadowRoot.querySelector(`#${userEssay.varName}`).value = userEssay.value;
            });

            const prepareEventListenerResult = prepareEventListener(_questionResponseListener);
            userInputsCorrectAnswerPrendusViewQuestion.addEventListener('question-response', prepareEventListenerResult.eventListener);
            userInputsCorrectAnswerPrendusViewQuestion.checkAnswer();
            await prepareEventListenerResult.eventPromise;

            const result = userInputsCorrectAnswerPrendusViewQuestion.checkAnswerResponse === 'Correct';

            return result;

            function questionLoadedListener(event: Event) {
                userInputsCorrectAnswerPrendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }

            function _questionResponseListener(event: Event) {
                userInputsCorrectAnswerPrendusViewQuestion.removeEventListener('question-response', prepareEventListenerResult.eventListener);
            }
        }

        async function test8(rawArbQuestion: JSVerify.Arbitrary<Question>) {
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            resetNums();
            const prendusViewQuestion = new PrendusViewQuestion();
            let {eventPromise, eventListener} = prepareEventListener(questionLoadedListener);
            prendusViewQuestion.addEventListener('question-loaded', eventListener);
            this.shadowRoot.appendChild(prendusViewQuestion);
            prendusViewQuestion.question = arbQuestion;
            await eventPromise;

            // act as the user and set all of the inputs
            rawArbQuestion.codeInfo.userChecks.forEach((userCheck: UserCheck) => {
                prendusViewQuestion.shadowRoot.querySelector(`#${userCheck.varName}`).checked = !userCheck.checked;
            });

            rawArbQuestion.codeInfo.userRadios.forEach((userRadio: UserRadio) => {
                prendusViewQuestion.shadowRoot.querySelector(`#${userRadio.varName}`).checked = !userRadio.checked;
            });

            rawArbQuestion.codeInfo.userInputs.forEach((userInput: UserInput) => {
                prendusViewQuestion.shadowRoot.querySelector(`#${userInput.varName}`).textContent = userInput.value + new Date();
            });

            rawArbQuestion.codeInfo.userEssays.forEach((userEssay: UserEssay) => {
                prendusViewQuestion.shadowRoot.querySelector(`#${userEssay.varName}`).value = userEssay.value + new Date();
            });

            const prepareEventListenerResult = prepareEventListener(_questionResponseListener);
            prendusViewQuestion.addEventListener('question-response', prepareEventListenerResult.eventListener);
            prendusViewQuestion.checkAnswer();
            await prepareEventListenerResult.eventPromise;

            const result = prendusViewQuestion.checkAnswerResponse === 'Incorrect' || (prendusViewQuestion.checkAnswerResponse === 'Correct' && arbQuestion.code.includes('answer = true;'));

            this.shadowRoot.removeChild(prendusViewQuestion);

            return result;

            function questionLoadedListener(event: Event) {
                prendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }

            function _questionResponseListener(event: Event) {
                prendusViewQuestion.removeEventListener('question-response', prepareEventListenerResult.eventListener);
            }
        }

        const userInputsInCorrectAnswerPrendusViewQuestion = new PrendusViewQuestion();
        this.shadowRoot.appendChild(userInputsInCorrectAnswerPrendusViewQuestion);
        async function test9(rawArbQuestion: JSVerify.Arbitrary<Question>) {
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            resetNums();
            let {eventPromise, eventListener} = prepareEventListener(questionLoadedListener);
            userInputsInCorrectAnswerPrendusViewQuestion.addEventListener('question-loaded', eventListener);
            userInputsInCorrectAnswerPrendusViewQuestion.question = arbQuestion;
            await eventPromise;

            // act as the user and set all of the inputs
            rawArbQuestion.codeInfo.userChecks.forEach((userCheck: UserCheck) => {
                userInputsInCorrectAnswerPrendusViewQuestion.shadowRoot.querySelector(`#${userCheck.varName}`).checked = !userCheck.checked;
            });

            rawArbQuestion.codeInfo.userRadios.forEach((userRadio: UserRadio) => {
                userInputsInCorrectAnswerPrendusViewQuestion.shadowRoot.querySelector(`#${userRadio.varName}`).checked = !userRadio.checked;
            });

            rawArbQuestion.codeInfo.userInputs.forEach((userInput: UserInput) => {
                userInputsInCorrectAnswerPrendusViewQuestion.shadowRoot.querySelector(`#${userInput.varName}`).textContent = userInput.value + new Date();
            });

            rawArbQuestion.codeInfo.userEssays.forEach((userEssay: UserEssay) => {
                userInputsInCorrectAnswerPrendusViewQuestion.shadowRoot.querySelector(`#${userEssay.varName}`).value = userEssay.value + new Date();
            });

            const prepareEventListenerResult = prepareEventListener(_questionResponseListener);
            userInputsInCorrectAnswerPrendusViewQuestion.addEventListener('question-response', prepareEventListenerResult.eventListener);
            userInputsInCorrectAnswerPrendusViewQuestion.checkAnswer();
            await prepareEventListenerResult.eventPromise;

            const result = userInputsInCorrectAnswerPrendusViewQuestion.checkAnswerResponse === 'Incorrect' || (userInputsInCorrectAnswerPrendusViewQuestion.checkAnswerResponse === 'Correct' && arbQuestion.code.includes('answer = true;'));

            return result;

            function questionLoadedListener(event: Event) {
                userInputsInCorrectAnswerPrendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }

            function _questionResponseListener(event: Event) {
                userInputsInCorrectAnswerPrendusViewQuestion.removeEventListener('question-response', prepareEventListenerResult.eventListener);
            }
        }

        async function test10(rawArbQuestion: JSVerify.Arbitrary<Question>) {
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
            resetNums();
            const prendusViewQuestion = new PrendusViewQuestion();
            const {eventPromise, eventListener} = prepareEventListener(questionLoadedListener);
            prendusViewQuestion.addEventListener('question-loaded', eventListener);
            this.shadowRoot.appendChild(prendusViewQuestion);
            prendusViewQuestion.question = arbQuestion;
            await eventPromise;
            const result = verifyMinAndMax(prendusViewQuestion.builtQuestion.ast, rawArbQuestion.codeInfo.varInfos);
            this.shadowRoot.removeChild(prendusViewQuestion);
            return result;

            function questionLoadedListener(event: Event) {
                prendusViewQuestion.removeEventListener('question-loaded', eventListener);
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

function verifyMinAndMax(ast: AST, varInfos) {
    return varInfos.reduce((result: boolean, varInfo) => {
        if (!result) {
            return result;
        }

        return ast.ast.reduce((result: boolean, astObject: ASTObject) => {
            if (!result) {
                return result;
            }

            if (astObject.type === 'VARIABLE' && astObject.varName === varInfo.varName) {
                if (varInfo.min < varInfo.max) {
                    return !isNaN(astObject.value) && astObject.value >= varInfo.min && astObject.value <= varInfo.max;
                }
                //TODO We might want to think about the expected behavior when the min is greater than the max...but that would be a user error
            }

            return result;
        }, true);
    }, true);
}

new Promise((resolve, reject) => {

})

function prepareEventListener(eventListener: EventListener) {
    let _resolve: (value?: {} | PromiseLike<{}> | undefined) => void;
    const eventPromise = new Promise((resolve, reject) => {
        _resolve = resolve;
    });

    function augmentedEventListener(event: Event) {
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
