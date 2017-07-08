import {State} from './state';
import {Action} from './actions';

export type Reducer = (state: State, action: Action) => State;
