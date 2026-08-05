import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { EventCreationError } from '../../../application/errors/EventCreationError';
import { draftPayloadSchema, ManageEventDraftsUseCase } from '../../../application/use-cases/ManageEventDraftsUseCase';
import { zodFieldErrors } from '../../../application/validation/EventCreationSchema';
import { getAuthenticatedUserId, UnauthorizedRequestError } from '../helpers/auth';

const createDraftSchema = z.object({ payload: draftPayloadSchema.optional().default({}) });
const updateDraftSchema = z.object({
    payload: draftPayloadSchema,
    currentStep: z.number().int().min(0).max(4),
    revision: z.number().int().nonnegative(),
});

export class EventDraftController {
    constructor(
        private readonly useCase: ManageEventDraftsUseCase,
        private readonly serializeEvent: (event: any, viewerId?: string) => unknown,
    ) {}

    async list(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async (hostId) => reply.send(await this.useCase.list(hostId)));
    }

    async create(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async (hostId) => {
            const body = createDraftSchema.parse(request.body ?? {});
            return reply.code(201).send(await this.useCase.create(hostId, body.payload));
        });
    }

    async get(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async (hostId) => {
            const { id } = request.params as { id: string };
            return reply.send(await this.useCase.get(id, hostId));
        });
    }

    async update(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async (hostId) => {
            const startedAt = Date.now();
            const { id } = request.params as { id: string };
            const body = updateDraftSchema.parse(request.body);
            const updated = await this.useCase.update({ id, hostId, ...body });
            request.log.info({
                event: 'event_draft_saved',
                currentStep: updated.currentStep,
                revision: updated.revision,
                durationMs: Date.now() - startedAt,
            });
            return reply.send(updated);
        });
    }

    async delete(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async (hostId) => {
            const { id } = request.params as { id: string };
            await this.useCase.delete(id, hostId);
            return reply.code(204).send();
        });
    }

    async publish(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async (hostId) => {
            const startedAt = Date.now();
            const { id } = request.params as { id: string };
            const rawKey = request.headers['idempotency-key'];
            const publishKey = (Array.isArray(rawKey) ? rawKey[0] : rawKey)?.trim();
            if (!publishKey) {
                throw new EventCreationError(
                    'IDEMPOTENCY_KEY_REQUIRED',
                    'Não foi possível iniciar a publicação com segurança',
                    {},
                    400,
                );
            }
            const event = await this.useCase.publish(id, hostId, publishKey);
            request.log.info({ event: 'event_draft_published', durationMs: Date.now() - startedAt });
            return reply.code(201).send(this.serializeEvent(event, hostId));
        });
    }

    private async handle(
        request: FastifyRequest,
        reply: FastifyReply,
        operation: (hostId: string) => Promise<unknown>,
    ) {
        try {
            return await operation(await getAuthenticatedUserId(request));
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ code: 'UNAUTHORIZED', message: error.message, fieldErrors: {} });
            }
            if (error instanceof z.ZodError) {
                request.log.warn({
                    event: 'event_draft_rejected',
                    code: 'INVALID_DRAFT',
                    fields: error.issues.map((issue) => issue.path.join('.')),
                });
                return reply.code(422).send({ code: 'INVALID_DRAFT', message: 'Revise os dados do rascunho', fieldErrors: zodFieldErrors(error) });
            }
            if (error instanceof EventCreationError) {
                request.log.warn({
                    event: 'event_draft_rejected',
                    code: error.code,
                    fields: Object.keys(error.fieldErrors),
                });
                return reply.code(error.statusCode).send({ code: error.code, message: error.message, fieldErrors: error.fieldErrors });
            }
            request.log.error({ err: error }, 'Event draft operation failed');
            return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'Não foi possível processar o rascunho', fieldErrors: {} });
        }
    }
}
