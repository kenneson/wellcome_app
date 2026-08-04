import { useState } from 'react';
import { EventCreationState, Dish, LocationDetails, EventDetails } from '@/entities/event/model/types';
import { eventService } from '@/services/api/EventService';

const defaultState: EventCreationState = {
    eventType: '',
    cuisineTypes: [],
    vibe: [],
    isServedInSequence: false,
    dishes: [],
    location: {
        address: '',
        latitude: null,
        longitude: null,
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
        questions: []
    },
    veganOptions: false,
    substitutions: false,
    menuAlterations: false,
};

export function useEventCreationViewModel() {
    const [data, setData] = useState<EventCreationState>({
        ...defaultState,
        details: { ...defaultState.details, coverImage: null }
    } as EventCreationState);

    const setEventType = (type: string) => setData(prev => ({ ...prev, eventType: type }));

    const toggleCuisineType = (type: string) => {
        setData(prev => {
            const exists = prev.cuisineTypes.includes(type);
            return {
                ...prev,
                cuisineTypes: exists
                    ? prev.cuisineTypes.filter(t => t !== type)
                    : [...prev.cuisineTypes, type]
            };
        });
    };

    const toggleVibe = (type: string) => {
        setData(prev => {
            const hasVibe = Array.isArray(prev.vibe) ? prev.vibe.includes(type) : false;
            return {
                ...prev,
                vibe: hasVibe
                    ? prev.vibe.filter(t => t !== type)
                    : [...(prev.vibe || []), type]
            };
        });
    };

    const setServedInSequence = (value: boolean) => setData(prev => ({ ...prev, isServedInSequence: value }));

    const addDish = (dish: Dish) => setData(prev => ({ ...prev, dishes: [...prev.dishes, { ...dish, category: dish.category || '' }] }));

    const removeDish = (id: string) => setData(prev => ({ ...prev, dishes: prev.dishes.filter(d => d.id !== id) }));

    const updateDish = (id: string, dish: Dish) => setData(prev => ({
        ...prev,
        dishes: prev.dishes.map(d => d.id === id ? dish : d)
    }));

    const updateLocation = (updates: Partial<LocationDetails>) => setData(prev => ({
        ...prev,
        location: { ...prev.location, ...updates }
    }));

    const updateDetails = (updates: Partial<EventDetails>) => setData(prev => ({
        ...prev,
        details: { ...prev.details, ...updates }
    }));

    // New methods for settings
    const setAccessType = (type: 'OPEN' | 'OPEN_WITH_APPROVAL' | 'PRIVATE' | 'INVITE_ONLY') =>
        updateDetails({ accessType: type });

    const addQuestion = (question: { question: string; questionType: 'TEXT' | 'SELECT' | 'MULTI_SELECT'; required: boolean }) => {
        setData(prev => ({
            ...prev,
            details: {
                ...prev.details,
                questions: [
                    ...(prev.details.questions || []),
                    { ...question, options: [] } // Initialize options as empty for now to match strict type if needed, or simplified
                ]
            }
        }));
    };

    const removeQuestion = (index: number) => {
        setData(prev => ({
            ...prev,
            details: {
                ...prev.details,
                questions: (prev.details.questions || []).filter((_, i) => i !== index)
            }
        }));
    };

    const setVeganOptions = (value: boolean) => setData(prev => ({ ...prev, veganOptions: value }));
    const setSubstitutions = (value: boolean) => setData(prev => ({ ...prev, substitutions: value }));
    const setMenuAlterations = (value: boolean) => setData(prev => ({ ...prev, menuAlterations: value }));

    const submitEvent = async () => {
        console.log('[DEBUG] useCreateEvent.submitEvent - Full data:');
        console.log('  - details.endTime:', data.details.endTime);
        console.log('  - details.registrationDeadline:', data.details.registrationDeadline);
        console.log('  - dishes count:', data.dishes.length);
        console.log('  - dishes:', JSON.stringify(data.dishes));
        console.log('  - veganOptions:', data.veganOptions);
        console.log('  - substitutions:', data.substitutions);
        console.log('  - menuAlterations:', data.menuAlterations);
        await eventService.submitEvent(data);
    };

    const loadEvent = (event: any) => {
        // Derive dietary booleans from dietaryOptions string array
        const dietaryOpts: string[] = event.dietary_options || [];

        setData(prev => ({
            ...prev,
            eventType: event.eventType ?? event.event_type ?? '',
            cuisineTypes: event.cuisineTypes ?? event.cuisine_types ?? [],
            vibe: event.vibe || [],
            dishes: (event.dishes || []).map((d: any) => ({
                id: d.id || Math.random().toString(36).substr(2, 9),
                name: d.name,
                description: d.description || '',
                category: d.category || ''
            })),
            location: {
                address: event.location,
                latitude: event.latitude,
                longitude: event.longitude,
                facilities: event.facilities || [],
                rules: event.rules || [],
            },
            details: {
                pricePerGuest: event.price?.toString() || '',
                maxGuests: (event.maxGuests ?? event.max_guests)?.toString() || '',
                date: event.eventDate || event.event_date ? new Date(event.eventDate ?? event.event_date) : null,
                endTime: event.endTime || event.end_time ? new Date(event.endTime ?? event.end_time) : null,
                registrationDeadline: event.reservationDeadline || event.reservation_deadline
                    ? new Date(event.reservationDeadline ?? event.reservation_deadline)
                    : null,
                title: event.title,
                description: event.description,
                coverImage: event.coverImageUrl ?? event.cover_image_url,
                accessType: event.accessType ?? event.access_type ?? 'OPEN',
                questions: event.questions || []
            },
            veganOptions: dietaryOpts.includes('Opções veganas e vegetarianas disponíveis'),
            substitutions: dietaryOpts.includes('Aceita adaptações por restrições alimentares'),
            menuAlterations: dietaryOpts.includes('Cardápio sujeito a alterações'),
        }));
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
        updateLocation,
        updateDetails,
        setVeganOptions,
        setSubstitutions,
        setMenuAlterations,
        submitEvent,
        setAccessType,
        addQuestion,
        removeQuestion,
        loadEvent
    };
}
