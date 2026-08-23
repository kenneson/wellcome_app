# Regras de negocio: eventos, inscricoes e pagamentos

Este documento descreve a regra implementada no aplicativo e deve ser usado por produto, suporte, operacao e desenvolvimento.

## Fluxo de inscricao

### Evento gratuito e aberto

- A inscricao e aprovada imediatamente, se houver vaga e o prazo do evento estiver aberto.

### Evento pago e aberto

- A inscricao nasce com pagamento pendente e reserva uma vaga.
- O participante tem ate 24 horas, ou ate o inicio do evento se ocorrer antes, para iniciar o pagamento.
- Se o prazo vencer sem pagamento, a inscricao deixa de ocupar uma vaga. O participante pode cancelar a inscricao vencida e solicitar novamente.

### Evento com aprovacao do anfitriao

- O participante primeiro solicita uma vaga; nenhuma cobranca pode ser criada nessa etapa.
- Pedidos pendentes nao ocupam a capacidade do evento.
- Depois da aprovacao, o participante tem ate 24 horas, ou ate o inicio do evento se ocorrer antes, para pagar.
- A vaga aprovada fica reservada durante esse prazo. Depois do vencimento sem pagamento, deixa de ocupar capacidade.
- O ingresso so e liberado quando a inscricao esta aprovada e, em evento pago, o pagamento esta confirmado.

### Lista de espera e capacidade

- Quando todas as vagas estao reservadas, novos pedidos entram em `WAITLIST` se o evento permitir lista de espera.
- Quando uma vaga e liberada, a fila e promovida automaticamente por ordem de criacao.
- Em evento moderado, a pessoa promovida volta para analise do anfitriao e a vaga fica reservada enquanto essa decisao estiver pendente.
- Em evento aberto e pago, a pessoa promovida recebe prazo de ate 24 horas para pagar; em evento gratuito, e aprovada.
- Um job do Supabase Cron reconcilia expiracoes e promocoes a cada minuto. Cancelamentos, recusas, novas inscricoes e aprovacoes tambem disparam a reconciliacao.
- A API usa bloqueio transacional do evento e impede aprovacoes acima de `maxGuests`, inclusive em chamadas concorrentes.

## Alteracoes depois da primeira venda

- A primeira cobranca liquidada protege o contrato apresentado ao participante.
- Depois disso, preco, vagas, data, horario, prazo de reserva, endereco, tipo de acesso, lista de espera, regras, restricoes, perguntas e cardapio nao podem ser alterados pelo fluxo comum.
- Titulo, descricao e midia continuam editaveis para correcoes de apresentacao que nao mudem as condicoes comerciais.
- Uma tentativa de mudar campo protegido retorna `EVENT_CONTRACT_LOCKED_AFTER_SALE` com HTTP 409.

## Cobranca e taxas

- Eventos pagos aceitam valores de R$ 5,00 a R$ 100.000,00.
- A taxa da plataforma e configurada por `APP_FEE_PERCENTAGE` (padrao atual: 10%).
- `PAYMENT_PROCESSING_FEE_PAYER=PLATFORM`: a plataforma assume a taxa Asaas.
- `PAYMENT_PROCESSING_FEE_PAYER=HOST`: a taxa Asaas tambem e descontada do repasse do anfitriao.

Exemplo com ingresso de R$ 100,00, taxa Wellcome de 10% e taxa Asaas paga pela plataforma:

```text
valor bruto:        R$ 100,00
taxa Wellcome:      R$  10,00
taxa do processador:R$   2,00
saldo do anfitriao: R$  90,00
margem Wellcome:    R$   8,00
```

- A margem realizada e calculada por pagamento, descontando taxa do processador e reversoes proporcionais de reembolso.
- O endpoint administrativo `GET /admin/finance/payments` retorna bruto capturado, reembolsado, liquido do anfitriao, custo do processador e margem realizada.

## Retencao e liberacao do anfitriao

- Quando o pagamento liquidado pertence a uma inscricao aprovada, o valor liquido entra em `saldo retido`.
- O valor se torna disponivel 24 horas depois do fim do evento (`endTime`; na ausencia, `eventDate`).
- A conversao de saldo retido em disponivel e transacional e idempotente.
- Valores vencidos sao liberados quando o anfitriao abre o proprio perfil/carteira ou solicita saque.
- Pagamentos antigos que ja estavam creditados continuam no saldo disponivel; nao ha retroacao.

## Cancelamento, recusa e reembolso

- Inscricoes com historico financeiro nao sao apagadas; passam para `CANCELLED` ou `REJECTED`.
- Se existe pagamento confirmado, o reembolso restante e solicitado ao Asaas antes de cancelar ou recusar localmente.
- Enquanto o valor esta retido, o reembolso reduz o saldo retido.
- Depois da liberacao, o reembolso debita o saldo disponivel e cria uma transacao de reversao.
- Se o provedor recusar a solicitacao de reembolso, o cancelamento local nao e concluido automaticamente.
- Eventos com qualquer historico de inscricao nao podem ser excluidos fisicamente.

## Saques

- Apenas saldo disponivel pode ser sacado; saldo retido nunca entra na reserva do saque.
- O anfitriao precisa de KYC aprovado e chave Pix valida.
- O saque minimo e configurado por `MIN_WITHDRAWAL_AMOUNT` (padrao: R$ 50,00) e aparece na carteira antes da solicitacao.
- So pode existir um saque pendente ou em processamento por anfitriao.
- A solicitacao reserva saldo de forma atomica. Falha definitiva devolve a reserva uma unica vez.
- Resposta incerta do Asaas exige conciliacao; nunca deve gerar um segundo envio automatico.

## KYC e acesso ao aplicativo

- Participantes podem navegar e participar sem KYC.
- KYC e obrigatorio para publicar evento pago e solicitar saque.
- A comparacao facial e apenas triagem; a aprovacao final e feita por administrador.
- Cada tentativa usa arquivos imutaveis em uma pasta unica. O cliente nao pode substituir evidencias depois do envio.
- Clientes autenticados nao possuem permissao SQL para alterar saldo, papel, decisao KYC ou campos de repasse.

## Parametros operacionais

```dotenv
APP_FEE_PERCENTAGE=10
PAYMENT_PROCESSING_FEE_PAYER=PLATFORM
PAYMENT_CHECKOUT_EXPIRATION_MINUTES=60
REGISTRATION_PAYMENT_TTL_HOURS=24
HOST_FUNDS_HOLD_HOURS=24
MIN_WITHDRAWAL_AMOUNT=50
```

## Politicas e Protecao Wellcome

- Termos de Uso, Politica de Privacidade e Protecao Wellcome estao acessiveis em Configuracoes no aplicativo e no rodape do site.
- O checkout explica que pagamentos dentro da plataforma possuem registro, suporte a reembolsos e retencao do saldo do anfitriao.
- Pagamentos combinados fora da plataforma nao recebem essa cobertura, pois a Wellcome nao consegue confirmar, reembolsar ou auditar a transacao.

## Decisoes ainda necessarias antes da operacao publica

- Politica juridica de cancelamento por antecedencia, taxa de cancelamento e no-show.
- Prazo prometido ao cliente para conclusao de reembolsos e suporte a disputas.
- Responsabilidade tributaria e emissao de documentos fiscais para anfitriao e plataforma.
- Tratamento operacional de chargeback depois que o anfitriao ja sacou.
- Rotina agendada para liberar saldos independentemente do acesso do anfitriao.
- Revisao juridica final das politicas publicadas e dos prazos comerciais.
