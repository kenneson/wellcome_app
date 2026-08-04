import { CreateEventUseCase } from '../CreateEventUseCase';
import { EventRepository } from '../../../domain/repositories/EventRepository';
import { EventQuestionRepository } from '../../../domain/repositories/EventQuestionRepository';
import { UserRepository } from '../../../domain/repositories/UserRepository';
import { CreateEventDTO, Event } from '../../../domain/entities/Event';
import { User } from '../../../domain/entities/User';
import { EventAccessType } from '../../../domain/value-objects/EventAccessType';

describe('CreateEventUseCase', () => {
    let createEventUseCase: CreateEventUseCase;
    let mockEventRepository: jest.Mocked<EventRepository>;
    let mockEventQuestionRepository: jest.Mocked<EventQuestionRepository>;
    let mockUserRepository: jest.Mocked<UserRepository>;

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
        mockUserRepository = {
            findById: jest.fn(),
            update: jest.fn(),
            addWalletBalance: jest.fn(),
            getAccountDeletionBlockers: jest.fn(),
            deleteAccount: jest.fn(),
        };
        createEventUseCase = new CreateEventUseCase(
            mockEventRepository,
            mockEventQuestionRepository,
            mockUserRepository
        );
    });

    it('should create an event successfully when host exists', async () => {
        const eventData: CreateEventDTO = {
            title: 'Test Event',
            description: 'Description',
            price: 10,
            maxGuests: 10,
            eventDate: new Date(),
            location: 'Location',
            latitude: 0,
            longitude: 0,
            coverImageUrl: 'url',
            hostId: 'host-123',
            questions: [],
            // Add missing required fields from Event
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
            endTime: null,
            reservationDeadline: null,
            imageGallery: [],
            dietaryOptions: [],
        };

        const mockUser: User = {
            id: 'host-123',
            fullName: 'Test Host',
            username: 'testhost',
            website: null,
            avatarUrl: null,
            occupation: null,
            bio: null,
            lookingFor: null,
            city: null,
            neighborhood: null,
            languages: [],
            dietaryRestrictions: [],
            events: [],
            bookings: [],
            expoPushToken: null,
            updatedAt: new Date()
        };

        // Explicitly construct Event without spread to avoid type issues with questions
        const mockEvent: Event = {
            id: 'event-123',
            title: eventData.title,
            description: eventData.description || null,
            price: eventData.price,
            maxGuests: eventData.maxGuests,
            eventDate: eventData.eventDate,
            location: eventData.location,
            latitude: eventData.latitude || null,
            longitude: eventData.longitude || null,
            coverImageUrl: eventData.coverImageUrl || null,
            hostId: eventData.hostId,
            eventType: eventData.eventType || null,
            cuisineTypes: eventData.cuisineTypes,
            vibe: eventData.vibe,
            facilities: eventData.facilities,
            rules: eventData.rules,
            accessType: eventData.accessType,
            requiresApproval: eventData.requiresApproval,
            allowWaitlist: eventData.allowWaitlist,
            autoApproveIfAttended: eventData.autoApproveIfAttended,
            autoApproveMinRating: eventData.autoApproveMinRating || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            bookings: [],
            endTime: null,
            reservationDeadline: null,
            imageGallery: [],
            dietaryOptions: [],
            questions: []
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);
        mockEventRepository.create.mockResolvedValue(mockEvent);

        const result = await createEventUseCase.execute(eventData);

        expect(mockUserRepository.findById).toHaveBeenCalledWith('host-123');
        expect(mockEventRepository.create).toHaveBeenCalledWith(eventData);
        expect(result).toEqual(mockEvent);
    });

    it('should throw error when host does not exist', async () => {
        const eventData: CreateEventDTO = {
            title: 'Test Event',
            description: 'Description',
            price: 10,
            maxGuests: 10,
            eventDate: new Date(),
            location: 'Location',
            latitude: 0,
            longitude: 0,
            coverImageUrl: 'url',
            hostId: 'non-existent-host',
            questions: [],
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
            endTime: null,
            reservationDeadline: null,
            imageGallery: [],
            dietaryOptions: [],
        };

        mockUserRepository.findById.mockResolvedValue(null);

        await expect(createEventUseCase.execute(eventData)).rejects.toThrow('Host user not found');
        expect(mockEventRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when maxGuests is less than 1', async () => {
        const eventData: CreateEventDTO = {
            title: 'Test Event',
            description: 'Description',
            price: 10,
            maxGuests: 0,
            eventDate: new Date(),
            location: 'Location',
            latitude: 0,
            longitude: 0,
            coverImageUrl: 'url',
            hostId: 'host-123',
            questions: [],
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
            endTime: null,
            reservationDeadline: null,
            imageGallery: [],
            dietaryOptions: [],
        };

        await expect(createEventUseCase.execute(eventData)).rejects.toThrow('Event must have at least 1 guest');
        expect(mockUserRepository.findById).not.toHaveBeenCalled();
        expect(mockEventRepository.create).not.toHaveBeenCalled();
    });

    it('should reject a paid event below the payment provider minimum', async () => {
        const eventData = {
            price: 2,
            maxGuests: 10,
        } as CreateEventDTO;

        await expect(createEventUseCase.execute(eventData)).rejects.toThrow(
            'Eventos pagos devem custar no minimo R$ 5,00 ou ser gratuitos'
        );
        expect(mockUserRepository.findById).not.toHaveBeenCalled();
        expect(mockEventRepository.create).not.toHaveBeenCalled();
    });
});
