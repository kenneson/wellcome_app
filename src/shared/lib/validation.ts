import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 6;

const requiredText = (message: string) => z.string().trim().min(1, message);

export const emailField = requiredText('Informe seu e-mail.').pipe(
    z.email('Digite um e-mail válido, como nome@exemplo.com.'),
);

export const loginSchema = z.object({
    email: emailField,
    password: z.string().min(1, 'Informe sua senha.'),
});

export const registerSchema = z
    .object({
        name: requiredText('Informe seu nome.').min(3, 'Digite seu nome completo.'),
        email: emailField,
        phoneNumber: z
            .string()
            .trim()
            .refine((value) => {
                if (!value) return true;
                const digits = value.replace(/\D/g, '');
                return digits.length >= 10 && digits.length <= 13;
            }, 'Digite um telefone com DDD, como (11) 99999-9999.'),
        password: z
            .string()
            .min(1, 'Crie uma senha.')
            .min(MIN_PASSWORD_LENGTH, `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`),
        confirmPassword: z.string().min(1, 'Repita sua senha.'),
        acceptedTerms: z.boolean().refine(Boolean, 'Leia e aceite os Termos de Uso e a Política de Privacidade.'),
    })
    .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
        path: ['confirmPassword'],
        message: 'As senhas não coincidem.',
    });

export type FieldErrors<T> = Partial<Record<keyof T & string, string>>;

/**
 * Validates `values` and returns either the parsed data or the first
 * pt-BR message for each invalid field, ready to show under its input.
 */
export function validateForm<S extends z.ZodType>(
    schema: S,
    values: unknown,
): { success: true; data: z.output<S> } | { success: false; errors: FieldErrors<z.input<S>> } {
    const result = schema.safeParse(values);
    if (result.success) return { success: true, data: result.data };

    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? '');
        if (field && !errors[field]) errors[field] = issue.message;
    }
    return { success: false, errors: errors as FieldErrors<z.input<S>> };
}
