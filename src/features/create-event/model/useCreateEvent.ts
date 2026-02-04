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
        coverImage: null
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

    const setVeganOptions = (value: boolean) => setData(prev => ({ ...prev, veganOptions: value }));
    const setSubstitutions = (value: boolean) => setData(prev => ({ ...prev, substitutions: value }));
    const setMenuAlterations = (value: boolean) => setData(prev => ({ ...prev, menuAlterations: value }));

    const submitEvent = async () => {
        await eventService.submitEvent(data);
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
        submitEvent
    };
}
