import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { NotificationType } from '../../domain/value-objects/NotificationType';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';
import { EfiPixService } from '../../infrastructure/external/EfiPixService';
import { SendNotificationUseCase } from './SendNotificationUseCase';
import { UserRepository } from '../../domain/repositories/UserRepository';

export interface CheckPixPaymentResult {
    paymentId: string;
    txid: string;
    status: string;
    paid: boolean;
}

export class CheckPixPaymentUseCase {
    constructor(
        private efiPixService: EfiPixService,
        private paymentRepository: PaymentRepository,
        private eventRegistrationRepository: EventRegistrationRepository,
        private eventRepository: EventRepository,
        private sendNotificationUseCase: SendNotificationUseCase,
        private userRepository: UserRepository
    ) {}

    async execute(bookingId: string): Promise<CheckPixPaymentResult> {
        // 1. Buscar pagamento pelo bookingId
        const payment = await this.paymentRepository.findByBookingId(bookingId);
        if (!payment) {
            throw new Error('Payment not found for this booking');
        }

        // Se já está confirmado, retorna direto
        if (payment.status === PaymentStatus.CONFIRMED) {
            return {
                paymentId: payment.id,
                txid: payment.txid,
                status: PaymentStatus.CONFIRMED,
                paid: true,
            };
        }

        // 2. Consultar status na EFI
        const efiStatus = await this.efiPixService.getChargeStatus(payment.txid);

        // Mapear status EFI para nosso status
        // Status EFI: ATIVA, CONCLUIDA, REMOVIDA_PELO_USUARIO_RECEBEDOR, REMOVIDA_PELO_PSP
        let newStatus: string = payment.status;
        let paid = false;

        if (efiStatus.status === 'CONCLUIDA') {
            newStatus = PaymentStatus.CONFIRMED;
            paid = true;

            const feePercentage = Number(process.env.APP_FEE_PERCENTAGE || '10') / 100;
            const platformFee = Number((payment.valor * feePercentage).toFixed(2));
            const netAmount = Number((payment.valor - platformFee).toFixed(2));

            // Atualizar pagamento e split
            await this.paymentRepository.updateStatus(
                payment.id,
                PaymentStatus.CONFIRMED,
                new Date(),
                platformFee,
                netAmount
            );

            const event = await this.eventRepository.findById(payment.eventId);

            // Adicionar saldo na carteira do organizador
            if (event?.hostId) {
                await this.userRepository.addWalletBalance(
                    event.hostId,
                    netAmount,
                    payment.id
                );
            }

            // Aprovar automaticamente o booking
            await this.eventRegistrationRepository.updateStatus(
                bookingId,
                'APPROVED'
            );

            // Notificar o host que o pagamento foi confirmado
            if (event?.host) {
                await this.sendNotificationUseCase.execute(
                    event.host.id,
                    event.host.expoPushToken || null,
                    'Pagamento confirmado! 💰',
                    `Um participante confirmou o pagamento para "${event.title}".`,
                    NotificationType.NEW_REGISTRATION_CONFIRMED,
                    { eventId: event.id }
                );
            }
        } else if (
            efiStatus.status === 'REMOVIDA_PELO_USUARIO_RECEBEDOR' ||
            efiStatus.status === 'REMOVIDA_PELO_PSP'
        ) {
            newStatus = PaymentStatus.EXPIRED;
            await this.paymentRepository.updateStatus(payment.id, PaymentStatus.EXPIRED);
        }

        return {
            paymentId: payment.id,
            txid: payment.txid,
            status: newStatus,
            paid,
        };
    }
}
