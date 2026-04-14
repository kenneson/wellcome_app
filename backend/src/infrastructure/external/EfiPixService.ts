import fs from 'fs';
import path from 'path';
import os from 'os';
import EfiPay from 'sdk-node-apis-efi';

export interface PixChargeResult {
    txid: string;
    location: string;
    qrcode: string;       // base64 image
    pixCopiaECola: string; // copia-e-cola string
    valor: string;
    status: string;
}

export class EfiPixService {
    private efiPay: any;

    constructor() {
        let certPath: string;

        // Suporte a certificado via base64 (ideal para Docker/EasyPanel)
        if (process.env.EFI_CERT_BASE64) {
            const tmpDir = os.tmpdir();
            certPath = path.join(tmpDir, 'efi-cert.p12');
            const certBuffer = Buffer.from(process.env.EFI_CERT_BASE64, 'base64');
            fs.writeFileSync(certPath, certBuffer);
            console.log('[EfiPixService] Certificado carregado via EFI_CERT_BASE64');
        } else {
            certPath = process.env.EFI_CERT_PATH
                || path.join(__dirname, '../../../../producao-560634-wellcome_prod.p12');

            if (!path.isAbsolute(certPath)) {
                certPath = path.resolve(process.cwd(), certPath);
            }
        }

        console.log('[EfiPixService] Cert path:', certPath);
        console.log('[EfiPixService] Cert exists:', fs.existsSync(certPath));
        console.log('[EfiPixService] Sandbox:', process.env.EFI_SANDBOX);
        console.log('[EfiPixService] Client ID present:', !!process.env.EFI_CLIENT_ID);
        console.log('[EfiPixService] PIX Key present:', !!process.env.EFI_PIX_KEY);

        if (!fs.existsSync(certPath)) {
            console.error(`[EfiPixService] ERRO: Certificado não encontrado em: ${certPath}`);
        }

        this.efiPay = new EfiPay({
            client_id: process.env.EFI_CLIENT_ID || '',
            client_secret: process.env.EFI_CLIENT_SECRET || '',
            certificate: certPath,
            sandbox: process.env.EFI_SANDBOX === 'true',
            pemKey: process.env.EFI_PEM_KEY || undefined,
        });
    }

    /**
     * Cria uma cobrança PIX imediata e retorna o QR code
     */
    async createPixCharge(
        valor: number,
        descricao: string,
        expiracao: number = 3600 // 1 hora padrão
    ): Promise<PixChargeResult> {
        const pixKey = process.env.EFI_PIX_KEY;
        if (!pixKey) {
            throw new Error('EFI_PIX_KEY não configurada nas variáveis de ambiente');
        }

        // 1. Criar cobrança imediata
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

        console.log('[EfiPixService] Criando cobrança PIX:', JSON.stringify(chargeBody, null, 2));

        try {
            const charge = await this.efiPay.pixCreateImmediateCharge([], chargeBody);
            console.log('[EfiPixService] Cobrança criada:', JSON.stringify(charge, null, 2));

            // 2. Gerar QR code a partir do loc.id
            const qrcodeData = await this.efiPay.pixGenerateQRCode({
                id: charge.loc.id,
            });
            console.log('[EfiPixService] QR Code gerado com sucesso');

            return {
                txid: charge.txid,
                location: charge.loc.location,
                qrcode: qrcodeData.imagemQrcode,
                pixCopiaECola: qrcodeData.qrcode,
                valor: charge.valor.original,
                status: charge.status,
            };
        } catch (error: any) {
            console.error('[EfiPixService] ERRO ao criar cobrança PIX:', error?.message || error);
            if (error?.response) {
                console.error('[EfiPixService] Response:', JSON.stringify(error.response, null, 2));
            }
            if (error?.config) {
                console.error('[EfiPixService] Config URL:', error.config?.url);
            }
            throw error;
        }
    }

    /**
     * Consulta status de uma cobrança pelo txid
     */
    async getChargeStatus(txid: string): Promise<{ status: string; txid: string; valor?: string }> {
        const charge = await this.efiPay.pixDetailCharge({ txid });

        return {
            status: charge.status,
            txid: charge.txid,
            valor: charge.valor?.original,
        };
    }

    /**
     * Envia um PIX da conta EFI para uma chave destino (Saque do host)
     */
    async sendPix(valor: number, chaveDestino: string, withdrawalId: string): Promise<any> {
        const pixKey = process.env.EFI_PIX_KEY;
        if (!pixKey) {
            throw new Error('EFI_PIX_KEY não configurada nas variáveis de ambiente');
        }

        // idEnvio: 1-35 chars, alphanumeric only (no hyphens)
        // Usamos o withdrawalId sem hífens para garantir conformidade
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

        console.log('[EfiPixService] Iniciando envio de PIX:', JSON.stringify({ params, body }, null, 2));

        try {
            const response = await this.efiPay.pixSend(params, body);
            console.log('[EfiPixService] Pix enviado com sucesso:', JSON.stringify(response, null, 2));
            return response;
        } catch (error: any) {
            console.error('[EfiPixService] ERRO ao enviar PIX:', error?.message || error);
            if (error?.response) {
                console.error('[EfiPixService] Detalhes do erro:', JSON.stringify(error.response, null, 2));
            }
            throw error;
        }
    }

    /**
     * Registra uma URL de Webhook para a chave PIX configurada
     */
    async configWebhook(url: string): Promise<any> {
        const pixKey = process.env.EFI_PIX_KEY;
        if (!pixKey) {
            throw new Error('EFI_PIX_KEY não configurada');
        }

        const params = {
            chave: pixKey,
        };

        const body = {
            webhookUrl: url,
        };

        console.log(`[EfiPixService] Registrando Webhook para a chave ${pixKey} na URL: ${url}`);

        try {
            const response = await this.efiPay.pixConfigWebhook(params, body);
            console.log('[EfiPixService] Webhook registrado com sucesso:', response);
            return response;
        } catch (error: any) {
            console.error('[EfiPixService] ERRO ao registrar Webhook:', error?.message || error);
            if (error?.response) {
                console.error('[EfiPixService] Detalhes:', JSON.stringify(error.response, null, 2));
            }
            throw error;
        }
    }
}
