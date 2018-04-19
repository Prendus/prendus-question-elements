import {GQLRequest} from '../node_modules/prendus-shared/services/graphql-service';

const jsc = require('jsverify');
const deepEqual = require('deep-equal');
const prendusQuestionElementsTestUserId = 'cj4oe24w1ei1u0160f2daribf';
const prendusQuestionElementsTestJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE1MDMwMDE3MjAsImNsaWVudElkIjoiY2oyd2lmdnZmM29raTAxNTRtZnN0c2lscCIsInByb2plY3RJZCI6ImNqMzZkZTlxNGRlbTAwMTM0Ymhrd200NHIiLCJwZXJtYW5lbnRBdXRoVG9rZW5JZCI6ImNqNmd3ZjF6NjF2YTYwMTEwbDlra2hwMWIifQ.I-3cxsgRzg1ArFylmkdNTxobkqKiEdpHNZ0_9vQ1kfQ';

class PrendusEditQuestionTest extends HTMLElement {
    connectedCallback() {
        this.attachShadow({mode: 'open'});

        const prendusEditQuestion = document.createElement('prendus-edit-question');
        prendusEditQuestion.noSave = true;
        prendusEditQuestion.setAttribute('multiple-choice-tool', '');
        prendusEditQuestion.setAttribute('multiple-select-tool', '');
        prendusEditQuestion.setAttribute('fill-in-the-blank-tool', '');
        prendusEditQuestion.setAttribute('essay-tool', '');
        prendusEditQuestion.setAttribute('code-tool', '');
        prendusEditQuestion.setAttribute('variable-tool', '');
        prendusEditQuestion.setAttribute('math-tool', '');
        prendusEditQuestion.setAttribute('image-tool', '');
        prendusEditQuestion.setAttribute('graph-tool', '');
        prendusEditQuestion.setAttribute('reset-tool', '');

        this.shadowRoot.appendChild(prendusEditQuestion);
    }

    prepareTests(test: any) {
        GQLRequest

        test('test 1', [jsc.nat], (arbNat) => {
            const prendusEditQuestion = document.createElement('prendus-edit-question');
            prendusEditQuestion.user = {
                id: prendusQuestionElementsTestUserId
            };
            prendusEditQuestion.userToken = prendusQuestionElementsTestJWT;
            this.shadowRoot.appendChild(prendusEditQuestion);
            return true;
        });
    }
}

window.customElements.define('prendus-edit-question-test', PrendusEditQuestionTest);
