import {AST, ASTObject} from 'assessml';

export interface Action {
    readonly type: string;
}

export interface SetGlobalPropertyAction {
    readonly type: 'SET_GLOBAL_PROPERTY';
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
    readonly originalVariableValues: string[];
}

export interface Question {
    readonly assessML: string;
    readonly javaScript: string;
}

export type Reducer = (state: State, action: Action) => State;

export interface PrendusViewQuestionState {
    readonly componentId: string;
    readonly loaded: boolean;
    readonly question: Question;
    readonly builtQuestion: BuiltQuestion;
    readonly showSolution: boolean;
    readonly showEmbedCode: boolean;
    readonly checkAnswerResponse: string;
    readonly solutionButtonText: string;
}

export interface State {
    readonly components: {
        readonly [componentId: string]: PrendusViewQuestionState;
    };
}

export type UserASTObject = UserVariable | UserInput | UserEssay | UserCheck | UserRadio;

export interface UserVariable {
    readonly type: 'USER_VARIABLE';
    readonly varName: string;
    readonly value: number | string;
}

export interface UserImage {
    readonly type: 'USER_IMAGE';
    readonly varName: string;
    readonly src: string;
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
    readonly content: ASTObject[];
    readonly checked: boolean;
}

export interface UserRadio {
    readonly type: 'USER_RADIO';
    readonly varName: string;
    readonly content: ASTObject[];
    readonly checked: boolean;
}

export interface UserGraph {
    readonly type: 'USER_GRAPH';
    readonly varName: string;
    readonly equations: string[];
}

export interface UserCode {
    readonly type: 'USER_CODE';
    readonly varName: string;
    readonly value: string;
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
