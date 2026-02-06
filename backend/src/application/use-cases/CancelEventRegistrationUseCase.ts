import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';

export class CancelEventRegistrationUseCase {
    constructor(private eventRegistrationRepository: EventRegistrationRepository) { }

    async execute(eventId: string, userId: string): Promise<void> {
        await this.eventRegistrationRepository.deleteByEventAndUser(eventId, userId);
    }
}
