import { OpsAlerter, createWebhookAlertTransport } from '../OpsAlerter';

describe('OpsAlerter', () => {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const alert = { key: 'k1', severity: 'critical' as const, title: 'Saldo divergente', details: { userId: 'u1' } };

    beforeEach(() => jest.clearAllMocks());

    it('logs and delivers an alert, then suppresses repeats during the cooldown', async () => {
        const transport = jest.fn().mockResolvedValue(undefined);
        const alerter = new OpsAlerter(logger, transport, 1_000);

        expect(await alerter.notify(alert, 0)).toBe(true);
        expect(await alerter.notify(alert, 500)).toBe(false);
        expect(await alerter.notify(alert, 1_500)).toBe(true);

        expect(transport).toHaveBeenCalledTimes(2);
        expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ alert: true, key: 'k1' }), 'ALERT Saldo divergente');
    });

    it('keeps working when delivery fails', async () => {
        const alerter = new OpsAlerter(logger, jest.fn().mockRejectedValue(new Error('timeout')));

        await expect(alerter.notify(alert)).resolves.toBe(true);
        expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ err: 'timeout' }), 'alert delivery failed');
    });

    it('only creates a webhook transport when a URL is configured', async () => {
        expect(createWebhookAlertTransport('')).toBeNull();

        const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200 });
        const transport = createWebhookAlertTransport('https://hooks.example/alert', fetchImpl as any)!;
        await transport(alert);

        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe('https://hooks.example/alert');
        expect(JSON.parse(init.body)).toEqual(expect.objectContaining({ text: '[CRITICAL] Saldo divergente', key: 'k1' }));
    });

    it('reports a failed webhook response as an error', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 500 });
        const transport = createWebhookAlertTransport('https://hooks.example/alert', fetchImpl as any)!;

        await expect(transport(alert)).rejects.toThrow('Alert webhook responded 500');
    });
});
