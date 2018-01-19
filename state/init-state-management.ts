import {
    GraphSMInit,
    Any
} from '../../graphsm/graphsm';

const reduxLogger = (store) => (next) => (action) => {
    console.log('dispatching', action);
    const result = next(action);
    console.log('state', store.getState());
    return result;
};

GraphSMInit({
    initialLocalState: {
        components: {}
    },
    localSchema: `
        scalar Any

        interface ComponentState {
            componentId: String!
        }

        type Query {
            componentState(componentId: String!): ComponentState!
        }

        type Mutation {
            updateComponentState(componentId: String!, props: Any): Any
        }
    `,
    localResolvers: {
        Any: Any, //TODO the reason I'm not shortening this with ES6 is most likely because of a bug in my SystemJS while emulating ES modules
        componentState: (variables, state) => {
            return state.components[variables.componentId];
        },
        updateComponentState: (variables, state) => {
            return {
                ...state,
                components: {
                    ...state.components,
                    [variables.componentId]: {
                        ...state.components[variables.componentId],
                        ...variables.props
                    }
                }
            };
        }
    },
    reduxMiddlewares: [reduxLogger]
});
