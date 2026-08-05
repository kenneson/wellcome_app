import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateEventUseCase } from '../../../application/use-cases/CreateEventUseCase';
import { ListEventsUseCase } from '../../../application/use-cases/ListEventsUseCase';
import { UpdateEventUseCase } from '../../../application/use-cases/UpdateEventUseCase';
import { DeleteEventUseCase } from '../../../application/use-cases/DeleteEventUseCase';
import { z } from 'zod';

import { EventAccessType } from '../../../domain/value-objects/EventAccessType';
import { UnauthorizedRequestError, getAuthenticatedUserId, getOptionalAuthenticatedUserContext } from '../helpers/auth';
import { INVALID_EVENT_PRICE_MESSAGE, isValidEventPrice } from '../../../domain/constants/payments';
import {
    createEventInputSchema,
    DISH_CATEGORIES,
    EVENT_TYPES,
    QUESTION_TYPES,
    zodFieldErrors,
} from '../../../application/validation/EventCreationSchema';
import { EventCreationError } from '../../../application/errors/EventCreationError';

const eventPriceSchema = z.number().nonnegative().refine(isValidEventPrice, {
    message: INVALID_EVENT_PRICE_MESSAGE,
});

const updateEventSchema = z.object({
    title: z.string().trim().min(5).max(80).optional(),
    description: z.string().trim().min(30).max(1500).optional(),
    price: eventPriceSchema.optional(),
    maxGuests: z.number().int().min(1).max(1000).optional(),
    eventDate: z.string().datetime({ offset: true }).transform((value) => new Date(value)).optional(),
    endTime: z.string().datetime({ offset: true }).transform((value) => new Date(value)).optional(),
    reservationDeadline: z.string().datetime({ offset: true }).transform((value) => new Date(value)).optional().nullable(),
    location: z.string().trim().min(5).max(500).optional(),
    city: z.string().trim().min(2).max(120).optional(),
    state: z.string().trim().min(2).max(80).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    coverImageUrl: z.string().url().optional(),
    imageGallery: z.array(z.string().url()).max(8).optional(),
    eventType: z.enum(EVENT_TYPES).optional(),
    cuisineTypes: z.array(z.string().trim().min(2).max(80)).min(1).max(5).optional(),
    vibe: z.array(z.string().trim().min(1).max(80)).max(5).optional(),
    facilities: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
    rules: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
    dietaryOptions: z.array(z.string().trim().min(1).max(160)).max(10).optional(),
    isServedInSequence: z.boolean().optional(),
    accessType: z.nativeEnum(EventAccessType).optional(),
    allowWaitlist: z.boolean().optional(),
    autoApproveIfAttended: z.boolean().optional(),
    autoApproveMinRating: z.number().nullable().optional(),
    questions: z.array(z.object({
        question: z.string().trim().min(5).max(180),
        questionType: z.enum(QUESTION_TYPES),
        required: z.boolean(),
        options: z.array(z.string().trim().min(1).max(100)).max(10).optional()
    })).max(5).optional(),
    dishes: z.array(z.object({
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(300).optional(),
        category: z.enum(DISH_CATEGORIES),
        order: z.number().int().nonnegative().optional()
    })).min(1).max(20).optional()
});

export class EventController {
    constructor(
        private createEventUseCase: CreateEventUseCase,
        private listEventsUseCase: ListEventsUseCase,
        private updateEventUseCase: UpdateEventUseCase,
        private deleteEventUseCase: DeleteEventUseCase
    ) { }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = createEventInputSchema.parse(request.body);
            const hostId = await getAuthenticatedUserId(request);
            const rawCreationKey = request.headers['idempotency-key'];
            const creationKey = Array.isArray(rawCreationKey) ? rawCreationKey[0] : rawCreationKey;
            
            const event = await this.createEventUseCase.execute({
                ...body,
                hostId,
                creationKey: creationKey?.trim() || null,
                requiresApproval: body.accessType === EventAccessType.OPEN_WITH_APPROVAL,
                questions: body.questions.map((q, index) => ({
                    ...q,
                    order: index
                })),
                dishes: body.dishes.map((d, index) => ({
                    ...d,
                    order: d.order ?? index
                })),
            });
            
            return reply.code(201).send(this.serializeEvent(event, hostId));
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ code: 'UNAUTHORIZED', message: error.message, fieldErrors: {} });
            }
            if (error instanceof z.ZodError) {
                return reply.code(422).send({
                    code: 'INVALID_EVENT',
                    message: 'Revise os campos destacados',
                    fieldErrors: zodFieldErrors(error),
                });
            }
            if (error instanceof EventCreationError) {
                return reply.code(error.statusCode).send({
                    code: error.code,
                    message: error.message,
                    fieldErrors: error.fieldErrors,
                });
            }
            request.log.error({ err: error }, 'Failed to create event');
            return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'Não foi possível criar o evento', fieldErrors: {} });
        }
    }

    async list(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { lat, lon, radius, city, cuisine, vibe, priceMin, priceMax, eventType, excludeHostId } = request.query as any;
            const latitude = this.parseOptionalNumber(lat);
            const longitude = this.parseOptionalNumber(lon);
            const radiusInKm = this.parseOptionalNumber(radius);
            const minimumPrice = this.parseOptionalNumber(priceMin);
            const maximumPrice = this.parseOptionalNumber(priceMax);

            if ([latitude, longitude, radiusInKm, minimumPrice, maximumPrice].some(Number.isNaN)) {
                return reply.code(400).send({ code: 'INVALID_EVENT_FILTER', message: 'Filtro numerico invalido', fieldErrors: {} });
            }
            if ((latitude === undefined) !== (longitude === undefined)) {
                return reply.code(400).send({ code: 'INVALID_EVENT_FILTER', message: 'Informe latitude e longitude juntas', fieldErrors: {} });
            }
            if (radiusInKm !== undefined && radiusInKm <= 0) {
                return reply.code(400).send({ code: 'INVALID_EVENT_FILTER', message: 'O raio deve ser maior que zero', fieldErrors: {} });
            }
            if (minimumPrice !== undefined && maximumPrice !== undefined && minimumPrice > maximumPrice) {
                return reply.code(400).send({ code: 'INVALID_EVENT_FILTER', message: 'O valor minimo nao pode superar o maximo', fieldErrors: {} });
            }

            const events = await this.listEventsUseCase.execute({
                latitude,
                longitude,
                radiusInKm,
                city: city ? (Array.isArray(city) ? city[0] : city) : undefined,
                cuisine: cuisine ? (Array.isArray(cuisine) ? cuisine : [cuisine]) : undefined,
                vibe: vibe ? (Array.isArray(vibe) ? vibe : [vibe]) : undefined,
                priceMin: minimumPrice,
                priceMax: maximumPrice,
                eventType: eventType ? (Array.isArray(eventType) ? eventType[0] : eventType) : undefined,
                excludeHostId: excludeHostId ? (Array.isArray(excludeHostId) ? excludeHostId[0] : excludeHostId) : undefined
            });
            return reply.send(events.map((event) => this.serializeEvent(event)));
        } catch (error) {
            request.log.error({ err: error }, 'Failed to list events');
            return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'Nao foi possivel listar os eventos', fieldErrors: {} });
        }
    }

    private parseOptionalNumber(value: unknown): number | undefined {
        const rawValue = Array.isArray(value) ? value[0] : value;
        if (rawValue === undefined || rawValue === null || rawValue === '') return undefined;

        const parsed = Number(rawValue);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
    }

    async getById(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        try {
            const event = await this.listEventsUseCase.getById(id);
            if (!event) {
                return reply.code(404).send({ code: 'EVENT_NOT_FOUND', message: 'Evento nao encontrado', fieldErrors: {} });
            }
            const viewer = await getOptionalAuthenticatedUserContext(request);
            return reply.send(this.serializeEvent(event, viewer?.userId));
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ code: 'UNAUTHORIZED', message: error.message, fieldErrors: {} });
            }
            request.log.error({ err: error }, 'Failed to load event');
            return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'Nao foi possivel carregar o evento', fieldErrors: {} });
        }
    }

    serializeEvent(event: any, viewerId?: string) {
        const canSeeExactLocation = viewerId === event.hostId || event.bookings?.some(
            (booking: any) => booking.userId === viewerId
                && booking.status === 'APPROVED'
                && (Number(event.price) <= 0 || booking.paymentStatus === 'CONFIRMED')
        );
        const viewerBookings = viewerId
            ? event.bookings?.filter((booking: any) => booking.userId === viewerId) ?? []
            : [];

        return {
            id: event.id,
            title: event.title,
            description: event.description,
            price: event.price,
            maxGuests: event.maxGuests,
            eventDate: event.eventDate,
            endTime: event.endTime,
            reservationDeadline: event.reservationDeadline,
            location: canSeeExactLocation
                ? event.location
                : [event.city, event.state].filter(Boolean).join(' - ') || this.getLocationSummary(event.location),
            city: event.city ?? null,
            state: event.state ?? null,
            locationNeedsReview: !event.city || !event.state,
            latitude: canSeeExactLocation ? event.latitude : null,
            longitude: canSeeExactLocation ? event.longitude : null,
            distanceKm: event.distanceKm,
            coverImageUrl: event.coverImageUrl,
            imageGallery: event.imageGallery,
            eventType: event.eventType,
            cuisineTypes: event.cuisineTypes,
            vibe: event.vibe,
            facilities: event.facilities,
            rules: event.rules,
            dietaryOptions: event.dietaryOptions,
            isServedInSequence: event.isServedInSequence ?? false,
            hostId: event.hostId,
            accessType: event.accessType,
            requiresApproval: event.requiresApproval,
            allowWaitlist: event.allowWaitlist,
            autoApproveIfAttended: event.autoApproveIfAttended,
            autoApproveMinRating: event.autoApproveMinRating,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
            host: event.host ? {
                id: event.host.id,
                fullName: event.host.fullName,
                username: event.host.username,
                avatarUrl: event.host.avatarUrl,
                isSuperhost: event.host.isSuperhost,
            } : undefined,
            dishes: event.dishes,
            questions: event.questions,
            reviews: event.reviews,
            bookings: viewerBookings.map((booking: any) => ({
                id: booking.id,
                eventId: booking.eventId,
                userId: booking.userId,
                status: booking.status,
                createdAt: booking.createdAt,
                updatedAt: booking.updatedAt,
                reviewedBy: booking.reviewedBy,
                reviewedAt: booking.reviewedAt,
                rejectionReason: booking.rejectionReason,
            })),
            participantCount: event.bookings?.filter(
                (booking: any) => booking.status === 'PENDING' || booking.status === 'APPROVED'
            ).length || 0,
        };
    }

    private getLocationSummary(location: string): string {
        return location ? 'Local exato informado apos a confirmacao' : 'Local informado apos a confirmacao';
    }

    async update(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        try {
            const body = updateEventSchema.parse(request.body);
            const hostId = await getAuthenticatedUserId(request);
            const updateData = body;
            const event = await this.updateEventUseCase.execute(id, hostId, updateData);
            return reply.send(this.serializeEvent(event, hostId));
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ code: 'UNAUTHORIZED', message: error.message, fieldErrors: {} });
            }
            if (error instanceof z.ZodError) {
                return reply.code(422).send({ code: 'INVALID_EVENT', message: 'Revise os campos destacados', fieldErrors: zodFieldErrors(error) });
            }
            if (error instanceof EventCreationError) {
                return reply.code(error.statusCode).send({ code: error.code, message: error.message, fieldErrors: error.fieldErrors });
            }
            if (error instanceof Error) {
                if (error.message === 'Event not found') {
                    return reply.code(404).send({ code: 'EVENT_NOT_FOUND', message: error.message, fieldErrors: {} });
                }
                if (error.message === 'Only the host can update this event') {
                    return reply.code(403).send({ code: 'FORBIDDEN', message: error.message, fieldErrors: {} });
                }
                if (error.message === INVALID_EVENT_PRICE_MESSAGE) {
                    return reply.code(422).send({ code: 'INVALID_EVENT_PRICE', message: error.message, fieldErrors: { price: error.message } });
                }
            }
            request.log.error({ err: error }, 'Failed to update event');
            return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'Nao foi possivel atualizar o evento', fieldErrors: {} });
        }
    }

    async delete(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        try {
            const hostId = await getAuthenticatedUserId(request);
            await this.deleteEventUseCase.execute(id, hostId);
            return reply.code(204).send();
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ code: 'UNAUTHORIZED', message: error.message, fieldErrors: {} });
            }
            if (error instanceof Error) {
                if (error.message === 'Event not found') {
                    return reply.code(404).send({ code: 'EVENT_NOT_FOUND', message: error.message, fieldErrors: {} });
                }
                if (error.message === 'Only the host can delete this event') {
                    return reply.code(403).send({ code: 'FORBIDDEN', message: error.message, fieldErrors: {} });
                }
            }
            request.log.error({ err: error }, 'Failed to delete event');
            return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'Nao foi possivel excluir o evento', fieldErrors: {} });
        }
    }
}
