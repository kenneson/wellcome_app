import { EventCreationState } from '@/entities/event/model/types';
import {
    firstInvalidStep,
    validateCompleteEvent,
    validateEventStep,
} from '../eventCreationValidation';

function validEvent(): EventCreationState {
    const start = new Date(Date.now() + 48 * 60 * 60 * 1000);
    return {
        eventType: 'Jantar',
        cuisineTypes: ['Brasileira'],
        vibe: [],
        isServedInSequence: true,
        dishes: [{ id: 'dish-1', name: 'Moqueca', description: '', category: 'PRATO_PRINCIPAL' }],
        location: {
            address: 'Rua das Flores, 100, Curitiba - PR',
            city: 'Curitiba',
            state: 'PR',
            neighborhood: 'Centro',
            postalCode: '80000-000',
            latitude: -25.4284,
            longitude: -49.2733,
            confirmed: true,
            facilities: [],
            rules: [],
        },
        details: {
            pricePerGuest: '80,00',
            maxGuests: '10',
            date: start,
            endTime: new Date(start.getTime() + 4 * 60 * 60 * 1000),
            registrationDeadline: new Date(start.getTime() - 24 * 60 * 60 * 1000),
            title: 'Jantar brasileiro especial',
            description: 'Uma experiencia gastronomica completa com ingredientes locais e boa companhia.',
            coverImage: 'https://images.example.com/event.jpg',
            accessType: 'OPEN',
            questions: [],
        },
        veganOptions: false,
        substitutions: false,
        menuAlterations: false,
    };
}

describe('event creation validation', () => {
    it('accepts a complete five-step event', () => {
        expect(validateCompleteEvent(validEvent())).toEqual({});
    });

    it('invalidates location after manual address editing', () => {
        const event = validEvent();
        event.location.address = 'Outro endereco';
        event.location.city = '';
        event.location.state = '';
        event.location.latitude = null;
        event.location.longitude = null;
        event.location.confirmed = false;

        expect(validateEventStep(event, 2)).toEqual(expect.objectContaining({
            city: expect.any(String),
            coordinates: expect.any(String),
        }));
    });

    it('rejects past starts and deadlines after the event begins', () => {
        const event = validEvent();
        event.details.date = new Date(Date.now() - 60_000);
        event.details.endTime = new Date(Date.now() + 60_000);
        event.details.registrationDeadline = new Date(Date.now() + 120_000);

        const errors = validateEventStep(event, 3);
        expect(errors.eventDate).toBeDefined();
        expect(errors.reservationDeadline).toBeDefined();
        expect(firstInvalidStep(errors)).toBe(3);
    });

    it('routes menu errors back to the second step', () => {
        expect(firstInvalidStep({ 'dishes.0.name': 'Informe o prato' })).toBe(1);
    });
});
