import { Payment } from '../../domain/entities/Payment';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';
import { prisma } from '../database/prismaClient';

export class PrismaPaymentRepository implements PaymentRepository {
    async create(data: {
        bookingId: string;
        eventId: string;
        userId: string;
        txid: string;
        pixCopiaECola: string;
        qrcode: string;
        valor: number;
    }): Promise<Payment> {
        const payment = await prisma.payment.create({
            data: {
                bookingId: data.bookingId,
                eventId: data.eventId,
                userId: data.userId,
                txid: data.txid,
                pixCopiaECola: data.pixCopiaECola,
                qrcode: data.qrcode,
                valor: data.valor,
                status: 'PENDING',
            },
        });

        return this.toDomain(payment);
    }

    async findByBookingId(bookingId: string): Promise<Payment | null> {
        const payment = await prisma.payment.findUnique({
            where: { bookingId },
        });

        return payment ? this.toDomain(payment) : null;
    }

    async findByTxid(txid: string): Promise<Payment | null> {
        const payment = await prisma.payment.findUnique({
            where: { txid },
        });

        return payment ? this.toDomain(payment) : null;
    }

    async updateStatus(id: string, status: string, paidAt?: Date): Promise<Payment> {
        const payment = await prisma.payment.update({
            where: { id },
            data: {
                status: status as any,
                ...(paidAt && { paidAt }),
            },
        });

        return this.toDomain(payment);
    }

    private toDomain(raw: any): Payment {
        return {
            id: raw.id,
            bookingId: raw.bookingId,
            eventId: raw.eventId,
            userId: raw.userId,
            txid: raw.txid,
            pixCopiaECola: raw.pixCopiaECola,
            qrcode: raw.qrcode,
            valor: Number(raw.valor),
            status: raw.status as PaymentStatus,
            paidAt: raw.paidAt ?? undefined,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
