class PrendusViewQuestionTest extends Polymer.Element {
    static get is() { return 'prendus-view-question-test'; }

    constructor() {
        super();

        this.question = {
            text: 'It works [input]',
            code: 'answer = 5;'
        };
    }
}

window.customElements.define(PrendusViewQuestionTest.is, PrendusViewQuestionTest);
