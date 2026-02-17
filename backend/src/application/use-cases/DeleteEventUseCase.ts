import { EventRepository } from '../../domain/repositories/EventRepository';
import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { SendNotificationUseCase } from './SendNotificationUseCase';
import { NotificationType } from '../../domain/value-objects/NotificationType';

export class DeleteEventUseCase {
    constructor(
        private eventRepository: EventRepository,
        private eventRegistrationRepository: EventRegistrationRepository,
        private sendNotificationUseCase: SendNotificationUseCase
    ) { }

    async execute(eventId: string, hostId: string): Promise<void> {
        const event = await this.eventRepository.findById(eventId);
        if (!event) {
            throw new Error('Event not found');
        }

        if (event.hostId !== hostId) {
            throw new Error('Only the host can delete this event');
        }

        // Notify participants
        const registrations = await this.eventRegistrationRepository.findByEventIdWithUser(eventId);
        if (registrations && registrations.length > 0) {
            const participantsToNotify = registrations.filter(b => b.status === 'APPROVED' || b.status === 'PENDING');
            
            for (const registration of participantsToNotify) {
                if (registration.user) {
                    await this.sendNotificationUseCase.execute(
                        registration.user.id,
                        registration.user.expoPushToken || null,
                        'Evento Cancelado',
                        `O evento "${event.title}" foi cancelado pelo organizador.`,
                        NotificationType.EVENT_CANCELED,
                        { eventId: event.id }
                    );
                }
            }
        }
        
        await this.eventRepository.delete(eventId);
    }
}
