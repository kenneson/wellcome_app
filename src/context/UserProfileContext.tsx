import { createContext, useContext } from 'react';

type UserProfileContextType = {
    isProfileComplete: boolean | null;
    refetchProfile: () => Promise<void>;
};

export const UserProfileContext = createContext<UserProfileContextType>({
    isProfileComplete: null,
    refetchProfile: async () => { },
});

export const useUserProfile = () => useContext(UserProfileContext);
