import { supabase } from '../../../infrastructure/external/supabaseClient';

const LEGAL_TERMS_VERSION = '2026-08-23';

export class RegisterUseCase {
    async execute(
        email: string,
        password: string,
        fullName: string,
        phoneNumber: string,
        acceptedTerms: boolean
    ): Promise<any> {
        if (!acceptedTerms) {
            throw new Error('Terms of Use and Privacy Policy acceptance is required');
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone_number: phoneNumber,
                    terms_accepted_at: new Date().toISOString(),
                    terms_version: LEGAL_TERMS_VERSION,
                },
            },
        });

        if (error) {
            throw new Error(error.message);
        }

        return data;
    }
}
