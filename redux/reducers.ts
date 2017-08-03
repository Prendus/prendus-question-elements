import {State} from '../prendus-question-elements.d';
import {InitialState} from './initial-state';
import {Action, SetPropertyAction, SetComponentPropertyAction} from '../prendus-question-elements.d';
import {Reducer} from '../prendus-question-elements.d';

export const RootReducer: Reducer = (state: State = InitialState, action: Action): State => {
    switch(action.type) {
        case 'SET_PROPERTY': {
            const _action = <SetPropertyAction> action;
            return {
                ...state,
                [_action.key]: _action.value
            };
        }
        case 'SET_COMPONENT_PROPERTY': {
            const _action = <SetComponentPropertyAction> action;
            return {
                ...state,
                components: {
                    ...state.components,
                    [_action.componentId]: {
                        ...state.components[_action.componentId],
                        [_action.key]: _action.value
                    }
                }
            };
        }
        default: {
            return state;
        }
    }
};
