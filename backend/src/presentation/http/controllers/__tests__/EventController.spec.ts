import { EventController } from '../EventController';

jest.mock('../../helpers/auth', () => ({
    getAuthenticatedUserId: jest.fn(),
    getOptionalAuthenticatedUserContext: jest.fn(),
}));

describe('EventController location privacy', () => {
    const controller = new EventController({} as any, {} as any, {} as any, {} as any);
    const event = {
        id: 'event-1',
        hostId: 'host-1',
        title: 'Jantar',
        price: 80,
        location: 'Rua Privada, 100',
        city: 'Curitiba',
        state: 'PR',
        latitude: -25.4,
        longitude: -49.2,
        bookings: [{ userId: 'guest-1', status: 'APPROVED', paymentStatus: 'PENDING' }],
    };

    it('hides the exact address of a paid event until payment is confirmed', () => {
        expect(controller.serializeEvent(event, 'guest-1')).toEqual(expect.objectContaining({
            location: 'Curitiba - PR',
            latitude: null,
            longitude: null,
        }));
    });

    it('reveals the address after confirmed payment', () => {
        const paidEvent = {
            ...event,
            bookings: [{ userId: 'guest-1', status: 'APPROVED', paymentStatus: 'CONFIRMED' }],
        };
        expect(controller.serializeEvent(paidEvent, 'guest-1')).toEqual(expect.objectContaining({
            location: 'Rua Privada, 100',
            latitude: -25.4,
            longitude: -49.2,
        }));
    });
});
