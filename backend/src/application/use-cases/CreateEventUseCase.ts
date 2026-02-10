import { EventRepository } from '../../domain/repositories/EventRepository';
import { EventQuestionRepository } from '../../domain/repositories/EventQuestionRepository';
import { CreateEventDTO, Event } from '../../domain/entities/Event';
import { prisma } from '../../infrastructure/database/prismaClient';
import { QuestionType } from '../../domain/value-objects/QuestionType';

export class CreateEventUseCase {
    constructor(
        private eventRepository: EventRepository,
        private eventQuestionRepository: EventQuestionRepository
    ) { }

    async execute(data: CreateEventDTO): Promise<Event> {
        // Business validation could go here
        if (data.maxGuests < 1) {
            throw new Error('Event must have at least 1 guest');
        }

        // Validate if host exists to prevent Foreign Key Constraint error
        // Since we are moving fast, we can auto-create the user if they don't exist
        const host = await prisma.user.findUnique({ where: { id: data.hostId } });
        if (!host) {
            // In a real scenario, we might want to throw an error if the user doesn't exist,
            // or rely on a trigger. For now, we create a placeholder profile.
            await prisma.user.create({
                data: {
                    id: data.hostId,
                    fullName: `User ${data.hostId.substring(0, 5)}`,
                    username: `user_${data.hostId.substring(0, 5)}`
                }
            });
        }

        const event = await this.eventRepository.create(data);

        // Save custom questions if any
        if (data.questions && data.questions.length > 0) {
            await this.eventQuestionRepository.createMany(
                data.questions.map((q, index) => ({
                    eventId: event.id,
                    question: q.question,
                    questionType: q.questionType as QuestionType,
                    options: q.options || [],
                    required: q.required,
                    order: index
                }))
            );
        }

        return event;
    }
}
