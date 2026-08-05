import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { MapboxLocationService } from '../../../infrastructure/external/MapboxLocationService';
import { getAuthenticatedUserId, UnauthorizedRequestError } from '../helpers/auth';

const suggestSchema = z.object({
    q: z.string().trim().min(3).max(160),
    sessionToken: z.string().uuid(),
    proximity: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/).optional(),
});
const retrieveSchema = z.object({ id: z.string().min(3).max(300), sessionToken: z.string().uuid() });
const reverseSchema = z.object({
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
});

export class LocationController {
    constructor(private readonly locations: MapboxLocationService) {}

    async suggest(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async () => {
            const input = suggestSchema.parse(request.query);
            return reply.send(await this.locations.suggest(input.q, input.sessionToken, input.proximity));
        });
    }

    async retrieve(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async () => {
            const params = request.params as { id: string };
            const query = request.query as { sessionToken?: string };
            const input = retrieveSchema.parse({ id: params.id, sessionToken: query.sessionToken });
            return reply.send(await this.locations.retrieve(input.id, input.sessionToken));
        });
    }

    async reverse(request: FastifyRequest, reply: FastifyReply) {
        return this.handle(request, reply, async () => {
            const input = reverseSchema.parse(request.query);
            return reply.send(await this.locations.reverse(input.lat, input.lon));
        });
    }

    private async handle(request: FastifyRequest, reply: FastifyReply, operation: () => Promise<unknown>) {
        try {
            await getAuthenticatedUserId(request);
            return await operation();
        } catch (error: any) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ code: 'UNAUTHORIZED', message: error.message, fieldErrors: {} });
            }
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ code: 'INVALID_LOCATION_QUERY', message: 'Busca de endereço inválida', fieldErrors: {} });
            }
            if (error?.message === 'MAPBOX_NOT_CONFIGURED') {
                return reply.code(503).send({ code: 'LOCATION_SERVICE_UNAVAILABLE', message: 'Busca de endereços indisponível', fieldErrors: {} });
            }
            request.log.error({ err: error }, 'Location lookup failed');
            return reply.code(502).send({ code: 'LOCATION_LOOKUP_FAILED', message: 'Não foi possível consultar este endereço', fieldErrors: {} });
        }
    }
}
