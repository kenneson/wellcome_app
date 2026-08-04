# Asaas Sandbox

## Backend no Easypanel

Configure estas variaveis no servico `wellcome/backend`:

```dotenv
ASAAS_API_KEY=<chave da conta Sandbox>
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=<segredo aleatorio de 32 a 255 caracteres>
PUBLIC_API_URL=https://wellcome-backend.igpqhp.easypanel.host
PAYMENT_CHECKOUT_EXPIRATION_MINUTES=60
PAYMENT_PROCESSING_FEE_PAYER=PLATFORM
APP_FEE_PERCENTAGE=10
```

O token do webhook deve ser igual no Easypanel e no campo `Token de autenticacao`
do Asaas. A chave da API nunca deve ser adicionada ao aplicativo Expo nem ao Git.

O dominio HTTPS deve encaminhar para o protocolo HTTP, porta `3000`, caminho `/` do
container.

## Webhook no Asaas

- Nome: `Wellcome Pagamentos Sandbox`
- URL: `https://wellcome-backend.igpqhp.easypanel.host/webhooks/asaas`
- Versao da API: `3`
- Tipo de envio: `SEQUENTIALLY`
- Webhook ativo: sim, somente depois do deploy
- Fila interrompida: nao
- Token de autenticacao: o mesmo `ASAAS_WEBHOOK_TOKEN`

Eventos necessarios:

```text
CHECKOUT_PAID
CHECKOUT_CANCELED
CHECKOUT_EXPIRED
PAYMENT_REFUNDED
PAYMENT_PARTIALLY_REFUNDED
PAYMENT_CHARGEBACK_REQUESTED
TRANSFER_DONE
TRANSFER_FAILED
TRANSFER_CANCELLED
```

## Aplicativo

No ambiente de build do EAS usado para homologacao:

```dotenv
EXPO_PUBLIC_API_URL=https://wellcome-backend.igpqhp.easypanel.host
```

## Validacao antes de producao

1. Criar uma inscricao em evento pago.
2. Abrir o checkout e validar Pix.
3. Repetir com cartao de teste do Sandbox.
4. Confirmar que a inscricao muda para aprovada uma unica vez.
5. Confirmar o credito liquido na carteira do anfitriao.
6. Reenviar o mesmo webhook e confirmar que nao duplica o credito.
7. Validar estorno total e parcial.
8. Solicitar um saque Pix e validar sucesso e falha.
9. Conferir a fila do webhook no Asaas.

Para producao, gere novas chaves e um novo token. Nao reutilize credenciais do
Sandbox.
