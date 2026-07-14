import { Report, ReportStatus } from '@prisma/client';
import { CreateReportDTO, ModerationRepository } from '../../domain/repositories/ModerationRepository';
import { prisma } from '../database/prismaClient';

export class PrismaModerationRepository implements ModerationRepository {
    async createReport(data: CreateReportDTO): Promise<Report> {
        return prisma.report.create({
            data: {
                reporterId: data.reporterId,
                targetType: data.targetType,
                targetId: data.targetId,
                reason: data.reason,
                details: data.details ?? null,
            },
        });
    }

    async listReports(status?: ReportStatus): Promise<Report[]> {
        return prisma.report.findMany({
            where: status ? { status } : undefined,
            orderBy: { createdAt: 'desc' },
        });
    }

    async resolveReport(id: string, reviewerId: string, status: ReportStatus): Promise<boolean> {
        const result = await prisma.report.updateMany({
            where: { id, status: ReportStatus.PENDING },
            data: { status, reviewedBy: reviewerId, reviewedAt: new Date() },
        });
        return result.count > 0;
    }

    async blockUser(blockerId: string, blockedId: string): Promise<void> {
        // Idempotente: bloquear duas vezes não é erro.
        await prisma.userBlock.upsert({
            where: { blockerId_blockedId: { blockerId, blockedId } },
            create: { blockerId, blockedId },
            update: {},
        });
    }

    async unblockUser(blockerId: string, blockedId: string): Promise<void> {
        await prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });
    }

    async listBlockedIds(blockerId: string): Promise<string[]> {
        const blocks = await prisma.userBlock.findMany({
            where: { blockerId },
            select: { blockedId: true },
        });
        return blocks.map((b) => b.blockedId);
    }
}
