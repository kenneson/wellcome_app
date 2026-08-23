import { EventRepository } from '../../domain/repositories/EventRepository';
import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { ChatService } from '../services/ChatService';

export class EventHasRegistrationHistoryError extends Error {
    constructor() {
        super('Este evento possui historico de inscricoes e deve ser cancelado, nao excluido');
        this.name = 'EventHasRegistrationHistoryError';
    }
}

export class DeleteEventUseCase {
    constructor(
        private eventRepository: EventRepository,
        private eventRegistrationRepository: EventRegistrationRepository,
        private chatService?: ChatService
    ) { }

    async execute(eventId: string, hostId: string): Promise<void> {
        const event = await this.eventRepository.findById(eventId);
        if (!event) {
            throw new Error('Event not found');
        }

        if (event.hostId !== hostId) {
            throw new Error('Only the host can delete this event');
        }

        const registrations = await this.eventRegistrationRepository.findByEventIdWithUser(eventId);
        if (registrations.length > 0) {
            throw new EventHasRegistrationHistoryError();
        }

        if (await this.chatService?.hasEventHistory(eventId)) {
            throw new EventHasRegistrationHistoryError();
        }

        await this.eventRepository.delete(eventId);
    }
}
