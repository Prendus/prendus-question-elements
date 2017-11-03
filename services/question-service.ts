import {parse, compileToHTML, getAstObjects} from '../../assessml/assessml';
import {asyncMap, asyncReduce} from '../../prendus-shared/services/utilities-service';
import {secureEval} from '../../secure-eval/secure-eval';
import {AST, ASTObject, Variable, Input, Essay, Check, Radio, Content, Drag, Drop, Image} from '../../assessml/assessml.d';
import {Program, ExpressionStatement, MemberExpression, Identifier, AssignmentExpression, Literal, BinaryExpression} from 'estree';
import {UserVariable, UserCheck, UserRadio, UserInput, UserEssay} from '../prendus-question-elements.d';
import {normalizeVariables} from '../../assessml/utilities';

export async function buildQuestion(text: string, code: string): Promise<{
    html: string;
    ast: AST;
}> {
    try {
        const originalAmlAst = parse(text, () => undefined, () => '');
        const jsAst: Program = esprima.parse(code);

        const initialVariablesSetAmlAst = await asyncReduce(originalAmlAst.ast, async (result: AST, astObject: ASTObject, index: number) => {
                if (astObject.type === 'VARIABLE') {
                    const newMin = await getPropertyValue(jsAst, result, astObject.varName, 'min', 0);
                    const newMax = await getPropertyValue(jsAst, result, astObject.varName, 'max', 100);
                    const newPrecision = await getPropertyValue(jsAst, result, astObject.varName, 'precision', 0);
                    const randomVariable = (Math.random() * (newMax - newMin + 1)) + newMin;
                    const newValue = await getAssignmentValue(jsAst, result, astObject.varName);
                    const value = (newValue || newValue === 0) ? newValue : (astObject.value === undefined ? newPrecision === 0 ? Math.floor(randomVariable) : +randomVariable.toPrecision(newPrecision) : astObject.value);

                    return {
                        ...result,
                        ast: [...result.ast.slice(0, index), {
                            ...astObject,
                            value
                        }, ...result.ast.slice(index + 1)]
                    };
                }

                return result;
            }, originalAmlAst);

        const normalizedInitialVariablesSetAmlAst = normalizeVariables(initialVariablesSetAmlAst);

        const newAmlAst = await asyncReduce(normalizedInitialVariablesSetAmlAst.ast, async (result: AST, astObject: ASTObject, index: number) => {
                if (astObject.type === 'VARIABLE') {
                    const newMin = await getPropertyValue(jsAst, result, astObject.varName, 'min', 0);
                    const newMax = await getPropertyValue(jsAst, result, astObject.varName, 'max', 100);
                    const newPrecision = await getPropertyValue(jsAst, result, astObject.varName, 'precision', 0);
                    const randomVariable = (Math.random() * (newMax - newMin + 1)) + newMin;
                    const newValue = await getAssignmentValue(jsAst, result, astObject.varName);
                    const value = (newValue || newValue === 0) ? newValue : (astObject.value === undefined ? newPrecision === 0 ? Math.floor(randomVariable) : +randomVariable.toPrecision(newPrecision) : astObject.value);

                    return {
                        ...result,
                        ast: [...result.ast.slice(0, index), {
                            ...astObject,
                            value
                        }, ...result.ast.slice(index + 1)]
                    };
                }

                if (astObject.type === 'IMAGE') {
                    return {
                        ...result,
                        ast: [...result.ast.slice(0, index), {
                            ...astObject,
                            src: await getPropertyValue(jsAst, result, astObject.varName, 'src', '')
                        }, ...result.ast.slice(index + 1)]
                    };
                }

                return result;
            }, normalizedInitialVariablesSetAmlAst);

        const normalizedAmlAst = normalizeVariables(newAmlAst);

        return {
            html: compileToHTML(normalizedAmlAst, () => generateRandomInteger(0, 100), () => ''),
            ast: normalizedAmlAst
        };
    }
    catch(error) {
        console.log(error);
        console.log('probably a JS parsing error while the user is typing');
        // There will be many intermediate JavaScript parsing errors while the user is typing. If that happens, do nothing
        return {
            html: compileToHTML(text, () => generateRandomInteger(0, 100), () => ''),
            ast: parse(text, () => generateRandomInteger(0, 100), () => '')
        };
    }
}

async function getPropertyValue(jsAst: Program, amlAst: AST, varName: string, propertyName: string, defaultValue: number | string): Promise<number | string> {
    const objectsWithProperty = jsAst.body.filter((bodyObj) => {
        return bodyObj.type === 'ExpressionStatement' && bodyObj.expression.type === 'AssignmentExpression' && (<MemberExpression> bodyObj.expression.left).object && (<Identifier> (<MemberExpression> bodyObj.expression.left).object).name === varName && (<Identifier> (<MemberExpression> bodyObj.expression.left).property).name === propertyName;
    });

    if (objectsWithProperty.length > 0) {
        const astVariables: Variable[] = <Variable[]> getAstObjects(amlAst, 'VARIABLE');
        const astImages: Image[] = <Image[]> getAstObjects(amlAst, 'IMAGE');
        const defineUserVariablesString = normalizeUserVariables(astVariables).reduce((result: string, astVariable: Variable) => {
            return `${result}let ${astVariable.varName} = ${typeof astVariable.value === 'number' ? `new Number(${astVariable.value})` : typeof astVariable.value === 'string' ? `new String('${astVariable.value}')` : NaN};`;
        }, '');
        const defineUserImagesString = astImages.reduce((result: string, astImage: Image) => {
            return `${result}let ${astImage.varName} = {};`;
        }, '');

        console.log('defineUserVariablesString', defineUserVariablesString);

        return (await secureEval(`
            ${defineUserVariablesString}
            ${defineUserImagesString}
            ${escodegen.generate(jsAst)}

            postMessage({
                result: ${escodegen.generate((<AssignmentExpression> (<ExpressionStatement> objectsWithProperty[0]).expression).right)}
            });
        `)).result;
    }
    else {
        return defaultValue;
    }
}

async function getAssignmentValue(jsAst: Program, amlAst: AST, varName: string): Promise<number | string | undefined> {
    const objectsWithAssignment = jsAst.body.filter((bodyObj) => {
        return bodyObj.type === 'ExpressionStatement' && bodyObj.expression.type === 'AssignmentExpression' && bodyObj.expression.left.type === 'Identifier' && bodyObj.expression.left.name === varName;
    });

    if (objectsWithAssignment.length > 0) {
        const astVariables: Variable[] = <Variable[]> getAstObjects(amlAst, 'VARIABLE');
        const defineUserVariablesString = normalizeUserVariables(astVariables).reduce((result: string, astVariable: Variable) => {
            return `${result}let ${astVariable.varName} = ${typeof astVariable.value === 'number' ? `new Number(${astVariable.value})` : typeof astVariable.value === 'string' ? `new String('${astVariable.value}')` : NaN};`;
        }, '');

        return (await secureEval(`
            ${defineUserVariablesString}
            ${escodegen.generate(jsAst)}

            postMessage({
                result: ${escodegen.generate((<AssignmentExpression> (<ExpressionStatement> objectsWithAssignment[objectsWithAssignment.length - 1]).expression).right)}
            });
        `)).result;
    }
    else {
        return undefined;
    }
}

export async function checkAnswer(code: string, userVariables: UserVariable[], userInputs: UserInput[], userEssays: UserEssay[], userChecks: UserCheck[], userRadios: UserRadio[]) {
    const defineUserVariablesString = normalizeUserVariables(userVariables).reduce((result: string, userVariable) => {
        return `${result}let ${userVariable.varName} = new Number(${userVariable.value});`;
    }, '');
    const defineUserInputsString = userInputs.reduce((result: string, userInput) => {
        return `${result}let ${userInput.varName} = '${userInput.value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n')}';`;
    }, '');
    const defineUserEssaysString = userEssays.reduce((result: string, userEssay) => {
        return `${result}let ${userEssay.varName} = '${userEssay.value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n')}';`;
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

function generateRandomInteger(min: number, max: number): number {
    //returns a random integer between min (included) and max (included)
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeUserVariables(userVariables: UserVariable[]): UserVariable[] {
    return userVariables.reduce((result: UserVariable[], outerUserVariable: UserVariable, index: number) => {
        return [userVariables[index], ...result.filter((innerUserVariable) => outerUserVariable.varName !== innerUserVariable.varName)];
    }, userVariables);
}

export function insertVariableIntoCode(code: string, varName: string, minValue: string, maxValue: string, precisionValue: string) {
    const jsAst: Program = esprima.parse(code);
    return escodegen.generate({
        ...jsAst,
        body: [
            createPropertyAssignment(varName, 'min', minValue),
            createPropertyAssignment(varName, 'max', maxValue),
            createPropertyAssignment(varName, 'precision', precisionValue),
            ...jsAst.body
        ]
    });
}

function createPropertyAssignment(varName: string, property: string, value: number | string) {
    return {
        type: 'ExpressionStatement',
        expression: {
            type: 'AssignmentExpression',
            operator: '=',
            left: {
                type: 'MemberExpression',
                computed: false,
                object: {
                    type: 'Identifier',
                    name: varName
                },
                property: {
                    type: 'Identifier',
                    name: property
                }
            },
            right: {
                type: 'Literal',
                value: value,
                raw: value.toString()
            }
        }
    };
}

export function insertRadioOrCheckIntoCode(code: string, varName: string, correct: boolean): string {
    const jsAst: Program = esprima.parse(code);
    const expressionToAdd: BinaryExpression = {
        type: 'BinaryExpression',
        operator: '===',
        left: {
            type: 'Identifier',
            name: varName
        },
        right: {
            type: 'Literal',
            value: correct,
            raw: correct.toString()
        }
    };
    return escodegen.generate({
        ...jsAst,
        body: addToAnswerAssignment(jsAst, expressionToAdd)
    });
}

export function insertInputIntoCode(code: string, varName: string, answer: string): string {
    const jsAst: Program = esprima.parse(code);
    const expressionToAdd: BinaryExpression = {
        type: 'BinaryExpression',
        operator: '===',
        left: {
            type: 'Identifier',
            name: varName
        },
        right: {
            type: 'Literal',
            value: answer,
            raw: `'${answer}'`
        }
    };
    return escodegen.generate({
        ...jsAst,
        body: addToAnswerAssignment(jsAst, expressionToAdd)
    });
}

export function insertEssayIntoCode(code: string): string {
    const jsAst: Program = esprima.parse(code);
    const expressionToAdd: Literal = {
        type: 'Literal',
        value: true,
        raw: "true"
    };
    return escodegen.generate({
        ...jsAst,
        body: addToAnswerAssignment(jsAst, expressionToAdd)
    });
}

export function insertImageIntoCode(code: string, varName: string, src: string): string {
    const jsAst: Program = esprima.parse(code);
    return escodegen.generate({
        ...jsAst,
        body: [
            createPropertyAssignment(varName, 'src', src),
            ...jsAst.body
        ]
    });
}

function addToAnswerAssignment(jsAst: Program, expressionToAdd: any) {
    const answerAssignment = jsAst.body.filter((object) => {
        return isAnswerAssignment(object);
    })[0];

    if (answerAssignment) {
        return jsAst.body.map((object) => {
            if (isAnswerAssignment(object)) {
                const right = object.expression.right;
                return {
                    ...object,
                    expression: {
                        ...object.expression,
                        right: {
                            type: 'LogicalExpression',
                            operator: '&&',
                            left: expressionToAdd,
                            right
                        }
                    }
                };
            }
            else {
                return object;
            }
        });
    }
    else {
        return [...jsAst.body, getBasicAnswerAssignment()];
    }
}

function isAnswerAssignment(object): boolean {
    return (
        object.type === 'ExpressionStatement' &&
        object.expression.left &&
        object.expression.left.type === 'Identifier' &&
        object.expression.left.name === 'answer'
    )
}

function getBasicAnswerAssignment() {
    return {
        type: 'ExpressionStatement',
        expression: {
            type: 'AssignmentExpression',
            operator: '=',
            left: {
                type: 'Identifier',
                name: 'answer'
            },
            right: {
                type: 'Literal',
                value: true,
                raw: 'true'
            }
        }
    };
}
