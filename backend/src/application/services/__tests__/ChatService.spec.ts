import { ChatRepository } from '../../../domain/repositories/ChatRepository';
import { ChatForbiddenError, ChatService } from '../ChatService';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const HOST_ID = '22222222-2222-4222-8222-222222222222';
const GUEST_ID = '33333333-3333-4333-8333-333333333333';
const OUTSIDER_ID = '44444444-4444-4444-8444-444444444444';
const BOOKING_ID = '55555555-5555-4555-8555-555555555555';
const CONVERSATION_ID = '66666666-6666-4666-8666-666666666666';

function createRepository(): jest.Mocked<ChatRepository> {
    return {
        findEvent: jest.fn(),
        findBookingForEventGuest: jest.fn(),
        findBooking: jest.fn(),
        findConversation: jest.fn(),
        findConversationForEventGuest: jest.fn(),
        getOrCreateConversation: jest.fn(),
        attachBooking: jest.fn(),
        listConversations: jest.fn(),
        listMessages: jest.fn(),
        createUserMessage: jest.fn(),
        createSystemMessage: jest.fn(),
        markRead: jest.fn(),
        areUsersBlocked: jest.fn(),
        findNotificationRecipient: jest.fn(),
        hasEventHistory: jest.fn(),
    };
}

const event = {
    id: EVENT_ID,
    hostId: HOST_ID,
    title: 'Jantar de teste',
    location: 'Rua Exata, 123',
    price: 120,
    eventDate: new Date('2026-12-10T20:00:00Z'),
    coverImageUrl: null,
};

const conversation = {
    id: CONVERSATION_ID,
    eventId: EVENT_ID,
    hostId: HOST_ID,
    guestId: GUEST_ID,
    bookingId: null,
    lastMessageAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    event,
    host: { id: HOST_ID, fullName: 'Anfitrião' },
    guest: { id: GUEST_ID, fullName: 'Participante' },
};

describe('ChatService', () => {
    it('allows a participant to ask the host before booking without exposing a phone', async () => {
        const repository = createRepository();
        repository.findEvent.mockResolvedValue(event);
        repository.findBookingForEventGuest.mockResolvedValue(null);
        repository.areUsersBlocked.mockResolvedValue(false);
        repository.getOrCreateConversation.mockResolvedValue(conversation);
        repository.createSystemMessage.mockResolvedValue({
            id: '77777777-7777-4777-8777-777777777777',
            conversationId: CONVERSATION_ID,
            kind: 'SYSTEM',
            body: 'Protegida',
            createdAt: new Date(),
        });
        repository.findConversation.mockResolvedValue(conversation);

        const result = await new ChatService(repository).openConversation(GUEST_ID, { eventId: EVENT_ID });

        expect(result.id).toBe(CONVERSATION_ID);
        expect(repository.getOrCreateConversation).toHaveBeenCalledWith(event, GUEST_ID, undefined);
        expect(result.event).not.toHaveProperty('location');
        expect(repository.createSystemMessage).toHaveBeenCalledWith(
            CONVERSATION_ID,
            expect.stringContaining('Conversa protegida'),
            { type: 'CONVERSATION_STARTED' },
            `conversation:${CONVERSATION_ID}:started`
        );
    });

    it('does not let a host open a conversation with a person who is not registered', async () => {
        const repository = createRepository();
        repository.findEvent.mockResolvedValue(event);
        repository.findBookingForEventGuest.mockResolvedValue(null);

        await expect(new ChatService(repository).openConversation(HOST_ID, {
            eventId: EVENT_ID,
            guestId: GUEST_ID,
        })).rejects.toBeInstanceOf(ChatForbiddenError);
    });

    it('blocks outsiders from reading conversation messages', async () => {
        const repository = createRepository();
        repository.findConversation.mockResolvedValue(conversation);

        await expect(new ChatService(repository).listMessages(CONVERSATION_ID, OUTSIDER_ID))
            .rejects.toBeInstanceOf(ChatForbiddenError);
        expect(repository.listMessages).not.toHaveBeenCalled();
    });

    it('releases the exact address only after an approved paid booking is confirmed', async () => {
        const repository = createRepository();
        repository.findBooking.mockResolvedValue({
            id: BOOKING_ID,
            eventId: EVENT_ID,
            userId: GUEST_ID,
            status: 'APPROVED',
            paymentStatus: 'CONFIRMED',
            dietaryRestrictions: [],
            answers: [],
        });
        repository.findEvent.mockResolvedValue(event);
        repository.getOrCreateConversation.mockResolvedValue({ ...conversation, bookingId: BOOKING_ID });
        repository.createSystemMessage.mockImplementation(async (_conversationId, body, metadata, dedupeKey) => ({
            id: dedupeKey,
            conversationId: CONVERSATION_ID,
            kind: 'SYSTEM',
            body,
            metadata,
            createdAt: new Date(),
        }));

        await new ChatService(repository).recordPaymentConfirmed(BOOKING_ID);

        expect(repository.createSystemMessage).toHaveBeenCalledWith(
            CONVERSATION_ID,
            'Endereço exato liberado: Rua Exata, 123',
            { type: 'ADDRESS_RELEASED', address: 'Rua Exata, 123' },
            `booking:${BOOKING_ID}:address-released`
        );
    });

    it('keeps the address hidden while payment is pending', async () => {
        const repository = createRepository();
        repository.findBooking.mockResolvedValue({
            id: BOOKING_ID,
            eventId: EVENT_ID,
            userId: GUEST_ID,
            status: 'APPROVED',
            paymentStatus: 'PENDING',
            dietaryRestrictions: [],
            answers: [],
        });
        repository.findEvent.mockResolvedValue(event);
        repository.getOrCreateConversation.mockResolvedValue({ ...conversation, bookingId: BOOKING_ID });
        repository.createSystemMessage.mockResolvedValue({
            id: '88888888-8888-4888-8888-888888888888',
            conversationId: CONVERSATION_ID,
            kind: 'SYSTEM',
            body: 'Aprovada',
            createdAt: new Date(),
        });

        await new ChatService(repository).recordRegistrationApproved(BOOKING_ID);

        expect(repository.createSystemMessage).toHaveBeenCalledTimes(1);
        expect(repository.createSystemMessage).not.toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('Rua Exata'),
            expect.anything(),
            expect.anything()
        );
    });
});
