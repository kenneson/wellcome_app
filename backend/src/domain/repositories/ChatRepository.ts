export type ChatMessageKind = 'USER' | 'SYSTEM';

export interface ChatParticipant {
    id: string;
    fullName?: string | null;
    avatarUrl?: string | null;
}

export interface ChatEventContext {
    id: string;
    hostId: string;
    title: string;
    location: string;
    price: number;
    eventDate: Date;
    coverImageUrl?: string | null;
}

export interface ChatBookingContext {
    id: string;
    eventId: string;
    userId: string;
    status: string;
    paymentStatus?: string | null;
    dietaryRestrictions: string[];
    answers: Array<{ question: string; answer: string }>;
}

export interface ChatMessageRecord {
    id: string;
    conversationId: string;
    senderId?: string | null;
    kind: ChatMessageKind;
    body: string;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
}

export interface ChatConversationRecord {
    id: string;
    eventId: string;
    hostId: string;
    guestId: string;
    bookingId?: string | null;
    lastMessageAt: Date;
    hostLastReadAt?: Date | null;
    guestLastReadAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    event: ChatEventContext;
    host: ChatParticipant;
    guest: ChatParticipant;
    lastMessage?: ChatMessageRecord | null;
    unreadCount?: number;
}

export interface ChatNotificationRecipient extends ChatParticipant {
    expoPushToken?: string | null;
}

export interface ChatRepository {
    findEvent(eventId: string): Promise<ChatEventContext | null>;
    findBookingForEventGuest(eventId: string, guestId: string): Promise<ChatBookingContext | null>;
    findBooking(bookingId: string): Promise<ChatBookingContext | null>;
    findConversation(conversationId: string, viewerId?: string): Promise<ChatConversationRecord | null>;
    findConversationForEventGuest(eventId: string, guestId: string): Promise<ChatConversationRecord | null>;
    getOrCreateConversation(event: ChatEventContext, guestId: string, bookingId?: string | null): Promise<ChatConversationRecord>;
    attachBooking(conversationId: string, bookingId: string): Promise<void>;
    listConversations(userId: string): Promise<ChatConversationRecord[]>;
    listMessages(conversationId: string, before: Date | undefined, limit: number): Promise<ChatMessageRecord[]>;
    createUserMessage(conversationId: string, senderId: string, body: string): Promise<ChatMessageRecord>;
    createSystemMessage(
        conversationId: string,
        body: string,
        metadata: Record<string, unknown>,
        dedupeKey: string
    ): Promise<ChatMessageRecord>;
    markRead(conversationId: string, userId: string): Promise<void>;
    areUsersBlocked(firstUserId: string, secondUserId: string): Promise<boolean>;
    findNotificationRecipient(userId: string): Promise<ChatNotificationRecipient | null>;
    hasEventHistory(eventId: string): Promise<boolean>;
}
