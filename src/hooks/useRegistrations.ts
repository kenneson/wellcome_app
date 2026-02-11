import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registrationService, CreateBookingData } from '@/services/api/RegistrationService';

export function useCreateRegistration() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateBookingData) => registrationService.createBooking(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] }); // If we have this query
        }
    });
}

export function useCancelRegistration() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
            registrationService.cancelBooking(eventId, userId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
        }
    });
}

export function useApproveRegistration() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ registrationId, hostId }: { registrationId: string; hostId: string }) =>
            registrationService.approveBooking(registrationId, hostId),
        onSuccess: () => {
            // We ideally need eventId to invalidate specific event, but we invalidate all events or refetch specific
            // Since we don't have eventId here easily, we might invalidate 'events' or 'event'
            queryClient.invalidateQueries({ queryKey: ['event'] });
        }
    });
}

export function useRejectRegistration() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ registrationId, hostId, reason }: { registrationId: string; hostId: string; reason: string }) =>
            registrationService.rejectBooking(registrationId, hostId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event'] });
        }
    });
}
