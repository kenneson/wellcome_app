import { EventCreationState } from '@/entities/event/model/types';
import { INVALID_EVENT_PRICE_MESSAGE, isValidEventPrice, parseEventPrice } from '@/shared/config/payments';

export type EventCreationFieldErrors = Record<string, string>;

export function validateEventStep(data: EventCreationState, step: number): EventCreationFieldErrors {
    const errors: EventCreationFieldErrors = {};

    if (step === 0 || step === 4) {
        if (data.details.title.trim().length < 5) errors.title = 'Use um título com pelo menos 5 caracteres';
        if (data.details.description.trim().length < 30) errors.description = 'Conte um pouco mais sobre a experiência';
        if (!data.details.coverImage) errors.coverImageUrl = 'Adicione uma foto de capa';
        if (!data.eventType) errors.eventType = 'Selecione o tipo do evento';
        if (data.cuisineTypes.length === 0) errors.cuisineTypes = 'Selecione ao menos uma culinária';
        if (data.cuisineTypes.length > 5) errors.cuisineTypes = 'Selecione no máximo cinco culinárias';
    }

    if (step === 1 || step === 4) {
        if (data.dishes.length === 0) errors.dishes = 'Adicione ao menos um prato';
        data.dishes.forEach((dish, index) => {
            if (dish.name.trim().length < 2) errors[`dishes.${index}.name`] = 'Informe o nome do prato';
            if (!dish.category) errors[`dishes.${index}.category`] = 'Selecione a categoria';
        });
    }

    if (step === 2 || step === 4) {
        if (!data.location.address.trim()) errors.location = 'Selecione o endereço do evento';
        if (!data.location.city.trim() || !data.location.state.trim()) errors.city = 'Confirme cidade e estado';
        if (data.location.latitude === null || data.location.longitude === null || !data.location.confirmed) {
            errors.coordinates = 'Confirme a localização no mapa';
        }
    }

    if (step === 3 || step === 4) {
        const now = Date.now();
        const start = data.details.date?.getTime() ?? 0;
        const end = data.details.endTime?.getTime() ?? 0;
        const deadline = data.details.registrationDeadline?.getTime() ?? null;
        const guests = Number(data.details.maxGuests);
        const price = parseEventPrice(data.details.pricePerGuest);

        if (!start || start <= now) errors.eventDate = 'Escolha uma data e hora futuras';
        if (!end || end <= start) errors.endTime = 'O término deve ser posterior ao início';
        if (deadline !== null && (deadline <= now || deadline >= start)) {
            errors.reservationDeadline = 'O prazo deve estar entre agora e o início do evento';
        }
        if (!Number.isInteger(guests) || guests < 1) errors.maxGuests = 'Informe uma quantidade válida de vagas';
        if (!isValidEventPrice(price)) errors.price = INVALID_EVENT_PRICE_MESSAGE;
    }

    return errors;
}

export function validateCompleteEvent(data: EventCreationState): EventCreationFieldErrors {
    return [0, 1, 2, 3].reduce(
        (all, step) => ({ ...all, ...validateEventStep(data, step) }),
        {} as EventCreationFieldErrors,
    );
}

export function firstInvalidStep(errors: EventCreationFieldErrors): number {
    const keys = Object.keys(errors);
    if (keys.some((key) => ['title', 'description', 'coverImageUrl', 'eventType', 'cuisineTypes'].includes(key))) return 0;
    if (keys.some((key) => key === 'dishes' || key.startsWith('dishes.'))) return 1;
    if (keys.some((key) => ['location', 'city', 'coordinates'].includes(key))) return 2;
    if (keys.some((key) => ['eventDate', 'endTime', 'reservationDeadline', 'maxGuests', 'price'].includes(key))) return 3;
    return 4;
}
