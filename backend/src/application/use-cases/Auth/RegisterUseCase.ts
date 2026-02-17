import { supabase } from '../../../infrastructure/external/supabaseClient';

export class RegisterUseCase {
    async execute(email: string, password: string, fullName: string, phoneNumber: string): Promise<any> {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone_number: phoneNumber,
                },
            },
        });

        if (error) {
            throw new Error(error.message);
        }

        return data;
    }
}
