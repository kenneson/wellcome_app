import { FastifyReply, FastifyRequest } from 'fastify';
import { KycStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../../infrastructure/database/prismaClient';
import { supabaseAdmin } from '../../../infrastructure/external/supabaseClient';
import { ForbiddenRequestError, UnauthorizedRequestError, requireAdminUser } from '../helpers/auth';

const listKycQuerySchema = z.object({
    status: z.enum(['ALL', 'PENDING', 'APPROVED', 'REJECTED']).optional().default('PENDING'),
});

const rejectKycBodySchema = z.object({
    reason: z.string().trim().min(3, 'Informe um motivo com pelo menos 3 caracteres'),
});

export class AdminController {
    async me(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { userId } = await requireAdminUser(request);
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    role: true,
                },
            });

            if (!user) {
                return reply.code(404).send({ message: 'Admin user not found' });
            }

            return reply.send(user);
        } catch (error) {
            return this.handleAuthError(error, reply);
        }
    }

    async listKycRequests(request: FastifyRequest, reply: FastifyReply) {
        try {
            await requireAdminUser(request);
            const { status } = listKycQuerySchema.parse(request.query ?? {});

            const users = await prisma.user.findMany({
                where: status === 'ALL'
                    ? { NOT: { kycStatus: KycStatus.NOT_SUBMITTED } }
                    : { kycStatus: status as Exclude<typeof status, 'ALL'> },
                orderBy: { kycSubmittedAt: 'desc' },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    city: true,
                    avatarUrl: true,
                    kycStatus: true,
                    kycDocumentUrl: true,
                    kycSelfieUrl: true,
                    kycSimilarityScore: true,
                    kycSubmittedAt: true,
                    kycReviewedAt: true,
                    kycRejectionReason: true,
                },
            });

            const response = await Promise.all(users.map(async (user) => ({
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                city: user.city,
                avatarUrl: user.avatarUrl,
                kycStatus: user.kycStatus,
                kycDocumentUrl: user.kycDocumentUrl,
                kycSelfieUrl: user.kycSelfieUrl,
                kycDocumentSignedUrl: await this.createKycSignedUrl(user.kycDocumentUrl),
                kycSelfieSignedUrl: await this.createKycSignedUrl(user.kycSelfieUrl),
                kycSimilarityScore: user.kycSimilarityScore,
                kycSubmittedAt: user.kycSubmittedAt,
                kycReviewedAt: user.kycReviewedAt,
                kycRejectionReason: user.kycRejectionReason,
            })));

            return reply.send(response);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Invalid query params', errors: error.issues });
            }

            return this.handleAuthError(error, reply);
        }
    }

    async approveKyc(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            await requireAdminUser(request);
            const { id } = request.params;

            const user = await prisma.user.update({
                where: { id },
                data: {
                    kycStatus: KycStatus.APPROVED,
                    kycReviewedAt: new Date(),
                    kycRejectionReason: null,
                },
                select: {
                    id: true,
                    kycStatus: true,
                    kycReviewedAt: true,
                    kycRejectionReason: true,
                },
            });

            return reply.send(user);
        } catch (error: any) {
            if (error?.code === 'P2025') {
                return reply.code(404).send({ message: 'User not found' });
            }

            return this.handleAuthError(error, reply);
        }
    }

    async rejectKyc(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            await requireAdminUser(request);
            const { id } = request.params;
            const { reason } = rejectKycBodySchema.parse(request.body);

            const user = await prisma.user.update({
                where: { id },
                data: {
                    kycStatus: KycStatus.REJECTED,
                    kycReviewedAt: new Date(),
                    kycRejectionReason: reason,
                },
                select: {
                    id: true,
                    kycStatus: true,
                    kycReviewedAt: true,
                    kycRejectionReason: true,
                },
            });

            return reply.send(user);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Invalid request body', errors: error.issues });
            }

            if (error?.code === 'P2025') {
                return reply.code(404).send({ message: 'User not found' });
            }

            return this.handleAuthError(error, reply);
        }
    }

    private async createKycSignedUrl(path: string | null): Promise<string | null> {
        if (!path || !supabaseAdmin) {
            return null;
        }

        const { data, error } = await supabaseAdmin.storage
            .from('kyc-documents')
            .createSignedUrl(path, 60 * 15);

        if (error) {
            console.warn(`[AdminController] Failed to sign KYC file ${path}: ${error.message}`);
            return null;
        }

        return data.signedUrl;
    }

    private handleAuthError(error: unknown, reply: FastifyReply) {
        if (error instanceof UnauthorizedRequestError) {
            return reply.code(401).send({ message: error.message });
        }

        if (error instanceof ForbiddenRequestError) {
            return reply.code(403).send({ message: error.message });
        }

        console.error('[AdminController] Error:', error);
        return reply.code(500).send({ message: 'Internal server error' });
    }
}
