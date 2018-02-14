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
    Code,
    Graph,
    ASTObjectType
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
    ConditionalExpression,
    LogicalExpression
} from 'estree';
import {UserVariable, UserCheck, UserRadio, UserInput, UserEssay, UserASTObject} from '../prendus-question-elements.d';
import {normalizeASTObjectPayloads} from '../../assessml/assessml';

declare var esprima: any;

//TODO there is a lot of repeated code in here
export async function buildQuestion(text: string, code: string): Promise<{
    html: string;
    ast: AST;
    originalVariableValues;
}> {
    try {
        const originalAmlAst = parse(text, () => generateRandomInteger(0, 10), () => '', () => [], () => null);

        const astVariables: Variable[] = <Variable[]> getAstObjects(originalAmlAst, 'VARIABLE');
        const astImages: Image[] = <Image[]> getAstObjects(originalAmlAst, 'IMAGE');
        const astInputs: Input[] = <Input[]> getAstObjects(originalAmlAst, 'INPUT');
        const astEssays: Essay[] = <Essay[]> getAstObjects(originalAmlAst, 'ESSAY');
        const astCodes: Code[] = <Code[]> getAstObjects(originalAmlAst, 'CODE');
        const astChecks: Check[] = <Check[]> getAstObjects(originalAmlAst, 'CHECK');
        const astRadios: Radio[] = <Radio[]> getAstObjects(originalAmlAst, 'RADIO');
        const astGraphs: Graph[] = <Graph[]> getAstObjects(originalAmlAst, 'GRAPH');

        const astVariablesString = createUserVariablesString(astVariables);
        const astImagesString = createUserImagesString(astImages);
        const astInputsString = createUserInputsString(astInputs);
        const astEssaysString = createUserEssaysString(astEssays);
        const astCodesString = createUserCodesString(astCodes);
        const astChecksString = createUserChecksString(astChecks);
        const astRadiosString = createUserRadiosString(astRadios);
        const astGraphsString = createUserGraphsString(astGraphs);

        const originalVariableValues = await secureEval(`
            let answer = true;
            ${astVariablesString}
            ${astImagesString}
            ${astInputsString}
            ${astEssaysString}
            ${astCodesString}
            ${astChecksString}
            ${astRadiosString}
            ${astGraphsString}
            ${code}
            postMessage({
                ${[...astVariables.map((astVariable: Variable) => astVariable.varName), ...astImages.map((astImage: Image) => astImage.varName), ...astGraphs.map((astGraph: Graph) => astGraph.varName), getAssignedToVariableNames(esprima.parse(code), astInputs, astEssays, astChecks, astRadios)]}
            });
        `);

        if (originalVariableValues.error) {
            return {
                html: compileToHTML(originalVariableValues.error, () => generateRandomInteger(0, 100), () => '', () => [], () => []),
                ast: parse(text, () => generateRandomInteger(0, 100), () => '', () => [], () => []),
                originalVariableValues: {}
            };
        }

        const newAmlAst: AST = await injectVariableValues(originalAmlAst, originalVariableValues);
        const normalizedAmlAst: AST = normalizeASTObjectPayloads(newAmlAst, newAmlAst);

        return {
            html: compileToHTML(normalizedAmlAst, () => generateRandomInteger(0, 10), () => '', () => [], () => []),
            ast: normalizedAmlAst,
            originalVariableValues
        };
    }
    catch(error) {
        console.log(error);
        console.log('probably a JS parsing error while the user is typing');
        // There will be many intermediate JavaScript parsing errors while the user is typing. If that happens, do nothing
        return {
            html: compileToHTML(text, () => generateRandomInteger(0, 100), () => '', () => [], () => []),
            ast: parse(text, () => generateRandomInteger(0, 100), () => '', () => [], () => []),
            originalVariableValues: {}
        };
    }
}

async function injectVariableValues(originalAmlAst: AST, originalVariableValues): Promise<AST> {
    return await asyncReduce(originalAmlAst.ast, async (result: AST, astObject: ASTObject, index: number) => {
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

        if (astObject.type === 'GRAPH') {
            return {
                ...result,
                ast: [...result.ast.slice(0, index), {
                    ...astObject,
                    equations: originalVariableValues[astObject.varName].equations || []
                }, ...result.ast.slice(index + 1)]
            };
        }

        if (
            astObject.type === 'CHECK' ||
            astObject.type === 'RADIO' ||
            astObject.type === 'SOLUTION' ||
            astObject.type === 'SHUFFLE' ||
            astObject.type === 'DRAG' ||
            astObject.type === 'DROP'
        ) {
            return {
                ...result,
                ast: [...result.ast.slice(0, index), {
                    ...astObject,
                    content: (await injectVariableValues({
                        type: 'AST',
                        ast: astObject.content
                    }, originalVariableValues)).ast
                }, ...result.ast.slice(index + 1)]
            };
        }

        return result;
    }, originalAmlAst);
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

function substituteVariablesInLogicalExpression(logicalExpression: LogicalExpression, substitutionFunctions, originalVariableValues) {
    return {
        ...logicalExpression,
        left: (() => {
            const substitutionFunction = substitutionFunctions[logicalExpression.left.type];
            return substitutionFunction ? substitutionFunction(logicalExpression.left, substitutionFunctions, originalVariableValues) : logicalExpression.left;
        })(),
        right: (() => {
            const substitutionFunction = substitutionFunctions[logicalExpression.right.type];
            return substitutionFunction ? substitutionFunction(logicalExpression.right, substitutionFunctions, originalVariableValues) : logicalExpression.right;
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

export async function checkAnswer(code: string, originalVariableValues, userVariables: UserVariable[], userInputs: UserInput[], userEssays: UserEssay[], userCodes: UserCodes[], userChecks: UserCheck[], userRadios: UserRadio[], userImages: UserImages[], userGraphs: UserGraphs[]) {
    const userVariablesString = createUserVariablesString(userVariables);
    const userInputsString = createUserInputsString(userInputs);
    const userEssaysString = createUserEssaysString(userEssays);
    const userCodesString = createUserCodesString(userCodes);
    const userChecksString = createUserChecksString(userChecks);
    const userRadiosString = createUserRadiosString(userRadios);
    const userImagesString = createUserImagesString(userImages);
    const userGraphsString = createUserGraphsString(userGraphs);

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
        'MemberExpression': substituteVariablesInMemberExpression,
        'LogicalExpression': substituteVariablesInLogicalExpression
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
        ${userGraphsString}
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

function createUserGraphsString(astGraphs: Graph[]) {
    return normalizeUserGraphs(astGraphs).reduce((result: string, astGraph: Graph) => {
        return `${result}let ${astGraph.varName} = {};`;
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

function normalizeUserGraphs(userGraphs: UserGraph[] | Graph[]): UserGraph[] | Graph[] {
    return userGraphs.reduce((result: UserGraph[] | Graph[], outerUserGraph: UserGraph | Graph, index: number) => {
        return [userGraphs[index], ...result.filter((innerUserGraph) => outerUserGraph.varName !== innerUserGraph.varName)];
    }, userGraphs);
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

    const body = answerAssignment ? jsAst.body : [...jsAst.body, getBasicAnswerAssignment()];

    return body.map((object) => {
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

export function setUserASTObjectValue(code: string, userASTObject: UserASTObject): string {
    const jsAst: Program = esprima.parse(code);
    return escodegen.generate({
        ...jsAst,
        body: jsAst.body.map((object) => {
            if (
                object.type === 'ExpressionStatement' &&
                object.expression.type === 'AssignmentExpression' &&
                object.expression.left.type === 'Identifier' &&
                object.expression.left.name === 'answer'
            ) {
                const userASTValue = userASTObject.type === 'USER_RADIO' || userASTObject.type === 'USER_CHECK' ? userASTObject.checked : userASTObject.value;

                if (object.expression.right.type === 'BinaryExpression') {
                    return {
                        ...object,
                        expression: {
                            ...object.expression,
                            right: setIdentifierValueInBinaryExpression(object.expression.right, userASTObject.varName, userASTValue)
                        }
                    };
                }

                if (object.expression.right.type === 'LogicalExpression') {
                    return {
                        ...object,
                        expression: {
                            ...object.expression,
                            right: setIdentifierValueInLogicalExpression(object.expression.right, userASTObject.varName, userASTValue)
                        }
                    };
                }
            }

            return object;
        })
    });
}

export function getUserASTObjectValue(code: string, userASTObject: UserASTObject) {
    const jsAst: Program = esprima.parse(code);
    return jsAst.body.reduce((result, object) => {
        if (
            object.type === 'ExpressionStatement' &&
            object.expression.type === 'AssignmentExpression' &&
            object.expression.left.type === 'Identifier' &&
            object.expression.left.name === 'answer'
        ) {
            if (object.expression.right.type === 'BinaryExpression') {
                return getIdentifierValueFromBinaryExpression(object.expression.right, userASTObject.varName);
            }

            if (object.expression.right.type === 'LogicalExpression') {
                return getIdentifierValueFromLogicalExpression(object.expression.right, userASTObject.varName);
            }
        }

        return result;
    }, null);
}

export function getUserASTObjectsFromAnswerAssignment(text: string, code: string, type: ASTObjectType): UserASTObject[]  {
    const astObjects: ASTObject[] = getAstObjects(
        parse(text, () => 5, () => '', () => [], () => []),
        type
    );

    const jsAst: Program = esprima.parse(code);

    return astObjects.map((astObject: ASTObject) => {
        return jsAst.body.reduce((result: UserASTObject, object) => {
            if (
                object.type === 'ExpressionStatement' &&
                object.expression.type === 'AssignmentExpression' &&
                object.expression.left.type === 'Identifier' &&
                object.expression.left.name === 'answer'
            ) {
                if (object.expression.right.type === 'BinaryExpression') {
                    return {
                        ...result,
                        checked: getIdentifierValueFromBinaryExpression(object.expression.right, astObject.varName)
                    };
                }

                if (object.expression.right.type === 'LogicalExpression') {
                    return {
                        ...result,
                        checked: getIdentifierValueFromLogicalExpression(object.expression.right, astObject.varName)
                    };
                }
            }

            return result;
        }, {
            varName: astObject.varName,
            checked: false,
            content: astObject.content
        });
    });
}

export function nullifyUserASTObjectInAnswerAssignment(code: String, userASTObject: UserASTObject): string {
    const jsAst: Program = esprima.parse(code);
    return escodegen.generate({
        ...jsAst,
        body: jsAst.body.map((object) => {
            if (
                object.type === 'ExpressionStatement' &&
                object.expression.type === 'AssignmentExpression' &&
                object.expression.left.type === 'Identifier' &&
                object.expression.left.name === 'answer'
            ) {
                if (object.expression.right.type === 'BinaryExpression') {
                    return {
                        ...object,
                        expression: {
                            ...object.expression,
                            right: nullifyIdentifierInBinaryExpression(object.expression.right, userASTObject.varName)
                        }
                    };
                }

                if (object.expression.right.type === 'LogicalExpression') {
                    return {
                        ...object,
                        expression: {
                            ...object.expression,
                            right: nullifyIdentifierInLogicalExpression(object.expression.right, userASTObject.varName)
                        }
                    };
                }
            }

            return object;
        })
    });
}

function getIdentifierValueFromBinaryExpression(expression: BinaryExpression, identifierName: string) {
    if (
        expression.left.type === 'Identifier' &&
        expression.left.name === identifierName
    ) {
        if (
            expression.right.type === 'Literal'
        ) {
            return expression.right.value;
        }
    }

    if (
        expression.right.type === 'Identifier' &&
        expression.right.name === identifierName
    ) {
        if (
            expression.left.type === 'Literal'
        ) {
            return expression.left.value;
        }
    }
}

function getIdentifierValueFromLogicalExpression(expression: LogicalExpression, identifierName: string): any {
    if (expression.left.type === 'BinaryExpression') {
        const value = getIdentifierValueFromBinaryExpression(expression.left, identifierName);
        if (value !== undefined) {
            return value;
        }
    }

    if (expression.right.type === 'BinaryExpression') {
        const value = getIdentifierValueFromBinaryExpression(expression.right, identifierName);
        if (value !== undefined) {
            return value;
        }
    }

    if (expression.left.type === 'LogicalExpression') {
        const value = getIdentifierValueFromLogicalExpression(expression.left, identifierName);
        if (value !== undefined) {
            return value;
        }
    }

    if (expression.right.type === 'LogicalExpression') {
        const value = getIdentifierValueFromLogicalExpression(expression.right, identifierName);
        if (value !== undefined) {
            return value;
        }
    }
}

function setIdentifierValueInBinaryExpression(expression: BinaryExpression, identifierName: string, value: any): BinaryExpression {
    return {
        ...expression,
        left: (() => {
            if (expression.right.type === 'Identifier' && expression.right.name === identifierName) {
                return {
                    ...expression.left,
                    value
                };
            }

            return expression.left;
        })(),
        right: (() => {
            if (expression.left.type === 'Identifier' && expression.left.name === identifierName) {
                return {
                    ...expression.right,
                    value
                };
            }

            return expression.right;
        })()
    };
}

function setIdentifierValueInLogicalExpression(expression: LogicalExpression, identifierName: string, value: any): LogicalExpression {
    return {
        ...expression,
        left: (() => {
            if (expression.left.type === 'BinaryExpression') {
                return setIdentifierValueInBinaryExpression(expression.left, identifierName, value);
            }

            if (expression.left.type === 'LogicalExpression') {
                return setIdentifierValueInLogicalExpression(expression.left, identifierName, value);
            }

            return expression.left;
        })(),
        right: (() => {
            if (expression.right.type === 'BinaryExpression') {
                return setIdentifierValueInBinaryExpression(expression.right, identifierName, value);
            }

            if (expression.right.type === 'LogicalExpression') {
                return setIdentifierValueInLogicalExpression(expression.right, identifierName, value);
            }

            return expression.right;
        })()
    };
}

function nullifyIdentifierInBinaryExpression(expression: BinaryExpression, identifierName: string): BinaryExpression {
    if (
        (
            expression.right.type === 'Identifier' &&
            expression.right.name === identifierName
        ) ||
        (
            expression.left.type === 'Identifier' &&
            expression.left.name === identifierName
        )
    ) {
        return {
            ...expression,
            left: {
                type: 'Literal',
                value: true
            },
            right: {
                type: 'Literal',
                value: true
            }
        };
    }

    return expression;
}

function nullifyIdentifierInLogicalExpression(expression: LogicalExpression, identifierName: string): LogicalExpression {
    return {
        ...expression,
        left: (() => {
            if (expression.left.type === 'BinaryExpression') {
                return nullifyIdentifierInBinaryExpression(expression.left, identifierName);
            }

            if (expression.left.type === 'LogicalExpression') {
                return nullifyIdentifierInLogicalExpression(expression.left, identifierName);
            }

            return expression.left;
        })(),
        right: (() => {
            if (expression.right.type === 'BinaryExpression') {
                return nullifyIdentifierInBinaryExpression(expression.right, identifierName);
            }

            if (expression.right.type === 'LogicalExpression') {
                return nullifyIdentifierInLogicalExpression(expression.right, identifierName);
            }

            return expression.right;
        })()
    };
}

export function setUserASTObjectIdentifierNameInAnswerAssignment(code: string, userASTObject: UserASTObject, newName: string): string {
    const jsAst: Program = esprima.parse(code);
    return escodegen.generate({
        ...jsAst,
        body: jsAst.body.map((object) => {
            if (
                object.type === 'ExpressionStatement' &&
                object.expression.type === 'AssignmentExpression' &&
                object.expression.left.type === 'Identifier' &&
                object.expression.left.name === 'answer'
            ) {
                if (object.expression.right.type === 'BinaryExpression') {
                    return {
                        ...object,
                        expression: {
                            ...object.expression,
                            right: setIdentifierNameInBinaryExpression(object.expression.right, userASTObject.varName, newName)
                        }
                    };
                }

                if (object.expression.right.type === 'LogicalExpression') {
                    return {
                        ...object,
                        expression: {
                            ...object.expression,
                            right: setIdentifierNameInLogicalExpression(object.expression.right, userASTObject.varName, newName)
                        }
                    };
                }
            }

            return object;
        })
    });
}

function setIdentifierNameInBinaryExpression(expression: BinaryExpression, identifierName: string, newName: string): BinaryExpression {
    return {
        ...expression,
        left: (() => {
            if (expression.left.type === 'Identifier' && expression.left.name === identifierName) {
                return {
                    ...expression.left,
                    name: newName
                };
            }

            return expression.left;
        })(),
        right: (() => {
            if (expression.right.type === 'Identifier' && expression.right.name === identifierName) {
                return {
                    ...expression.right,
                    name: newName
                };
            }

            return expression.right;
        })()
    };
}

function setIdentifierNameInLogicalExpression(expression: LogicalExpression, identifierName: string, newName: string): LogicalExpression {
    return {
        ...expression,
        left: (() => {
            if (expression.left.type === 'BinaryExpression') {
                return setIdentifierNameInBinaryExpression(expression.left, identifierName, newName);
            }

            if (expression.left.type === 'LogicalExpression') {
                return setIdentifierNameInLogicalExpression(expression.left, identifierName, newName);
            }

            return expression.left;
        })(),
        right: (() => {
            if (expression.right.type === 'BinaryExpression') {
                return setIdentifierNameInBinaryExpression(expression.right, identifierName, newName);
            }

            if (expression.right.type === 'LogicalExpression') {
                return setIdentifierNameInLogicalExpression(expression.right, identifierName, newName);
            }

            return expression.right;
        })()
    };
}
