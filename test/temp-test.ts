import 'prendus-question-elements/prendus-view-question.ts';

class TempTest extends HTMLElement {
    connectedCallback() {
        const prendusViewQuestion = document.createElement('prendus-view-question');
        document.body.appendChild(prendusViewQuestion);

        prendusViewQuestion.question = {
            assessML: `
                hello there [code1] [code2] [input1]
                <p>f
                </p>
                <p>f
                </p>
                <p>f
                </p>
                <p>f
                </p>
                <p>f
                </p>
                <p>f
                </p>
                <p>f
                </p>
                <p>f
                </p>
                <p>f
                </p>
                <p>f
                </p>

                [solution1]
                    <code-sample>
                        <template>
                            const monkey = 5;
                            const puppy = 10;
                        </template>
                    </code-sample>
                [solution1]
            `,
            javaScript: `
                if (code1) {
                    eval(code1);
                    answer = monkey === true;
                }
                else {
                    answer = false;
                }
            `
        };
    }
}

window.customElements.define('temp-test', TempTest);
