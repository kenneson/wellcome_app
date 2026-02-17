import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { SendNotificationUseCase } from './SendNotificationUseCase';
import { NotificationType } from '../../domain/value-objects/NotificationType';

export class CancelEventRegistrationUseCase {
    constructor(
        private eventRegistrationRepository: EventRegistrationRepository,
        private eventRepository: EventRepository,
        private sendNotificationUseCase: SendNotificationUseCase
    ) { }

    async execute(eventId: string, userId: string): Promise<void> {
        // Fetch event to get host token
        const event = await this.eventRepository.findById(eventId);
        
        const registrations = await this.eventRegistrationRepository.findByUserId(userId);
        const registration = registrations.find(r => r.eventId === eventId);
        const userName = registration?.user?.fullName || 'Um participante';

        await this.eventRegistrationRepository.deleteByEventAndUser(eventId, userId);

        if (event && event.host) {
            await this.sendNotificationUseCase.execute(
                event.host.id,
                event.host.expoPushToken || null,
                'Cancelamento de Inscrição',
                `${userName} cancelou a inscrição no evento "${event.title}".`,
                NotificationType.PARTICIPANT_CANCELED,
                { eventId: event.id }
            );
        }
    }
}
