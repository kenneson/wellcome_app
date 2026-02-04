import { createContext, useContext } from 'react';

export const UserProfileContext = createContext<{
    isProfileComplete: boolean | null;
    refetchProfile: () => Promise<void>;
}>({
    isProfileComplete: null,
    refetchProfile: async () => { },
});

export const useUserProfile = () => useContext(UserProfileContext);
