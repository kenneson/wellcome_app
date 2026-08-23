import { Event } from './Event';
import { EventRegistration } from './EventRegistration';

export interface User {
    id: string;
    fullName: string | null;
    username?: string | null;
    website?: string | null;
    avatarUrl: string | null;
    occupation?: string | null;
    bio?: string | null;
    lookingFor?: string | null;
    city?: string | null;
    neighborhood?: string | null;
    languages?: string[];
    dietaryRestrictions?: string[];
    birthDecade?: string | null;
    pets?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    isSuperhost?: boolean;
    events?: Event[];
    bookings?: EventRegistration[];
    expoPushToken?: string | null;
    walletBalance?: number;
    pendingWalletBalance?: number;
    pixKey?: string | null;
    pixKeyType?: string | null;
    kycStatus?: string | null;
    kycDocumentUrl?: string | null;
    kycSelfieUrl?: string | null;
    kycSimilarityScore?: number | null;
    kycSubmittedAt?: Date | null;
    kycReviewedAt?: Date | null;
    kycRejectionReason?: string | null;
    updatedAt: Date;
}

