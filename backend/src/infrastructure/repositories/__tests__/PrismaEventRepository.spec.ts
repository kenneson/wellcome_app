import { prisma } from '../../database/prismaClient';
import { PrismaEventRepository } from '../PrismaEventRepository';

jest.mock('../../database/prismaClient', () => ({
    prisma: {
        event: {
            findMany: jest.fn(),
            create: jest.fn(),
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

describe('PrismaEventRepository.create', () => {
    const create = prisma.event.create as jest.Mock;

    beforeEach(() => {
        create.mockReset();
        create.mockResolvedValue({
            id: 'event-1',
            title: 'Jantar completo',
            description: 'Uma experiencia gastronomica completa.',
            price: { toNumber: () => 80 },
            maxGuests: 8,
            eventDate: new Date(Date.now() + 86_400_000),
            endTime: new Date(Date.now() + 90_000_000),
            reservationDeadline: null,
            location: 'Rua Teste, 100',
            city: 'Curitiba',
            state: 'PR',
            latitude: -25.4,
            longitude: -49.2,
            coverImageUrl: 'https://example.com/cover.jpg',
            imageGallery: [],
            eventType: 'Jantar',
            cuisineTypes: ['Brasileira'],
            vibe: [],
            facilities: [],
            rules: [],
            dietaryOptions: [],
            isServedInSequence: true,
            creationKey: 'event-draft:draft-1',
            hostId: 'host-1',
            accessType: 'OPEN_WITH_APPROVAL',
            requiresApproval: true,
            allowWaitlist: false,
            autoApproveIfAttended: false,
            autoApproveMinRating: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            dishes: [],
            questions: [],
        });
    });

    it('creates the event, dishes and questions atomically with the persisted access type', async () => {
        const repository = new PrismaEventRepository();
        await repository.create({
            title: 'Jantar completo',
            description: 'Uma experiencia gastronomica completa.',
            price: 80,
            maxGuests: 8,
            eventDate: new Date(Date.now() + 86_400_000),
            endTime: new Date(Date.now() + 90_000_000),
            reservationDeadline: null,
            location: 'Rua Teste, 100',
            city: 'Curitiba',
            state: 'PR',
            latitude: -25.4,
            longitude: -49.2,
            coverImageUrl: 'https://example.com/cover.jpg',
            imageGallery: [],
            eventType: 'Jantar',
            cuisineTypes: ['Brasileira'],
            vibe: [],
            facilities: [],
            rules: [],
            dietaryOptions: [],
            isServedInSequence: true,
            creationKey: 'event-draft:draft-1',
            hostId: 'host-1',
            accessType: 'OPEN_WITH_APPROVAL' as any,
            requiresApproval: false,
            allowWaitlist: false,
            autoApproveIfAttended: false,
            autoApproveMinRating: null,
            dishes: [{ name: 'Moqueca', description: 'Peixe', category: 'PRATO_PRINCIPAL', order: 0 }],
            questions: [{ question: 'Possui alergias?', questionType: 'TEXT', required: true, order: 0 }],
        });

        expect(create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                accessType: 'OPEN_WITH_APPROVAL',
                requiresApproval: true,
                isServedInSequence: true,
                dishes: { create: [expect.objectContaining({ name: 'Moqueca', order: 0 })] },
                questions: { create: [expect.objectContaining({ question: 'Possui alergias?', order: 0 })] },
            }),
        }));
    });
});
