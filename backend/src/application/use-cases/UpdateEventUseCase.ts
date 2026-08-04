import { EventRepository } from '../../domain/repositories/EventRepository';
import { EventQuestionRepository } from '../../domain/repositories/EventQuestionRepository';
import { Event, UpdateEventDTO } from '../../domain/entities/Event';
import { QuestionType } from '../../domain/value-objects/QuestionType';
import { INVALID_EVENT_PRICE_MESSAGE, isValidEventPrice } from '../../domain/constants/payments';

export class UpdateEventUseCase {
    constructor(
        private eventRepository: EventRepository,
        private eventQuestionRepository: EventQuestionRepository
    ) { }

    async execute(eventId: string, hostId: string, data: UpdateEventDTO): Promise<Event> {
        const event = await this.eventRepository.findById(eventId);
        if (!event) {
            throw new Error('Event not found');
        }

        if (event.hostId !== hostId) {
            throw new Error('Only the host can update this event');
        }

        if (data.price !== undefined && !isValidEventPrice(Number(data.price))) {
            throw new Error(INVALID_EVENT_PRICE_MESSAGE);
        }

        // Update questions if provided
        if (data.questions && data.questions.length > 0) {
            await this.eventQuestionRepository.deleteByEventId(eventId);
            await this.eventQuestionRepository.createMany(
                data.questions.map((q, index) => ({
                    eventId,
                    question: q.question,
                    questionType: q.questionType as QuestionType,
                    options: q.options || [],
                    required: q.required,
                    order: index
                }))
            );
        }

        const { questions, dishes, ...eventData } = data;
        return this.eventRepository.update(eventId, { ...eventData, dishes });
    }
}
