import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politica de Privacidade | Wellcome',
  description: 'Como a Wellcome coleta, usa, compartilha e protege dados pessoais.',
};

const sections = [
  {
    title: '1. Dados que tratamos',
    paragraphs: [
      'Podemos tratar dados de conta e contato, perfil, eventos, inscricoes, localizacao informada, mensagens operacionais, registros de acesso, dados de cobranca e informacoes necessarias para verificacao de identidade.',
      'A verificacao pode incluir fotos de documento e selfie. Dados completos de cartao sao processados pelo provedor de pagamento e nao devem ser armazenados pela Wellcome.',
    ],
  },
  {
    title: '2. Por que usamos esses dados',
    paragraphs: [
      'Usamos dados para executar os servicos solicitados, organizar eventos e inscricoes, processar pagamentos e saques, prestar suporte, prevenir fraude, proteger a comunidade, cumprir obrigacoes legais e exercer direitos.',
      'Quando a lei exigir, solicitaremos consentimento especifico. Voce pode revoga-lo, sem afetar tratamentos anteriores ou outras bases legais aplicaveis.',
    ],
  },
  {
    title: '3. Compartilhamento',
    paragraphs: [
      'Podemos compartilhar apenas os dados necessarios com fornecedores de infraestrutura, autenticacao, armazenamento, verificacao de identidade, comunicacao e pagamentos, incluindo Supabase, AWS e Asaas, alem de autoridades quando houver obrigacao legal.',
      'Nao vendemos dados pessoais. Fornecedores devem tratar os dados conforme suas finalidades contratadas e requisitos de seguranca aplicaveis.',
    ],
  },
  {
    title: '4. Retencao e seguranca',
    paragraphs: [
      'Mantemos os dados pelo periodo necessario as finalidades informadas e aos prazos legais, regulatorios, antifraude, de auditoria ou defesa de direitos. Depois disso, eles sao excluidos ou anonimizados quando aplicavel.',
      'Adotamos controles de acesso, autenticacao e registros operacionais. Nenhum sistema e totalmente imune a riscos, e incidentes relevantes serao tratados conforme a legislacao.',
    ],
  },
  {
    title: '5. Seus direitos',
    paragraphs: [
      'Voce pode solicitar confirmacao do tratamento, acesso, correcao, informacoes sobre compartilhamento, revisao, portabilidade quando aplicavel, revogacao de consentimento e exclusao, respeitadas as hipoteses legais de conservacao.',
      'Use a opcao de excluir conta no aplicativo ou envie sua solicitacao para oi@wellcome.app.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <header className="legal-header shell">
        <a className="wordmark footer-wordmark" href="/" aria-label="Voltar para a Wellcome">wellcome<span>.</span></a>
        <a className="legal-back-link" href="/">Voltar ao site</a>
      </header>
      <section className="legal-hero shell" aria-labelledby="privacy-title">
        <p className="eyebrow">POLITICA DE PRIVACIDADE</p>
        <h1 id="privacy-title">Transparencia sobre seus dados.</h1>
        <p>Ultima atualizacao: 23 de agosto de 2026. Esta politica explica como a Wellcome trata dados pessoais.</p>
      </section>
      <article className="legal-content shell">
        <div className="legal-notice">
          <strong>Resumo:</strong> tratamos os dados necessarios para operar a plataforma, proteger a comunidade, processar pagamentos e cumprir obrigacoes legais.
        </div>
        {sections.map((section) => (
          <section key={section.title} className="legal-section">
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
      </article>
    </main>
  );
}
