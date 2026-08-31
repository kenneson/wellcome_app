import { AsaasPaymentService } from '../AsaasPaymentService';

describe('AsaasPaymentService', () => {
    const originalApiKey = process.env.ASAAS_API_KEY;
    const originalBaseUrl = process.env.ASAAS_BASE_URL;
    const originalNodeEnv = process.env.NODE_ENV;
    const fetchMock = jest.fn();

    beforeEach(() => {
        fetchMock.mockReset();
        global.fetch = fetchMock as typeof fetch;
    });

    afterEach(() => {
        if (originalApiKey === undefined) delete process.env.ASAAS_API_KEY;
        else process.env.ASAAS_API_KEY = originalApiKey;

        if (originalBaseUrl === undefined) delete process.env.ASAAS_BASE_URL;
        else process.env.ASAAS_BASE_URL = originalBaseUrl;

        if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = originalNodeEnv;
    });

    it('requires an explicit base URL in production', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.ASAAS_BASE_URL;

        expect(() => new AsaasPaymentService()).toThrow(
            'ASAAS_BASE_URL deve ser configurada explicitamente em producao'
        );
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects production API keys when the sandbox URL is configured', async () => {
        process.env.ASAAS_API_KEY = '$aact_prod_test';
        process.env.ASAAS_BASE_URL = 'https://api-sandbox.asaas.com/v3';

        await expect(new AsaasPaymentService().getPayment('pay_123')).rejects.toThrow(
            'ASAAS_API_KEY de producao configurada com ASAAS_BASE_URL sandbox'
        );
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('uses the production URL when a production key and production URL are configured', async () => {
        process.env.ASAAS_API_KEY = '$aact_prod_test';
        process.env.ASAAS_BASE_URL = 'https://api.asaas.com/v3';
        fetchMock.mockResolvedValue({
            ok: true,
            text: async () => JSON.stringify({ id: 'pay_123' }),
        });

        const result = await new AsaasPaymentService().getPayment('pay_123');

        expect(result).toEqual({ id: 'pay_123' });
        expect(fetchMock.mock.calls[0][0]).toBe('https://api.asaas.com/v3/payments/pay_123');
        expect(fetchMock.mock.calls[0][1].headers.access_token).toBe('$aact_prod_test');
    });
});
