import {
    AsaasCustomerInput,
    AsaasCustomerResult,
    CheckoutPayment,
    CheckoutResult,
    CreateProviderPaymentInput,
    CreateCheckoutInput,
    PaymentGateway,
    PaymentGatewayError,
    PixQrCodeResult,
    PayoutGateway,
    ProviderPayment,
    PixTransferInput,
    PixTransferResult,
    TokenizeCreditCardInput,
    TokenizedCreditCard,
} from '../../domain/services/PaymentGateway';

interface AsaasErrorResponse {
    errors?: Array<{
        code?: string;
        description?: string;
    }>;
}

interface AsaasListResponse<T> {
    data?: T[];
}

export class AsaasPaymentService implements PaymentGateway, PayoutGateway {
    private readonly baseUrl = (
        process.env.ASAAS_BASE_URL || 'https://api-sandbox.asaas.com/v3'
    ).replace(/\/$/, '');

    async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
        const bookingId = encodeURIComponent(input.externalReference);
        const eventId = encodeURIComponent(input.eventId);
        const callbackPath = `${input.callbackBaseUrl.replace(/\/$/, '')}/payments/checkout/return`;
        const query = `bookingId=${bookingId}&eventId=${eventId}`;
        const minutesToExpire = this.getCheckoutExpirationMinutes();

        return this.request<CheckoutResult>('/checkouts', {
            method: 'POST',
            body: JSON.stringify({
                billingTypes: ['PIX', 'CREDIT_CARD'],
                chargeTypes: ['DETACHED'],
                minutesToExpire,
                externalReference: input.externalReference,
                callback: {
                    successUrl: `${callbackPath}/success?${query}`,
                    cancelUrl: `${callbackPath}/cancel?${query}`,
                    expiredUrl: `${callbackPath}/expired?${query}`,
                },
                items: [
                    {
                        externalReference: input.eventId,
                        name: input.eventTitle.substring(0, 100),
                        description: 'Ingresso de evento Wellcome',
                        quantity: 1,
                        value: input.value,
                    },
                ],
            }),
        });
    }

    async listCheckoutPayments(checkoutId: string): Promise<CheckoutPayment[]> {
        const query = new URLSearchParams({
            checkoutSession: checkoutId,
            limit: '20',
        });
        const result = await this.request<AsaasListResponse<CheckoutPayment>>(`/payments?${query.toString()}`);
        return result.data ?? [];
    }

    async cancelCheckout(checkoutId: string): Promise<void> {
        await this.request(`/checkouts/${encodeURIComponent(checkoutId)}/cancel`, {
            method: 'POST',
            body: JSON.stringify({}),
        });
    }

    async findCustomerByExternalReference(externalReference: string): Promise<AsaasCustomerResult | null> {
        const query = new URLSearchParams({ externalReference, limit: '1' });
        const result = await this.request<AsaasListResponse<AsaasCustomerResult>>(
            `/customers?${query.toString()}`
        );
        return result.data?.[0] ?? null;
    }

    async createCustomer(input: AsaasCustomerInput): Promise<AsaasCustomerResult> {
        return this.request<AsaasCustomerResult>('/customers', {
            method: 'POST',
            body: JSON.stringify(this.toCustomerPayload(input)),
        });
    }

    async updateCustomer(customerId: string, input: AsaasCustomerInput): Promise<AsaasCustomerResult> {
        return this.request<AsaasCustomerResult>(`/customers/${encodeURIComponent(customerId)}`, {
            method: 'PUT',
            body: JSON.stringify(this.toCustomerPayload(input)),
        });
    }

    async tokenizeCreditCard(input: TokenizeCreditCardInput): Promise<TokenizedCreditCard> {
        return this.request<TokenizedCreditCard>('/creditCard/tokenizeCreditCard', {
            method: 'POST',
            body: JSON.stringify({
                customer: input.customerId,
                creditCard: input.creditCard,
                creditCardHolderInfo: input.holderInfo,
                remoteIp: input.remoteIp,
            }),
        }, 60000);
    }

    async createPayment(input: CreateProviderPaymentInput): Promise<ProviderPayment> {
        return this.request<ProviderPayment>('/payments', {
            method: 'POST',
            body: JSON.stringify({
                customer: input.customerId,
                billingType: 'UNDEFINED',
                value: input.value,
                dueDate: input.dueDate,
                description: input.description.substring(0, 500),
                externalReference: input.externalReference,
            }),
        });
    }

    async getPayment(paymentId: string): Promise<ProviderPayment> {
        return this.request<ProviderPayment>(`/payments/${encodeURIComponent(paymentId)}`);
    }

    async deletePayment(paymentId: string): Promise<void> {
        await this.request(`/payments/${encodeURIComponent(paymentId)}`, { method: 'DELETE' });
    }

    async getPixQrCode(paymentId: string): Promise<PixQrCodeResult> {
        return this.request<PixQrCodeResult>(`/payments/${encodeURIComponent(paymentId)}/pixQrCode`);
    }

    async payWithCreditCard(paymentId: string, creditCardToken: string): Promise<ProviderPayment> {
        return this.request<ProviderPayment>(
            `/payments/${encodeURIComponent(paymentId)}/payWithCreditCard`,
            {
                method: 'POST',
                body: JSON.stringify({ creditCardToken }),
            },
            60000
        );
    }

    async createPixTransfer(input: PixTransferInput): Promise<PixTransferResult> {
        return this.request<PixTransferResult>('/transfers', {
            method: 'POST',
            body: JSON.stringify({
                value: input.value,
                operationType: 'PIX',
                pixAddressKey: input.pixAddressKey,
                pixAddressKeyType: input.pixAddressKeyType,
                description: input.description.substring(0, 140),
                externalReference: input.externalReference,
            }),
        });
    }

    private async request<T>(path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
        const apiKey = process.env.ASAAS_API_KEY?.trim();
        if (!apiKey) {
            throw new PaymentGatewayError('ASAAS_API_KEY nao configurada');
        }

        let response: Response;
        try {
            response = await fetch(`${this.baseUrl}${path}`, {
                ...init,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Wellcome/1.0 (Node.js)',
                    access_token: apiKey,
                    ...init.headers,
                },
                signal: AbortSignal.timeout(timeoutMs),
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Falha de rede desconhecida';
            throw new PaymentGatewayError(`Falha ao conectar com o Asaas: ${message}`);
        }

        const payload = await this.readJson(response);
        if (!response.ok) {
            const errorPayload = payload as AsaasErrorResponse;
            const firstError = errorPayload.errors?.[0];
            throw new PaymentGatewayError(
                firstError?.description || `Asaas respondeu com HTTP ${response.status}`,
                response.status,
                firstError?.code
            );
        }

        return payload as T;
    }

    private async readJson(response: Response): Promise<unknown> {
        const text = await response.text();
        if (!text) return {};

        try {
            return JSON.parse(text);
        } catch {
            throw new PaymentGatewayError('Resposta invalida recebida do Asaas', response.status);
        }
    }

    private getCheckoutExpirationMinutes(): number {
        const configured = Number(process.env.PAYMENT_CHECKOUT_EXPIRATION_MINUTES || '60');
        if (!Number.isFinite(configured)) return 60;
        return Math.min(1440, Math.max(10, Math.trunc(configured)));
    }

    private toCustomerPayload(input: AsaasCustomerInput): Record<string, unknown> {
        return {
            name: input.name,
            cpfCnpj: input.cpfCnpj,
            email: input.email,
            mobilePhone: input.mobilePhone,
            externalReference: input.externalReference,
            notificationDisabled: true,
            ...(input.postalCode && { postalCode: input.postalCode }),
            ...(input.addressNumber && { addressNumber: input.addressNumber }),
            ...(input.addressComplement && { complement: input.addressComplement }),
        };
    }
}
