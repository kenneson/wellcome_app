import React, { createContext, useContext, ReactNode } from 'react';
import { useEventCreationViewModel } from '@/features/create-event/model/useCreateEvent';

// Infer the return type of the hook
type EventCreationContextType = ReturnType<typeof useEventCreationViewModel>;

const EventCreationContext = createContext<EventCreationContextType | null>(null);

export function EventCreationProvider({ children }: { children: ReactNode }) {
    const value = useEventCreationViewModel();

    return (
        <EventCreationContext.Provider value={value}>
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
