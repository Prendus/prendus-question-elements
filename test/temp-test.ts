import 'prendus-question-elements/prendus-view-question.ts';

class TempTest extends HTMLElement {
    connectedCallback() {
        const prendusViewQuestion = document.createElement('prendus-view-question');
        document.body.appendChild(prendusViewQuestion);

        prendusViewQuestion.question = {
            assessML: `
                [markdown1]
                    \`\`\`javascript
                        const monkey = 5;
                        const pupppy = 6;
                    \`\`\`
                    * hello
                [markdown1]
            `,
            javaScript: 'answer = true'
        };
    }
}

window.customElements.define('temp-test', TempTest);
