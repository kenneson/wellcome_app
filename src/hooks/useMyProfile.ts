import { userService } from '@/services/api/UserService';
import { supabase } from '@/shared/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/** Signed-in user id, resolved once from the Supabase session. */
export function useSessionUserId() {
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (active) setUserId(session?.user?.id ?? null);
        });
        return () => {
            active = false;
        };
    }, []);

    return userId;
}

/**
 * Private profile of the signed-in user. Shares the `['profile', id]` cache
 * across tabs so switching between them doesn't refetch.
 */
export function useMyProfile() {
    const userId = useSessionUserId();
    const query = useQuery({
        queryKey: ['profile', userId],
        queryFn: () => userService.getProfile(userId!),
        enabled: !!userId,
    });

    return { userId, ...query };
}
