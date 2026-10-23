// Mock via factory para não carregar auth.ts -> supabaseClient (exige env).
jest.mock('../../helpers/auth', () => ({
    getAuthenticatedUserId: jest.fn(),
    getOptionalAuthenticatedUserContext: jest.fn(),
    UnauthorizedRequestError: class extends Error {},
}));

import { UserController } from '../UserController';
import * as auth from '../../helpers/auth';

const mockedAuth = auth as jest.Mocked<typeof auth>;
const USER_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

function makeReply() {
    const reply: any = {};
    reply.code = jest.fn(() => reply);
    reply.send = jest.fn(() => reply);
    return reply;
}

describe('UserController.updateProfile', () => {
    it('responde 409 com mensagem amigável quando o username já existe', async () => {
        mockedAuth.getAuthenticatedUserId.mockResolvedValue(USER_ID);
        const updateUseCase = { execute: jest.fn().mockRejectedValue(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })) };
        const controller = new UserController({} as any, updateUseCase as any, {} as any);
        const reply = makeReply();
        const request: any = { params: { id: USER_ID }, body: { username: 'joao' }, log: { error: jest.fn() } };

        await controller.updateProfile(request, reply);

        expect(reply.code).toHaveBeenCalledWith(409);
        expect(reply.send).toHaveBeenCalledWith({ message: 'Este nome de usuário já está em uso. Escolha outro.' });
    });
});
