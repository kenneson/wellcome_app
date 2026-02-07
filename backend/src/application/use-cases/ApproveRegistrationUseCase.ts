import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRegistration } from '../../domain/entities/EventRegistration';
import { notificationService } from '../services/NotificationService';

export class ApproveRegistrationUseCase {
    constructor(private eventRegistrationRepository: EventRegistrationRepository) { }

    async execute(registrationId: string, hostId: string): Promise<EventRegistration> {
        // TODO: Validate if hostId owns the event associated with the registration

        // For now, simple update
        // Update status (now returns populated user and event)
        const updatedRegistration = await this.eventRegistrationRepository.updateStatus(registrationId, 'APPROVED');

        // Send Push Notification
        if (updatedRegistration.user?.expoPushToken) {
            const eventTitle = updatedRegistration.event?.title || 'Evento';
            await notificationService.sendPushBlocking(
                updatedRegistration.user.expoPushToken,
                'Inscrição Aprovada! 🥳',
                `Sua presença em "${eventTitle}" foi confirmada.`,
                { eventId: updatedRegistration.eventId }
            );
        }

        return updatedRegistration;
    }
}
