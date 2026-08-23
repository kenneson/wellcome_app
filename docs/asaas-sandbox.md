# Asaas Sandbox

## Backend no Easypanel

Configure estas variaveis no servico `wellcome/backend`:

```dotenv
ASAAS_API_KEY=<chave da conta Sandbox>
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=<segredo aleatorio de 32 a 255 caracteres>
PUBLIC_API_URL=https://wellcome-backend.igpqhp.easypanel.host
PAYMENT_CHECKOUT_EXPIRATION_MINUTES=60
REGISTRATION_PAYMENT_TTL_HOURS=24
HOST_FUNDS_HOLD_HOURS=24
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
PAYMENT_CONFIRMED
PAYMENT_RECEIVED
PAYMENT_REFUNDED
PAYMENT_PARTIALLY_REFUNDED
PAYMENT_CHARGEBACK_REQUESTED
TRANSFER_CREATED
TRANSFER_PENDING
TRANSFER_IN_BANK_PROCESSING
TRANSFER_BLOCKED
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

1. Criar uma solicitacao em evento pago com aprovacao e confirmar que ainda nao e possivel pagar.
2. Aprovar a solicitacao, abrir o checkout e validar Pix.
3. Repetir com cartao de teste do Sandbox.
4. Confirmar que a inscricao e o pagamento mudam de estado uma unica vez.
5. Confirmar o valor liquido no saldo retido do anfitriao.
6. Reenviar o mesmo webhook e confirmar que nao duplica a retencao.
7. Validar estorno total e parcial.
8. Solicitar um saque Pix e validar sucesso e falha.
9. Conferir a fila do webhook no Asaas.

## Regra de repasse

O saldo retido do anfitriao so e registrado quando a cobranca estiver efetivamente
recebida no Asaas (RECEIVED ou RECEIVED_IN_CASH). CONFIRMED representa
autorizacao do pagamento, mas ainda nao libera saque. O saldo se torna
disponivel 24 horas depois do fim do evento.

Com APP_FEE_PERCENTAGE=10 e PAYMENT_PROCESSING_FEE_PAYER=PLATFORM, uma
inscricao de R$ 100,00 gera:

```text
valor bruto:        R$ 100,00
taxa do app:        R$  10,00
repasse anfitriao:  R$  90,00
taxa Asaas:         custo da plataforma
```

Se PAYMENT_PROCESSING_FEE_PAYER=HOST, a taxa Asaas tambem e descontada do
repasse do anfitriao.

## Operacao segura de saques

- O anfitriao precisa ter KYC aprovado e chave Pix valida.
- A solicitacao reserva o saldo de forma transacional.
- Somente um saque pode ficar pendente ou em processamento por anfitriao.
- A aprovacao registra o administrador e usa o ID do saque como
  externalReference.
- Nunca aprove novamente um saque em PROCESSING.
- Quando providerStatus estiver como SUBMISSION_UNCERTAIN, use
  **Conciliar** no painel admin. Essa acao apenas consulta o Asaas e nao envia
  outro Pix.
- Falhas definitivas devolvem o valor reservado para a carteira uma unica vez.
- Reembolsos e chargebacks podem deixar a carteira negativa se o anfitriao ja
  tiver sacado; novos saques ficam bloqueados enquanto nao houver saldo.

Antes do deploy do codigo, aplique todas as migrations pendentes em ordem no
ambiente correspondente.

Para producao, gere novas chaves e um novo token. Nao reutilize credenciais do
Sandbox.
