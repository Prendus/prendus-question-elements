import {parse, compileToHTML, getAstObjects, generateRandomInteger} from '../../assessml/assessml';
import {asyncMap, asyncReduce} from '../../prendus-shared/services/utilities-service';
import {secureEval} from '../../secure-eval/secure-eval';
import {AST, ASTObject, Variable, Input, Essay, Check, Radio, Content, Drag, Drop, Image, Solution} from '../../assessml/assessml.d';
import {Program, ExpressionStatement, MemberExpression, Identifier, AssignmentExpression, Literal, BinaryExpression, VariableDeclaration, CallExpression} from 'estree';
import {UserVariable, UserCheck, UserRadio, UserInput, UserEssay} from '../prendus-question-elements.d';
import {normalizeVariables} from '../../assessml/assessml';

//TODO there is a lot of repeated code in here
export async function buildQuestion(text: string, code: string): Promise<{
    html: string;
    ast: AST;
    originalVariableValues;
}> {
    try {
        // const jsAst: Program = esprima.parse(code);

        // const initialVariablesSetAmlAst = await asyncReduce(originalAmlAst.ast, async (result: AST, astObject: ASTObject, index: number) => {
                // if (astObject.type === 'VARIABLE') {
                    // const newMin = await getPropertyValue(jsAst, result, astObject.varName, 'min', 0);
                    // const newMax = await getPropertyValue(jsAst, result, astObject.varName, 'max', 100);
                    // const newPrecision = await getPropertyValue(jsAst, result, astObject.varName, 'precision', 0);
                    // const randomVariable = (Math.random() * (newMax - newMin + 1)) + newMin;
                    // const newValue = await getAssignmentValue(jsAst, result, astObject.varName);
                    // const value = (newValue || newValue === 0) ? newValue : (astObject.value === undefined ? newPrecision === 0 ? Math.floor(randomVariable) : +randomVariable.toPrecision(newPrecision) : astObject.value);
                    //
                //     return {
                //         ...result,
                //         ast: [...result.ast.slice(0, index), {
                //             ...astObject,
                //             value: await getAssignmentValue(jsAst, result, astObject.varName, generateRandomInteger(0, 10))
                //         }, ...result.ast.slice(index + 1)]
                //     };
                // }

                // if (astObject.type === 'IMAGE') {
                //     return {
                //         ...result,
                //         ast: [...result.ast.slice(0, index), {
                //             ...astObject,
                //             src: await getPropertyValue(jsAst, result, astObject.varName, 'src', '')
                //         }, ...result.ast.slice(index + 1)]
                //     };
                // }

                // if (astObject.type === 'RADIO' || astObject.type === 'CHECK' || astObject.type === 'SOLUTION') {
                //     return {
                //         ...result,
                //         ast: [...result.ast.slice(0, index), {
                //             ...astObject,
                //             content: await asyncReduce(astObject.content, async (result: (Variable | Content | Image)[], astObject: Variable | Content, index: number) => {
                //                 if (astObject.type === 'VARIABLE') {
                //                     const newMin = await getPropertyValue(jsAst, {
                //                         type: 'AST',
                //                         ast: result
                //                     }, astObject.varName, 'min', 0);
                //                     const newMax = await getPropertyValue(jsAst, {
                //                         type: 'AST',
                //                         ast: result
                //                     }, astObject.varName, 'max', 100);
                //                     const newPrecision = await getPropertyValue(jsAst, {
                //                         type: 'AST',
                //                         ast: result
                //                     }, astObject.varName, 'precision', 0);
                //                     const randomVariable = (Math.random() * (+newMax - +newMin + 1)) + +newMin;
                //                     const newValue = await getAssignmentValue(jsAst, {
                //                         type: 'AST',
                //                         ast: result
                //                     }, astObject.varName);
                //                     const value = (newValue || newValue === 0) ? newValue : (astObject.value === undefined ? newPrecision === 0 ? Math.floor(randomVariable) : +randomVariable.toPrecision(newPrecision) : astObject.value);
                //
                //                     return [...result.slice(0, index), {
                //                         ...astObject,
                //                         value
                //                     }, ...result.slice(index + 1)];
                //                 }
                //
                //                 return result;
                //             }, astObject.content)
                //         }, ...result.ast.slice(index + 1)]
                //     };
                // }

        //         return result;
        //     }, originalAmlAst);
        //
        // const normalizedInitialVariablesSetAmlAst = normalizeVariables(initialVariablesSetAmlAst);

        // const newAmlAst = await asyncReduce(normalizedInitialVariablesSetAmlAst.ast, async (result: AST, astObject: ASTObject, index: number) => {
        //         if (astObject.type === 'VARIABLE') {
        //             const newMin = await getPropertyValue(jsAst, result, astObject.varName, 'min', 0);
        //             const newMax = await getPropertyValue(jsAst, result, astObject.varName, 'max', 100);
        //             const newPrecision = await getPropertyValue(jsAst, result, astObject.varName, 'precision', 0);
        //             const randomVariable = (Math.random() * (newMax - newMin + 1)) + newMin;
        //             const newValue = await getAssignmentValue(jsAst, result, astObject.varName);
        //             const value = (newValue || newValue === 0) ? newValue : (astObject.value === undefined ? newPrecision === 0 ? Math.floor(randomVariable) : +randomVariable.toPrecision(newPrecision) : astObject.value);
        //
        //             return {
        //                 ...result,
        //                 ast: [...result.ast.slice(0, index), {
        //                     ...astObject,
        //                     value
        //                 }, ...result.ast.slice(index + 1)]
        //             };
        //         }
        //
        //         if (astObject.type === 'IMAGE') {
        //             return {
        //                 ...result,
        //                 ast: [...result.ast.slice(0, index), {
        //                     ...astObject,
        //                     src: await getPropertyValue(jsAst, result, astObject.varName, 'src', '')
        //                 }, ...result.ast.slice(index + 1)]
        //             };
        //         }
        //
        //         if (astObject.type === 'RADIO' || astObject.type === 'CHECK' || astObject.type === 'SOLUTION') {
        //             return {
        //                 ...result,
        //                 ast: [...result.ast.slice(0, index), {
        //                     ...astObject,
        //                     content: await asyncReduce(astObject.content, async (result: (Variable | Content | Image)[], astObject: Variable | Content | Image, index: number) => {
        //                         if (astObject.type === 'VARIABLE') {
        //                             const newMin = await getPropertyValue(jsAst, {
        //                                 type: 'AST',
        //                                 ast: result
        //                             }, astObject.varName, 'min', 0);
        //                             const newMax = await getPropertyValue(jsAst, {
        //                                 type: 'AST',
        //                                 ast: result
        //                             }, astObject.varName, 'max', 100);
        //                             const newPrecision = await getPropertyValue(jsAst, {
        //                                 type: 'AST',
        //                                 ast: result
        //                             }, astObject.varName, 'precision', 0);
        //                             const randomVariable = (Math.random() * (+newMax - +newMin + 1)) + +newMin;
        //                             const newValue = await getAssignmentValue(jsAst, {
        //                                 type: 'AST',
        //                                 ast: result
        //                             }, astObject.varName);
        //                             const value = (newValue || newValue === 0) ? newValue : (astObject.value === undefined ? newPrecision === 0 ? Math.floor(randomVariable) : +randomVariable.toPrecision(newPrecision) : astObject.value);
        //
        //                             return [...result.slice(0, index), {
        //                                 ...astObject,
        //                                 value
        //                             }, ...result.slice(index + 1)];
        //                         }
        //
        //                         if (astObject.type === 'IMAGE') {
        //                             return [...result.slice(0, index), {
        //                                 ...astObject,
        //                                 src: await getPropertyValue(jsAst, {
        //                                     type: 'AST',
        //                                     ast: result
        //                                 }, astObject.varName, 'src', '')
        //                             }, ...result.slice(index + 1)];
        //                         }
        //
        //                         return result;
        //                     }, astObject.content)
        //                 }, ...result.ast.slice(index + 1)]
        //             };
        //         }
        //
        //         return result;
        //     }, normalizedInitialVariablesSetAmlAst);
        //
        // const normalizedAmlAst = normalizeVariables(newAmlAst);

        const originalAmlAst = parse(text, () => undefined, () => '');

        const astVariables: Variable[] = <Variable[]> getAstObjects(originalAmlAst, 'VARIABLE');
        const astImages: Image[] = <Image[]> getAstObjects(originalAmlAst, 'IMAGE');
        const astInputs: Input[] = <Input[]> getAstObjects(originalAmlAst, 'INPUT');
        const astEssays: Essay[] = <Essay[]> getAstObjects(originalAmlAst, 'ESSAY');
        const astChecks: Check[] = <Check[]> getAstObjects(originalAmlAst, 'CHECK');
        const astRadios: Radio[] = <Radio[]> getAstObjects(originalAmlAst, 'RADIO');

        const astVariablesString = createUserVariablesString(astVariables);
        const astImagesString = createUserImagesString(astImages);

        //TODO finish all of the astobjects...it's working

        const originalVariableValues = await secureEval(`
            let answer;
            ${astVariablesString}
            ${astImagesString}
            ${code}
            postMessage({
                ${getAssignedToVariableNames(esprima.parse(code), astInputs, astEssays, astChecks, astRadios)}
            });
        `);

        const newAmlAst: AST = await asyncReduce(originalAmlAst.ast, async (result: AST, astObject: ASTObject, index: number) => {
            if (astObject.type === 'VARIABLE') {
                return {
                    ...result,
                    ast: [...result.ast.slice(0, index), {
                        ...astObject,
                        value: originalVariableValues[astObject.varName] || generateRandomInteger(0, 10)
                    }, ...result.ast.slice(index + 1)]
                };
            }

            if (astObject.type === 'IMAGE') {
                return {
                    ...result,
                    ast: [...result.ast.slice(0, index), {
                        ...astObject,
                        src: originalVariableValues[astObject.varName] ? originalVariableValues[astObject.varName].src : ''
                    }, ...result.ast.slice(index + 1)]
                };
            }

            return result;
        }, originalAmlAst);

        const normalizedAmlAst: AST = normalizeVariables(newAmlAst);

        return {
            html: compileToHTML(normalizedAmlAst, () => generateRandomInteger(0, 10), () => ''),
            ast: normalizedAmlAst,
            originalVariableValues
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

// returns the names of all variables that have been assigned to in an Esprima JavaScript AST
function getAssignedToVariableNames(jsAst: Program, astInputs: Input[], astEssays: Essay[], astChecks: Check[], astRadios: Radio[]): string[] {
    return jsAst.body.reduce((result: string[], astObject) => {
        if (astObject.type === 'ExpressionStatement') {
            if (astObject.expression.type === 'AssignmentExpression') {
                if (astObject.expression.left.type === 'Identifier') {
                    if (
                        astInputs.filter((astInput: Input) => astInput.varName === astObject.expression.left.name).length === 0 &&
                        astEssays.filter((astEssay: Essay) => astEssay.varName === astObject.expression.left.name).length === 0 &&
                        astChecks.filter((astCheck: Check) => astCheck.varName === astObject.expression.left.name).length === 0 &&
                        astRadios.filter((astRadio: Radio) => astRadio.varName === astObject.expression.left.name).length === 0
                    ) {
                        //TODO put in the checks for dependence on the input, essay, check, and radio global variables
                        //isDependentOnGlobalVariable
                        return [...result, astObject.expression.left.name];
                    }
                }
            }
        }

        if (astObject.type === 'VariableDeclaration') {
            if (astObject.declarations[0].id.type === 'Identifier') {
                if (
                    astInputs.filter((astInput: Input) => astInput.varName === astObject.declarations[0].id.name).length === 0 &&
                    astEssays.filter((astEssay: Essay) => astEssay.varName === astObject.declarations[0].id.name).length === 0 &&
                    astChecks.filter((astCheck: Check) => astCheck.varName === astObject.declarations[0].id.name).length === 0 &&
                    astRadios.filter((astRadio: Radio) => astRadio.varName === astObject.declarations[0].id.name).length === 0
                ) {
                    return [...result, astObject.declarations[0].id.name];
                }
            }
        }

        return result;
    }, []);
}

function isDependentOnGlobalVariable(expression: BinaryExpression, globalVarName: string): boolean {
    return false;
}

function substituteVariablesForValues(jsAst: Program, originalVariableValues) {
    return {
        ...jsAst,
        body: jsAst.body.map((astObject) => {
            if (astObject.type === 'ExpressionStatement') {
                if (astObject.expression.type === 'AssignmentExpression') {
                    return {
                        ...astObject,
                        expression: substituteVariablesInAssignmentExpression(astObject.expression, originalVariableValues)
                    };
                }
            }

            return astObject;
        })
    };
}

function substituteVariablesInAssignmentExpression(assignmentExpression: AssignmentExpression, originalVariableValues) {
    if (assignmentExpression.right.type === 'Identifier') {
        return {
            ...assignmentExpression,
            right: substituteVariablesInIdentifier(assignmentExpression.right, originalVariableValues)
        };
    }

    if (assignmentExpression.right.type === 'BinaryExpression') {
        return {
            ...assignmentExpression,
            right: substituteVariablesInBinaryExpression(assignmentExpression.right, originalVariableValues)
        };
    }

    if (assignmentExpression.right.type === 'CallExpression') {
        return {
            ...assignmentExpression,
            right: substituteVariablesInCallExpression(assignmentExpression.right, originalVariableValues)
        };
    }

    return assignmentExpression;
}

function substituteVariablesInCallExpression(callExpression: CallExpression, originalVariableValues) {
    return {
        ...callExpression,
        arguments: callExpression.arguments.map((argument) => {
            if (argument.type === 'Identifier') {
                return substituteVariablesInIdentifier(argument, originalVariableValues);
            }

            if (argument.type === 'BinaryExpression') {
                return substituteVariablesInBinaryExpression(argument, originalVariableValues);
            }

            if (argument.type === 'CallExpression') {
                return substituteVariablesInCallExpression(argument, originalVariableValues);
            }

            return argument;
        })
    };
}

function substituteVariablesInIdentifier(identifier: Identifier, originalVariableValues) {
    if (
        Object.keys(originalVariableValues).includes(identifier.name)
    ) {
        return {
            type: 'Literal',
            value: originalVariableValues[identifier.name]
        };
    }

    return identifier;
}

function substituteVariablesInBinaryExpression(binaryExpression: BinaryExpression, originalVariableValues): BinaryExpression {
    return {
        ...binaryExpression,
        left: (() => {
            if (binaryExpression.left.type === 'Identifier') {
                if (
                    Object.keys(originalVariableValues).includes(binaryExpression.left.name)
                ) {
                    return {
                        type: 'Literal',
                        value: originalVariableValues[binaryExpression.left.name],
                        raw: originalVariableValues[binaryExpression.left.name].toString()
                    };
                }
            }

            if (binaryExpression.left.type === 'BinaryExpression') {
                return substituteVariablesInBinaryExpression(binaryExpression.left, originalVariableValues);
            }

            return binaryExpression.left;
        })(),
        right: (() => {
            if (binaryExpression.right.type === 'Identifier') {
                if (
                    Object.keys(originalVariableValues).includes(binaryExpression.right.name)
                ) {
                    return {
                        type: 'Literal',
                        value: originalVariableValues[binaryExpression.right.name],
                        raw: originalVariableValues[binaryExpression.right.name].toString()
                    };
                }
            }

            if (binaryExpression.left.type === 'BinaryExpression') {
                return substituteVariablesInBinaryExpression(binaryExpression.right, originalVariableValues);
            }

            return binaryExpression.right;
        })()
    };
}

async function getPropertyValue(jsAst: Program, amlAst: AST, varName: string, propertyName: string, defaultValue: number | string): Promise<number | string> {
    const objectsWithProperty = jsAst.body.filter((bodyObj) => {
        return bodyObj.type === 'ExpressionStatement' && bodyObj.expression.type === 'AssignmentExpression' && (<MemberExpression> bodyObj.expression.left).object && (<Identifier> (<MemberExpression> bodyObj.expression.left).object).name === varName && (<Identifier> (<MemberExpression> bodyObj.expression.left).property).name === propertyName;
    });

    if (objectsWithProperty.length > 0) {
        const astVariables: Variable[] = <Variable[]> getAstObjects(amlAst, 'VARIABLE');
        const astImages: Image[] = <Image[]> getAstObjects(amlAst, 'IMAGE');
        const userVariablesString = createUserVariablesString(astVariables);
        const defineUserImagesString = astImages.reduce((result: string, astImage: Image) => {
            return `${result}let ${astImage.varName} = {};`;
        }, '');

        return (await secureEval(`
            let answer;
            ${userVariablesString}
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

async function getAssignmentValue(jsAst: Program, amlAst: AST, varName: string, defaultValue: number | string): Promise<number | string> {
    const objectsWithAssignment = jsAst.body.filter((bodyObj) => {
        return bodyObj.type === 'ExpressionStatement' && bodyObj.expression.type === 'AssignmentExpression' && bodyObj.expression.left.type === 'Identifier' && bodyObj.expression.left.name === varName;
    });

    if (objectsWithAssignment.length > 0) {
        const astVariables: Variable[] = <Variable[]> getAstObjects(amlAst, 'VARIABLE');
        const userVariablesString = createUserVariablesString(astVariables);

        return (await secureEval(`
            ${userVariablesString}
            ${escodegen.generate(jsAst)}

            postMessage({
                result: ${escodegen.generate((<AssignmentExpression> (<ExpressionStatement> objectsWithAssignment[objectsWithAssignment.length - 1]).expression).right)}
            });
        `)).result;
    }
    else {
        return defaultValue;
    }
}

export async function checkAnswer(code: string, originalVariableValues, userVariables: UserVariable[], userInputs: UserInput[], userEssays: UserEssay[], userChecks: UserCheck[], userRadios: UserRadio[]) {
    const userVariablesString = createUserVariablesString(userVariables);
    const userInputsString = createUserInputsString(userInputs);
    // const defineUserInputsString = userInputs.reduce((result: string, userInput) => {
    //     return `${result}let ${userInput.varName} = '${userInput.value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n')}';`;
    // }, '');
    // const defineUserEssaysString = userEssays.reduce((result: string, userEssay) => {
    //     return `${result}let ${userEssay.varName} = '${userEssay.value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n')}';`;
    // }, '');
    // const defineUserChecksString = userChecks.reduce((result: string, userCheck) => {
    //     return `${result}let ${userCheck.varName} = ${userCheck.checked};`;
    // }, '');
    // const defineUserRadiosString = userRadios.reduce((result: string, userRadio) => {
    //     return `${result}let ${userRadio.varName} = ${userRadio.checked};`;
    // }, '');

    const jsAst = esprima.parse(code);
    const jsAstReplacedVariables = substituteVariablesForValues(jsAst, originalVariableValues);
    const codeReplacedVariables = escodegen.generate(jsAstReplacedVariables);

    console.log(codeReplacedVariables);

    const codeToEval = `
        let answer;
        ${userVariablesString}
        ${userInputsString}
        ${codeReplacedVariables}

        postMessage({
            answer
        });
    `;

    return await secureEval(codeToEval);
}

function createUserVariablesString(userVariables: UserVariable[] | Variable[]) {
    return normalizeUserVariables(userVariables).reduce((result: string, userVariable) => {
        return `${result}let ${userVariable.varName} = ${typeof userVariable.value === 'number' ? `new Number(${userVariable.value})` : typeof userVariable.value === 'string' ? `new String('${userVariable.value}')` : NaN};`;
    }, '');
}

function createUserImagesString(astImages: Image[]) {
    return astImages.reduce((result: string, astImage: Image) => {
        return `${result}let ${astImage.varName} = {};`;
    }, '');
}

function createUserInputsString(userInputs: UserInput[]) {
    return userInputs.reduce((result: string, userInput) => {
        return `${result}let ${userInput.varName} = '${userInput.value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n')}';`;
    }, '');
}

function generateRandomInteger(min: number, max: number): number {
    //returns a random integer between min (included) and max (included)
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeUserVariables(userVariables: UserVariable[] | Variable[]): UserVariable[] | Variable[] {
    return userVariables.reduce((result: UserVariable[] | Variable[], outerUserVariable: UserVariable | Variable, index: number) => {
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
