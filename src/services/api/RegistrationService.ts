import { supabase } from '@/shared/lib/supabase';
import { API_URL } from '@/shared/config/api';
import { RegistrationStatus } from '@/entities/event/types';

export interface CreateBookingData {
    eventId: string;
    userId: string;
    answers?: { questionId: string; answer: string }[];
}

export class RegistrationService {
    private async getAuthHeaders(): Promise<Record<string, string>> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('UsuÃ¡rio nÃ£o autenticado');

        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        };
    }

    async createBooking(data: CreateBookingData) {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
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
            headers: await this.getAuthHeaders(),
            body: JSON.stringify({ eventId, userId })
        });

        if (!response.ok) {
            throw new Error('Failed to cancel booking');
        }
    }

    async getRegistrations(eventId: string) {
        const response = await fetch(`${API_URL}/bookings/event/${eventId}`, {
            headers: await this.getAuthHeaders(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch registrations');
        }

        return response.json();
    }

    async approveRegistration(registrationId: string) {
        const response = await fetch(`${API_URL}/bookings/approve`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify({ registrationId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to approve registration');
        }

        return response.json();
    }

    async rejectRegistration(registrationId: string, reason: string = 'Rejeitado pelo anfitrião') {
        const response = await fetch(`${API_URL}/bookings/reject`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify({ registrationId, reason })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to reject registration');
        }

        return response.json();
    }

    async approveBooking(registrationId: string, hostId: string) {
        return this.approveRegistration(registrationId);
    }

    async rejectBooking(registrationId: string, hostId: string, reason: string) {
        return this.rejectRegistration(registrationId, reason);
    }

    async validateTicket(bookingId: string) {
        const response = await fetch(`${API_URL}/bookings/validate-ticket`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify({ bookingId })
        });

        return response.json();
    }

    async createPixCharge(data: { bookingId: string; eventId: string }) {
        const response = await fetch(`${API_URL}/payments/pix`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Falha ao gerar cobranÃ§a PIX');
        }

        return response.json();
    }

    async checkPixPayment(bookingId: string) {
        const response = await fetch(`${API_URL}/payments/pix/${bookingId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Falha ao verificar pagamento');
        }

        return response.json();
    }
}

export const registrationService = new RegistrationService();
