import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { EfiPixService, PixChargeResult } from '../../infrastructure/external/EfiPixService';

export interface CreatePixChargeDTO {
    bookingId: string;
    eventId: string;
    userId: string;
}

export interface CreatePixChargeResult {
    paymentId: string;
    txid: string;
    qrcode: string;
    pixCopiaECola: string;
    valor: string;
    status: string;
}

export class CreatePixChargeUseCase {
    constructor(
        private efiPixService: EfiPixService,
        private eventRepository: EventRepository,
        private eventRegistrationRepository: EventRegistrationRepository,
        private paymentRepository: PaymentRepository
    ) {}

    async execute(data: CreatePixChargeDTO): Promise<CreatePixChargeResult> {
        // 1. Buscar evento para obter o preço
        const event = await this.eventRepository.findById(data.eventId);
        if (!event) {
            throw new Error('Event not found');
        }

        const price = Number(event.price);
        if (!price || price <= 0) {
            throw new Error('Event has no price set');
        }

        // 2. Verificar se o booking existe e pertence ao usuário
        const registration = await this.eventRegistrationRepository.findById(data.bookingId);
        if (!registration) {
            throw new Error('Booking not found');
        }
        if (registration.userId !== data.userId) {
            throw new Error('Booking does not belong to this user');
        }

        // 3. Verificar se já existe pagamento para este booking
        const existingPayment = await this.paymentRepository.findByBookingId(data.bookingId);
        if (existingPayment) {
            // Se já existe e está pendente, retorna o mesmo
            if (existingPayment.status === 'PENDING') {
                return {
                    paymentId: existingPayment.id,
                    txid: existingPayment.txid,
                    qrcode: existingPayment.qrcode,
                    pixCopiaECola: existingPayment.pixCopiaECola,
                    valor: existingPayment.valor.toFixed(2),
                    status: existingPayment.status,
                };
            }
            if (existingPayment.status === 'CONFIRMED') {
                throw new Error('Payment already confirmed');
            }
        }

        // 4. Criar cobrança PIX na EFI
        const descricao = `Inscrição: ${event.title}`;
        const pixResult: PixChargeResult = await this.efiPixService.createPixCharge(
            price,
            descricao
        );

        // 5. Salvar pagamento no banco
        const payment = await this.paymentRepository.create({
            bookingId: data.bookingId,
            eventId: data.eventId,
            userId: data.userId,
            txid: pixResult.txid,
            pixCopiaECola: pixResult.pixCopiaECola,
            qrcode: pixResult.qrcode,
            valor: price,
        });

        return {
            paymentId: payment.id,
            txid: payment.txid,
            qrcode: pixResult.qrcode,
            pixCopiaECola: pixResult.pixCopiaECola,
            valor: price.toFixed(2),
            status: payment.status,
        };
    }
}
