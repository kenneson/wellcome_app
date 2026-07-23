import { Report, ReportStatus } from '@prisma/client';
import { CreateReportDTO, ModerationRepository, ReportWithContext } from '../../domain/repositories/ModerationRepository';
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

    async listReports(status?: ReportStatus): Promise<ReportWithContext[]> {
        const reports = await prisma.report.findMany({
            where: status ? { status } : undefined,
            orderBy: { createdAt: 'desc' },
            include: { reporter: { select: { fullName: true } } },
        });

        // Resolve o alvo por tipo (targetId é polimórfico, sem FK). Batch por tipo.
        const idsOf = (t: string) => reports.filter((r) => r.targetType === t).map((r) => r.targetId);
        const [events, users, reviews] = await Promise.all([
            prisma.event.findMany({
                where: { id: { in: idsOf('EVENT') } },
                select: { id: true, title: true, host: { select: { fullName: true } } },
            }),
            prisma.user.findMany({
                where: { id: { in: idsOf('USER') } },
                select: { id: true, fullName: true },
            }),
            prisma.eventReview.findMany({
                where: { id: { in: idsOf('REVIEW') } },
                select: { id: true, comment: true, user: { select: { fullName: true } }, event: { select: { title: true } } },
            }),
        ]);

        const eventMap = new Map(events.map((e) => [e.id, e]));
        const userMap = new Map(users.map((u) => [u.id, u]));
        const reviewMap = new Map(reviews.map((r) => [r.id, r]));

        return reports.map((r) => {
            let targetLabel = '';
            let targetDetail = '';
            if (r.targetType === 'EVENT') {
                const e = eventMap.get(r.targetId);
                targetLabel = e?.title ?? '(evento removido)';
                targetDetail = e?.host?.fullName ? `Anfitrião: ${e.host.fullName}` : '';
            } else if (r.targetType === 'USER') {
                targetLabel = userMap.get(r.targetId)?.fullName ?? '(usuário removido)';
            } else if (r.targetType === 'REVIEW') {
                const rv = reviewMap.get(r.targetId);
                targetLabel = rv?.comment || '(avaliação sem texto)';
                const author = rv?.user?.fullName;
                targetDetail = author ? `Autor: ${author}${rv?.event?.title ? ` · ${rv.event.title}` : ''}` : '';
            }
            const { reporter, ...rest } = r;
            return { ...rest, reporterName: reporter?.fullName ?? null, targetLabel, targetDetail };
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
