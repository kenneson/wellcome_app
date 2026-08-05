import { createEventInputSchema, normalizeEventDraftPayload } from '../EventCreationSchema';

function validPayload() {
    const start = new Date(Date.now() + 48 * 60 * 60 * 1000);
    return {
        title: 'Jantar brasileiro especial',
        description: 'Uma experiência gastronômica completa com pratos brasileiros e ingredientes locais.',
        price: 80,
        maxGuests: 10,
        eventDate: start.toISOString(),
        endTime: new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        reservationDeadline: new Date(start.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        location: 'Rua das Flores, 100, Centro, Curitiba - PR',
        city: 'Curitiba',
        state: 'PR',
        latitude: -25.4284,
        longitude: -49.2733,
        coverImageUrl: 'https://images.example.com/event.jpg',
        eventType: 'Jantar',
        cuisineTypes: ['Brasileira'],
        dishes: [{ name: 'Moqueca', description: 'Peixe e leite de coco', category: 'PRATO_PRINCIPAL' }],
    };
}

describe('createEventInputSchema', () => {
    it('accepts a complete future culinary event', () => {
        expect(createEventInputSchema.parse(validPayload())).toEqual(expect.objectContaining({
            title: 'Jantar brasileiro especial',
            latitude: -25.4284,
        }));
    });

    it('rejects incoherent dates and coordinates', () => {
        const payload = validPayload();
        payload.eventDate = new Date(Date.now() - 60_000).toISOString();
        payload.endTime = new Date(Date.now() - 120_000).toISOString();
        payload.latitude = 100;
        const result = createEventInputSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.issues.map((issue) => issue.path.join('.'));
            expect(paths).toEqual(expect.arrayContaining(['eventDate', 'endTime', 'latitude']));
        }
    });

    it('requires cover image, menu and a confirmed coordinate pair', () => {
        const payload: any = validPayload();
        delete payload.coverImageUrl;
        delete payload.city;
        delete payload.state;
        payload.dishes = [];
        payload.longitude = null;
        const result = createEventInputSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.issues.map((issue) => issue.path.join('.'));
            expect(paths).toEqual(expect.arrayContaining(['coverImageUrl', 'city', 'state', 'dishes', 'longitude']));
        }
    });

    it('normalizes the mobile draft into the publication contract', () => {
        const payload = validPayload();
        const draft = {
            eventType: payload.eventType,
            cuisineTypes: payload.cuisineTypes,
            vibe: [],
            isServedInSequence: true,
            dishes: payload.dishes,
            location: {
                address: payload.location,
                city: payload.city,
                state: payload.state,
                latitude: payload.latitude,
                longitude: payload.longitude,
                facilities: [],
                rules: [],
            },
            details: {
                title: payload.title,
                description: payload.description,
                pricePerGuest: '80,00',
                maxGuests: '10',
                date: payload.eventDate,
                endTime: payload.endTime,
                registrationDeadline: payload.reservationDeadline,
                coverImage: payload.coverImageUrl,
                accessType: 'OPEN',
                questions: [],
            },
        };
        const normalized = normalizeEventDraftPayload(draft);
        expect(createEventInputSchema.parse(normalized)).toEqual(expect.objectContaining({
            price: 80,
            isServedInSequence: true,
        }));
    });
});
