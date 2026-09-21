import { DeleteEventUseCase } from '../DeleteEventUseCase';
import { EventRepository } from '../../../domain/repositories/EventRepository';
import { EventRegistrationRepository } from '../../../domain/repositories/EventRegistrationRepository';
import { Event } from '../../../domain/entities/Event';
import { EventAccessType } from '../../../domain/value-objects/EventAccessType';

describe('DeleteEventUseCase', () => {
    let deleteEventUseCase: DeleteEventUseCase;
    let mockEventRepository: jest.Mocked<EventRepository>;
    let mockEventRegistrationRepository: jest.Mocked<EventRegistrationRepository>;

    beforeEach(() => {
        mockEventRepository = {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        } as unknown as jest.Mocked<EventRepository>;

        mockEventRegistrationRepository = {
            create: jest.fn(),
            findByEventId: jest.fn(),
            findByEventIdWithUser: jest.fn(),
            updateStatus: jest.fn(),
            findByUserAndEvent: jest.fn(),
            cancel: jest.fn(),
        } as unknown as jest.Mocked<EventRegistrationRepository>;

        deleteEventUseCase = new DeleteEventUseCase(
            mockEventRepository,
            mockEventRegistrationRepository
        );
    });

    it('should delete an event successfully when host is correct', async () => {
        const existingEvent: Event = {
            id: 'event-123',
            title: 'Event',
            description: 'Description',
            price: 10,
            maxGuests: 10,
            eventDate: new Date(),
            location: 'Location',
            latitude: 0,
            longitude: 0,
            coverImageUrl: 'url',
            hostId: 'host-123',
            eventType: 'DINNER',
            cuisineTypes: ['ITALIAN'],
            vibe: ['COZY'],
            facilities: ['WIFI'],
            rules: ['NO_SMOKING'],
            accessType: EventAccessType.OPEN,
            requiresApproval: false,
            allowWaitlist: false,
            autoApproveIfAttended: false,
            autoApproveMinRating: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            bookings: [],
            endTime: null,
            reservationDeadline: null,
            imageGallery: [],
            dietaryOptions: [],
            questions: [],
            reviews: [],
            dishes: []
        };

        mockEventRepository.findById.mockResolvedValue(existingEvent);
        mockEventRegistrationRepository.findByEventIdWithUser.mockResolvedValue([]);

        await deleteEventUseCase.execute('event-123', 'host-123');

        expect(mockEventRepository.findById).toHaveBeenCalledWith('event-123');
        expect(mockEventRepository.delete).toHaveBeenCalledWith('event-123');
    });

    it('should throw error when event does not exist', async () => {
        mockEventRepository.findById.mockResolvedValue(null);

        await expect(deleteEventUseCase.execute('non-existent', 'host-123')).rejects.toThrow('Event not found');
        expect(mockEventRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error when deleting with different hostId', async () => {
        const existingEvent: Event = {
            id: 'event-123',
            title: 'Event',
            description: 'Description',
            price: 10,
            maxGuests: 10,
            eventDate: new Date(),
            location: 'Location',
            latitude: 0,
            longitude: 0,
            coverImageUrl: 'url',
            hostId: 'host-123',
            eventType: 'DINNER',
            cuisineTypes: ['ITALIAN'],
            vibe: ['COZY'],
            facilities: ['WIFI'],
            rules: ['NO_SMOKING'],
            accessType: EventAccessType.OPEN,
            requiresApproval: false,
            allowWaitlist: false,
            autoApproveIfAttended: false,
            autoApproveMinRating: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            bookings: [],
            endTime: null,
            reservationDeadline: null,
            imageGallery: [],
            dietaryOptions: [],
            questions: [],
            reviews: [],
            dishes: []
        };

        mockEventRepository.findById.mockResolvedValue(existingEvent);

        await expect(deleteEventUseCase.execute('event-123', 'other-host')).rejects.toThrow('Only the host can delete this event');
        expect(mockEventRepository.delete).not.toHaveBeenCalled();
    });

    it('cancels instead of deleting an event with registration history, refunding and notifying', async () => {
        const existingEvent = {
            id: 'event-123',
            hostId: 'host-123',
            title: 'Event',
        } as Event;
        const cancelByHost = jest.fn().mockResolvedValue({
            refundPaymentIds: ['payment-1'],
            pendingPayments: [{ id: 'payment-2', txid: 'tx-2', providerPaymentId: 'asaas-2' }],
            notifyUsers: [{ id: 'guest-1', expoPushToken: null }],
            feeTotal: 1.99,
        });
        const cancellation = {
            payments: { updateStatus: jest.fn() },
            gateway: { deletePayment: jest.fn().mockResolvedValue(undefined), cancelCheckout: jest.fn() },
            refunds: { execute: jest.fn().mockResolvedValue(undefined) },
            notifications: { execute: jest.fn().mockResolvedValue(undefined) },
        };
        const useCase = new DeleteEventUseCase(
            { ...mockEventRepository, cancelByHost } as any,
            mockEventRegistrationRepository,
            undefined,
            cancellation as any
        );
        mockEventRepository.findById.mockResolvedValue(existingEvent);
        mockEventRegistrationRepository.findByEventIdWithUser.mockResolvedValue([
            { id: 'booking-1', eventId: 'event-123', userId: 'guest-1', status: 'APPROVED' } as any,
        ]);

        await expect(useCase.execute('event-123', 'host-123'))
            .resolves.toEqual({ outcome: 'CANCELLED', cancellationFee: 1.99 });

        expect(mockEventRepository.delete).not.toHaveBeenCalled();
        expect(cancelByHost).toHaveBeenCalledWith('event-123', 'host-123', expect.any(String));
        expect(cancellation.refunds.execute).toHaveBeenCalledWith('payment-1');
        expect(cancellation.gateway.deletePayment).toHaveBeenCalledWith('asaas-2');
        expect(cancellation.payments.updateStatus).toHaveBeenCalledWith('payment-2', 'EXPIRED');
        expect(cancellation.notifications.execute).toHaveBeenCalledWith(
            'guest-1', null, 'Evento cancelado', expect.any(String), 'EVENT_CANCELED', { eventId: 'event-123' });
    });
});
