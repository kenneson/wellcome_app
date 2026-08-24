import { EventRegistrationController } from '../EventRegistrationController';
import { getAuthenticatedUserId } from '../../helpers/auth';

jest.mock('../../helpers/auth', () => ({
    getAuthenticatedUserId: jest.fn(),
    UnauthorizedRequestError: class UnauthorizedRequestError extends Error {},
}));

describe('EventRegistrationController.create', () => {
    const makeReply = () => {
        const reply: any = {
            code: jest.fn(),
            send: jest.fn(),
        };
        reply.code.mockReturnValue(reply);
        reply.send.mockReturnValue(reply);
        return reply;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getAuthenticatedUserId as jest.Mock).mockResolvedValue('guest-1');
    });

    it('logs unexpected failures and returns a safe error response', async () => {
        const failure = new Error('private.reconcile_event_capacity does not exist');
        const joinEventUseCase = { execute: jest.fn().mockRejectedValue(failure) };
        const controller = new EventRegistrationController(
            joinEventUseCase as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
        );
        const request = {
            body: { eventId: 'event-1' },
            log: { error: jest.fn() },
        } as any;
        const reply = makeReply();

        await controller.create(request, reply);

        expect(request.log.error).toHaveBeenCalledWith(
            { err: failure },
            'Failed to create event booking',
        );
        expect(reply.code).toHaveBeenCalledWith(500);
        expect(reply.send).toHaveBeenCalledWith({
            code: 'INTERNAL_ERROR',
            message: 'Não foi possível realizar a inscrição. Tente novamente.',
        });
    });
});
