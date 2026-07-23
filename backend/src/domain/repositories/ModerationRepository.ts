import { Report, ReportReason, ReportStatus, ReportTargetType } from '@prisma/client';

export interface CreateReportDTO {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    details?: string | null;
}

// Denúncia com contexto legível para o painel admin.
export interface ReportWithContext extends Report {
    reporterName: string | null;
    targetLabel: string;   // título do evento / nome do usuário / texto da avaliação
    targetDetail: string;  // contexto extra (anfitrião, autor + evento)
}

export interface ModerationRepository {
    createReport(data: CreateReportDTO): Promise<Report>;
    listReports(status?: ReportStatus): Promise<ReportWithContext[]>;
    resolveReport(id: string, reviewerId: string, status: ReportStatus): Promise<boolean>;
    blockUser(blockerId: string, blockedId: string): Promise<void>;
    unblockUser(blockerId: string, blockedId: string): Promise<void>;
    listBlockedIds(blockerId: string): Promise<string[]>;
}
