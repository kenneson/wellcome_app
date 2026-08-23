import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
    ChatForbiddenError,
    ChatNotFoundError,
    ChatService,
    ChatValidationError,
} from '../../../application/services/ChatService';
import { UnauthorizedRequestError, getAuthenticatedUserId } from '../helpers/auth';

const openConversationSchema = z.object({
    eventId: z.string().uuid(),
    guestId: z.string().uuid().optional(),
});
const conversationParamsSchema = z.object({ id: z.string().uuid() });
const messageSchema = z.object({ body: z.string().trim().min(1).max(2000) });
const messagesQuerySchema = z.object({
    before: z.string().datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});

export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    async open(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async (userId) => {
            const body = openConversationSchema.parse(request.body);
            return reply.code(201).send(await this.chatService.openConversation(userId, body));
        });
    }

    async list(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async (userId) => reply.send(await this.chatService.listConversations(userId)));
    }

    async get(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async (userId) => {
            const { id } = conversationParamsSchema.parse(request.params);
            return reply.send(await this.chatService.getConversation(id, userId));
        });
    }

    async messages(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async (userId) => {
            const { id } = conversationParamsSchema.parse(request.params);
            const query = messagesQuerySchema.parse(request.query);
            const messages = await this.chatService.listMessages(
                id,
                userId,
                query.before ? new Date(query.before) : undefined,
                query.limit
            );
            return reply.send(messages);
        });
    }

    async send(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async (userId) => {
            const { id } = conversationParamsSchema.parse(request.params);
            const { body } = messageSchema.parse(request.body);
            return reply.code(201).send(await this.chatService.sendMessage(id, userId, body));
        });
    }

    async markRead(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async (userId) => {
            const { id } = conversationParamsSchema.parse(request.params);
            await this.chatService.markRead(id, userId);
            return reply.code(204).send();
        });
    }

    private async handle(
        request: FastifyRequest,
        reply: FastifyReply,
        action: (userId: string) => Promise<unknown>
    ) {
        try {
            return await action(await getAuthenticatedUserId(request));
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) return reply.code(401).send({ message: error.message });
            if (error instanceof z.ZodError || error instanceof ChatValidationError) {
                return reply.code(400).send({ message: error instanceof Error ? error.message : 'Dados inválidos' });
            }
            if (error instanceof ChatForbiddenError) return reply.code(403).send({ message: error.message });
            if (error instanceof ChatNotFoundError) return reply.code(404).send({ message: error.message });
            request.log.error({ err: error }, 'Chat request failed');
            return reply.code(500).send({ message: 'Não foi possível processar a conversa' });
        }
    }
}
