import { prisma } from '../../database/prismaClient';
import { PrismaEventRepository } from '../PrismaEventRepository';

jest.mock('../../database/prismaClient', () => ({
    prisma: {
        event: {
            findMany: jest.fn(),
        },
    },
}));

describe('PrismaEventRepository.findAll', () => {
    const findMany = prisma.event.findMany as jest.Mock;

    beforeEach(() => {
        findMany.mockReset();
        findMany.mockResolvedValue([]);
    });

    it('applies the feed filters and orders upcoming events by date', async () => {
        const repository = new PrismaEventRepository();

        await repository.findAll({
            cuisine: ['Brasileira', 'Italiana'],
            vibe: ['Casual'],
            priceMin: 20,
            priceMax: 80,
            eventType: 'DINNER',
            excludeHostId: 'current-user',
        });

        expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                eventDate: { gt: expect.any(Date) },
                price: { gte: 20, lte: 80 },
                eventType: 'DINNER',
                cuisineTypes: { hasSome: ['Brasileira', 'Italiana'] },
                vibe: { hasSome: ['Casual'] },
                hostId: { not: 'current-user' },
            },
            orderBy: { eventDate: 'asc' },
        }));
    });
});
