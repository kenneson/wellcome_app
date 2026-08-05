import { z } from 'zod';
import { INVALID_EVENT_PRICE_MESSAGE, isValidEventPrice } from '../../domain/constants/payments';
import { EventAccessType } from '../../domain/value-objects/EventAccessType';

export const EVENT_TYPES = [
    'Café da manhã', 'Brunch', 'Almoço', 'Lanche', 'Jantar',
    'Degustação', 'Pic-nic', 'Coquetel', 'Outro',
] as const;

export const DISH_CATEGORIES = ['ENTRADA', 'PRATO_PRINCIPAL', 'SOBREMESA', 'BEBIDA'] as const;
export const QUESTION_TYPES = ['TEXT', 'SELECT', 'MULTI_SELECT'] as const;

const dateString = z.string().datetime({ offset: true }).transform((value) => new Date(value));

export const createEventInputSchema = z.object({
    title: z.string().trim().min(5).max(80),
    description: z.string().trim().min(30).max(1500),
    price: z.number().nonnegative().refine(isValidEventPrice, { message: INVALID_EVENT_PRICE_MESSAGE }),
    maxGuests: z.number().int().min(1).max(1000),
    eventDate: dateString,
    endTime: dateString,
    reservationDeadline: dateString.optional().nullable().default(null),
    location: z.string().trim().min(5).max(500),
    city: z.string().trim().min(2).max(120),
    state: z.string().trim().min(2).max(80),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    coverImageUrl: z.string().url(),
    imageGallery: z.array(z.string().url()).max(8).optional().default([]),
    eventType: z.enum(EVENT_TYPES),
    cuisineTypes: z.array(z.string().trim().min(2).max(80)).min(1).max(5),
    vibe: z.array(z.string().trim().min(1).max(80)).max(5).optional().default([]),
    facilities: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
    rules: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
    dietaryOptions: z.array(z.string().trim().min(1).max(160)).max(10).optional().default([]),
    isServedInSequence: z.boolean().optional().default(false),
    accessType: z.nativeEnum(EventAccessType).optional().default(EventAccessType.OPEN),
    allowWaitlist: z.boolean().optional().default(false),
    autoApproveIfAttended: z.boolean().optional().default(false),
    autoApproveMinRating: z.number().min(0).max(5).nullable().optional().default(null),
    questions: z.array(z.object({
        question: z.string().trim().min(5).max(180),
        questionType: z.enum(QUESTION_TYPES),
        required: z.boolean(),
        options: z.array(z.string().trim().min(1).max(100)).max(10).optional().default([]),
    })).max(5).optional().default([]),
    dishes: z.array(z.object({
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(300).optional().default(''),
        category: z.enum(DISH_CATEGORIES),
        order: z.number().int().nonnegative().optional(),
    })).min(1).max(20),
}).superRefine((event, context) => {
    const now = Date.now();
    if (event.eventDate.getTime() <= now) {
        context.addIssue({ code: 'custom', path: ['eventDate'], message: 'A data do evento deve estar no futuro' });
    }
    if (event.endTime.getTime() <= event.eventDate.getTime()) {
        context.addIssue({ code: 'custom', path: ['endTime'], message: 'O término deve ser posterior ao início' });
    }
    if (event.reservationDeadline) {
        if (event.reservationDeadline.getTime() <= now) {
            context.addIssue({ code: 'custom', path: ['reservationDeadline'], message: 'O prazo de inscrição deve estar no futuro' });
        }
        if (event.reservationDeadline.getTime() >= event.eventDate.getTime()) {
            context.addIssue({ code: 'custom', path: ['reservationDeadline'], message: 'O prazo deve ser anterior ao início do evento' });
        }
    }
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;

export function normalizeEventDraftPayload(payload: Record<string, any>): Record<string, unknown> {
    if (!payload.details) return payload;
    const details = payload.details ?? {};
    const location = payload.location ?? {};
    const rawPrice = String(details.pricePerGuest ?? '').replace(/^R\$\s*/i, '').replace(/\s/g, '');
    const normalizedPrice = rawPrice.includes(',')
        ? rawPrice.replace(/\./g, '').replace(',', '.')
        : rawPrice;
    const dietaryOptions = [
        payload.veganOptions ? 'Opções veganas e vegetarianas disponíveis' : null,
        payload.substitutions ? 'Aceita adaptações por restrições alimentares' : null,
        payload.menuAlterations ? 'Cardápio sujeito a alterações' : null,
    ].filter(Boolean);

    return {
        title: details.title,
        description: details.description,
        price: Number(normalizedPrice),
        maxGuests: Number(details.maxGuests),
        eventDate: details.date,
        endTime: details.endTime,
        reservationDeadline: details.registrationDeadline ?? null,
        location: location.address,
        city: location.city || null,
        state: location.state || null,
        latitude: location.latitude,
        longitude: location.longitude,
        coverImageUrl: details.coverImage,
        imageGallery: [],
        eventType: payload.eventType,
        cuisineTypes: payload.cuisineTypes,
        vibe: payload.vibe ?? [],
        facilities: location.facilities ?? [],
        rules: location.rules ?? [],
        dietaryOptions,
        isServedInSequence: payload.isServedInSequence ?? false,
        accessType: details.accessType,
        questions: details.questions ?? [],
        dishes: payload.dishes ?? [],
    };
}

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
    return Object.fromEntries(error.issues.map((issue) => [issue.path.join('.'), issue.message]));
}
