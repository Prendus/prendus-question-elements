import {Quiz} from './quiz';
import {User} from './user';
import {Discipline} from './discipline';
import {Subject} from './subject';
import {Concept} from './concept';


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
