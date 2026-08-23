import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Protecao Wellcome',
  description: 'Beneficios e controles para inscricoes e pagamentos feitos dentro da Wellcome.',
};

const benefits = [
  'Aprovacao do anfitriao antes do pagamento em eventos moderados.',
  'Registro verificavel de pagamento, cancelamento e eventual reembolso.',
  'Saldo do anfitriao retido ate 24 horas depois do evento.',
  'Expiracao automatica de vagas nao pagas e promocao por ordem da lista de espera.',
  'Suporte baseado no historico da transacao e das decisoes feitas no aplicativo.',
];

export default function WellcomeProtectionPage() {
  return (
    <main className="legal-page">
      <header className="legal-header shell">
        <a className="wordmark footer-wordmark" href="/" aria-label="Voltar para a Wellcome">wellcome<span>.</span></a>
        <a className="legal-back-link" href="/">Voltar ao site</a>
      </header>
      <section className="legal-hero shell" aria-labelledby="protection-title">
        <p className="eyebrow">PROTECAO WELLCOME</p>
        <h1 id="protection-title">Mais seguranca quando tudo acontece no app.</h1>
        <p>Controles financeiros e operacionais para participantes e anfitrioes.</p>
      </section>
      <article className="legal-content shell">
        <div className="legal-notice">
          <strong>Importante:</strong> a Protecao Wellcome vale para inscricoes e pagamentos realizados dentro da plataforma.
        </div>
        <section className="legal-section">
          <h2>O que esta incluido</h2>
          {benefits.map((benefit) => <p key={benefit}>• {benefit}</p>)}
        </section>
        <section className="legal-section">
          <h2>Para anfitrioes</h2>
          <p>A plataforma organiza inscritos pendentes, aprovados e pagos, protege a capacidade do evento e mostra saldo disponivel, retido e o minimo necessario para saque.</p>
          <p>Depois da primeira venda, condicoes essenciais do evento ficam protegidas contra alteracoes, preservando o acordo feito com os participantes.</p>
        </section>
        <section className="legal-section">
          <h2>Pagamentos por fora</h2>
          <p>Transferencias, dinheiro ou cobrancas combinadas fora da Wellcome nao possuem registro financeiro na plataforma. Nao conseguimos confirmar esses pagamentos, executar reembolso, analisar disputa ou aplicar a retencao de saldo.</p>
          <p>Se alguem solicitar pagamento por fora, nao pague e entre em contato pelo e-mail oi@wellcome.app.</p>
        </section>
      </article>
    </main>
  );
}
