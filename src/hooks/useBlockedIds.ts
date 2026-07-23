import { moderationService } from '@/services/api/ModerationService';
import { useQuery } from '@tanstack/react-query';

/**
 * IDs dos usuários que o usuário atual bloqueou. Usado para ocultar
 * eventos/avaliações de quem foi bloqueado (filtro client-side).
 */
export function useBlockedIds() {
    const { data } = useQuery({
        queryKey: ['blockedIds'],
        queryFn: () => moderationService.listBlocked(),
        staleTime: 60_000,
    });
    return new Set<string>(data ?? []);
}
