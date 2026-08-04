jest.mock('../../../../infrastructure/database/prismaClient', () => ({
    prisma: {
        user: {
            count: jest.fn(),
            updateMany: jest.fn(),
            findUnique: jest.fn(),
            findUniqueOrThrow: jest.fn(),
        },
        report: { count: jest.fn() },
        withdrawalRequest: { count: jest.fn() },
    },
}));

jest.mock('../../../../infrastructure/external/supabaseClient', () => ({
    supabaseAdmin: null,
}));

jest.mock('../../helpers/auth', () => ({
    requireAdminUser: jest.fn(),
    UnauthorizedRequestError: class UnauthorizedRequestError extends Error {},
    ForbiddenRequestError: class ForbiddenRequestError extends Error {},
}));

import { AdminController } from '../AdminController';
import { prisma } from '../../../../infrastructure/database/prismaClient';
import { requireAdminUser } from '../../helpers/auth';

type PrismaMock = {
    user: {
        count: jest.Mock;
        updateMany: jest.Mock;
        findUnique: jest.Mock;
        findUniqueOrThrow: jest.Mock;
    };
    report: { count: jest.Mock };
    withdrawalRequest: { count: jest.Mock };
};

const prismaMock = prisma as unknown as PrismaMock;
const requireAdminUserMock = requireAdminUser as jest.Mock;

function createReply() {
    const reply = {
        code: jest.fn(),
        send: jest.fn(),
    };
    reply.code.mockReturnValue(reply);
    reply.send.mockReturnValue(reply);
    return reply;
}

describe('AdminController', () => {
    const controller = new AdminController();

    beforeEach(() => {
        jest.clearAllMocks();
        requireAdminUserMock.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
    });

    it('returns the counters used by the operational dashboard', async () => {
        prismaMock.user.count.mockResolvedValueOnce(48).mockResolvedValueOnce(3);
        prismaMock.report.count.mockResolvedValue(2);
        prismaMock.withdrawalRequest.count.mockResolvedValueOnce(5).mockResolvedValueOnce(1);
        const reply = createReply();

        await controller.overview({} as any, reply as any);

        expect(requireAdminUserMock).toHaveBeenCalled();
        expect(reply.send).toHaveBeenCalledWith({
            totalUsers: 48,
            pendingKyc: 3,
            pendingReports: 2,
            pendingWithdrawals: 5,
            processingWithdrawals: 1,
        });
    });

    it('approves only a KYC request that is still pending', async () => {
        prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
        prismaMock.user.findUniqueOrThrow.mockResolvedValue({
            id: 'user-1',
            kycStatus: 'APPROVED',
            kycReviewedAt: new Date('2026-08-02T12:00:00.000Z'),
            kycRejectionReason: null,
        });
        const reply = createReply();

        await controller.approveKyc({ params: { id: 'user-1' } } as any, reply as any);

        expect(prismaMock.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'user-1', kycStatus: 'PENDING' },
            data: expect.objectContaining({ kycStatus: 'APPROVED' }),
        }));
        expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1', kycStatus: 'APPROVED' }));
    });

    it('rejects a second review of an already processed KYC request', async () => {
        prismaMock.user.updateMany.mockResolvedValue({ count: 0 });
        prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
        const reply = createReply();

        await controller.rejectKyc({
            params: { id: 'user-1' },
            body: { reason: 'Documento ilegivel' },
        } as any, reply as any);

        expect(reply.code).toHaveBeenCalledWith(409);
        expect(reply.send).toHaveBeenCalledWith({ message: 'Only pending KYC requests can be reviewed' });
    });
});
