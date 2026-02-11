import { EventQuestion } from '../entities/EventQuestion';

export interface CreateEventQuestionDTO {
    eventId: string;
    question: string;
    questionType: import('../value-objects/QuestionType').QuestionType;
    options: string[];
    required: boolean;
    order: number;
}

export interface EventQuestionRepository {
    createMany(questions: CreateEventQuestionDTO[]): Promise<void>;
    findByEventId(eventId: string): Promise<EventQuestion[]>;
    deleteByEventId(eventId: string): Promise<void>;
}
