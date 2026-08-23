import {
    ChatConversationRecord,
    ChatEventContext,
    ChatRepository,
} from '../../domain/repositories/ChatRepository';
import { NotificationType } from '../../domain/value-objects/NotificationType';
import { SendNotificationUseCase } from '../use-cases/SendNotificationUseCase';

export class ChatNotFoundError extends Error {}
export class ChatForbiddenError extends Error {}
export class ChatValidationError extends Error {}

export interface OpenConversationInput {
    eventId: string;
    guestId?: string;
}
export type ChatConversationView = Omit<ChatConversationRecord, 'event' | 'hostLastReadAt' | 'guestLastReadAt'> & {
    event: Pick<ChatEventContext, 'id' | 'title' | 'eventDate' | 'coverImageUrl'>;
};


export class ChatService {
    constructor(
        private readonly chatRepository: ChatRepository,
        private readonly sendNotificationUseCase?: SendNotificationUseCase
    ) {}

    async openConversation(requesterId: string, input: OpenConversationInput): Promise<ChatConversationView> {
        const event = await this.chatRepository.findEvent(input.eventId);
        if (!event) throw new ChatNotFoundError('Evento não encontrado');

        const requesterIsHost = event.hostId === requesterId;
        const guestId = requesterIsHost ? input.guestId : requesterId;
        if (!guestId) throw new ChatValidationError('Selecione um participante para iniciar a conversa');
        if (!requesterIsHost && input.guestId && input.guestId !== requesterId) {
            throw new ChatForbiddenError('Você não pode iniciar uma conversa para outro participante');
        }
        if (guestId === event.hostId) throw new ChatValidationError('O anfitrião não pode conversar consigo mesmo');

        const booking = await this.chatRepository.findBookingForEventGuest(event.id, guestId);
        if (requesterIsHost && !booking) {
            throw new ChatForbiddenError('O anfitrião só pode iniciar conversas com pessoas inscritas no evento');
        }
        if (await this.chatRepository.areUsersBlocked(event.hostId, guestId)) {
            throw new ChatForbiddenError('Esta conversa não está disponível');
        }

        const conversation = await this.chatRepository.getOrCreateConversation(event, guestId, booking?.id);
        await this.chatRepository.createSystemMessage(
            conversation.id,
            'Conversa protegida pelo Wellcome. Mantenha pagamentos e combinações dentro da plataforma.',
            { type: 'CONVERSATION_STARTED' },
            `conversation:${conversation.id}:started`
        );
        const hydrated = await this.chatRepository.findConversation(conversation.id, requesterId);
        if (!hydrated) throw new ChatNotFoundError('Conversa não encontrada');
        return this.toConversationView(hydrated);
    }

    async listConversations(userId: string): Promise<ChatConversationView[]> {
        const conversations = await this.chatRepository.listConversations(userId);
        return conversations.map((conversation) => this.toConversationView(conversation));
    }

    async getConversation(conversationId: string, userId: string): Promise<ChatConversationView> {
        const conversation = await this.requireParticipant(conversationId, userId);
        return this.toConversationView(conversation);
    }

    async listMessages(conversationId: string, userId: string, before?: Date, limit = 50) {
        await this.requireParticipant(conversationId, userId);
        return this.chatRepository.listMessages(conversationId, before, Math.min(100, Math.max(1, limit)));
    }

    async sendMessage(conversationId: string, userId: string, rawBody: string) {
        const body = rawBody.trim();
        if (!body || body.length > 2000) {
            throw new ChatValidationError('A mensagem deve ter entre 1 e 2000 caracteres');
        }
        const conversation = await this.requireParticipant(conversationId, userId);
        const recipientId = conversation.hostId === userId ? conversation.guestId : conversation.hostId;
        if (await this.chatRepository.areUsersBlocked(userId, recipientId)) {
            throw new ChatForbiddenError('Esta conversa não está disponível');
        }

        const message = await this.chatRepository.createUserMessage(conversationId, userId, body);
        await this.notifyNewMessage(conversation, userId, recipientId).catch((error) => {
            console.error('Failed to notify chat recipient', error);
        });
        return message;
    }

    async markRead(conversationId: string, userId: string): Promise<void> {
        await this.requireParticipant(conversationId, userId);
        await this.chatRepository.markRead(conversationId, userId);
    }

    async recordBookingCreated(bookingId: string): Promise<void> {
        const context = await this.getAutomationContext(bookingId);
        if (!context) return;
        const { booking, conversation, event } = context;
        const statusText = booking.status === 'WAITLIST'
            ? 'A inscrição entrou na lista de espera.'
            : booking.status === 'APPROVED'
                ? 'A inscrição foi confirmada.'
                : 'A solicitação de inscrição foi enviada ao anfitrião.';
        await this.systemMessage(conversation.id, statusText, 'BOOKING_CREATED', `booking:${booking.id}:created`);

        const restrictions = booking.dietaryRestrictions.filter(Boolean);
        const dietaryBody = restrictions.length
            ? `Restrições alimentares informadas: ${restrictions.join(', ')}. Confirme aqui alergias e adaptações necessárias.`
            : 'O participante ainda não informou restrições alimentares. Confirme aqui alergias e adaptações necessárias.';
        await this.systemMessage(
            conversation.id,
            dietaryBody,
            'DIETARY_CONFIRMATION',
            `booking:${booking.id}:dietary`,
            { dietaryRestrictions: restrictions, answers: booking.answers }
        );
        if (this.isConfirmed(booking.status, booking.paymentStatus, event.price)) {
            await this.releaseAddress(conversation.id, booking.id, event.location);
        }
    }

    async recordRegistrationApproved(bookingId: string): Promise<void> {
        const context = await this.getAutomationContext(bookingId);
        if (!context) return;
        const { booking, conversation, event } = context;
        const paid = this.isPaymentConfirmed(booking.paymentStatus);
        const body = event.price > 0 && !paid
            ? 'Inscrição aprovada. O participante deve concluir o pagamento dentro do prazo para confirmar a vaga.'
            : 'Inscrição aprovada e presença confirmada.';
        await this.systemMessage(conversation.id, body, 'REGISTRATION_APPROVED', `booking:${booking.id}:approved`);
        if (this.isConfirmed(booking.status, booking.paymentStatus, event.price)) {
            await this.releaseAddress(conversation.id, booking.id, event.location);
        }
    }

    async recordRegistrationRejected(bookingId: string, reason?: string): Promise<void> {
        const context = await this.getAutomationContext(bookingId);
        if (!context) return;
        const suffix = reason?.trim() ? ` Motivo: ${reason.trim()}` : '';
        await this.systemMessage(
            context.conversation.id,
            `A inscrição não foi aprovada.${suffix}`,
            'REGISTRATION_REJECTED',
            `booking:${bookingId}:rejected`
        );
    }

    async recordRegistrationCancelled(bookingId: string, refundRequested = false): Promise<void> {
        const context = await this.getAutomationContext(bookingId);
        if (!context) return;
        const suffix = refundRequested ? ' O reembolso foi solicitado ao meio de pagamento.' : '';
        await this.systemMessage(
            context.conversation.id,
            `A inscrição foi cancelada.${suffix}`,
            'REGISTRATION_CANCELLED',
            `booking:${bookingId}:cancelled`
        );
    }

    async recordPaymentConfirmed(bookingId: string): Promise<void> {
        const context = await this.getAutomationContext(bookingId);
        if (!context) return;
        await this.systemMessage(
            context.conversation.id,
            'Pagamento confirmado. A vaga está garantida.',
            'PAYMENT_CONFIRMED',
            `booking:${bookingId}:payment-confirmed`
        );
        if (context.booking.status === 'APPROVED') {
            await this.releaseAddress(context.conversation.id, bookingId, context.event.location);
        }
    }

    async hasEventHistory(eventId: string): Promise<boolean> {
        return this.chatRepository.hasEventHistory(eventId);
    }

    private async getAutomationContext(bookingId: string) {
        const booking = await this.chatRepository.findBooking(bookingId);
        if (!booking) return null;
        const event = await this.chatRepository.findEvent(booking.eventId);
        if (!event) return null;
        const conversation = await this.chatRepository.getOrCreateConversation(event, booking.userId, booking.id);
        return { booking, event, conversation };
    }

    private async releaseAddress(conversationId: string, bookingId: string, address: string): Promise<void> {
        await this.systemMessage(
            conversationId,
            `Endereço exato liberado: ${address}`,
            'ADDRESS_RELEASED',
            `booking:${bookingId}:address-released`,
            { address }
        );
    }

    private async systemMessage(
        conversationId: string,
        body: string,
        type: string,
        dedupeKey: string,
        extraMetadata: Record<string, unknown> = {}
    ): Promise<void> {
        await this.chatRepository.createSystemMessage(conversationId, body, { type, ...extraMetadata }, dedupeKey);
    }

    private async requireParticipant(conversationId: string, userId: string): Promise<ChatConversationRecord> {
        const conversation = await this.chatRepository.findConversation(conversationId, userId);
        if (!conversation) throw new ChatNotFoundError('Conversa não encontrada');

        if (conversation.hostId !== userId && conversation.guestId !== userId) {
            throw new ChatForbiddenError('Você não participa desta conversa');
        }
        return conversation;
    }

    private toConversationView(conversation: ChatConversationRecord): ChatConversationView {
        const {
            hostLastReadAt: _hostLastReadAt,
            guestLastReadAt: _guestLastReadAt,
            event: internalEvent,
            ...publicConversation
        } = conversation;
        return {
            ...publicConversation,
            event: {
                id: internalEvent.id,
                title: internalEvent.title,
                eventDate: internalEvent.eventDate,
                coverImageUrl: internalEvent.coverImageUrl,
            },
        };
    }

    private isPaymentConfirmed(status?: string | null): boolean {
        return status === 'CONFIRMED' || status === 'PARTIALLY_REFUNDED';
    }

    private isConfirmed(status: string, paymentStatus: string | null | undefined, price: number): boolean {
        return status === 'APPROVED' && (price <= 0 || this.isPaymentConfirmed(paymentStatus));
    }

    private async notifyNewMessage(
        conversation: ChatConversationRecord,
        senderId: string,
        recipientId: string
    ): Promise<void> {
        if (!this.sendNotificationUseCase) return;
        const recipient = await this.chatRepository.findNotificationRecipient(recipientId);
        if (!recipient) return;
        const sender = conversation.hostId === senderId ? conversation.host : conversation.guest;
        await this.sendNotificationUseCase.execute(
            recipientId,
            recipient.expoPushToken || null,
            'Nova mensagem',
            `${sender.fullName || 'Alguém'} enviou uma mensagem sobre "${conversation.event.title}".`,
            NotificationType.CHAT_MESSAGE,
            { conversationId: conversation.id, eventId: conversation.eventId }
        );
    }
}
