import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRegistration } from '../../domain/entities/EventRegistration';

export class RejectRegistrationUseCase {
    constructor(private eventRegistrationRepository: EventRegistrationRepository) { }

    async execute(registrationId: string, hostId: string, reason: string): Promise<EventRegistration> {
        // TODO: Validate host ownership

        await this.eventRegistrationRepository.updateStatus(registrationId, 'REJECTED', reason);

        return {} as EventRegistration;
    }
}
