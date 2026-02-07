import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRegistration } from '../../domain/entities/EventRegistration';
import { notificationService } from '../services/NotificationService';

export class RejectRegistrationUseCase {
    constructor(private eventRegistrationRepository: EventRegistrationRepository) { }

    async execute(registrationId: string, hostId: string, reason: string): Promise<EventRegistration> {
        // TODO: Validate host ownership

        const updatedRegistration = await this.eventRegistrationRepository.updateStatus(registrationId, 'REJECTED', reason);

        // Send Push Notification
        if (updatedRegistration.user?.expoPushToken) {
            const eventTitle = updatedRegistration.event?.title || 'Evento';
            await notificationService.sendPushBlocking(
                updatedRegistration.user.expoPushToken,
                'Inscrição Recusada 😔',
                `Sua inscrição para "${eventTitle}" não foi aceita.${reason ? ` Motivo: ${reason}` : ''}`,
                { eventId: updatedRegistration.eventId }
            );
        }

        return updatedRegistration;
    }
}
