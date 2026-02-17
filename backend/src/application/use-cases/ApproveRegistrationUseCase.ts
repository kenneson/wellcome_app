import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRegistration } from '../../domain/entities/EventRegistration';
import { SendNotificationUseCase } from './SendNotificationUseCase';
import { NotificationType } from '../../domain/value-objects/NotificationType';

export class ApproveRegistrationUseCase {
    constructor(
        private eventRegistrationRepository: EventRegistrationRepository,
        private sendNotificationUseCase: SendNotificationUseCase
    ) { }

    async execute(registrationId: string, hostId: string): Promise<EventRegistration> {
        // Validate if hostId owns the event associated with the registration
        const registration = await this.eventRegistrationRepository.findById(registrationId);

        if (!registration) {
            throw new Error('Registration not found');
        }

        if (registration.event && registration.event.hostId !== hostId) {
            throw new Error('Unauthorized: You are not the host of this event');
        }

        const updatedRegistration = await this.eventRegistrationRepository.updateStatus(registrationId, 'APPROVED');

        // Send Push Notification
        if (updatedRegistration.user) {
            const eventTitle = updatedRegistration.event?.title || 'Evento';
            await this.sendNotificationUseCase.execute(
                updatedRegistration.user.id,
                updatedRegistration.user.expoPushToken || null,
                'Inscrição Aprovada! 🥳',
                `Sua presença em "${eventTitle}" foi confirmada.`,
                NotificationType.REGISTRATION_APPROVED,
                { eventId: updatedRegistration.eventId }
            );
        }

        return updatedRegistration;
    }
}
