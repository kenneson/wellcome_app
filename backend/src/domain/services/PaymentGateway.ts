export interface CreateCheckoutInput {
    externalReference: string;
    eventId: string;
    eventTitle: string;
    value: number;
    callbackBaseUrl: string;
}

export interface CheckoutResult {
    id: string;
    link: string;
    status: string;
}

export interface CheckoutPayment {
    id: string;
    billingType: string;
    status: string;
    value: number;
    netValue: number;
    paymentDate?: string | null;
    externalReference?: string | null;
    refunds?: Array<{
        status: string;
        value: number;
    }>;
}

export interface PixTransferInput {
    value: number;
    pixAddressKey: string;
    pixAddressKeyType: string;
    externalReference: string;
    description: string;
}

export interface PixTransferResult {
    id: string;
    status: string;
    endToEndIdentifier?: string | null;
}

export interface PaymentGateway {
    createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
    listCheckoutPayments(checkoutId: string): Promise<CheckoutPayment[]>;
}

export interface PayoutGateway {
    createPixTransfer(input: PixTransferInput): Promise<PixTransferResult>;
}

export class PaymentGatewayError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly code?: string
    ) {
        super(message);
        this.name = 'PaymentGatewayError';
    }

    get isDefinitiveClientError(): boolean {
        return Boolean(this.statusCode && this.statusCode >= 400 && this.statusCode < 500);
    }
}
