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
        prendusEditQuestion.question = {
            text: '',
            code: ''
        };

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
