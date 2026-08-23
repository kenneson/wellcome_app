import { Prisma } from '@prisma/client';
import {
    ChatBookingContext,
    ChatConversationRecord,
    ChatEventContext,
    ChatMessageRecord,
    ChatNotificationRecipient,
    ChatRepository,
} from '../../domain/repositories/ChatRepository';
import { prisma } from '../database/prismaClient';

const conversationInclude = {
    event: {
        select: {
            id: true,
            hostId: true,
            title: true,
            location: true,
            price: true,
            eventDate: true,
            coverImageUrl: true,
        },
    },
    host: { select: { id: true, fullName: true, avatarUrl: true } },
    guest: { select: { id: true, fullName: true, avatarUrl: true } },
    messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
};

export class PrismaChatRepository implements ChatRepository {
    async findEvent(eventId: string): Promise<ChatEventContext | null> {
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                hostId: true,
                title: true,
                location: true,
                price: true,
                eventDate: true,
                coverImageUrl: true,
            },
        });
        return event ? this.mapEvent(event) : null;
    }

    async findBookingForEventGuest(eventId: string, guestId: string): Promise<ChatBookingContext | null> {
        const booking = await prisma.booking.findUnique({
            where: { eventId_userId: { eventId, userId: guestId } },
            include: {
                guest: { select: { dietaryRestrictions: true } },
                payment: { select: { status: true } },
                answers: { include: { question: { select: { question: true } } } },
            },
        });
        return booking ? this.mapBooking(booking) : null;
    }

    async findBooking(bookingId: string): Promise<ChatBookingContext | null> {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                guest: { select: { dietaryRestrictions: true } },
                payment: { select: { status: true } },
                answers: { include: { question: { select: { question: true } } } },
            },
        });
        return booking ? this.mapBooking(booking) : null;
    }

    async findConversation(conversationId: string, viewerId?: string): Promise<ChatConversationRecord | null> {
        const conversation = await prisma.chatConversation.findUnique({
            where: { id: conversationId },
            include: conversationInclude,
        });
        if (!conversation) return null;
        return this.withUnreadCount(conversation, viewerId);
    }

    async findConversationForEventGuest(eventId: string, guestId: string): Promise<ChatConversationRecord | null> {
        const conversation = await prisma.chatConversation.findUnique({
            where: { eventId_guestId: { eventId, guestId } },
            include: conversationInclude,
        });
        return conversation ? this.mapConversation(conversation) : null;
    }

    async getOrCreateConversation(
        event: ChatEventContext,
        guestId: string,
        bookingId?: string | null
    ): Promise<ChatConversationRecord> {
        const conversation = await prisma.chatConversation.upsert({
            where: { eventId_guestId: { eventId: event.id, guestId } },
            create: {
                eventId: event.id,
                hostId: event.hostId,
                guestId,
                bookingId: bookingId ?? null,
            },
            update: bookingId ? { bookingId } : {},
            include: conversationInclude,
        });
        return this.mapConversation(conversation);
    }

    async attachBooking(conversationId: string, bookingId: string): Promise<void> {
        await prisma.chatConversation.update({ where: { id: conversationId }, data: { bookingId } });
    }

    async listConversations(userId: string): Promise<ChatConversationRecord[]> {
        const conversations = await prisma.chatConversation.findMany({
            where: { OR: [{ hostId: userId }, { guestId: userId }] },
            include: conversationInclude,
            orderBy: { lastMessageAt: 'desc' },
        });
        return Promise.all(conversations.map((conversation) => this.withUnreadCount(conversation, userId)));
    }

    async listMessages(conversationId: string, before: Date | undefined, limit: number): Promise<ChatMessageRecord[]> {
        const messages = await prisma.chatMessage.findMany({
            where: {
                conversationId,
                ...(before ? { createdAt: { lt: before } } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return messages.reverse().map((message) => this.mapMessage(message));
    }

    async createUserMessage(conversationId: string, senderId: string, body: string): Promise<ChatMessageRecord> {
        const message = await prisma.$transaction(async (tx) => {
            const created = await tx.chatMessage.create({
                data: { conversationId, senderId, kind: 'USER', body },
            });
            await tx.chatConversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: created.createdAt },
            });
            return created;
        });
        return this.mapMessage(message);
    }

    async createSystemMessage(
        conversationId: string,
        body: string,
        metadata: Record<string, unknown>,
        dedupeKey: string
    ): Promise<ChatMessageRecord> {
        const message = await prisma.$transaction(async (tx) => {
            const existing = await tx.chatMessage.findUnique({ where: { dedupeKey } });
            if (existing) return existing;
            const created = await tx.chatMessage.create({
                data: { conversationId, kind: 'SYSTEM', body, metadata: metadata as Prisma.InputJsonValue, dedupeKey },
            });
            await tx.chatConversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: created.createdAt },
            });
            return created;
        });
        return this.mapMessage(message);
    }

    async markRead(conversationId: string, userId: string): Promise<void> {
        const conversation = await prisma.chatConversation.findUnique({
            where: { id: conversationId },
            select: { hostId: true, guestId: true },
        });
        if (!conversation || (conversation.hostId !== userId && conversation.guestId !== userId)) return;
        await prisma.chatConversation.update({
            where: { id: conversationId },
            data: conversation.hostId === userId
                ? { hostLastReadAt: new Date() }
                : { guestLastReadAt: new Date() },
        });
    }

    async areUsersBlocked(firstUserId: string, secondUserId: string): Promise<boolean> {
        const count = await prisma.userBlock.count({
            where: {
                OR: [
                    { blockerId: firstUserId, blockedId: secondUserId },
                    { blockerId: secondUserId, blockedId: firstUserId },
                ],
            },
        });
        return count > 0;
    }

    async findNotificationRecipient(userId: string): Promise<ChatNotificationRecipient | null> {
        return prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, fullName: true, avatarUrl: true, expoPushToken: true },
        });
    }

    async hasEventHistory(eventId: string): Promise<boolean> {
        return (await prisma.chatConversation.count({ where: { eventId } })) > 0;
    }

    private async withUnreadCount(conversation: any, viewerId?: string): Promise<ChatConversationRecord> {
        const mapped = this.mapConversation(conversation);
        if (!viewerId || (mapped.hostId !== viewerId && mapped.guestId !== viewerId)) return mapped;
        const lastReadAt = mapped.hostId === viewerId ? mapped.hostLastReadAt : mapped.guestLastReadAt;
        const unreadCount = await prisma.chatMessage.count({
            where: {
                conversationId: mapped.id,
                ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
                OR: [{ kind: 'SYSTEM' }, { senderId: { not: viewerId } }],
            },
        });
        return { ...mapped, unreadCount };
    }

    private mapEvent(event: any): ChatEventContext {
        return { ...event, price: Number(event.price || 0) };
    }

    private mapBooking(booking: any): ChatBookingContext {
        return {
            id: booking.id,
            eventId: booking.eventId,
            userId: booking.userId,
            status: booking.status,
            paymentStatus: booking.payment?.status ?? null,
            dietaryRestrictions: booking.guest?.dietaryRestrictions ?? [],
            answers: (booking.answers ?? []).map((answer: any) => ({
                question: answer.question?.question ?? '',
                answer: answer.answer,
            })),
        };
    }

    private mapConversation(conversation: any): ChatConversationRecord {
        return {
            id: conversation.id,
            eventId: conversation.eventId,
            hostId: conversation.hostId,
            guestId: conversation.guestId,
            bookingId: conversation.bookingId,
            lastMessageAt: conversation.lastMessageAt,
            hostLastReadAt: conversation.hostLastReadAt,
            guestLastReadAt: conversation.guestLastReadAt,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            event: this.mapEvent(conversation.event),
            host: conversation.host,
            guest: conversation.guest,
            lastMessage: conversation.messages?.[0] ? this.mapMessage(conversation.messages[0]) : null,
        };
    }

    private mapMessage(message: any): ChatMessageRecord {
        return {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            kind: message.kind,
            body: message.body,
            metadata: message.metadata as Record<string, unknown> | null,
            createdAt: message.createdAt,
        };
    }
}
