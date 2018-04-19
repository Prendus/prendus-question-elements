import {parse, compileToAssessML, compileToHTML} from '../node_modules/assessml/assessml';
import {AST, ASTObject} from '../node_modules/assessml/assessml.d';
import {GQLRequest} from '../node_modules/prendus-shared/services/graphql-service';
import {arbAST, verifyHTML} from '../node_modules/assessml/test-utilities';
import {generateVarValue, getASTObjectPayload} from '../node_modules/assessml/assessml';
import {generateArbQuestion} from '../node_modules/prendus-question-elements/test-utilities';
import {UserCheck, UserRadio, UserInput, UserEssay, Question} from '../prendus-question-elements.d';
import * as JSVerify from 'jsverify';
import {PrendusViewQuestion} from '../node_modules/prendus-question-elements/prendus-view-question';

const jsc = require('jsverify');
const deepEqual = require('deep-equal');
const prendusQuestionElementsTestUserId = 'cje4i8o2e1s4x01314c4nt9v4';
const prendusQuestionElementsTestJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE1MjY3NTI4MTcsImlhdCI6MTUyNDE2MDgxNywicHJvamVjdElkIjoiY2o4ZGx6eGduMG95cjAxNDQ1NzR1Mml2YiIsInVzZXJJZCI6ImNqZTRpOG8yZTFzNHgwMTMxNGM0bnQ5djQiLCJtb2RlbE5hbWUiOiJVc2VyIn0.FLTVHAQYH5h-Tzk-DlxAP0E8u6l0kJqx2GMh-TQmsCI';

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

        //TODO the check answer tests should be rethought
        test('user inputs correct answer with no residual state', [generateArbQuestion(jsc.sampler(jsc.nat, 10)())], test6.bind(this));
        test('user inputs correct answer with residual state', [generateArbQuestion(jsc.sampler(jsc.nat, 10)())], test7.bind(this));
        test('user inputs incorrect answer with no residual state', [generateArbQuestion(jsc.sampler(jsc.nat, 10)())], test8.bind(this));
        test('user inputs incorrect answer with residual state', [generateArbQuestion(jsc.sampler(jsc.nat, 10)())], test9.bind(this));

        async function test1(rawArbQuestion: JSVerify.Arbitrary<Question>) {
            const arbQuestion = prepareArbQuestion(rawArbQuestion);
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

            const result = prendusViewQuestion.checkAnswerResponse === 'Incorrect' || (prendusViewQuestion.checkAnswerResponse === 'Correct' && (arbQuestion.code.includes('answer = true;') || arbQuestion.code.includes('&& true;')));

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

            const result = userInputsInCorrectAnswerPrendusViewQuestion.checkAnswerResponse === 'Incorrect' || (arbQuestion.code.includes('answer = true;') || arbQuestion.code.includes('&& true;')));

            return result;

            function questionLoadedListener(event: Event) {
                userInputsInCorrectAnswerPrendusViewQuestion.removeEventListener('question-loaded', eventListener);
            }

            function _questionResponseListener(event: Event) {
                userInputsInCorrectAnswerPrendusViewQuestion.removeEventListener('question-response', prepareEventListenerResult.eventListener);
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
    const DEFAULT_QUESTION_VISIBILITY_ID = window.process.env.NODE_ENV === 'production' ? 'cjeeq78rc6h6h0189oq3yrbgv' : 'cjebyzjku5yiq018991vwbbyo';
    const DEFAULT_QUESTION_LICENSE_ID = window.process.env.NODE_ENV === 'production' ? 'cje7p5cg051940189kq9gy6to' : 'cje4ugv8u4fjx0189dmif4moc';

    return await GQLRequest(`
        mutation createQuestion($authorId: ID!, $text: String!, $code: String!) {
            createQuestion(
                authorId: $authorId
                text: $text
                code: $code
                visibilityId: "${DEFAULT_QUESTION_VISIBILITY_ID}"
                licenseId: "${DEFAULT_QUESTION_LICENSE_ID}"
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
    await GQLRequest(`
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
    const questionCorrect = deepEqual(prendusViewQuestion._question, arbQuestion);
    const loaded = deepEqual(prendusViewQuestion.loaded, undefined);
    const builtQuestionCorrect = deepEqual(
        compileToAssessML(
            prendusViewQuestion.builtQuestion.ast,
            (varName: string) => getASTObjectPayload(prendusViewQuestion.builtQuestion.ast, 'VARIABLE', varName),
            (varName: string) => getASTObjectPayload(prendusViewQuestion.builtQuestion.ast, 'IMAGE', varName),
            (varName: string) => getASTObjectPayload(prendusViewQuestion.builtQuestion.ast, 'GRAPH', varName),
            (varName: string) => getASTObjectPayload(prendusViewQuestion.builtQuestion.ast, 'SHUFFLE', varName)
        ),
        arbQuestion.text
    );
    const htmlCorrect = verifyHTML(
        parse(
            arbQuestion.text,
            (varName: string) => getASTObjectPayload(prendusViewQuestion.builtQuestion.ast, 'VARIABLE', varName),
            (varName: string) => getASTObjectPayload(prendusViewQuestion.builtQuestion.ast, 'IMAGE', varName),
            (varName: string) => getASTObjectPayload(prendusViewQuestion.builtQuestion.ast, 'GRAPH', varName),
            (varName: string) => getASTObjectPayload(prendusViewQuestion.builtQuestion.ast, 'SHUFFLE', varName)
        ),
        prendusViewQuestion.builtQuestion.html
    );

    const result = questionCorrect && loaded && builtQuestionCorrect && htmlCorrect;

    return result;
}
