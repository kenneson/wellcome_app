import { supabase } from '@/lib/supabase';
import { EventCreationState } from '../models/Event';
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

            // Construct Description
            let fullDescription = data.details.description || '';
            fullDescription += `\n\n--- MENU ---\n`;
            data.dishes.forEach(d => fullDescription += `• ${d.name}: ${d.description}\n`);

            fullDescription += `\n--- DETALHES ---\n`;
            if (data.location.facilities.length > 0) fullDescription += `Facilidades: ${data.location.facilities.join(', ')}\n`;
            if (data.location.rules.length > 0) fullDescription += `Regras: ${data.location.rules.join(', ')}\n`;
            fullDescription += `Tipo: ${data.eventType}\nCulinária: ${data.cuisineTypes.join(', ')}`;

            // Geolocation fallback
            let { latitude, longitude } = data.location;

            if ((!latitude || !longitude) && data.location.address) {
                const coords = await this.geocodeLocation(data.location.address);
                latitude = coords.latitude;
                longitude = coords.longitude;
            }

            // Insert Event
            const { error: insertError } = await supabase.from('events').insert({
                host_id: session.user.id,
                title: data.details.title,
                description: fullDescription,
                event_date: data.details.date?.toISOString(),
                location: data.location.address,
                latitude: latitude,
                longitude: longitude,
                max_guests: parseInt(data.details.maxGuests || '0'),
                cover_image_url: coverImageUrl,
                price: parseFloat(data.details.pricePerGuest.replace('R$', '').replace(',', '.') || '0')
            });

            if (insertError) throw insertError;

        } catch (error) {
            console.error('Submit Error:', error);
            throw error;
        }
    }
}

export const eventService = new EventService();
