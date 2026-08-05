import { useState } from 'react';
import { Dish, EventCreationState, EventDetails, LocationDetails } from '@/entities/event/model/types';
import { eventService } from '@/services/api/EventService';
import { formatEventPriceInput } from '@/shared/config/payments';

export const defaultEventCreationState: EventCreationState = {
    eventType: '',
    cuisineTypes: [],
    vibe: [],
    isServedInSequence: false,
    dishes: [{ id: 'dish-1', name: '', description: '', category: '' }],
    location: {
        address: '',
        city: '',
        state: '',
        neighborhood: '',
        postalCode: '',
        latitude: null,
        longitude: null,
        confirmed: false,
        facilities: [],
        rules: [],
    },
    details: {
        pricePerGuest: '',
        maxGuests: '',
        date: null,
        endTime: null,
        registrationDeadline: null,
        title: '',
        description: '',
        coverImage: null,
        accessType: 'OPEN',
        questions: [],
    },
    veganOptions: false,
    substitutions: false,
    menuAlterations: false,
};

function freshDefaultState(): EventCreationState {
    return {
        ...defaultEventCreationState,
        cuisineTypes: [],
        vibe: [],
        dishes: defaultEventCreationState.dishes.map((dish) => ({ ...dish })),
        location: { ...defaultEventCreationState.location, facilities: [], rules: [] },
        details: { ...defaultEventCreationState.details, questions: [] },
    };
}

export function useEventCreationViewModel() {
    const [data, setData] = useState<EventCreationState>(freshDefaultState);

    const setEventType = (type: string) => setData((previous) => ({ ...previous, eventType: type }));
    const toggleCuisineType = (type: string) => setData((previous) => {
        const selected = previous.cuisineTypes.includes(type);
        return {
            ...previous,
            cuisineTypes: selected
                ? previous.cuisineTypes.filter((item) => item !== type)
                : previous.cuisineTypes.length < 5
                    ? [...previous.cuisineTypes, type]
                    : previous.cuisineTypes,
        };
    });
    const toggleVibe = (type: string) => setData((previous) => ({
        ...previous,
        vibe: previous.vibe.includes(type)
            ? previous.vibe.filter((item) => item !== type)
            : [...previous.vibe, type],
    }));
    const setServedInSequence = (value: boolean) => setData((previous) => ({ ...previous, isServedInSequence: value }));
    const addDish = (dish: Dish) => setData((previous) => previous.dishes.length >= 20
        ? previous
        : { ...previous, dishes: [...previous.dishes, { ...dish, category: dish.category || '' }] });
    const removeDish = (id: string) => setData((previous) => ({
        ...previous,
        dishes: previous.dishes.filter((dish) => dish.id !== id),
    }));
    const updateDish = (id: string, dish: Dish) => setData((previous) => ({
        ...previous,
        dishes: previous.dishes.map((current) => current.id === id ? dish : current),
    }));
    const duplicateDish = (id: string) => setData((previous) => {
        const index = previous.dishes.findIndex((dish) => dish.id === id);
        if (index < 0 || previous.dishes.length >= 20) return previous;
        const dishes = [...previous.dishes];
        dishes.splice(index + 1, 0, {
            ...previous.dishes[index],
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
        return { ...previous, dishes };
    });
    const moveDish = (id: string, direction: -1 | 1) => setData((previous) => {
        const index = previous.dishes.findIndex((dish) => dish.id === id);
        const destination = index + direction;
        if (index < 0 || destination < 0 || destination >= previous.dishes.length) return previous;
        const dishes = [...previous.dishes];
        [dishes[index], dishes[destination]] = [dishes[destination], dishes[index]];
        return { ...previous, dishes };
    });
    const updateLocation = (updates: Partial<LocationDetails>) => setData((previous) => ({
        ...previous,
        location: { ...previous.location, ...updates },
    }));
    const updateDetails = (updates: Partial<EventDetails>) => setData((previous) => ({
        ...previous,
        details: { ...previous.details, ...updates },
    }));
    const setAccessType = (accessType: EventDetails['accessType']) => updateDetails({ accessType });
    const addQuestion = (question: EventDetails['questions'][number]) => setData((previous) => ({
        ...previous,
        details: {
            ...previous.details,
            questions: previous.details.questions.length >= 5
                ? previous.details.questions
                : [...previous.details.questions, { ...question, options: question.options ?? [] }],
        },
    }));
    const removeQuestion = (index: number) => setData((previous) => ({
        ...previous,
        details: {
            ...previous.details,
            questions: previous.details.questions.filter((_, questionIndex) => questionIndex !== index),
        },
    }));

    const setVeganOptions = (value: boolean) => setData((previous) => ({ ...previous, veganOptions: value }));
    const setSubstitutions = (value: boolean) => setData((previous) => ({ ...previous, substitutions: value }));
    const setMenuAlterations = (value: boolean) => setData((previous) => ({ ...previous, menuAlterations: value }));
    const submitEvent = () => eventService.submitEvent(data);
    const replaceData = (next: EventCreationState) => setData(next);
    const reset = () => setData(freshDefaultState());

    const loadEvent = (event: any) => {
        const dietaryOptions: string[] = event.dietaryOptions ?? event.dietary_options ?? [];
        const loadedStart = event.eventDate || event.event_date
            ? new Date(event.eventDate ?? event.event_date)
            : null;
        const loadedEnd = event.endTime || event.end_time
            ? new Date(event.endTime ?? event.end_time)
            : loadedStart
                ? new Date(loadedStart.getTime() + 4 * 60 * 60 * 1000)
                : null;
        setData({
            ...freshDefaultState(),
            eventType: event.eventType ?? event.event_type ?? '',
            cuisineTypes: event.cuisineTypes ?? event.cuisine_types ?? [],
            vibe: event.vibe ?? [],
            isServedInSequence: event.isServedInSequence ?? event.is_served_in_sequence ?? false,
            dishes: (event.dishes ?? []).map((dish: any) => ({
                id: dish.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                name: dish.name,
                description: dish.description ?? '',
                category: dish.category ?? '',
            })),
            location: {
                address: event.location ?? '',
                city: event.city ?? '',
                state: event.state ?? '',
                neighborhood: event.neighborhood ?? '',
                postalCode: event.postalCode ?? '',
                latitude: event.latitude ?? null,
                longitude: event.longitude ?? null,
                confirmed: event.latitude != null && event.longitude != null,
                facilities: event.facilities ?? [],
                rules: event.rules ?? [],
            },
            details: {
                pricePerGuest: event.price === null || event.price === undefined
                    ? ''
                    : formatEventPriceInput(Math.round(Number(event.price) * 100).toString()),
                maxGuests: (event.maxGuests ?? event.max_guests)?.toString() ?? '',
                date: loadedStart,
                endTime: loadedEnd,
                registrationDeadline: event.reservationDeadline || event.reservation_deadline
                    ? new Date(event.reservationDeadline ?? event.reservation_deadline)
                    : null,
                title: event.title ?? '',
                description: event.description ?? '',
                coverImage: event.coverImageUrl ?? event.cover_image_url ?? null,
                accessType: event.accessType ?? event.access_type ?? 'OPEN',
                questions: event.questions ?? [],
            },
            veganOptions: dietaryOptions.includes('Opções veganas e vegetarianas disponíveis'),
            substitutions: dietaryOptions.includes('Aceita adaptações por restrições alimentares'),
            menuAlterations: dietaryOptions.includes('Cardápio sujeito a alterações'),
        });
    };

    return {
        data,
        setEventType,
        toggleCuisineType,
        toggleVibe,
        setServedInSequence,
        addDish,
        removeDish,
        updateDish,
        duplicateDish,
        moveDish,
        updateLocation,
        updateDetails,
        setVeganOptions,
        setSubstitutions,
        setMenuAlterations,
        submitEvent,
        setAccessType,
        addQuestion,
        removeQuestion,
        loadEvent,
        replaceData,
        reset,
    };
}
