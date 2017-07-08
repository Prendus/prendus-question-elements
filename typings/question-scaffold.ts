import {QuestionScaffoldAnswer} from './question-scaffold-answer';
import {Question} from './question';

export interface QuestionScaffold {
  readonly answers: {
    [ questionScaffoldAnswerId: string]: QuestionScaffoldAnswer;
  };
  readonly question: string;
  readonly concept: string;
  readonly explanation: string;
  readonly convertedQuestion: Question;
}
