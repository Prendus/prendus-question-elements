import {parse, compileToHTML} from '../../assessml/assessml';
import {asyncMap} from '../services/utilities-service';
import {secureEval} from '../services/secure-eval-service';
import {AST, ASTObject, Variable, Input, Essay, Check, Radio} from 'assessml';
import {Program, ExpressionStatement, MemberExpression, Identifier, AssignmentExpression} from 'estree';
import {UserVariable, UserCheck, UserRadio, UserInput, UserEssay} from '../prendus-question-elements.d';

export async function buildQuestion(text: string, code: string): Promise<{
    html: string;
    ast: AST;
}> {
    try {
        const originalAmlAst = parse(text);
        const jsAst: Program = esprima.parse(code);

        const newAmlAst = {
            ...originalAmlAst,
            ast: await asyncMap(originalAmlAst.ast, async (astObject: ASTObject) => {
                if (astObject.type === 'VARIABLE') {
                    const newMin = await newPropertyValue(jsAst, astObject.varName, 'min', 0);
                    const newMax = await newPropertyValue(jsAst, astObject.varName, 'max', 100);
                    const precision = await newPropertyValue(jsAst, astObject.varName, 'precision', 0);

                    const randomVariable = (Math.random() * (newMax - newMin + 1)) + newMin;

                    return {
                        ...astObject,
                        value: precision === 0 ? Math.floor(randomVariable) : +randomVariable.toPrecision(precision)
                    };
                }
                else {
                    return astObject;
                }
            })
        };

        return {
            html: compileToHTML(newAmlAst),
            ast: newAmlAst
        };
    }
    catch(error) {
        console.log('probably a JS parsing error while the user is typing');
        // There will be many intermediate JavaScript parsing errors while the user is typing. If that happens, do nothing
        return {
            html: compileToHTML(text),
            ast: parse(text)
        };
    }
}

async function newPropertyValue(jsAst: Program, varName: string, propertyName: string, defaultValue: number): Promise<number> {
    const objectsWithProperty = jsAst.body.filter((bodyObj) => {
        return bodyObj.type === 'ExpressionStatement' && bodyObj.expression.type === 'AssignmentExpression' && (<MemberExpression> bodyObj.expression.left).object && (<Identifier> (<MemberExpression> bodyObj.expression.left).object).name === varName && (<Identifier> (<MemberExpression> bodyObj.expression.left).property).name === propertyName;
    });

    if (objectsWithProperty.length > 0) {
        return (await secureEval(`
            postMessage({
                result: ${escodegen.generate((<AssignmentExpression> (<ExpressionStatement> objectsWithProperty[0]).expression).right)}
            });
        `)).result;
    }
    else {
        return defaultValue;
    }
}

export async function checkAnswer(code: string, userVariables: UserVariable[], userInputs: UserInput[], userEssays: UserEssay[], userChecks: UserCheck[], userRadios: UserRadio[]) {
    const defineUserVariablesString = userVariables.reduce((result: string, userVariable) => {
        return `${result}let ${userVariable.varName} = new Number(${userVariable.value});`;
    }, '');
    const defineUserInputsString = userInputs.reduce((result: string, userInput) => {
        return `${result}let ${userInput.varName} = '${userInput.value.replace(/'/g, '\\\'').replace(/\n/g, '\\n')}';`;
    }, '');
    const defineUserEssaysString = userEssays.reduce((result: string, userEssay) => {
        return `${result}let ${userEssay.varName} = '${userEssay.value.replace(/'/g, '\\\'').replace(/\n/g, '\\n')}';`;
    }, '');
    const defineUserChecksString = userChecks.reduce((result: string, userCheck) => {
        return `${result}let ${userCheck.varName} = ${userCheck.checked};`;
    }, '');
    const defineUserRadiosString = userRadios.reduce((result: string, userRadio) => {
        return `${result}let ${userRadio.varName} = ${userRadio.checked};`;
    }, '');

    const codeToEval = `
        let answer;
        ${defineUserVariablesString}
        ${defineUserInputsString}
        ${defineUserEssaysString}
        ${defineUserChecksString}
        ${defineUserRadiosString}
        ${code}

        postMessage({
            answer
        });
    `;

    return await secureEval(codeToEval);
}
