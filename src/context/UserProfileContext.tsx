import { createContext, useContext } from 'react';

export type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | null;

type UserProfileContextType = {
    isProfileComplete: boolean | null;
    kycStatus: KycStatus;
    refetchProfile: () => Promise<void>;
};

export const UserProfileContext = createContext<UserProfileContextType>({
    isProfileComplete: null,
    kycStatus: null,
    refetchProfile: async () => { },
});

export const useUserProfile = () => useContext(UserProfileContext);
