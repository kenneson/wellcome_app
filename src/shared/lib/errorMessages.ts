const KNOWN_MESSAGES: [RegExp, string][] = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/email not confirmed/i, 'Confirme seu e-mail antes de entrar. O link de confirmação está na sua caixa de entrada.'],
    [/user already registered|already been registered/i, 'Já existe uma conta com este e-mail. Entre pela tela de login (se você se cadastrou com o Google, use "Continuar com Google").'],
    [/password should be at least/i, 'A senha precisa ter pelo menos 8 caracteres.'],
    [/rate limit|for security purposes|too many requests/i, 'Muitas tentativas seguidas. Aguarde um pouco e tente novamente.'],
    [/network request failed|failed to fetch|network ?error|load failed/i, 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.'],
    [/missing or invalid bearer token|jwt expired|invalid jwt/i, 'Sua sessão expirou. Entre novamente para continuar.'],
];

// Raw technical text that should never reach a person: JSON payloads,
// parser errors and generic English fallbacks from the API layer.
const TECHNICAL_MESSAGE = /^\s*[[{]|json parse|unexpected token|unexpected character|^[a-z ]*failed$|^error$|internal server error/i;

/** Turns any thrown error into a short pt-BR message safe to show in an alert. */
export function friendlyErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
    const message = typeof error === 'string' ? error : (error as { message?: unknown } | null)?.message;
    if (typeof message !== 'string' || !message.trim()) return fallback;

    for (const [pattern, friendly] of KNOWN_MESSAGES) {
        if (pattern.test(message)) return friendly;
    }
    if (TECHNICAL_MESSAGE.test(message)) return fallback;
    return message;
}
