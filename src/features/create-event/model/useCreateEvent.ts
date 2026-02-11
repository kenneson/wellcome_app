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

    const addDish = (dish: Dish) => setData(prev => ({ ...prev, dishes: [...prev.dishes, dish] }));

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

    const addQuestion = (question: { question: string; type: 'TEXT' | 'SELECT' | 'MULTI_SELECT'; required: boolean }) => {
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
        await eventService.submitEvent(data);
    };

    const loadEvent = (event: any) => {
        // Map backend event to state
        setData(prev => ({
            ...prev,
            eventType: event.event_type || '', // Handle snake_case from DB
            cuisineTypes: event.cuisine_types || [],
            vibe: event.vibe || [],
            location: {
                address: event.location,
                latitude: event.latitude,
                longitude: event.longitude,
                facilities: event.facilities || [],
                rules: event.rules || [],
            },
            details: {
                pricePerGuest: event.price?.toString() || '',
                maxGuests: event.max_guests?.toString() || '',
                date: event.event_date ? new Date(event.event_date) : null,
                registrationDeadline: null, // Not in DB yet?
                title: event.title,
                description: event.description,
                coverImage: event.cover_image_url,
                accessType: event.access_type || 'OPEN',
                questions: event.questions || []
            },
            // Defaulting others for now as they might not be in DB or mapped differently
            veganOptions: false,
            substitutions: false,
            menuAlterations: false,
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
