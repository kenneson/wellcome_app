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
}

export const eventService = new EventService();
