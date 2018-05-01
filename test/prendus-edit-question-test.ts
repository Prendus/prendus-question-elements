import '../prendus-edit-question';

class PrendusEditQuestionTest extends HTMLElement {
    shadowRoot: ShadowRoot;

    connectedCallback() {
        this.attachShadow({mode: 'open'});

        const prendusEditQuestion = document.createElement('prendus-edit-question');
        // prendusEditQuestion.noSave = true;
        // prendusEditQuestion.setAttribute('multiple-choice-tool', '');
        // prendusEditQuestion.setAttribute('multiple-select-tool', '');
        // prendusEditQuestion.setAttribute('fill-in-the-blank-tool', '');
        // prendusEditQuestion.setAttribute('essay-tool', '');
        prendusEditQuestion.setAttribute('code-tool', '');
        // prendusEditQuestion.setAttribute('variable-tool', '');
        // prendusEditQuestion.setAttribute('math-tool', '');
        // prendusEditQuestion.setAttribute('image-tool', '');
        // prendusEditQuestion.setAttribute('graph-tool', '');
        // prendusEditQuestion.setAttribute('reset-tool', '');

        prendusEditQuestion.question = {
            text: 'Monkey',
            code: 'answer = true;'
        };

        this.shadowRoot.appendChild(prendusEditQuestion);
    }
}

window.customElements.define('prendus-edit-question-test', PrendusEditQuestionTest);
