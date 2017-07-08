import {Answer} from './answer';
import {User} from './user';

export interface BuiltQuestion {
    readonly transformedText: string;
    readonly text: string;
    readonly code: string;
    readonly answer: Answer;
    readonly uuid: string;
    readonly userInputs: string[];
    readonly userCheckboxes: string[];
    readonly userRadios: string[];
    readonly author: User;
}
