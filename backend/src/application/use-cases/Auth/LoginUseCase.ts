import { supabase } from '../../../infrastructure/external/supabaseClient';

export class LoginUseCase {
    async execute(email: string, password: string): Promise<any> {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw new Error(error.message);
        }

        return data;
    }
}
