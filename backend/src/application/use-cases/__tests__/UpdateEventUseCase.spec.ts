import { UpdateEventUseCase } from '../UpdateEventUseCase';
import { EventRepository } from '../../../domain/repositories/EventRepository';
import { EventQuestionRepository } from '../../../domain/repositories/EventQuestionRepository';
import { UpdateEventDTO, Event } from '../../../domain/entities/Event';
import { EventAccessType } from '../../../domain/value-objects/EventAccessType';

describe('UpdateEventUseCase', () => {
    let updateEventUseCase: UpdateEventUseCase;
    let mockEventRepository: jest.Mocked<EventRepository>;
    let mockEventQuestionRepository: jest.Mocked<EventQuestionRepository>;

    beforeEach(() => {
        mockEventRepository = {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        mockEventQuestionRepository = {
            // create: jest.fn(), // Removed as it's not in the interface
            createMany: jest.fn(),
            findByEventId: jest.fn(),
            deleteByEventId: jest.fn(),
        };
        updateEventUseCase = new UpdateEventUseCase(
            mockEventRepository,
            mockEventQuestionRepository
        );
    });

    it('should update an event successfully when host is correct', async () => {
        const updateData: UpdateEventDTO = {
            title: 'Updated Event',
        };

        const existingEvent: Event = {
            id: 'event-123',
            title: 'Original Event',
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
            questions: []
        };

        const updatedEvent: Event = {
            ...existingEvent,
            title: updateData.title!, // Explicitly update title
            updatedAt: new Date(),
            questions: [] // Ensure questions is typed correctly
        };

        mockEventRepository.findById.mockResolvedValue(existingEvent);
        mockEventRepository.update.mockResolvedValue(updatedEvent);

        const result = await updateEventUseCase.execute('event-123', 'host-123', updateData);

        expect(mockEventRepository.findById).toHaveBeenCalledWith('event-123');
        expect(mockEventRepository.update).toHaveBeenCalledWith('event-123', updateData);
        expect(result).toEqual(updatedEvent);
    });

    it('should throw error when event does not exist', async () => {
        mockEventRepository.findById.mockResolvedValue(null);

        await expect(updateEventUseCase.execute('non-existent', 'host-123', {})).rejects.toThrow('Event not found');
        expect(mockEventRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when updating with different hostId', async () => {
        const existingEvent: Event = {
            id: 'event-123',
            title: 'Original Event',
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
            questions: []
        };

        mockEventRepository.findById.mockResolvedValue(existingEvent);

        await expect(updateEventUseCase.execute('event-123', 'other-host', {})).rejects.toThrow('Only the host can update this event');
        expect(mockEventRepository.update).not.toHaveBeenCalled();
    });

    it('should replace questions when provided', async () => {
        const updateData: UpdateEventDTO = {
            questions: [
                { question: 'New Question', questionType: 'TEXT', required: true }
            ]
        };

        const existingEvent: Event = {
            id: 'event-123',
            title: 'Original Event',
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
            questions: []
        };

        mockEventRepository.findById.mockResolvedValue(existingEvent);
        mockEventRepository.update.mockResolvedValue(existingEvent);

        await updateEventUseCase.execute('event-123', 'host-123', updateData);

        expect(mockEventQuestionRepository.deleteByEventId).toHaveBeenCalledWith('event-123');
        expect(mockEventQuestionRepository.createMany).toHaveBeenCalled();
    });

    it('should reject a paid event below the payment provider minimum', async () => {
        mockEventRepository.findById.mockResolvedValue({
            id: 'event-123',
            hostId: 'host-123',
        } as Event);

        await expect(
            updateEventUseCase.execute('event-123', 'host-123', { price: 2 })
        ).rejects.toThrow('Eventos pagos devem custar no minimo R$ 5,00 ou ser gratuitos');
        expect(mockEventRepository.update).not.toHaveBeenCalled();
    });
});
