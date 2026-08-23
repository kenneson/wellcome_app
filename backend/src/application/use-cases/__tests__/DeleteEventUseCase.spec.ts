import { DeleteEventUseCase, EventHasRegistrationHistoryError } from '../DeleteEventUseCase';
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

    it('should preserve an event that already has registration history', async () => {
        const existingEvent = {
            id: 'event-123',
            hostId: 'host-123',
            title: 'Event',
        } as Event;
        mockEventRepository.findById.mockResolvedValue(existingEvent);
        mockEventRegistrationRepository.findByEventIdWithUser.mockResolvedValue([
            {
                id: 'booking-1',
                eventId: 'event-123',
                userId: 'guest-1',
                status: 'CANCELLED',
            } as any,
        ]);

        await expect(deleteEventUseCase.execute('event-123', 'host-123'))
            .rejects.toBeInstanceOf(EventHasRegistrationHistoryError);

        expect(mockEventRepository.delete).not.toHaveBeenCalled();
    });
});
