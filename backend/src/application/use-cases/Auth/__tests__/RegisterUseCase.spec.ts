jest.mock('../../../../infrastructure/external/supabaseClient', () => ({
    supabase: {
        auth: {
            signUp: jest.fn(),
        },
    },
}));

import { supabase } from '../../../../infrastructure/external/supabaseClient';
import { RegisterUseCase } from '../RegisterUseCase';

describe('RegisterUseCase', () => {
    const signUpMock = supabase.auth.signUp as jest.Mock;

    beforeEach(() => {
        signUpMock.mockReset();
    });

    it('rejects registration without legal acceptance', async () => {
        await expect(new RegisterUseCase().execute(
            'user@example.com',
            'secret123',
            'User Name',
            '',
            false
        )).rejects.toThrow('Terms of Use and Privacy Policy acceptance is required');
        expect(signUpMock).not.toHaveBeenCalled();
    });

    it('records the legal version and acceptance timestamp in Auth metadata', async () => {
        signUpMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

        await new RegisterUseCase().execute(
            'user@example.com',
            'secret123',
            'User Name',
            '11999999999',
            true
        );

        expect(signUpMock).toHaveBeenCalledWith(expect.objectContaining({
            options: {
                data: expect.objectContaining({
                    terms_accepted_at: expect.any(String),
                    terms_version: '2026-08-23',
                }),
            },
        }));
    });
});
