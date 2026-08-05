import { supabase } from '@/shared/lib/supabase';
import { EventCreationState } from '@/entities/event/model/types';
import { Event } from '@/entities/event/types';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { API_URL } from '@/shared/config/api';
import { INVALID_EVENT_PRICE_MESSAGE, isValidEventPrice, parseEventPrice } from '@/shared/config/payments';
import { isEventRegistrationClosed } from '@/shared/lib/eventAvailability';
import * as Crypto from 'expo-crypto';
import { EventDraftApiError } from './EventDraftService';

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

    async getPaymentConfig(): Promise<{ platformFeePercentage: number }> {
        const response = await fetch(`${API_URL}/payments/config`, {
            headers: await this.getOptionalAuthHeaders(),
        });
        if (!response.ok) throw new Error('Falha ao carregar configuracao de pagamentos');
        return response.json();
    }

    async uploadImage(uri: string, userId: string, draftId = 'legacy'): Promise<string> {
        if (/^https?:\/\//i.test(uri)) return uri;
        const filename = `${userId}/${draftId}/${Crypto.randomUUID()}.jpg`;
        const image = await fetch(uri).then((response) => response.arrayBuffer());
        const { error: uploadError } = await supabase.storage
            .from('event-images')
            .upload(filename, image, {
                contentType: 'image/jpeg',
                upsert: false,
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(filename);
        return publicUrl;
    }

    async deleteUploadedImage(publicUrl: string): Promise<void> {
        const marker = '/event-images/';
        const markerIndex = publicUrl.indexOf(marker);
        if (markerIndex < 0) return;
        const path = decodeURIComponent(publicUrl.slice(markerIndex + marker.length));
        await supabase.storage.from('event-images').remove([path]);
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
        } catch {
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

            let coverImageUrl: string | null = null;
            let uploadedForRequest = false;
            if (data.details.coverImage) {
                coverImageUrl = await this.uploadImage(data.details.coverImage, session.user.id);
                uploadedForRequest = coverImageUrl !== data.details.coverImage;
            }

            const endTime = data.details.endTime
                ?? (data.details.date ? new Date(data.details.date.getTime() + 4 * 60 * 60 * 1000) : null);

            const payload = {
                title: data.details.title,
                description: data.details.description,
                price,
                maxGuests: parseInt(data.details.maxGuests || '0'),
                eventDate: data.details.date?.toISOString(),
                endTime: endTime?.toISOString(),
                reservationDeadline: data.details.registrationDeadline ? data.details.registrationDeadline.toISOString() : null,
                location: data.location.address,
                city: data.location.city,
                state: data.location.state,
                latitude: data.location.latitude,
                longitude: data.location.longitude,
                coverImageUrl: coverImageUrl,
                imageGallery: [] as string[],
                eventType: data.eventType,
                cuisineTypes: data.cuisineTypes,
                vibe: data.vibe,
                facilities: data.location.facilities,
                rules: data.location.rules,
                dietaryOptions: this.buildDietaryOptions(data),
                isServedInSequence: data.isServedInSequence,
                accessType: data.details.accessType,
                questions: data.details.questions,
                dishes: this.mapDishesForPayload(data.dishes)
            };

            const apiUrl = `${API_URL}/events`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    ...(await this.getAuthHeaders()),
                    'Idempotency-Key': Crypto.randomUUID(),
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (uploadedForRequest && coverImageUrl) await this.deleteUploadedImage(coverImageUrl);
                throw new EventDraftApiError(
                    errorData.message || 'Falha ao criar evento',
                    errorData.code || 'EVENT_CREATE_FAILED',
                    errorData.fieldErrors || {},
                    response.status,
                );
            }

            return await response.json();

        } catch (error) {
            throw error;
        }
    }

    async getEventById(id: string): Promise<Event> {
        const response = await fetch(`${API_URL}/events/${id}`, {
            headers: await this.getOptionalAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch event');
        }
        return response.json();
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
            city: location?.city,
            state: location?.state,
            latitude: location?.latitude,
            longitude: location?.longitude,
            coverImageUrl: details?.coverImage,
            eventType: data.eventType,
            cuisineTypes: data.cuisineTypes,
            vibe: data.vibe,
            facilities: location?.facilities,
            rules: location?.rules,
            dietaryOptions,
            isServedInSequence: data.isServedInSequence,
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
        const response = await fetch(`${API_URL}/events/${id}`, {
            method: 'DELETE',
            headers: await this.getAuthHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao excluir evento');
        }
    }
}

export const eventService = new EventService();
