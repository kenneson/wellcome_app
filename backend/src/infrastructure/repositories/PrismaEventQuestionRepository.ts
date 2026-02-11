import { EventQuestionRepository, CreateEventQuestionDTO } from '../../domain/repositories/EventQuestionRepository';
import { EventQuestion } from '../../domain/entities/EventQuestion';
import { prisma } from '../database/prismaClient';
import { QuestionType } from '../../domain/value-objects/QuestionType';

export class PrismaEventQuestionRepository implements EventQuestionRepository {
    async createMany(questions: CreateEventQuestionDTO[]): Promise<void> {
        if (questions.length === 0) return;

        await prisma.eventQuestion.createMany({
            data: questions.map(q => ({
                eventId: q.eventId,
                question: q.question,
                questionType: q.questionType,
                options: q.options,
                required: q.required,
                order: q.order
            }))
        });
    }

    async findByEventId(eventId: string): Promise<EventQuestion[]> {
        const questions = await prisma.eventQuestion.findMany({
            where: { eventId },
            orderBy: { order: 'asc' }
        });

        return questions.map(q => ({
            id: q.id,
            eventId: q.eventId,
            question: q.question,
            questionType: q.questionType as QuestionType,
            options: q.options,
            required: q.required,
            order: q.order,
            createdAt: q.createdAt
        }));
    }

    async deleteByEventId(eventId: string): Promise<void> {
        await prisma.eventQuestion.deleteMany({
            where: { eventId }
        });
    }
}
