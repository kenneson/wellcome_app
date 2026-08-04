import { supabase } from '@/shared/lib/supabase';
import { EventCreationState } from '@/entities/event/model/types';
import { Event } from '@/entities/event/types';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { API_URL } from '@/shared/config/api';
import { INVALID_EVENT_PRICE_MESSAGE, isValidEventPrice, parseEventPrice } from '@/shared/config/payments';
import { isEventRegistrationClosed } from '@/shared/lib/eventAvailability';

export class EventService {
    private async getAuthHeaders(includeJsonContentType: boolean = true): Promise<Record<string, string>> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('UsuÃ¡rio nÃ£o autenticado');

        return {
            ...(includeJsonContentType ? { 'Content-Type': 'application/json' } : {}),
            Authorization: `Bearer ${session.access_token}`,
        };
    }

    private async getOptionalAuthHeaders(): Promise<Record<string, string>> {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
    }

    async uploadImage(uri: string, userId: string): Promise<string | null> {
        const filename = `${userId}/${Date.now()}.jpg`;
        const image = await fetch(uri).then((response) => response.arrayBuffer());
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filename, image, {
                contentType: 'image/jpeg',
                upsert: false,
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filename);
        return publicUrl;
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

    private buildDietaryOptions(data: EventCreationState): string[] {
        const dietaryOptions: string[] = [];
        if (data.veganOptions) dietaryOptions.push('Opções veganas e vegetarianas disponíveis');
        if (data.substitutions) dietaryOptions.push('Aceita adaptações por restrições alimentares');
        if (data.menuAlterations) dietaryOptions.push('Cardápio sujeito a alterações');
        return dietaryOptions;
    }

    private mapDishesForPayload(dishes: EventCreationState['dishes']) {
        return dishes.map((d, idx) => ({
            name: d.name,
            description: d.description,
            category: d.category || 'PRATO_PRINCIPAL',
            order: idx
        }));
    }

    async submitEvent(data: EventCreationState): Promise<Event> {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Usuário não autenticado');

            const price = parseEventPrice(data.details.pricePerGuest);
            if (!isValidEventPrice(price)) throw new Error(INVALID_EVENT_PRICE_MESSAGE);

            let coverImageUrl = null;
            if (data.details.coverImage) {
                coverImageUrl = await this.uploadImage(data.details.coverImage, session.user.id);
            }

            const payload = {
                title: data.details.title,
                description: data.details.description,
                price,
                maxGuests: parseInt(data.details.maxGuests || '0'),
                eventDate: data.details.date ? data.details.date.toISOString() : new Date().toISOString(),
                endTime: data.details.endTime ? data.details.endTime.toISOString() : null,
                reservationDeadline: data.details.registrationDeadline ? data.details.registrationDeadline.toISOString() : null,
                location: data.location.address,
                latitude: data.location.latitude,
                longitude: data.location.longitude,
                coverImageUrl: coverImageUrl,
                imageGallery: [] as string[],
                hostId: session.user.id,
                eventType: data.eventType,
                cuisineTypes: data.cuisineTypes,
                vibe: data.vibe,
                facilities: data.location.facilities,
                rules: data.location.rules,
                dietaryOptions: this.buildDietaryOptions(data),
                accessType: data.details.accessType,
                questions: data.details.questions,
                dishes: this.mapDishesForPayload(data.dishes)
            };

            // Debug logging
            console.log('[DEBUG] EventService.submitEvent - Payload:');
            console.log('  - endTime:', payload.endTime);
            console.log('  - reservationDeadline:', payload.reservationDeadline);
            console.log('  - dishes count:', payload.dishes.length);
            console.log('  - dishes:', JSON.stringify(payload.dishes));

            const apiUrl = `${API_URL}/events`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: await this.getAuthHeaders(),
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
        console.log('[DEBUG] EventService.getEventById - Fetching from:', `${API_URL}/events/${id}`);
        const response = await fetch(`${API_URL}/events/${id}`, {
            headers: await this.getOptionalAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch event');
        }
        const event = await response.json();
        
        // Debug logging - log the full object
        console.log('[DEBUG] EventService.getEventById - Full response:', JSON.stringify(event, null, 2));
        console.log('[DEBUG] EventService.getEventById - Key fields:');
        console.log('  - endTime:', event.endTime);
        console.log('  - reservationDeadline:', event.reservationDeadline);
        console.log('  - dishes count:', event.dishes?.length || 0);
        console.log('  - host:', event.host);
        console.log('  - host fullName:', event.host?.fullName);
        console.log('  - host avatarUrl:', event.host?.avatarUrl);
        
        return event;
    }

    async listEvents(filters?: Record<string, string | string[] | undefined>): Promise<Event[]> {
        const queryParams = new URLSearchParams();
        Object.entries(filters || {}).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach((item) => queryParams.append(key, item));
            } else if (value !== undefined) {
                queryParams.set(key, value);
            }
        });
        const response = await fetch(`${API_URL}/events?${queryParams.toString()}`, {
            headers: await this.getOptionalAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to list events');
        }
        const events: Event[] = await response.json();
        return events.filter((event) => !isEventRegistrationClosed(event));
    }

    async updateEvent(id: string, data: Partial<EventCreationState>): Promise<Event> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Usuário não autenticado');

        const details = data.details;
        const location = data.location;
        const price = details?.pricePerGuest ? parseEventPrice(details.pricePerGuest) : undefined;
        if (price !== undefined && !isValidEventPrice(price)) {
            throw new Error(INVALID_EVENT_PRICE_MESSAGE);
        }

        // Build dietaryOptions from boolean flags
        const dietaryOptions: string[] = [];
        if (data.veganOptions) dietaryOptions.push('Opções veganas e vegetarianas disponíveis');
        if (data.substitutions) dietaryOptions.push('Aceita adaptações por restrições alimentares');
        if (data.menuAlterations) dietaryOptions.push('Cardápio sujeito a alterações');

        const payload = {
            title: details?.title,
            description: details?.description,
            price,
            maxGuests: details?.maxGuests ? parseInt(details.maxGuests) : undefined,
            eventDate: details?.date ? details.date.toISOString() : undefined,
            endTime: details?.endTime ? details.endTime.toISOString() : undefined,
            reservationDeadline: details?.registrationDeadline ? details.registrationDeadline.toISOString() : undefined,
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
            dietaryOptions,
            accessType: details?.accessType,
            questions: details?.questions,
            dishes: data.dishes?.map((d, idx) => ({
                name: d.name,
                description: d.description,
                category: d.category || 'PRATO_PRINCIPAL',
                order: idx
            }))
        };

        // Remove undefined keys for partial updates
        const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));

        const response = await fetch(`${API_URL}/events/${id}`, {
            method: 'PUT',
            headers: await this.getAuthHeaders(),
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
            headers: await this.getAuthHeaders(),
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
