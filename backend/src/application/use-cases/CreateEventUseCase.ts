import { EventRepository } from '../../domain/repositories/EventRepository';
import { EventQuestionRepository } from '../../domain/repositories/EventQuestionRepository';
import { UserRepository } from '../../domain/repositories/UserRepository';
import { CreateEventDTO, Event } from '../../domain/entities/Event';
import { QuestionType } from '../../domain/value-objects/QuestionType';
import { INVALID_EVENT_PRICE_MESSAGE, isValidEventPrice } from '../../domain/constants/payments';

export class CreateEventUseCase {
    constructor(
        private eventRepository: EventRepository,
        private eventQuestionRepository: EventQuestionRepository,
        private userRepository: UserRepository
    ) { }

    async execute(data: CreateEventDTO): Promise<Event> {
        if (data.maxGuests < 1) {
            throw new Error('Event must have at least 1 guest');
        }

        if (!isValidEventPrice(Number(data.price))) {
            throw new Error(INVALID_EVENT_PRICE_MESSAGE);
        }

        // Validate host exists
        const host = await this.userRepository.findById(data.hostId);
        if (!host) {
            throw new Error('Host user not found');
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
