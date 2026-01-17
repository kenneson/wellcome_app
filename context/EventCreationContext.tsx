import React, { createContext, useContext, ReactNode } from 'react';
import { EventCreationState, Dish, LocationDetails, EventDetails } from '@/models/Event';
import { useEventCreationViewModel } from '@/viewmodels/useEventCreationViewModel';

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

const EventCreationContext = createContext<EventCreationContextType | undefined>(undefined);

export function EventCreationProvider({ children }: { children: ReactNode }) {
    const viewModel = useEventCreationViewModel();

    return (
        <EventCreationContext.Provider value={viewModel}>
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
