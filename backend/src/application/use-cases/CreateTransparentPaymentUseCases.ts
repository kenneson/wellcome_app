import { BillingRepository } from '../../domain/repositories/BillingRepository';
import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { PaymentGateway, PaymentGatewayError } from '../../domain/services/PaymentGateway';
import { isProviderPaymentSettled } from '../../domain/services/PaymentStatusPolicy';
import { ConfirmAsaasPaymentService } from '../services/ConfirmAsaasPaymentService';
import { PrepareProviderPaymentInput, PrepareProviderPaymentService } from '../services/PrepareProviderPaymentService';
import { SendNotificationUseCase } from './SendNotificationUseCase';

export class CreatePixPaymentUseCase {
    private preparePaymentService: PrepareProviderPaymentService;
    private confirmPaymentService: ConfirmAsaasPaymentService;

    constructor(
        private paymentGateway: PaymentGateway,
        eventRepository: EventRepository,
        registrationRepository: EventRegistrationRepository,
        private paymentRepository: PaymentRepository,
        billingRepository: BillingRepository,
        sendNotificationUseCase: SendNotificationUseCase
    ) {
        this.preparePaymentService = new PrepareProviderPaymentService(
            paymentGateway,
            eventRepository,
            registrationRepository,
            paymentRepository,
            billingRepository
        );
        this.confirmPaymentService = new ConfirmAsaasPaymentService(
            paymentRepository,
            eventRepository,
            sendNotificationUseCase
        );
    }

    async execute(input: PrepareProviderPaymentInput) {
        const prepared = await this.preparePaymentService.execute(input);
        const paid = isProviderPaymentSettled(prepared.providerPayment);
        if (paid) {
            await this.confirmPaymentService.execute(prepared.payment, prepared.providerPayment);
            return {
                paymentId: prepared.payment.id,
                providerPaymentId: prepared.providerPayment.id,
                value: prepared.payment.valor.toFixed(2),
                status: 'CONFIRMED',
                paid: true,
                awaitingSettlement: false,
                pixCopyPaste: prepared.payment.pixCopiaECola,
                expirationDate: prepared.payment.pixExpirationDate?.toISOString() || new Date().toISOString(),
                environment: (process.env.ASAAS_BASE_URL || '').includes('sandbox') ? 'sandbox' : 'production',
            };
        }

        if (
            prepared.providerPayment.billingType === 'PIX' &&
            prepared.providerPayment.status === 'CONFIRMED'
        ) {
            await this.paymentRepository.updateProviderPayment({
                paymentId: prepared.payment.id,
                providerPaymentId: prepared.providerPayment.id,
                paymentMethod: 'PIX',
                providerStatus: prepared.providerPayment.status,
            });
            return {
                paymentId: prepared.payment.id,
                providerPaymentId: prepared.providerPayment.id,
                value: prepared.payment.valor.toFixed(2),
                status: prepared.providerPayment.status,
                paid: false,
                awaitingSettlement: true,
                pixCopyPaste: prepared.payment.pixCopiaECola,
                expirationDate: prepared.payment.pixExpirationDate?.toISOString() || new Date().toISOString(),
                environment: (process.env.ASAAS_BASE_URL || '').includes('sandbox') ? 'sandbox' : 'production',
            };
        }

        const qrCode = await this.paymentGateway.getPixQrCode(prepared.providerPayment.id);
        const expirationDate = new Date(qrCode.expirationDate);
        if (Number.isNaN(expirationDate.getTime())) throw new Error('Validade do Pix invalida');
        await this.paymentRepository.savePixData({
            paymentId: prepared.payment.id,
            payload: qrCode.payload,
            expirationDate,
        });

        return {
            paymentId: prepared.payment.id,
            providerPaymentId: prepared.providerPayment.id,
            value: prepared.payment.valor.toFixed(2),
            status: paid ? 'CONFIRMED' : prepared.providerPayment.status,
            paid,
            awaitingSettlement: false,
            pixCopyPaste: qrCode.payload,
            expirationDate: expirationDate.toISOString(),
            environment: (process.env.ASAAS_BASE_URL || '').includes('sandbox') ? 'sandbox' : 'production',
        };
    }

}

export class PayWithSavedCardUseCase {
    private preparePaymentService: PrepareProviderPaymentService;
    private confirmPaymentService: ConfirmAsaasPaymentService;

    constructor(
        private paymentGateway: PaymentGateway,
        eventRepository: EventRepository,
        registrationRepository: EventRegistrationRepository,
        private paymentRepository: PaymentRepository,
        private billingRepository: BillingRepository,
        sendNotificationUseCase: SendNotificationUseCase
    ) {
        this.preparePaymentService = new PrepareProviderPaymentService(
            paymentGateway,
            eventRepository,
            registrationRepository,
            paymentRepository,
            billingRepository
        );
        this.confirmPaymentService = new ConfirmAsaasPaymentService(
            paymentRepository,
            eventRepository,
            sendNotificationUseCase
        );
    }

    async execute(input: PrepareProviderPaymentInput & { cardId: string }) {
        const card = await this.billingRepository.findCardById(input.userId, input.cardId);
        if (!card) throw new Error('Cartao nao encontrado');

        const prepared = await this.preparePaymentService.execute(input);
        if (isProviderPaymentSettled(prepared.providerPayment)) {
            await this.confirmPaymentService.execute(prepared.payment, prepared.providerPayment);
            return {
                paymentId: prepared.payment.id,
                providerPaymentId: prepared.providerPayment.id,
                value: prepared.payment.valor.toFixed(2),
                status: prepared.providerPayment.status,
                paid: true,
            };
        }

        const claimed = await this.paymentRepository.claimCardPaymentAttempt(
            prepared.payment.id,
            prepared.providerPayment.id
        );
        if (!claimed) throw new Error('Payment is being processed');

        let providerPayment;
        try {
            providerPayment = await this.paymentGateway.payWithCreditCard(
                prepared.providerPayment.id,
                card.providerToken
            );
        } catch (error) {
            if (error instanceof PaymentGatewayError) {
                await this.paymentRepository.updateProviderPayment({
                    paymentId: prepared.payment.id,
                    providerPaymentId: prepared.providerPayment.id,
                    paymentMethod: 'CREDIT_CARD',
                    providerStatus: error.code || 'REFUSED',
                });
            }
            throw error;
        }

        await this.paymentRepository.updateProviderPayment({
            paymentId: prepared.payment.id,
            providerPaymentId: providerPayment.id,
            paymentMethod: 'CREDIT_CARD',
            providerStatus: providerPayment.status,
        });
        const paid = isProviderPaymentSettled(providerPayment);
        if (paid) await this.confirmPaymentService.execute(prepared.payment, providerPayment);

        return {
            paymentId: prepared.payment.id,
            providerPaymentId: providerPayment.id,
            value: prepared.payment.valor.toFixed(2),
            status: providerPayment.status,
            paid,
        };
    }

}
