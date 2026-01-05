import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Dish {
    id: string;
    name: string;
    description: string;
}

export interface LocationDetails {
    address: string;
    facilities: string[];
    rules: string[];
}

export interface EventDetails {
    pricePerGuest: string;
    maxGuests: string;
    date: Date | null;
    registrationDeadline: Date | null;
    title: string;
    description: string;
}

interface EventCreationState {
    eventType: string;
    cuisineTypes: string[];
    isServedInSequence: boolean;
    dishes: Dish[];
    location: LocationDetails;
    details: EventDetails;
    veganOptions: boolean;
    substitutions: boolean;
    menuAlterations: boolean;
}

interface EventCreationContextType {
    data: EventCreationState;
    setEventType: (type: string) => void;
    toggleCuisineType: (type: string) => void;
    setServedInSequence: (value: boolean) => void;
    addDish: (dish: Dish) => void;
    removeDish: (id: string) => void;
    updateDish: (id: string, dish: Dish) => void;
    updateLocation: (updates: Partial<LocationDetails>) => void;
    updateDetails: (updates: Partial<EventDetails>) => void;
    setVeganOptions: (value: boolean) => void;
    setSubstitutions: (value: boolean) => void;
    setMenuAlterations: (value: boolean) => void;
    submitEvent: () => Promise<void>;
}

const defaultState: EventCreationState = {
    eventType: '',
    cuisineTypes: [],
    isServedInSequence: false,
    dishes: [],
    location: {
        address: '',
        facilities: [],
        rules: [],
    },
    details: {
        pricePerGuest: '',
        maxGuests: '',
        date: null,
        registrationDeadline: null,
        title: '',
        description: ''
    },
    veganOptions: false,
    substitutions: false,
    menuAlterations: false,
};

const EventCreationContext = createContext<EventCreationContextType | undefined>(undefined);

export function EventCreationProvider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<EventCreationState>(defaultState);

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
        console.log('Submitting event:', data);
        // TODO: Implement Supabase submission
    };

    return (
        <EventCreationContext.Provider value={{
            data,
            setEventType,
            toggleCuisineType,
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
        }}>
            {children}
        </EventCreationContext.Provider>
    );
}

export function useEventCreation() {
    const context = useContext(EventCreationContext);
    if (!context) {
        throw new Error('useEventCreation must be used within an EventCreationProvider');
    }
    return context;
}
