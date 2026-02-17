import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateReviewUseCase } from '../../../application/use-cases/CreateReviewUseCase';
import { DeleteReviewUseCase } from '../../../application/use-cases/DeleteReviewUseCase';
import { z } from 'zod';

const createReviewSchema = z.object({
    eventId: z.string(),
    userId: z.string(),
    rating: z.number().min(1).max(5),
    comment: z.string().optional()
});

export class ReviewController {
    constructor(
        private createReviewUseCase: CreateReviewUseCase,
        private deleteReviewUseCase: DeleteReviewUseCase
    ) {}

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = createReviewSchema.parse(request.body);
            const review = await this.createReviewUseCase.execute(body);
            return reply.status(201).send(review);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.status(400).send({ message: 'Validation error', errors: error.issues });
            }
            return reply.status(500).send({ message: 'Internal server error' });
        }
    }

    async delete(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const { userId } = request.body as { userId: string }; // Assuming passed in body or extracted from auth token

        try {
            if (!userId) {
                return reply.status(401).send({ message: 'Unauthorized' });
            }
            await this.deleteReviewUseCase.execute(id, userId);
            return reply.status(204).send();
        } catch (error: any) {
            if (error.message === 'Review not found') {
                return reply.status(404).send({ message: 'Review not found' });
            }
            if (error.message === 'Only the author can delete this review') {
                return reply.status(403).send({ message: 'Forbidden' });
            }
            return reply.status(500).send({ message: 'Internal server error' });
        }
    }
}

