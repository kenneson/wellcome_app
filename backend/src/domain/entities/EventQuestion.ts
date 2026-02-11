import { QuestionType } from '../value-objects/QuestionType';

export interface EventQuestion {
    id: string;
    eventId: string;
    question: string;
    questionType: QuestionType;
    options: string[];
    required: boolean;
    order: number;
    createdAt: Date;
}
