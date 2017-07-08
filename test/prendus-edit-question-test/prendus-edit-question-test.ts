class PrendusEditQuestionTest extends Polymer.Element {
    static get is() { return 'prendus-edit-question-test'; }

    constructor() {
        super();

        this.question = {
            text: 'It works [input]',
            code: 'answer = 5;'
        };
    }
}

window.customElements.define(PrendusEditQuestionTest.is, PrendusEditQuestionTest);
