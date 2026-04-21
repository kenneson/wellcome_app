import { FastifyRequest } from 'fastify';
import { supabase } from '../../../infrastructure/external/supabaseClient';

export class UnauthorizedRequestError extends Error {
    constructor(message: string = 'Missing or invalid bearer token') {
        super(message);
        this.name = 'UnauthorizedRequestError';
    }
}

export async function getAuthenticatedUserId(request: FastifyRequest): Promise<string> {
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedRequestError();
    }

    const accessToken = authorizationHeader.slice(7).trim();

    if (!accessToken) {
        throw new UnauthorizedRequestError();
    }

    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user?.id) {
        throw new UnauthorizedRequestError('Session expired or invalid');
    }

    return data.user.id;
}
