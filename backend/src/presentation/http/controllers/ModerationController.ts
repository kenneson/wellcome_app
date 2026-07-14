import { FastifyReply, FastifyRequest } from 'fastify';
import { ReportReason, ReportStatus, ReportTargetType } from '@prisma/client';
import { z } from 'zod';
import { ModerationRepository } from '../../../domain/repositories/ModerationRepository';
import {
    ForbiddenRequestError,
    UnauthorizedRequestError,
    getAuthenticatedUserId,
    requireAdminUser,
} from '../helpers/auth';

const createReportSchema = z.object({
    targetType: z.nativeEnum(ReportTargetType),
    targetId: z.string().uuid(),
    reason: z.nativeEnum(ReportReason),
    details: z.string().max(1000).optional(),
});

const blockSchema = z.object({ blockedId: z.string().uuid() });
const resolveSchema = z.object({
    status: z.enum([ReportStatus.RESOLVED, ReportStatus.DISMISSED]),
});

export class ModerationController {
    constructor(private moderationRepository: ModerationRepository) {}

    private handleError(error: unknown, reply: FastifyReply) {
        if (error instanceof UnauthorizedRequestError) {
            return reply.status(401).send({ message: error.message });
        }
        if (error instanceof ForbiddenRequestError) {
            return reply.status(403).send({ message: error.message });
        }
        if (error instanceof z.ZodError) {
            return reply.status(400).send({ message: 'Validation error', errors: error.issues });
        }
        return reply.status(500).send({ message: 'Internal server error' });
    }

    async createReport(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = createReportSchema.parse(request.body);
            const reporterId = await getAuthenticatedUserId(request);
            const report = await this.moderationRepository.createReport({ ...body, reporterId });
            return reply.status(201).send(report);
        } catch (error) {
            return this.handleError(error, reply);
        }
    }

    async block(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { blockedId } = blockSchema.parse(request.body);
            const blockerId = await getAuthenticatedUserId(request);
            if (blockerId === blockedId) {
                return reply.status(400).send({ message: 'You cannot block yourself' });
            }
            await this.moderationRepository.blockUser(blockerId, blockedId);
            return reply.status(204).send();
        } catch (error) {
            return this.handleError(error, reply);
        }
    }

    async unblock(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { blockedId } = request.params as { blockedId: string };
            const blockerId = await getAuthenticatedUserId(request);
            await this.moderationRepository.unblockUser(blockerId, blockedId);
            return reply.status(204).send();
        } catch (error) {
            return this.handleError(error, reply);
        }
    }

    async listBlocks(request: FastifyRequest, reply: FastifyReply) {
        try {
            const blockerId = await getAuthenticatedUserId(request);
            const blockedIds = await this.moderationRepository.listBlockedIds(blockerId);
            return reply.status(200).send({ blockedIds });
        } catch (error) {
            return this.handleError(error, reply);
        }
    }

    async listReports(request: FastifyRequest, reply: FastifyReply) {
        try {
            await requireAdminUser(request);
            const { status } = request.query as { status?: ReportStatus };
            const reports = await this.moderationRepository.listReports(status);
            return reply.status(200).send(reports);
        } catch (error) {
            return this.handleError(error, reply);
        }
    }

    async resolveReport(request: FastifyRequest, reply: FastifyReply) {
        try {
            const admin = await requireAdminUser(request);
            const { id } = request.params as { id: string };
            const { status } = resolveSchema.parse(request.body);
            const updated = await this.moderationRepository.resolveReport(id, admin.userId, status);
            if (!updated) {
                return reply.status(404).send({ message: 'Report not found or already resolved' });
            }
            return reply.status(204).send();
        } catch (error) {
            return this.handleError(error, reply);
        }
    }
}
