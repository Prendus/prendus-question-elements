import './process.js';
import '../node_modules/@webcomponents/shadydom/shadydom.min.js';
import '../node_modules/@webcomponents/custom-elements/custom-elements.min.js';
import '../node_modules/guesswork/test-runner.ts';
import './prendus-view-question-test.ts';
import './prendus-edit-question-test.ts';

window.document.body.innerHTML = `
    <prendus-edit-question-test></prendus-edit-question-test>
    <!--<test-runner>
        <prendus-view-question-test></prendus-view-question-test>
    </test-runner>-->
`;
