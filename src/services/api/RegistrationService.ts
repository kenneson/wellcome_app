import { supabase } from '@/shared/lib/supabase';
import { API_URL } from '@/shared/config/api';
import { RegistrationStatus } from '@/entities/event/types';

export interface CreateBookingData {
    eventId: string;
    userId: string;
    answers?: { questionId: string; answer: string }[];
}

export class RegistrationService {
    async createBooking(data: CreateBookingData) {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create booking');
        }

        return response.json();
    }

    async cancelBooking(eventId: string, userId: string) {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ eventId, userId })
        });

        if (!response.ok) {
            throw new Error('Failed to cancel booking');
        }
    }

    async approveBooking(registrationId: string, hostId: string) {
        const response = await fetch(`${API_URL}/bookings/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ registrationId, hostId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to approve booking');
        }

        return response.json();
    }

    async rejectBooking(registrationId: string, hostId: string, reason: string) {
        const response = await fetch(`${API_URL}/bookings/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ registrationId, hostId, reason })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to reject booking');
        }

        return response.json();
    }
}

export const registrationService = new RegistrationService();
