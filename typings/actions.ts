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
