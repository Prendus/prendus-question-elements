// import '../prendus-edit-question';

class PrendusEditQuestionTest extends HTMLElement {
    connectedCallback() {
        this.innerHTML = 'it is working';
    }

    // shadowRoot: ShadowRoot;
    //
    // connectedCallback() {
    //     const prendusEditQuestion = document.createElement('prendus-edit-question');
    //     // prendusEditQuestion.noSave = true;
    //     prendusEditQuestion.setAttribute('multiple-choice-tool', '');
    //     // prendusEditQuestion.setAttribute('multiple-select-tool', '');
    //     // prendusEditQuestion.setAttribute('fill-in-the-blank-tool', '');
    //     prendusEditQuestion.setAttribute('essay-tool', '');
    //     prendusEditQuestion.setAttribute('code-tool', '');
    //     prendusEditQuestion.setAttribute('variable-tool', '');
    //     // prendusEditQuestion.setAttribute('math-tool', '');
    //     prendusEditQuestion.setAttribute('image-tool', '');
    //     prendusEditQuestion.setAttribute('graph-tool', '');
    //     prendusEditQuestion.setAttribute('reset-tool', '');
    //
    //     prendusEditQuestion.question = {
    //         text: 'Monkey',
    //         code: 'answer = true;'
    //     };
    //
    //     this.appendChild(prendusEditQuestion);
    // }
}

window.customElements.define('prendus-edit-question-test', PrendusEditQuestionTest);
