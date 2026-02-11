import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/api/EventService';
import { EventCreationState } from '@/entities/event/model/types';

export function useEvents(filters?: any) {
    return useQuery({
        queryKey: ['events', filters],
        queryFn: () => eventService.listEvents(filters)
    });
}

export function useEvent(id: string) {
    return useQuery({
        queryKey: ['event', id],
        queryFn: () => eventService.getEventById(id),
        enabled: !!id
    });
}

export function useCreateEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: EventCreationState) => eventService.submitEvent(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        }
    });
}
