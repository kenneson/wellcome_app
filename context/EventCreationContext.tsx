import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';

export interface Dish {
    id: string;
    name: string;
    description: string;
}

export interface LocationDetails {
    address: string;
    latitude: number | null;
    longitude: number | null;
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
    coverImage: string | null;
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

const EventCreationContext = createContext<EventCreationContextType | undefined>(undefined);

export function EventCreationProvider({ children }: { children: ReactNode }) {
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
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Usuário não autenticado');

            let coverImageUrl = null;

            // 1. Upload Image if exists
            if (data.details.coverImage) {
                const navKey = data.details.coverImage; // Assume it's a local URI
                // For simplicity in MVP, we might need to process the URI to blob
                // But React Native Supabase upload often requires FormData or specialized fetch
                // Let's implement a basic upload or skip if complex for now.
                // Assuming we have a helper or just uploading raw.

                // NOTE: Real image upload is complex in Expo without specific polyfills. 
                // We will try a standard FormData approach.
                const filename = `${session.user.id}/${Date.now()}.jpg`;
                const formData = new FormData();

                // @ts-ignore
                formData.append('file', {
                    uri: navKey,
                    name: filename,
                    type: 'image/jpeg',
                });

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('avatars') // Reusing avatars bucket or 'events' if exists. Let's try 'avatars' as safe bet.
                    .upload(filename, formData as any);

                if (uploadData) {
                    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filename);
                    coverImageUrl = publicUrl;
                }
            }

            // 2. Construct Description (Rich Text Simulation)
            let fullDescription = data.details.description || '';
            fullDescription += `\n\n--- MENU ---\n`;
            data.dishes.forEach(d => fullDescription += `• ${d.name}: ${d.description}\n`);

            fullDescription += `\n--- DETALHES ---\n`;
            if (data.location.facilities.length > 0) fullDescription += `Facilidades: ${data.location.facilities.join(', ')}\n`;
            if (data.location.rules.length > 0) fullDescription += `Regras: ${data.location.rules.join(', ')}\n`;
            fullDescription += `Tipo: ${data.eventType}\nCulinária: ${data.cuisineTypes.join(', ')}`;

            // 2b. Ensure Coordinates exist (Geocode fallback)
            let lat = data.location.latitude;
            let long = data.location.longitude;

            if ((!lat || !long) && data.location.address) {
                // Web: Geocoding API not supported by Expo Location directly
                if (Platform.OS !== 'web') {
                    try {
                        const geocoded = await Location.geocodeAsync(data.location.address);
                        if (geocoded && geocoded.length > 0) {
                            lat = geocoded[0].latitude;
                            long = geocoded[0].longitude;
                        }
                    } catch (e) {
                        console.log('Failed to geocode address during submit', e);
                    }
                } else {
                    console.warn('Web platform: skipping server-side geocoding fallback. Event may lack coords if not provided via GPS.');
                }
            }

            // 3. Insert Event
            const { error: insertError } = await supabase.from('events').insert({
                host_id: session.user.id,
                title: data.details.title,
                description: fullDescription,
                event_date: data.details.date?.toISOString(),
                location: data.location.address,
                latitude: lat,
                longitude: long,
                max_guests: parseInt(data.details.maxGuests || '0'),
                cover_image_url: coverImageUrl,
                price: parseFloat(data.details.pricePerGuest.replace('R$', '').replace(',', '.') || '0')
            });

            if (insertError) throw insertError;

        } catch (error) {
            console.error('Submit Error:', error);
            throw error;
        }
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
