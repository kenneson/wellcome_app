import { DeleteEventUseCase } from '../DeleteEventUseCase';
import { EventRepository } from '../../../domain/repositories/EventRepository';
import { Event } from '../../../domain/entities/Event';
import { EventAccessType } from '../../../domain/value-objects/EventAccessType';

describe('DeleteEventUseCase', () => {
    let deleteEventUseCase: DeleteEventUseCase;
    let mockEventRepository: jest.Mocked<EventRepository>;

    beforeEach(() => {
        mockEventRepository = {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        deleteEventUseCase = new DeleteEventUseCase(
            mockEventRepository
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
            bookings: []
        };

        mockEventRepository.findById.mockResolvedValue(existingEvent);

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
            bookings: []
        };

        mockEventRepository.findById.mockResolvedValue(existingEvent);

        await expect(deleteEventUseCase.execute('event-123', 'other-host')).rejects.toThrow('Only the host can delete this event');
        expect(mockEventRepository.delete).not.toHaveBeenCalled();
    });
});
