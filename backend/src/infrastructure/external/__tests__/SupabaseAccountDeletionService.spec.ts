jest.mock('../supabaseClient', () => ({ supabaseAdmin: null }));

import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAccountDeletionService } from '../SupabaseAccountDeletionService';

describe('SupabaseAccountDeletionService', () => {
    const userId = '11111111-1111-4111-8111-111111111111';

    it('removes nested user files from every account bucket', async () => {
        const removeCalls: Array<{ bucket: string; paths: string[] }> = [];
        const listCalls: Array<{ bucket: string; prefix: string }> = [];

        const client = {
            storage: {
                from: (bucket: string) => ({
                    list: async (prefix: string) => {
                        listCalls.push({ bucket, prefix });
                        if (bucket === 'avatars') {
                            return { data: [{ id: 'avatar-1', name: 'avatar.jpg', metadata: {} }], error: null };
                        }
                        if (bucket === 'kyc-documents' && prefix === userId) {
                            return { data: [{ id: null, name: 'submission-1', metadata: null }], error: null };
                        }
                        if (bucket === 'kyc-documents') {
                            return {
                                data: [
                                    { id: 'doc-1', name: 'document.jpg', metadata: {} },
                                    { id: 'selfie-1', name: 'selfie.jpg', metadata: {} },
                                ],
                                error: null,
                            };
                        }
                        return { data: [], error: null };
                    },
                    remove: async (paths: string[]) => {
                        removeCalls.push({ bucket, paths });
                        return { data: [], error: null };
                    },
                }),
            },
            auth: { admin: { deleteUser: jest.fn() } },
        } as unknown as SupabaseClient;

        await new SupabaseAccountDeletionService(client).deleteOwnedStorageObjects(userId);

        expect(listCalls).toContainEqual({ bucket: 'event-images', prefix: userId });
        expect(removeCalls).toEqual(expect.arrayContaining([
            { bucket: 'avatars', paths: [`${userId}/avatar.jpg`] },
            {
                bucket: 'kyc-documents',
                paths: [
                    `${userId}/submission-1/document.jpg`,
                    `${userId}/submission-1/selfie.jpg`,
                ],
            },
        ]));
    });

    it('hard-deletes the Auth user through the admin API', async () => {
        const deleteUser = jest.fn().mockResolvedValue({ data: null, error: null });
        const client = { auth: { admin: { deleteUser } } } as unknown as SupabaseClient;

        await new SupabaseAccountDeletionService(client).deleteAuthUser(userId);

        expect(deleteUser).toHaveBeenCalledWith(userId, false);
    });

    it('fails closed when the service-role client is unavailable', async () => {
        await expect(new SupabaseAccountDeletionService(null).deleteAuthUser(userId))
            .rejects.toThrow('SUPABASE_SERVICE_ROLE_KEY is required for account deletion');
    });
});
