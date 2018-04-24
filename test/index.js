import './process.js';
// import '../node_modules/@webcomponents/shadydom/shadydom.min.js';
// import '../node_modules/@webcomponents/custom-elements/custom-elements.min.js';
// import '../node_modules/guesswork/test-runner.ts';
// import './prendus-view-question-test.ts';
import '../prendus-view-question.ts';

window.document.body.innerHTML = `
    <prendus-view-question id="prendusViewQuestion"></prendus-view-question>
`;

document.body.querySelector('#prendusViewQuestion').question = {
    text: '<p>Just testing $$x^5$$</p>',
    code: 'answer = true;'
};
