import 'prendus-question-elements/prendus-view-question.ts';

class TempTest extends HTMLElement {
    connectedCallback() {
        const prendusViewQuestion = document.createElement('prendus-view-question');
        document.body.appendChild(prendusViewQuestion);

        prendusViewQuestion.question = {
            assessML: '[input1] [var1] [radio1]sdaf[radio1]\n[radio2]sdaf[radio2] [solution1]hello[solution1]',
            javaScript: 'answer = input1 === \'hello\''
        };
    }
}

window.customElements.define('temp-test', TempTest);
