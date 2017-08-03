import {AST} from 'assessml';

export interface Action {
    readonly type: string;
}

export interface SetPropertyAction {
    readonly type: 'SET_PROPERTY';
    readonly key: string;
    readonly value: any;
}

export interface SetComponentPropertyAction {
    readonly type: 'SET_COMPONENT_PROPERTY';
    readonly componentId: string;
    readonly key: string;
    readonly value: any;
}

export interface DefaultAction {
    readonly type: 'DEFAULT_ACTION';
}

export interface BuiltQuestion {
    readonly html: string;
    readonly ast: AST;
}

export type GQLMutateErrorCallback = (error: any) => void;

export type GQLQueryDataCallback = (key: string, value: any) => void;

export type GQLQueryErrorCallback = (error: any) => void;

export type GQLSubscribeCallback = (data: any) => void;

export interface Question {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly text: string;
    readonly code: string;
    readonly quiz: Quiz | null;
    readonly author: User;
    readonly license: string;
    readonly discipline: Discipline;
    readonly subject: Subject;
    readonly concept: Concept
    readonly resource: string;
    readonly explanation: string;
    readonly answerComments: {};
}

export type Reducer = (state: State, action: Action) => State;

export interface State {
    readonly components: {
        readonly [componentId: string]: any;
    };
}

export interface User {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly courses: Course[];
    readonly assignments: Assignment[];
    readonly quizzes: Quiz[];
    readonly questions: Question[];
}

export interface UserVariable {
    varName: string;
    value: number;
}

export interface UserInput {
    varName: string;
    value: string;
}

export interface UserEssay {
    varName: string;
    value: string;
}

export interface UserCheck {
    varName: string;
    checked: boolean;
}

export interface UserRadio {
    varName: string;
    checked: boolean;
}

export interface QuestionScaffold {

}

export interface QuestionScaffoldAnswer {
    
}
