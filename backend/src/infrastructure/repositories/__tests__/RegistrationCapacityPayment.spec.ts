import { prisma } from '../../database/prismaClient';
import { PrismaPaymentRepository } from '../PrismaPaymentRepository';
jest.mock('../../database/prismaClient', () => ({ prisma: { $transaction: jest.fn() } }));

describe('payment reserves capacity atomically before approval', () => {
    const tx = {
        $queryRaw: jest.fn(),
        payment: { findUnique: jest.fn(), updateMany: jest.fn() },
        booking: { findUnique: jest.fn(), update: jest.fn() },
        user: { update: jest.fn() },
    };
    const input = { paymentId: 'payment-1', bookingId: 'booking-1', hostId: 'host-1',
        platformFee: 10, netAmount: 90, paidAt: new Date(), fundsAvailableAt: new Date(),
        approveBookingOnPayment: false };
    const event = { id: 'event-1', price: 100, requiresApproval: true, accessType: 'OPEN_WITH_APPROVAL',
        maxGuests: 1, eventDate: new Date(Date.now() + 86_400_000), bookings: [] };
    beforeEach(() => {
        jest.resetAllMocks();
        (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(tx));
        tx.payment.findUnique.mockResolvedValue({ id: 'payment-1', eventId: 'event-1' });
        tx.payment.updateMany.mockResolvedValue({ count: 1 });
        tx.booking.findUnique.mockResolvedValue({ id: 'booking-1', status: 'PENDING', event });
    });
    it('sets capacity without approving the candidate or crediting the host', async () => {
        await new PrismaPaymentRepository().confirmAndHoldHostFunds(input);
        expect(tx.booking.update).toHaveBeenCalledWith({ where: { id: 'booking-1' },
            data: { status: 'PENDING', capacityHeldAt: expect.any(Date), paymentDueAt: null } });
        expect(tx.user.update).not.toHaveBeenCalled();
        expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.payment.updateMany.mock.invocationCallOrder[0]);
    });
    it('does not repeat confirmation or capacity reservation on duplicate webhooks', async () => {
        tx.payment.updateMany.mockResolvedValue({ count: 0 });
        await expect(new PrismaPaymentRepository().confirmAndHoldHostFunds(input)).resolves.toBe(false);
        expect(tx.booking.update).not.toHaveBeenCalled();
    });
    it('queues an automatic refund if another paid candidate holds the last spot', async () => {
        tx.booking.findUnique.mockResolvedValue({ id: 'booking-1', status: 'PENDING',
            event: { ...event, bookings: [{ id: 'other', status: 'PENDING', payment: { status: 'CONFIRMED' } }] } });
        await new PrismaPaymentRepository().confirmAndHoldHostFunds(input);
        expect(tx.booking.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: 'EXPIRED', capacityHeldAt: null }),
        }));
        expect(tx.user.update).not.toHaveBeenCalled();
    });
    it.each(['REJECTED', 'CANCELLED', 'EXPIRED'])('never reactivates a %s registration on late payment', async (status) => {
        tx.booking.findUnique.mockResolvedValue({ id: 'booking-1', status, event });
        await new PrismaPaymentRepository().confirmAndHoldHostFunds(input);
        expect(tx.booking.update).not.toHaveBeenCalled();
        expect(tx.user.update).not.toHaveBeenCalled();
    });
});
