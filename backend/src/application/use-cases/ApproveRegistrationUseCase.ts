import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRegistration } from '../../domain/entities/EventRegistration';

export class ApproveRegistrationUseCase {
    constructor(private eventRegistrationRepository: EventRegistrationRepository) { }

    async execute(registrationId: string, hostId: string): Promise<EventRegistration> {
        // TODO: Validate if hostId owns the event associated with the registration

        // For now, simple update
        await this.eventRegistrationRepository.updateStatus(registrationId, 'APPROVED'); // Need to add updateStatus method to Repo

        // Return updated registration
        // return this.eventRegistrationRepository.findById(registrationId);

        // Placeholder return
        return {} as EventRegistration;
    }
}
