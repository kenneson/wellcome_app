import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRegistration } from '../../domain/entities/EventRegistration';
import { SendNotificationUseCase } from './SendNotificationUseCase';
import { NotificationType } from '../../domain/value-objects/NotificationType';

export class RejectRegistrationUseCase {
    constructor(
        private eventRegistrationRepository: EventRegistrationRepository,
        private sendNotificationUseCase: SendNotificationUseCase
    ) { }

    async execute(registrationId: string, hostId: string, reason: string): Promise<EventRegistration> {
        // Validate host ownership
        const registration = await this.eventRegistrationRepository.findById(registrationId);

        if (!registration) {
            throw new Error('Registration not found');
        }

        if (registration.event && registration.event.hostId !== hostId) {
            throw new Error('Unauthorized: You are not the host of this event');
        }

        if (registration.event && new Date(registration.event.eventDate) < new Date()) {
            throw new Error('Cannot change registration status for past events');
        }

        const updatedRegistration = await this.eventRegistrationRepository.updateStatus(registrationId, 'REJECTED', reason);

        // Send Push Notification
        if (updatedRegistration.user) {
            const eventTitle = updatedRegistration.event?.title || 'Evento';
            await this.sendNotificationUseCase.execute(
                updatedRegistration.user.id,
                updatedRegistration.user.expoPushToken || null,
                'Inscrição Recusada 😔',
                `Sua inscrição para "${eventTitle}" não foi aceita.${reason ? ` Motivo: ${reason}` : ''}`,
                NotificationType.REGISTRATION_REJECTED,
                { eventId: updatedRegistration.eventId }
            );
        }

        return updatedRegistration;
    }
}
