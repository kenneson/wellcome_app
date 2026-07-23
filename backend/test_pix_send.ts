import EfiPay from 'sdk-node-apis-efi';
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const certPath = path.resolve(__dirname, '../producao-560634-wellcome_prod.p12');

const efiPay = new EfiPay({
    client_id: process.env.EFI_CLIENT_ID || '',
    client_secret: process.env.EFI_CLIENT_SECRET || '',
    certificate: certPath,
    sandbox: process.env.EFI_SANDBOX === 'true'
});

async function run() {
    try {
        const pixKey = process.env.EFI_PIX_KEY;
        const idEnvio = `TESTEAP${Date.now().toString()}`.substring(0, 35);
        const body = { valor: "1.80", pagador: { chave: pixKey }, favorecido: { chave: "02556051299" } };
        
        console.log("Enviando PIX de Teste...");
        const res = await efiPay.pixSend({ idEnvio }, body);
        console.log("Sucesso:", res);
    } catch(err: any) {
        console.log("\nERRO BRUTO EFI:");
        if (err.response) {
            console.log("Status:", err.response.status);
            console.dir(err.response.data, {depth:null});
        } else {
            console.log(err.nome || err.message || err);
        }
    }
}
run();
