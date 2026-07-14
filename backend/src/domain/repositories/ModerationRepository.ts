import { Report, ReportReason, ReportStatus, ReportTargetType } from '@prisma/client';

export interface CreateReportDTO {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    details?: string | null;
}

export interface ModerationRepository {
    createReport(data: CreateReportDTO): Promise<Report>;
    listReports(status?: ReportStatus): Promise<Report[]>;
    resolveReport(id: string, reviewerId: string, status: ReportStatus): Promise<boolean>;
    blockUser(blockerId: string, blockedId: string): Promise<void>;
    unblockUser(blockerId: string, blockedId: string): Promise<void>;
    listBlockedIds(blockerId: string): Promise<string[]>;
}
