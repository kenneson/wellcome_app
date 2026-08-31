import type { SupabaseClient } from '@supabase/supabase-js';
import { AccountDeletionGateway } from '../../domain/services/AccountDeletionGateway';
import { supabaseAdmin } from './supabaseClient';

const ACCOUNT_STORAGE_BUCKETS = ['avatars', 'kyc-documents', 'event-images'] as const;
const STORAGE_PAGE_SIZE = 1000;

type StorageEntry = {
    id?: string | null;
    metadata?: unknown;
    name: string;
};

export class SupabaseAccountDeletionService implements AccountDeletionGateway {
    constructor(private readonly client: SupabaseClient | null = supabaseAdmin) { }

    async deleteOwnedStorageObjects(userId: string): Promise<void> {
        const client = this.requireClient();
        const filesByBucket = await Promise.all(
            ACCOUNT_STORAGE_BUCKETS.map(async (bucket) => ({
                bucket,
                paths: await this.listFilesRecursively(client, bucket, userId),
            }))
        );

        for (const { bucket, paths } of filesByBucket) {
            for (let offset = 0; offset < paths.length; offset += STORAGE_PAGE_SIZE) {
                const batch = paths.slice(offset, offset + STORAGE_PAGE_SIZE);
                const { error } = await client.storage.from(bucket).remove(batch);
                if (error) {
                    throw new Error(`Failed to remove ${bucket} objects: ${error.message}`);
                }
            }
        }
    }

    async deleteAuthUser(userId: string): Promise<void> {
        const { error } = await this.requireClient().auth.admin.deleteUser(userId, false);
        if (error) {
            throw new Error(`Failed to delete Supabase Auth user: ${error.message}`);
        }
    }

    private requireClient(): SupabaseClient {
        if (!this.client) {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for account deletion');
        }
        return this.client;
    }

    private async listFilesRecursively(
        client: SupabaseClient,
        bucket: string,
        prefix: string
    ): Promise<string[]> {
        const files: string[] = [];

        for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
            const { data, error } = await client.storage.from(bucket).list(prefix, {
                limit: STORAGE_PAGE_SIZE,
                offset,
                sortBy: { column: 'name', order: 'asc' },
            });

            if (error) {
                throw new Error(`Failed to list ${bucket} objects: ${error.message}`);
            }

            const entries = (data ?? []) as StorageEntry[];
            for (const entry of entries) {
                const path = `${prefix}/${entry.name}`;
                const isFolder = !entry.id && !entry.metadata;
                if (isFolder) {
                    files.push(...await this.listFilesRecursively(client, bucket, path));
                } else {
                    files.push(path);
                }
            }

            if (entries.length < STORAGE_PAGE_SIZE) break;
        }

        return files;
    }
}
