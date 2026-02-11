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

    // Get all registrations for an event (used by host to manage)
    async getRegistrations(eventId: string) {
        const response = await fetch(`${API_URL}/bookings/event/${eventId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch registrations');
        }

        return response.json();
    }

    // Approve a registration (called by host)
    async approveRegistration(registrationId: string) {
        // Get current user session to get hostId
        const { data: { session } } = await supabase.auth.getSession();
        const hostId = session?.user?.id;

        const response = await fetch(`${API_URL}/bookings/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ registrationId, hostId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to approve registration');
        }

        return response.json();
    }

    // Reject a registration (called by host)
    async rejectRegistration(registrationId: string, reason: string = 'Rejeitado pelo anfitrião') {
        // Get current user session to get hostId
        const { data: { session } } = await supabase.auth.getSession();
        const hostId = session?.user?.id;

        const response = await fetch(`${API_URL}/bookings/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ registrationId, hostId, reason })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to reject registration');
        }

        return response.json();
    }

    // Old methods kept for backwards compatibility
    async approveBooking(registrationId: string, hostId: string) {
        return this.approveRegistration(registrationId);
    }

    async rejectBooking(registrationId: string, hostId: string, reason: string) {
        return this.rejectRegistration(registrationId, reason);
    }
}

export const registrationService = new RegistrationService();

