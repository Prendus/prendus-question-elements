import {arbAST} from './node_modules/assessml/test-utilities';
import {AST, ASTObject} from './node_modules/assessml/assessml.d';
import {compileToAssessML} from './node_modules/assessml/assessml';
import {CodeInfo} from './prendus-question-elements.d';

const jsc = require('jsverify');

export const arbQuestion = arbAST.smap((arbAST: any) => {
    const arbQuestionIntermediate = {
        text: compileToAssessML(arbAST, () => 5),
        codeInfo: arbAST.ast.reduce((result: CodeInfo, astObject: ASTObject, index: number) => {
            if (astObject.type === 'CHECK' || astObject.type === 'RADIO') {
                const arrayName = astObject.type === 'CHECK' ? 'userChecks' : 'userRadios';
                const resolvedBool = jsc.sampler(jsc.bool, 1)();
                const checked = astObject.type === 'CHECK' ? resolvedBool : result.oneRadioHasBeenSetToTrue ? false : resolvedBool;

                return {
                    ...result,
                    code: `${result.code} ${astObject.varName} === ${checked} &&`,
                    [arrayName]: [...(result[arrayName]), {
                        varName: astObject.varName,
                        checked
                    }],
                    oneRadioHasBeenSetToTrue: astObject.type === 'RADIO' && checked && !result.oneRadioHasBeenSetToTrue ? true : result.oneRadioHasBeenSetToTrue
                }
            }

            if (astObject.type === 'ESSAY' || astObject.type === 'INPUT') {
                const arrayName = astObject.type === 'ESSAY' ? 'userEssays' : 'userInputs';
                const value = encodeURIComponent(jsc.sampler(jsc.string, 1000000)());
                return {
                    ...result,
                    code: `${result.code} ${astObject.varName} === '${value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}' &&`,
                    [arrayName]: [...(result[arrayName]), {
                        varName: astObject.varName,
                        value
                    }]
                };
            }

            return result
        }, {
            code: 'answer =',
            userChecks: [],
            userRadios: [],
            userEssays: [],
            userInputs: [],
            oneRadioHasBeenSetToTrue: null
        })
    };

    return {
        ...arbQuestionIntermediate,
        codeInfo: {
            ...arbQuestionIntermediate.codeInfo,
            code: `${arbQuestionIntermediate.codeInfo.code} true;`
        }
    };
});
