import {createStore} from 'redux';
import {
    State,
    Action,
    Reducer,
    SetComponentPropertyAction
} from '../prendus-question-elements.d';

const InitialState: State = {
    components: {}
};

const RootReducer: Reducer = (state: State = InitialState, action: Action) => {

    if (action.type === 'SET_COMPONENT_PROPERTY') {
        const concreteAction: SetComponentPropertyAction = <SetComponentPropertyAction> action;
        return {
            ...state,
            components: {
                ...state.components,
                [concreteAction.componentId]: {
                    ...state.components[concreteAction.componentId],
                    [concreteAction.key]: concreteAction.value
                }
            }
        };
    }

    return state;
};

export const Store = createStore(RootReducer);
