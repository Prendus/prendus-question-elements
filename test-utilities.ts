import {arbAST} from 'assessml/test-utilities.ts';
import {AST, ASTObject, Variable} from 'assessml/assessml.d';
import {compileToAssessML} from 'assessml';
import {CodeInfo} from './prendus-question-elements.d';
import {shuffleArray} from 'prendus-shared/services/utilities-service.ts';
import jsverify from 'jsverify-es-module';

export function generateArbQuestion(numEquivalentVars: number) {
    const _arbAST = getArbAST(arbAST, numEquivalentVars);

    const arbQuestion = _arbAST.smap((arbAST: any) => {
        const arbQuestionIntermediate = {
            text: compileToAssessML(arbAST, () => 5, () => ''),
            codeInfo: arbAST.ast.reduce((result: CodeInfo, astObject: ASTObject, index: number) => {
                if (astObject.type === 'CHECK' || astObject.type === 'RADIO') {
                    const arrayName = astObject.type === 'CHECK' ? 'userChecks' : 'userRadios';
                    const resolvedBool = jsverify.sampler(jsverify.bool, 1)();
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
                    const value = encodeURIComponent(jsverify.sampler(jsverify.string, 1000000)());
                    return {
                        ...result,
                        code: `${result.code} ${astObject.varName} === '${value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}' &&`,
                        [arrayName]: [...(result[arrayName]), {
                            varName: astObject.varName,
                            value
                        }]
                    };
                }

                if (astObject.type === 'VARIABLE') {
                    const varName = astObject.varName;
                    const min = jsverify.sampler(jsverify.integer, 1000000)();
                    const max = jsverify.sampler(jsverify.integer, 1000000)();
                    const precision = 5; //TODO make this real

                    //TODO the code below was once checking variables for us, but now that variables can be strings, it needs to be reworked...also, is this the best way to be testing the variables? Perhaps variables should have their own tests
                    // !isNaN(${varName}) && ((${min} < ${max} && ${varName} >= ${min} && ${varName} <= ${max}) || ${min} >= ${max}) &&

                    return {
                        ...result,
                        code: `${varName}.min = ${min}; ${varName}.max = ${max}; ${varName}.precision = ${precision}; ${result.code}`,
                        varInfos: [...result.varInfos, {
                            varName,
                            min,
                            max,
                            precision
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
                oneRadioHasBeenSetToTrue: null,
                varInfos: []
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

    return arbQuestion;
}

function getArbAST(arbAST: any, numEquivalentVars: number) {
    return arbAST.smap((arbAST: any) => {
        return {
            ...arbAST,
            ast: shuffleArray([...arbAST.ast, new Array(numEquivalentVars).map((number) => {
                return {
                    type: 'VARIABLE',
                    varName: `varSameVar`,
                    value: 5
                };
            })])
        };
    });
}
