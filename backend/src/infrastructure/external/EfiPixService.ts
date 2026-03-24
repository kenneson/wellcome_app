import fs from 'fs';
import path from 'path';
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
        const certPath = process.env.EFI_CERT_PATH
            || path.join(__dirname, '../../../../homologacao-560634-wellcomeapp.p12');

        if (!fs.existsSync(certPath)) {
            console.warn(`[EfiPixService] Certificado não encontrado em: ${certPath}`);
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
                { nome: 'Descrição', valor: descricao.substring(0, 72) },
            ],
        };

        const charge = await this.efiPay.pixCreateImmediateCharge([], chargeBody);

        // 2. Gerar QR code a partir do loc.id
        const qrcodeData = await this.efiPay.pixGenerateQRCode({
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
}
