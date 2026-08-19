import { EventRegistration } from '../../../domain/entities/EventRegistration';
import { EventRegistrationRepository } from '../../../domain/repositories/EventRegistrationRepository';
import { EventRepository } from '../../../domain/repositories/EventRepository';
import { EventAccessType } from '../../../domain/value-objects/EventAccessType';
import { RegistrationStatus } from '../../../domain/value-objects/RegistrationStatus';
import { JoinEventUseCase } from '../JoinEventUseCase';

describe('JoinEventUseCase', () => {
    it('reuses an active registration instead of returning a duplicate error', async () => {
        const existingRegistration: EventRegistration = {
            id: 'booking-1',
            eventId: 'event-1',
            userId: 'user-1',
            status: RegistrationStatus.PENDING,
            attendedBefore: false,
            noShowCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const registrationRepository: jest.Mocked<EventRegistrationRepository> = {
            create: jest.fn(),
            findByEventId: jest.fn(),
            findByEventIdWithUser: jest.fn(),
            findByUserId: jest.fn().mockResolvedValue([existingRegistration]),
            delete: jest.fn(),
            deleteByEventAndUser: jest.fn(),
            updateStatus: jest.fn(),
            findById: jest.fn(),
        };
        const eventRepository: jest.Mocked<EventRepository> = {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn().mockResolvedValue({
                id: 'event-1',
                hostId: 'host-1',
                eventDate: new Date(Date.now() + 60 * 60 * 1000),
                reservationDeadline: null,
                maxGuests: 1,
                allowWaitlist: false,
                bookings: [existingRegistration],
            } as any),
            update: jest.fn(),
            delete: jest.fn(),
        };
        const sendNotificationUseCase = { execute: jest.fn() };
        const useCase = new JoinEventUseCase(
            registrationRepository,
            eventRepository,
            sendNotificationUseCase as any
        );

        const result = await useCase.execute({ eventId: 'event-1', userId: 'user-1' });

        expect(result).toBe(existingRegistration);
        expect(registrationRepository.create).not.toHaveBeenCalled();
        expect(sendNotificationUseCase.execute).not.toHaveBeenCalled();
    });

    it.each([
        [EventAccessType.OPEN, 0, RegistrationStatus.APPROVED],
        [EventAccessType.OPEN, 20, RegistrationStatus.PENDING],
        [EventAccessType.OPEN_WITH_APPROVAL, 20, RegistrationStatus.PENDING],
    ])('creates the correct initial status for %s access with price %s', async (accessType, price, expectedStatus) => {
        const registrationRepository: jest.Mocked<EventRegistrationRepository> = {
            create: jest.fn().mockImplementation(async (input) => ({ id: 'booking-1', ...input } as any)),
            findByEventId: jest.fn(),
            findByEventIdWithUser: jest.fn(),
            findByUserId: jest.fn().mockResolvedValue([]),
            delete: jest.fn(),
            deleteByEventAndUser: jest.fn(),
            updateStatus: jest.fn(),
            findById: jest.fn(),
        };
        const eventRepository: jest.Mocked<EventRepository> = {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn().mockResolvedValue({
                id: 'event-1',
                hostId: 'host-1',
                eventDate: new Date(Date.now() + 60 * 60 * 1000),
                reservationDeadline: null,
                maxGuests: 8,
                allowWaitlist: false,
                accessType,
                price,
                bookings: [],
            } as any),
            update: jest.fn(),
            delete: jest.fn(),
        };
        const useCase = new JoinEventUseCase(
            registrationRepository,
            eventRepository,
            { execute: jest.fn() } as any,
        );

        await useCase.execute({ eventId: 'event-1', userId: 'user-1' });

        expect(registrationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            status: expectedStatus,
        }));
    });
});
