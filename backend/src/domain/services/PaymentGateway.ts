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
    confirmedDate?: string | null;
    externalReference?: string | null;
    refunds?: Array<{
        status: string;
        value: number;
    }>;
}

export interface AsaasCustomerInput {
    name: string;
    cpfCnpj: string;
    email: string;
    mobilePhone: string;
    externalReference: string;
    postalCode?: string;
    addressNumber?: string;
    addressComplement?: string;
}

export interface AsaasCustomerResult {
    id: string;
}

export interface CreditCardData {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
}

export interface CreditCardHolderInfo {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone?: string;
    mobilePhone: string;
}

export interface TokenizeCreditCardInput {
    customerId: string;
    creditCard: CreditCardData;
    holderInfo: CreditCardHolderInfo;
    remoteIp: string;
}

export interface TokenizedCreditCard {
    creditCardToken: string;
    creditCardNumber?: string;
    creditCardBrand?: string;
}

export interface CreateProviderPaymentInput {
    customerId: string;
    value: number;
    dueDate: string;
    description: string;
    externalReference: string;
}

export interface ProviderPayment extends CheckoutPayment {
    billingType: string;
    status: string;
}

export interface PixQrCodeResult {
    encodedImage?: string;
    payload: string;
    expirationDate: string;
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
    externalReference?: string | null;
    failReason?: string | null;
    dateCreated?: string | null;
}

export interface PaymentGateway {
    createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
    listCheckoutPayments(checkoutId: string): Promise<CheckoutPayment[]>;
    cancelCheckout(checkoutId: string): Promise<void>;
    findCustomerByExternalReference(externalReference: string): Promise<AsaasCustomerResult | null>;
    createCustomer(input: AsaasCustomerInput): Promise<AsaasCustomerResult>;
    updateCustomer(customerId: string, input: AsaasCustomerInput): Promise<AsaasCustomerResult>;
    tokenizeCreditCard(input: TokenizeCreditCardInput): Promise<TokenizedCreditCard>;
    createPayment(input: CreateProviderPaymentInput): Promise<ProviderPayment>;
    getPayment(paymentId: string): Promise<ProviderPayment>;
    deletePayment(paymentId: string): Promise<void>;
    getPixQrCode(paymentId: string): Promise<PixQrCodeResult>;
    payWithCreditCard(paymentId: string, creditCardToken: string): Promise<ProviderPayment>;
}

export interface PayoutGateway {
    createPixTransfer(input: PixTransferInput): Promise<PixTransferResult>;
    getPixTransfer(transferId: string): Promise<PixTransferResult>;
    findPixTransferByExternalReference(
        externalReference: string,
        requestedAt: Date
    ): Promise<PixTransferResult | null>;
}

export class PaymentGatewayError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly code?: string,
        public readonly outcomeUncertain: boolean = false
    ) {
        super(message);
        this.name = 'PaymentGatewayError';
    }

    get isDefinitiveClientError(): boolean {
        return Boolean(this.statusCode && this.statusCode >= 400 && this.statusCode < 500);
    }
}
