import {arbAST} from './node_modules/assessml/test-utilities';
import {AST} from './node_modules/assessml/assessml.d';
import {compileToAssessML} from './node_modules/assessml/assessml';

const jsc = require('jsverify');

let tempAST; //TODO is there any way to do this without the side effect?
export const arbQuestion = jsc.record({
    text: arbAST.smap((ast: AST) => {
        tempAST = compileToAssessML(ast, () => 5);
        return tempAST;
    }), // it doesn't matter what the variables are because AST to AssessML conversion loses variable information
    code: jsc.constant(tempAST.reduce((result, astObject) => {
        return 'answer = 5;';
    }, ''))
});
