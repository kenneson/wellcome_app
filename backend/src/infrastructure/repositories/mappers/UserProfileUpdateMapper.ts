import { User } from '../../../domain/entities/User';

/**
 * Explicit allowlist for fields that the authenticated profile endpoint may
 * persist. Server-owned wallet, role and KYC fields are intentionally absent.
 */
export function mapUserProfileUpdate(data: Partial<User>) {
    return {
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
        occupation: data.occupation,
        bio: data.bio,
        lookingFor: data.lookingFor,
        city: data.city,
        neighborhood: data.neighborhood,
        languages: data.languages,
        dietaryRestrictions: data.dietaryRestrictions,
        phoneNumber: data.phoneNumber,
        expoPushToken: data.expoPushToken,
        username: data.username,
        website: data.website,
        birthDecade: data.birthDecade,
        pets: data.pets,
        pixKey: data.pixKey,
        pixKeyType: data.pixKeyType,
    };
}
