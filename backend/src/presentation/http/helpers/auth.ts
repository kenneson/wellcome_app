import { Role } from '@prisma/client';
import { FastifyRequest } from 'fastify';
import { prisma } from '../../../infrastructure/database/prismaClient';
import { supabase } from '../../../infrastructure/external/supabaseClient';

export class UnauthorizedRequestError extends Error {
    constructor(message: string = 'Missing or invalid bearer token') {
        super(message);
        this.name = 'UnauthorizedRequestError';
    }
}

export class ForbiddenRequestError extends Error {
    constructor(message: string = 'You do not have permission to perform this action') {
        super(message);
        this.name = 'ForbiddenRequestError';
    }
}

export interface AuthenticatedUserContext {
    userId: string;
    role: Role;
}

async function resolveAuthenticatedUserContext(accessToken: string): Promise<AuthenticatedUserContext> {
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user?.id) {
        throw new UnauthorizedRequestError('Session expired or invalid');
    }

    const profile = await prisma.user.findUnique({
        where: { id: data.user.id },
        select: { role: true },
    });

    if (!profile) {
        throw new UnauthorizedRequestError('User profile not found');
    }

    return {
        userId: data.user.id,
        role: profile.role,
    };
}

function getBearerToken(request: FastifyRequest): string {
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedRequestError();
    }

    const accessToken = authorizationHeader.slice(7).trim();

    if (!accessToken) {
        throw new UnauthorizedRequestError();
    }

    return accessToken;
}

export async function getAuthenticatedUserContext(request: FastifyRequest): Promise<AuthenticatedUserContext> {
    return resolveAuthenticatedUserContext(getBearerToken(request));
}

export async function getAuthenticatedUserId(request: FastifyRequest): Promise<string> {
    const context = await getAuthenticatedUserContext(request);

    return context.userId;
}

export async function getOptionalAuthenticatedUserContext(request: FastifyRequest): Promise<AuthenticatedUserContext | null> {
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader) {
        return null;
    }

    return getAuthenticatedUserContext(request);
}

export async function requireAdminUser(request: FastifyRequest): Promise<AuthenticatedUserContext> {
    const context = await getAuthenticatedUserContext(request);

    if (context.role !== Role.ADMIN) {
        throw new ForbiddenRequestError('Admin access is required');
    }

    return context;
}
