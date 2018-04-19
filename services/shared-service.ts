import {execute} from '../../graphsm/graphsm';
import {buildQuestion} from './question-service';
import {getAstObjects} from '../../assessml/assessml';

export async function loadQuestion(componentId: string, componentType: string, question: any, questionId: string, userToken: string | null) {
    await execute(`
        mutation prepareForQuestionQuery(
            $componentId: String!
            $props: Any
        ) {
            updateComponentState(componentId: $componentId, props: $props)
        }

        ${question ? `
            query getLocalQuestion($componentId: String!) {
                componentState(componentId: $componentId) {
                    ... on ${componentType} {
                        question {
                            text
                            code
                        }
                    }
                }
            }
        ` : `
            # TODO Do not forget to handle the case where the question is not found when the question id is set
            query getRemoteQuestion($questionId: ID!) {
                question: Question(
                    id: $questionId
                ) {
                    text
                    code
                }
            }
        `}

        mutation questionPrepared(
            $componentId: String!
            $props: Any
        ) {
            updateComponentState(componentId: $componentId, props: $props)
        }
    `, {
        prepareForQuestionQuery: (previousResult: any) => {
            return {
                componentId: componentId,
                props: {
                    question
                }
            };
        },
        getLocalQuestion: (previousResult: any) => {
            return {
                componentId: componentId
            };
        },
        getRemoteQuestion: (previousResult: any) => {
            return {
                questionId: questionId
            };
        },
        questionPrepared: async (previousResult: any) => {
            if (previousResult.data.question) {
                const question = previousResult.data.question;
                const builtQuestion = await buildQuestion(question.text, question.code);
                return {
                    componentId: componentId,
                    props: {
                        question,
                        builtQuestion,
                        showSolution: builtQuestion ? getAstObjects(builtQuestion.ast, 'SOLUTION').length > 0 : false
                    }
                };
            }

            if (previousResult.data.componentState) {
                const question = previousResult.data.componentState.question;
                const builtQuestion = await buildQuestion(question.text, question.code);
                return {
                    componentId: componentId,
                    props: {
                        question,
                        builtQuestion,
                        showSolution: builtQuestion ? getAstObjects(builtQuestion.ast, 'SOLUTION').length > 0 : false
                    }
                };
            }

            return {};
        }
    }, userToken);
}
