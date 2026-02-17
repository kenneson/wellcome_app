import { FastifyReply, FastifyRequest } from 'fastify';
import { LoginUseCase } from '../../../application/use-cases/Auth/LoginUseCase';
import { RegisterUseCase } from '../../../application/use-cases/Auth/RegisterUseCase';
import { z } from 'zod';

export class AuthController {
    constructor(
        private loginUseCase: LoginUseCase,
        private registerUseCase: RegisterUseCase
    ) { }

    async login(req: FastifyRequest, reply: FastifyReply) {
        const loginSchema = z.object({
            email: z.string().email(),
            password: z.string().min(6),
        });

        try {
            const { email, password } = loginSchema.parse(req.body);
            const data = await this.loginUseCase.execute(email, password);
            return reply.code(200).send(data);
        } catch (error: any) {
            return reply.code(400).send({ message: error.message });
        }
    }

    async register(req: FastifyRequest, reply: FastifyReply) {
        const registerSchema = z.object({
            email: z.string().email(),
            password: z.string().min(6),
            fullName: z.string(),
            phoneNumber: z.string().optional(),
        });

        try {
            const { email, password, fullName, phoneNumber } = registerSchema.parse(req.body);
            const data = await this.registerUseCase.execute(email, password, fullName, phoneNumber || '');
            return reply.code(201).send(data);
        } catch (error: any) {
            return reply.code(400).send({ message: error.message });
        }
    }
}
