import { mapUserProfileUpdate } from '../UserProfileUpdateMapper';

describe('mapUserProfileUpdate', () => {
    it('persists every user-editable profile field', () => {
        expect(mapUserProfileUpdate({
            fullName: 'Maria Silva',
            avatarUrl: 'https://example.com/avatar.jpg',
            occupation: 'Chef',
            bio: 'Recebo pessoas em casa.',
            lookingFor: 'ambos',
            city: 'Recife',
            neighborhood: 'Boa Viagem',
            languages: ['Português', 'Inglês'],
            dietaryRestrictions: ['Lactose'],
            phoneNumber: '81999999999',
            expoPushToken: 'ExponentPushToken[test]',
            username: 'maria',
            website: 'https://example.com',
            birthDecade: '1990',
            pets: 'Gato',
            pixKey: 'maria@example.com',
            pixKeyType: 'EMAIL',
        })).toEqual({
            fullName: 'Maria Silva',
            avatarUrl: 'https://example.com/avatar.jpg',
            occupation: 'Chef',
            bio: 'Recebo pessoas em casa.',
            lookingFor: 'ambos',
            city: 'Recife',
            neighborhood: 'Boa Viagem',
            languages: ['Português', 'Inglês'],
            dietaryRestrictions: ['Lactose'],
            phoneNumber: '81999999999',
            expoPushToken: 'ExponentPushToken[test]',
            username: 'maria',
            website: 'https://example.com',
            birthDecade: '1990',
            pets: 'Gato',
            pixKey: 'maria@example.com',
            pixKeyType: 'EMAIL',
        });
    });

    it('never forwards server-owned fields', () => {
        const mapped = mapUserProfileUpdate({
            walletBalance: 999,
            pendingWalletBalance: 999,
            kycStatus: 'APPROVED',
            isSuperhost: true,
        });

        expect(mapped).not.toHaveProperty('walletBalance');
        expect(mapped).not.toHaveProperty('pendingWalletBalance');
        expect(mapped).not.toHaveProperty('kycStatus');
        expect(mapped).not.toHaveProperty('isSuperhost');
    });
});
