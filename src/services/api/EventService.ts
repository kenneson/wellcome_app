import { supabase } from '@/shared/lib/supabase';
import { EventCreationState } from '@/entities/event/model/types';
import { Event } from '@/entities/event/types';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { API_URL } from '@/shared/config/api';

export class EventService {
    async uploadImage(uri: string, userId: string): Promise<string | null> {
        const filename = `${userId}/${Date.now()}.jpg`;
        const formData = new FormData();

        // @ts-ignore
        formData.append('file', {
            uri: uri,
            name: filename,
            type: 'image/jpeg',
        });

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filename, formData as any);

        if (uploadData) {
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filename);
            return publicUrl;
        }

        if (uploadError) {
        }

        return null;
    }

    async geocodeLocation(address: string): Promise<{ latitude: number | null, longitude: number | null }> {
        if (Platform.OS === 'web') {
            return { latitude: null, longitude: null };
        }

        try {
            const geocoded = await Location.geocodeAsync(address);
            if (geocoded && geocoded.length > 0) {
                return {
                    latitude: geocoded[0].latitude,
                    longitude: geocoded[0].longitude
                };
            }
        } catch (e) {
        }
        return { latitude: null, longitude: null };
    }

    async submitEvent(data: EventCreationState): Promise<Event> {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Usuário não autenticado');

            let coverImageUrl = null;
            if (data.details.coverImage) {
                coverImageUrl = await this.uploadImage(data.details.coverImage, session.user.id);
            }

            // Construct payload forBackend
            const apiUrl = `${API_URL}/events`;

            // Adapting data to Backend Schema
            const payload = {
                title: data.details.title,
                description: data.details.description, // Menu detail could be structured better, sending raw for now
                price: parseFloat(data.details.pricePerGuest.replace('R$', '').replace(',', '.') || '0'),
                maxGuests: parseInt(data.details.maxGuests || '0'),
                eventDate: data.details.date ? data.details.date.toISOString() : new Date().toISOString(),
                location: data.location.address,
                latitude: data.location.latitude,
                longitude: data.location.longitude,
                coverImageUrl: coverImageUrl,
                hostId: session.user.id, // In real backend, extract from JWT token
                eventType: data.eventType,
                cuisineTypes: data.cuisineTypes,
                vibe: data.vibe,
                facilities: data.location.facilities,
                rules: data.location.rules,
                accessType: data.details.accessType,
                questions: data.details.questions
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao criar evento');
            }

            return await response.json();

        } catch (error) {
            throw error;
        }
    }

    async getEventById(id: string): Promise<Event> {
        const response = await fetch(`${API_URL}/events/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch event');
        }
        return response.json();
    }

    async listEvents(filters?: any): Promise<Event[]> {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${API_URL}/events?${queryParams}`);
        if (!response.ok) {
            throw new Error('Failed to list events');
        }
        return response.json();
    }

    async updateEvent(id: string, data: Partial<EventCreationState>): Promise<Event> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Usuário não autenticado');

        // Reuse logic from submitEvent to map Frontend State -> Backend DTO
        const details = data.details;
        const location = data.location;

        const payload = {
            title: details?.title,
            description: details?.description,
            price: details?.pricePerGuest ? parseFloat(details.pricePerGuest.replace('R$', '').replace('.', '').replace(',', '.') || '0') : undefined,
            maxGuests: details?.maxGuests ? parseInt(details.maxGuests) : undefined,
            eventDate: details?.date ? details.date.toISOString() : undefined,
            location: location?.address,
            latitude: location?.latitude,
            longitude: location?.longitude,
            coverImageUrl: details?.coverImage,
            hostId: session.user.id,
            eventType: data.eventType,
            cuisineTypes: data.cuisineTypes,
            vibe: data.vibe,
            facilities: location?.facilities,
            rules: location?.rules,
            accessType: details?.accessType,
            questions: details?.questions
        };

        // Remove undefined keys to allow partial updates if backend supports it
        // But PUT usually expects full resource or PATCH expects partial.
        // Our backend UpdateEventDTO allows partials (all fields optional).
        // So we should clean undefined.
        const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));

        const response = await fetch(`${API_URL}/events/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cleanPayload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao atualizar evento');
        }

        return await response.json();
    }

    async deleteEvent(id: string): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Usuário não autenticado');

        const response = await fetch(`${API_URL}/events/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                hostId: session.user.id
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao excluir evento');
        }
    }
}

export const eventService = new EventService();
