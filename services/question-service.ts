import {parse, compileToHTML, getAstObjects, generateRandomInteger} from '../../assessml/assessml';
import {asyncMap, asyncReduce} from '../../prendus-shared/services/utilities-service';
import {secureEval} from '../../secure-eval/secure-eval';
import {
    AST,
    ASTObject,
    Variable,
    Input,
    Essay,
    Check,
    Radio,
    Content,
    Drag,
    Drop,
    Image,
    Solution,
    Code
} from '../../assessml/assessml.d';
import {
    Program,
    ExpressionStatement,
    MemberExpression,
    Identifier,
    AssignmentExpression,
    Literal,
    BinaryExpression,
    VariableDeclaration,
    CallExpression,
    ArrayExpression,
    VariableDeclarator,
    IfStatement,
    BlockStatement,
    WhileStatement,
    DoWhileStatement,
    ForStatement,
    UpdateExpression,
    ConditionalExpression
} from 'estree';
import {UserVariable, UserCheck, UserRadio, UserInput, UserEssay} from '../prendus-question-elements.d';
import {normalizeVariables} from '../../assessml/assessml';

//TODO there is a lot of repeated code in here
export async function buildQuestion(text: string, code: string): Promise<{
    html: string;
    ast: AST;
    originalVariableValues;
}> {
    try {
        const originalAmlAst = parse(text, () => generateRandomInteger(0, 10), () => '');

        const astVariables: Variable[] = <Variable[]> getAstObjects(originalAmlAst, 'VARIABLE');
        const astImages: Image[] = <Image[]> getAstObjects(originalAmlAst, 'IMAGE');
        const astInputs: Input[] = <Input[]> getAstObjects(originalAmlAst, 'INPUT');
        const astEssays: Essay[] = <Essay[]> getAstObjects(originalAmlAst, 'ESSAY');
        const astCodes: Code[] = <Code[]> getAstObjects(originalAmlAst, 'CODE');
        const astChecks: Check[] = <Check[]> getAstObjects(originalAmlAst, 'CHECK');
        const astRadios: Radio[] = <Radio[]> getAstObjects(originalAmlAst, 'RADIO');

        const astVariablesString = createUserVariablesString(astVariables);
        const astImagesString = createUserImagesString(astImages);
        const astInputsString = createUserInputsString(astInputs);
        const astEssaysString = createUserEssaysString(astEssays);
        const astCodesString = createUserCodesString(astCodes);
        const astChecksString = createUserChecksString(astChecks);
        const astRadiosString = createUserRadiosString(astRadios);

        const originalVariableValues = await secureEval(`
            let answer;
            ${astVariablesString}
            ${astImagesString}
            ${astInputsString}
            ${astEssaysString}
            ${astCodesString}
            ${astChecksString}
            ${astRadiosString}
            ${code}
            postMessage({
                ${[...astVariables.map((astVariable: Variable) => astVariable.varName), ...astImages.map((astImage: Image) => astImage.varName), getAssignedToVariableNames(esprima.parse(code), astInputs, astEssays, astChecks, astRadios)]}
            });
        `);

        if (originalVariableValues.error) {
            return {
                html: compileToHTML(originalVariableValues.error, () => generateRandomInteger(0, 100), () => ''),
                ast: parse(text, () => generateRandomInteger(0, 100), () => ''),
                originalVariableValues: {}
            };
        }

        const newAmlAst: AST = await asyncReduce(originalAmlAst.ast, async (result: AST, astObject: ASTObject, index: number) => {
            if (astObject.type === 'VARIABLE') {
                const originalVariableValue = originalVariableValues[astObject.varName];
                return {
                    ...result,
                    ast: [...result.ast.slice(0, index), {
                        ...astObject,
                        value: (originalVariableValue || originalVariableValue === 0) ? originalVariableValue : generateRandomInteger(0, 10)
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

            if (astObject.type === 'RADIO' || astObject.type === 'CHECK' || astObject.type === 'SOLUTION') {
                return {
                    ...result,
                    ast: [...result.ast.slice(0, index), {
                        ...astObject,
                        content: await asyncReduce(astObject.content, async (result: (Variable | Content | Image)[], astObject: Variable | Content, index: number) => {
                            if (astObject.type === 'VARIABLE') {
                                const originalVariableValue = originalVariableValues[astObject.varName];
                                return [...result.slice(0, index), {
                                    ...astObject,
                                    value: (originalVariableValue || originalVariableValue === 0) ? originalVariableValue : generateRandomInteger(0, 10)
                                }, ...result.slice(index + 1)];
                            }

                            if (astObject.type === 'IMAGE') {
                                return [...result.slice(0, index), {
                                    ...astObject,
                                    src: originalVariableValues[astObject.varName] ? originalVariableValues[astObject.varName].src : ''
                                }, ...result.slice(index + 1)];
                            }

                            return result;
                        }, astObject.content)
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
            ast: parse(text, () => generateRandomInteger(0, 100), () => ''),
            originalVariableValues: {}
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

function substituteVariablesForValues(jsAst: Program, substitutionFunctions, originalVariableValues) {
    return {
        ...jsAst,
        body: jsAst.body.map((astObject) => {
            const substitutionFunction = substitutionFunctions[astObject.type];
            return substitutionFunction ? substitutionFunction(astObject, substitutionFunctions, originalVariableValues) : astObject;
        })
    };
}

function substituteVariablesInExpressionStatement(expressionStatement: ExpressionStatement, substitutionFunctions, originalVariableValues) {
    const substitutionFunction = substitutionFunctions[expressionStatement.expression.type];
    return {
        ...expressionStatement,
        expression: substitutionFunction ? substitutionFunction(expressionStatement.expression, substitutionFunctions, originalVariableValues) : expressionStatement.expression
    };
}

function substituteVariablesInVariableDeclaration(variableDeclaration: VariableDeclaration, substitutionFunctions, originalVariableValues) {
    return {
        ...variableDeclaration,
        declarations: variableDeclaration.declarations.map((variableDeclarator: VariableDeclarator) => {
            const substitutionFunction = substitutionFunctions[variableDeclarator.init.type];
            return {
                ...variableDeclarator,
                init: substitutionFunction ? substitutionFunction(variableDeclarator.init, substitutionFunctions, originalVariableValues) : variableDeclarator.init
            };
        })
    };
}

function substituteVariablesInAssignmentExpression(assignmentExpression: AssignmentExpression, substitutionFunctions, originalVariableValues) {
    const substitutionFunction = substitutionFunctions[assignmentExpression.right.type];
    if (substitutionFunction) {
        return {
            ...assignmentExpression,
            right: substitutionFunction(assignmentExpression.right, substitutionFunctions, originalVariableValues)
        };
    }
    else {
        return assignmentExpression;
    }
}

function substituteVariablesinArrayExpression(arrayExpression: ArrayExpression, substitutionFunctions, originalVariableValues) {
    return {
        ...arrayExpression,
        elements: arrayExpression.elements.map((element) => {
            const substitutionFunction = substitutionFunctions[element.type];
            return substitutionFunction ? substitutionFunction(element, substitutionFunctions, originalVariableValues) : element;
        })
    }
}

function substituteVariablesInObjectExpression(objectExpression: ObjectExpression, substitutionFunctions, originalVariableValues) {
    return {
        ...objectExpression,
        properties: objectExpression.properties.map((property) => {
            const substitutionFunction = substitutionFunctions[property.value.type];
            return {
                ...property,
                value: substitutionFunction ? substitutionFunction(property.value, substitutionFunctions, originalVariableValues) : property.value
            };
        })
    };
}

function substituteVariablesInCallExpression(callExpression: CallExpression, substitutionFunctions, originalVariableValues) {
    return {
        ...callExpression,
        callee: (() => {
            const substitutionFunction = substitutionFunctions[callExpression.callee.type];
            return substitutionFunction ? substitutionFunction(callExpression.callee, substitutionFunctions, originalVariableValues) : callExpression.callee;
        })(),
        arguments: callExpression.arguments.map((argument) => {
            const substitutionFunction = substitutionFunctions[argument.type];
            return substitutionFunction ? substitutionFunction(argument, substitutionFunctions, originalVariableValues) : argument;
        })
    };
}

function substituteVariablesInIdentifier(identifier: Identifier, substitutionFunctions, originalVariableValues) {
    if (Object.keys(originalVariableValues).includes(identifier.name)) {
        return {
            type: 'Literal',
            value: originalVariableValues[identifier.name]
        };
    }

    return identifier;
}

function substituteVariablesInBinaryExpression(binaryExpression: BinaryExpression, substitutionFunctions, originalVariableValues): BinaryExpression {
    return {
        ...binaryExpression,
        left: (() => {
            const substitutionFunction = substitutionFunctions[binaryExpression.left.type];
            return substitutionFunction ? substitutionFunction(binaryExpression.left, substitutionFunctions, originalVariableValues) : binaryExpression.left;
        })(),
        right: (() => {
            const substitutionFunction = substitutionFunctions[binaryExpression.right.type];
            return substitutionFunction ? substitutionFunction(binaryExpression.right, substitutionFunctions, originalVariableValues) : binaryExpression.right;
        })()
    };
}

function substituteVariablesInIfStatementOrConditionalExpression(statementOrExpression: IfStatement | ConditionalExpression, substitutionFunctions, originalVariableValues) {
    return {
        ...statementOrExpression,
        test: (() => {
            const substitutionFunction = substitutionFunctions[statementOrExpression.test.type];
            return substitutionFunction ? substitutionFunction(statementOrExpression.test, substitutionFunctions, originalVariableValues) : statementOrExpression.test;
        })(),
        consequent: (() => {
            const substitutionFunction = substitutionFunctions[statementOrExpression.consequent.type];
            return substitutionFunction ? substitutionFunction(statementOrExpression.consequent, substitutionFunctions, originalVariableValues) : statementOrExpression.consequent;
        })(),
        ...(statementOrExpression.alternate ? {
            alternate: (() => {
                const substitutionFunction = substitutionFunctions[statementOrExpression.alternate.type];
                return substitutionFunction ? substitutionFunction(statementOrExpression.alternate, substitutionFunctions, originalVariableValues) : statementOrExpression.alternate;
            })()
        } : {})
    };
}

function substituteVariablesInBlockStatement(blockStatement: BlockStatement, substitutionFunctions, originalVariableValues) {
    return {
        ...blockStatement,
        body: substituteVariablesForValues({
            type: 'Program',
            body: blockStatement.body
        }, substitutionFunctions, originalVariableValues).body
    };
}

function substituteVariablesInWhileOrDoWhileStatement(statement: WhileStatement | DoWhileStatement, substitutionFunctions, originalVariableValues) {
    return {
        ...statement,
        test: (() => {
            const substitutionFunction = substitutionFunctions[statement.test.type];
            return substitutionFunction ? substitutionFunction(statement.test, substitutionFunctions, originalVariableValues) : statement.test;
        })(),
        body: (() => {
            const substitutionFunction = substitutionFunctions[statement.body.type];
            return substitutionFunction ? substitutionFunction(statement.body, substitutionFunctions, originalVariableValues) : statement.body;
        })()
    };
}

function substituteVariablesInForStatement(forStatement: ForStatement, substitutionFunctions, originalVariableValues) {
    return {
        ...forStatement,
        init: (() => {
            const substitutionFunction = substitutionFunctions[forStatement.init.type];
            return substitutionFunction ? substitutionFunction(forStatement.init, substitutionFunctions, originalVariableValues) : forStatement.init;
        })(),
        test: (() => {
            const substitutionFunction = substitutionFunctions[forStatement.test.type];
            return substitutionFunction ? substitutionFunction(forStatement.test, substitutionFunctions, originalVariableValues) : forStatement.test;
        })(),
        update: (() => {
            const substitutionFunction = substitutionFunctions[forStatement.update.type];
            return substitutionFunction ? substitutionFunction(forStatement.update, substitutionFunctions, originalVariableValues) : forStatement.update;
        })(),
        body: (() => {
            const substitutionFunction = substitutionFunctions[forStatement.body.type];
            return substitutionFunction ? substitutionFunction(forStatement.body, substitutionFunctions, originalVariableValues) : forStatement.body;
        })()
    };
}

function substituteVariablesInUpdateExpression(updateExpression: UpdateExpression, substitutionFunctions, originalVariableValues) {
    return {
        ...updateExpression,
        argument: (() => {
            const substitutionFunction = substitutionFunctions[updateExpression.argument.type];
            return substitutionFunction ? substitutionFunction(updateExpression.argument, substitutionFunctions, originalVariableValues) : updateExpression.argument;
        })()
    };
}

function substituteVariablesInMemberExpression(memberExpression: MemberExpression, substitutionFunctions, originalVariableValues) {
    return {
        ...memberExpression,
        object: (() => {
            const memberExpressionObjectSubstitutionFunctions = {
                ...substitutionFunctions
            };
            delete memberExpressionObjectSubstitutionFunctions.Identifier;

            const substitutionFunction = memberExpressionObjectSubstitutionFunctions[memberExpression.object.type];
            return substitutionFunction ? substitutionFunction(memberExpression.object, substitutionFunctions, originalVariableValues) : memberExpression.object;
        })(),
        property: (() => {
            const substitutionFunction = substitutionFunctions[memberExpression.property.type];
            return substitutionFunction ? substitutionFunction(memberExpression.property, substitutionFunctions, originalVariableValues) : memberExpression.property;
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

export async function checkAnswer(code: string, originalVariableValues, userVariables: UserVariable[], userInputs: UserInput[], userEssays: UserEssay[], userCodes: UserCodes[], userChecks: UserCheck[], userRadios: UserRadio[], userImages: UserImages[]) {
    const userVariablesString = createUserVariablesString(userVariables);
    const userInputsString = createUserInputsString(userInputs);
    const userEssaysString = createUserEssaysString(userEssays);
    const userCodesString = createUserCodesString(userCodes);
    const userChecksString = createUserChecksString(userChecks);
    const userRadiosString = createUserRadiosString(userRadios);
    const userImagesString = createUserImagesString(userImages);

    const substitutionFunctions = {
        'Identifier': substituteVariablesInIdentifier,
        'ArrayExpression': substituteVariablesinArrayExpression,
        'BinaryExpression': substituteVariablesInBinaryExpression,
        'CallExpression': substituteVariablesInCallExpression,
        'ObjectExpression': substituteVariablesInObjectExpression,
        'IfStatement': substituteVariablesInIfStatementOrConditionalExpression,
        'ConditionalExpression': substituteVariablesInIfStatementOrConditionalExpression,
        'BlockStatement': substituteVariablesInBlockStatement,
        'ExpressionStatement': substituteVariablesInExpressionStatement,
        'VariableDeclaration': substituteVariablesInVariableDeclaration,
        'WhileStatement': substituteVariablesInWhileOrDoWhileStatement,
        'DoWhileStatement': substituteVariablesInWhileOrDoWhileStatement,
        'ForStatement': substituteVariablesInForStatement,
        'AssignmentExpression': substituteVariablesInAssignmentExpression,
        'UpdateExpression': substituteVariablesInUpdateExpression,
        'MemberExpression': substituteVariablesInMemberExpression
    };
    const jsAst = esprima.parse(code);

    const jsAstReplacedVariables = substituteVariablesForValues(jsAst, substitutionFunctions, originalVariableValues);
    const codeReplacedVariables = escodegen.generate(jsAstReplacedVariables);

    const codeToEval = `
        let answer;
        ${userVariablesString}
        ${userInputsString}
        ${userEssaysString}
        ${userCodesString}
        ${userChecksString}
        ${userRadiosString}
        ${userImagesString}
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
    return normalizeUserImages(astImages).reduce((result: string, astImage: Image) => {
        return `${result}let ${astImage.varName} = {};`;
    }, '');
}

function createUserInputsString(userInputs: UserInput[]) {
    return userInputs.map((userInput) => Object.keys(userInput).includes('value') ? userInput : {
        ...userInput,
        value: ''
    }).reduce((result: string, userInput) => {
        return `${result}let ${userInput.varName} = '${userInput.value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n')}';`;
    }, '');
}

function createUserEssaysString(userEssays: UserEssay[]) {
    return userEssays.map((userEssay) => Object.keys(userEssay).includes('value') ? userEssay : {
        ...userEssay,
        value: ''
    }).reduce((result: string, userEssay) => {
        return `${result}let ${userEssay.varName} = '${userEssay.value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n')}';`;
    }, '');
}

function createUserCodesString(userCodes: UserCode[]) {
    return userCodes.map((userCode) => Object.keys(userCode).includes('value') ? userCode : {
        ...userCode,
        value: ''
    }).reduce((result: string, userCode) => {
        return `${result}let ${userCode.varName} = '${userCode.value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n')}';`;
    }, '');
}

function createUserChecksString(userChecks: UserCheck[]) {
    return userChecks.map((userCheck) => Object.keys(userCheck).includes('checked') ? userCheck : {
        ...userCheck,
        checked: false
    }).reduce((result: string, userCheck) => {
        return `${result}let ${userCheck.varName} = ${userCheck.checked};`;
    }, '');
}

function createUserRadiosString(userRadios: UserRadio[]) {
    return userRadios.map((userRadio) => Object.keys(userRadio).includes('checked') ? userRadio : {
        ...userRadio,
        checked: false
    }).reduce((result: string, userRadio) => {
        return `${result}let ${userRadio.varName} = ${userRadio.checked};`;
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

function normalizeUserImages(userImages: UserImage[] | Image[]): UserVariable[] | Variable[] {
    return userImages.reduce((result: UserVariable[] | Variable[], outerUserImage: UserVariable | Variable, index: number) => {
        return [userImages[index], ...result.filter((innerUserImage) => outerUserImage.varName !== innerUserImage.varName)];
    }, userImages);
}

export async function insertVariableIntoCode(code: string, varName: string, minValue: string, maxValue: string, precisionValue: string) {
    const jsAst: Program = esprima.parse(code);
    return escodegen.generate({
        ...jsAst,
        body: [
            createCallExpression('importScripts', [createLiteral(`https://cdn.rawgit.com/Prendus/functions/${await getLatestFunctionsTagName()}/functions.js`)]),
            createAssignmentExpression(varName, createCallExpression('toPrecision', [createCallExpression('randFloat', [createLiteral(minValue), createLiteral(maxValue)]), createLiteral(precisionValue)])),
            ...jsAst.body
        ]
    });
}

async function getLatestFunctionsTagName(): Promise<string> {
    const response = await window.fetch('https://api.github.com/repos/Prendus/functions/git/refs/tags');
    const tags = await response.json();
    const lastTag = tags[tags.length - 1];
    const lastTagName = lastTag.ref.slice(lastTag.ref.lastIndexOf('/') + 1);
    return lastTagName;
}

function createAssignmentExpression(varName: string, value) {
    return {
        type: 'ExpressionStatement',
        expression: {
            type: 'AssignmentExpression',
            operator: '=',
            left: {
                type: 'Identifier',
                name: varName
            },
            right: value
        }
    };
}

function createCallExpression(name: string, args) {
    return {
        type: 'CallExpression',
        callee: {
            type: 'Identifier',
            name
        },
        arguments: args
    };
}

function createLiteral(value: string | number) {
    return {
        type: 'Literal',
        value,
        raw: value.toString()
    };
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

export function insertCodeIntoCode(code: string): string {
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
