import 'prendus-question-elements/prendus-view-question.ts';

class TempTest extends HTMLElement {
    connectedCallback() {
        const prendusViewQuestion = document.createElement('prendus-view-question');
        document.body.appendChild(prendusViewQuestion);

        const button = document.createElement('button');
        button.innerHTML = 'Toggle Solution';
        button.addEventListener('click', () => {
            console.log('prendusViewQuestion.showingExercise', prendusViewQuestion.showingExercise);
            console.log('prendusViewQuestion.showingSolution', prendusViewQuestion.showingSolution);

            if (prendusViewQuestion.showingExercise) {
                prendusViewQuestion.showSolution();
                return;
            }

            if (prendusViewQuestion.showingSolution) {
                prendusViewQuestion.showExercise();
                return;
            }
        });

        document.body.appendChild(button);

        prendusViewQuestion.question = {
            assessML: `
                What is 5 + 5?[code1][input1][input2][essay1][check1]Yes[check1][radio1]Hello[radio1]
                [solution1]
                    The answer is 10
                [solution1]
            `,
            javaScript: `
                answer = true;
            `
        };
    }
}

window.customElements.define('temp-test', TempTest);
