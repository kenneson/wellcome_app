import fs from 'fs';
import os from 'os';
import path from 'path';
import EfiPay from 'sdk-node-apis-efi';

export interface PixChargeResult {
    txid: string;
    location: string;
    qrcode: string;
    pixCopiaECola: string;
    valor: string;
    status: string;
}

export class EfiPixService {
    private efiPay: any | null = null;

    constructor() {
        const certPath = this.resolveCertificatePath();
        const clientId = process.env.EFI_CLIENT_ID || '';
        const clientSecret = process.env.EFI_CLIENT_SECRET || '';

        if (!certPath || !clientId || !clientSecret) {
            console.warn('[EfiPixService] EFI PIX integration is not fully configured.');
            return;
        }

        this.efiPay = new EfiPay({
            client_id: clientId,
            client_secret: clientSecret,
            certificate: certPath,
            sandbox: process.env.EFI_SANDBOX === 'true',
            pemKey: process.env.EFI_PEM_KEY || undefined,
        });
    }

    async createPixCharge(
        valor: number,
        descricao: string,
        expiracao: number = 3600
    ): Promise<PixChargeResult> {
        const pixKey = process.env.EFI_PIX_KEY;
        const efiPay = this.getClient();

        if (!pixKey) {
            throw new Error('EFI_PIX_KEY nao configurada nas variaveis de ambiente');
        }

        const chargeBody = {
            calendario: {
                expiracao,
            },
            valor: {
                original: valor.toFixed(2),
            },
            chave: pixKey,
            infoAdicionais: [
                { nome: 'Plataforma', valor: 'Wellcome App' },
                { nome: 'Descricao', valor: descricao.substring(0, 72) },
            ],
        };

        try {
            const charge = await efiPay.pixCreateImmediateCharge([], chargeBody);
            const qrcodeData = await efiPay.pixGenerateQRCode({
                id: charge.loc.id,
            });

            return {
                txid: charge.txid,
                location: charge.loc.location,
                qrcode: qrcodeData.imagemQrcode,
                pixCopiaECola: qrcodeData.qrcode,
                valor: charge.valor.original,
                status: charge.status,
            };
        } catch (error: any) {
            console.error('[EfiPixService] Failed to create PIX charge:', error?.message || error);
            throw error;
        }
    }

    async getChargeStatus(txid: string): Promise<{ status: string; txid: string; valor?: string }> {
        const charge = await this.getClient().pixDetailCharge({ txid });

        return {
            status: charge.status,
            txid: charge.txid,
            valor: charge.valor?.original,
        };
    }

    async sendPix(valor: number, chaveDestino: string, withdrawalId: string): Promise<any> {
        const pixKey = process.env.EFI_PIX_KEY;
        const efiPay = this.getClient();

        if (!pixKey) {
            throw new Error('EFI_PIX_KEY nao configurada nas variaveis de ambiente');
        }

        const idEnvio = `WD${withdrawalId.replace(/[^a-zA-Z0-9]/g, '')}`.substring(0, 35);
        const params = { idEnvio };
        const body = {
            valor: valor.toFixed(2),
            pagador: {
                chave: pixKey,
            },
            favorecido: {
                chave: chaveDestino,
            },
        };

        try {
            return await efiPay.pixSend(params, body);
        } catch (error: any) {
            console.error('[EfiPixService] Failed to send PIX:', error?.message || error);
            throw error;
        }
    }

    async configWebhook(url: string): Promise<any> {
        const pixKey = process.env.EFI_PIX_KEY;
        const efiPay = this.getClient();

        if (!pixKey) {
            throw new Error('EFI_PIX_KEY nao configurada');
        }

        try {
            return await efiPay.pixConfigWebhook(
                { chave: pixKey },
                { webhookUrl: url }
            );
        } catch (error: any) {
            console.error('[EfiPixService] Failed to configure webhook:', error?.message || error);
            throw error;
        }
    }

    private getClient() {
        if (!this.efiPay) {
            throw new Error('EFI PIX integration is not configured');
        }

        return this.efiPay;
    }

    private resolveCertificatePath(): string | null {
        if (process.env.EFI_CERT_BASE64) {
            const tmpDir = os.tmpdir();
            const certPath = path.join(tmpDir, 'efi-cert.p12');
            const certBuffer = Buffer.from(process.env.EFI_CERT_BASE64, 'base64');
            fs.writeFileSync(certPath, certBuffer);
            return certPath;
        }

        if (!process.env.EFI_CERT_PATH) {
            return null;
        }

        const certPath = path.isAbsolute(process.env.EFI_CERT_PATH)
            ? process.env.EFI_CERT_PATH
            : path.resolve(process.cwd(), process.env.EFI_CERT_PATH);

        return fs.existsSync(certPath) ? certPath : null;
    }
}
