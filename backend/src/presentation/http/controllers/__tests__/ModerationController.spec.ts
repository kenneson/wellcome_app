// Mock via factory para não carregar auth.ts -> supabaseClient (exige env).
jest.mock('../../helpers/auth', () => ({
    getAuthenticatedUserId: jest.fn(),
    requireAdminUser: jest.fn(),
    UnauthorizedRequestError: class extends Error {},
    ForbiddenRequestError: class extends Error {},
}));

import { ModerationController } from '../ModerationController';
import { ModerationRepository } from '../../../../domain/repositories/ModerationRepository';
import * as auth from '../../helpers/auth';

const mockedAuth = auth as jest.Mocked<typeof auth>;

function makeReply() {
    const reply: any = {};
    reply.status = jest.fn(() => reply);
    reply.send = jest.fn(() => reply);
    return reply;
}

describe('ModerationController', () => {
    let repo: jest.Mocked<ModerationRepository>;
    let controller: ModerationController;

    beforeEach(() => {
        repo = {
            createReport: jest.fn(),
            listReports: jest.fn(),
            resolveReport: jest.fn(),
            blockUser: jest.fn(),
            unblockUser: jest.fn(),
            listBlockedIds: jest.fn(),
        };
        controller = new ModerationController(repo);
        jest.clearAllMocks();
    });

    const USER_A = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
    const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    it('recusa auto-bloqueio com 400 e não grava', async () => {
        mockedAuth.getAuthenticatedUserId.mockResolvedValue(USER_A);
        const reply = makeReply();

        await controller.block({ body: { blockedId: USER_A } } as any, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
        expect(repo.blockUser).not.toHaveBeenCalled();
    });

    it('bloqueia outro usuário com 204', async () => {
        mockedAuth.getAuthenticatedUserId.mockResolvedValue(USER_A);
        const reply = makeReply();

        await controller.block({ body: { blockedId: USER_B } } as any, reply);

        expect(repo.blockUser).toHaveBeenCalledWith(USER_A, USER_B);
        expect(reply.status).toHaveBeenCalledWith(204);
    });

    it('resolve inexistente/já-resolvido retorna 404', async () => {
        mockedAuth.requireAdminUser.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' as any });
        repo.resolveReport.mockResolvedValue(false);
        const reply = makeReply();

        await controller.resolveReport(
            { params: { id: 'x' }, body: { status: 'RESOLVED' } } as any,
            reply,
        );

        expect(reply.status).toHaveBeenCalledWith(404);
    });
});
