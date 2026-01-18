import { supabase } from '@/shared/lib/supabase';
import { EventCreationState } from '@/entities/event/model/types';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

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
            console.error('Image upload failed', uploadError);
        }

        return null;
    }

    async geocodeLocation(address: string): Promise<{ latitude: number | null, longitude: number | null }> {
        if (Platform.OS === 'web') {
            console.warn('Web platform: skipping server-side geocoding fallback.');
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
            console.log('Failed to geocode address', e);
        }
        return { latitude: null, longitude: null };
    }

    async submitEvent(data: EventCreationState): Promise<void> {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Usuário não autenticado');

            let coverImageUrl = null;
            if (data.details.coverImage) {
                coverImageUrl = await this.uploadImage(data.details.coverImage, session.user.id);
            }

            // Construct payload for Backend
            // Note: In a real app, use an environment variable for the API URL
            const apiUrl = 'http://10.0.2.2:3000/events'; // Android Emulator localhost
            // const apiUrl = 'http://localhost:3000/events'; // iOS / Web

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
                hostId: session.user.id // In real backend, extract from JWT token
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

        } catch (error) {
            console.error('Submit Error:', error);
            throw error;
        }
    }
}

export const eventService = new EventService();
