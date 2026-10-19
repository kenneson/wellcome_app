import { FastifyReply, FastifyRequest } from 'fastify';
import { LoginUseCase } from '../../../application/use-cases/Auth/LoginUseCase';
import { RegisterUseCase } from '../../../application/use-cases/Auth/RegisterUseCase';
import { z } from 'zod';

// A ZodError's .message is the raw JSON list of issues; send its first
// readable message instead so the app never shows JSON to the user.
function authErrorMessage(error: unknown): string {
    if (error instanceof z.ZodError) return error.issues[0]?.message ?? 'Confira os dados informados.';
    return error instanceof Error ? error.message : 'Não foi possível concluir a solicitação.';
}

export class AuthController {
    constructor(
        private loginUseCase: LoginUseCase,
        private registerUseCase: RegisterUseCase
    ) { }

    async login(req: FastifyRequest, reply: FastifyReply) {
        const loginSchema = z.object({
            email: z.string().email('Digite um e-mail válido.'),
            password: z.string().min(1, 'Informe sua senha.'),
        });

        try {
            const { email, password } = loginSchema.parse(req.body);
            const data = await this.loginUseCase.execute(email, password);
            return reply.code(200).send(data);
        } catch (error: any) {
            return reply.code(400).send({ message: authErrorMessage(error) });
        }
    }

    async register(req: FastifyRequest, reply: FastifyReply) {
        const registerSchema = z.object({
            email: z.string().email('Digite um e-mail válido.'),
            password: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.'),
            fullName: z.string().trim().min(1, 'Informe seu nome.'),
            phoneNumber: z.string().optional(),
            acceptedTerms: z.literal(true, { message: 'Aceite os Termos de Uso e a Política de Privacidade.' }),
        });

        try {
            const { email, password, fullName, phoneNumber, acceptedTerms } = registerSchema.parse(req.body);
            const data = await this.registerUseCase.execute(
                email,
                password,
                fullName,
                phoneNumber || '',
                acceptedTerms
            );
            return reply.code(201).send(data);
        } catch (error: any) {
            return reply.code(400).send({ message: authErrorMessage(error) });
        }
    }
}
