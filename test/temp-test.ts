import 'prendus-question-elements/prendus-view-question.ts';

class TempTest extends HTMLElement {
    connectedCallback() {
        const prendusViewQuestion = document.createElement('prendus-view-question');
        document.body.appendChild(prendusViewQuestion);

        prendusViewQuestion.question = {
            assessML: `
                hello there
                [solution1]
                    <code-sample>
                        <template>
                            const monkey = 5;
                            const puppy = 10;
                        </template>
                    </code-sample>
                [solution1]
            `,
            javaScript: 'answer = true'
        };
    }
}

window.customElements.define('temp-test', TempTest);
