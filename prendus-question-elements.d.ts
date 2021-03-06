import {AST} from '../assessml/assessml.d';

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

export type UserASTObject = UserVariable | UserInput | UserEssay | UserCheck | UserRadio;

export interface UserVariable {
    readonly type: 'USER_VARIABLE';
    readonly varName: string;
    readonly value: number;
}

export interface UserInput {
    readonly type: 'USER_INPUT';
    readonly varName: string;
    readonly value: string;
}

export interface UserEssay {
    readonly type: 'USER_ESSAY';
    readonly varName: string;
    readonly value: string;
}

export interface UserCheck {
    readonly type: 'USER_CHECK';
    readonly varName: string;
    readonly checked: boolean;
}

export interface UserRadio {
    readonly type: 'USER_RADIO';
    readonly varName: string;
    readonly checked: boolean;
}

export interface QuestionScaffold {

}

export interface QuestionScaffoldAnswer {

}

export interface CodeInfo {
    readonly code: string;
    readonly userChecks: UserCheck[];
    readonly userRadios: UserRadio[];
    readonly userEssays: UserEssay[];
    readonly userInputs: UserInput[];
    readonly oneRadioHasBeenSetToTrue: boolean;
    readonly varInfos: {
        readonly min: number;
        readonly max: number;
        readonly precision: number;
    }[];
}
