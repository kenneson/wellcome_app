import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exclusão de Conta | Wellcome',
  description: 'Como solicitar a exclusão da sua conta e dos seus dados na Wellcome.',
};

const sections = [
  {
    title: '1. Excluir pelo aplicativo',
    paragraphs: [
      'No aplicativo Wellcome, acesse Perfil, abra Configurações, toque em Excluir minha conta e confirme a solicitação. A exclusão exige uma sessão autenticada para proteger sua conta.',
      'Antes de excluir, finalize ou cancele eventos futuros, inscrições ativas e saques pendentes. Os saldos disponível e pendente também precisam estar zerados.',
    ],
  },
  {
    title: '2. Solicitar pela web',
    paragraphs: [
      'Se você não consegue acessar o aplicativo, envie um e-mail para oi@wellcome.app com o assunto Exclusão de conta. Use o mesmo endereço de e-mail cadastrado e informe seu nome para que possamos validar a titularidade.',
      'Nunca envie senha, código de acesso, documento completo ou dados de cartão por e-mail. Podemos pedir informações adicionais estritamente necessárias para confirmar que a conta pertence a você.',
    ],
  },
  {
    title: '3. Dados removidos',
    paragraphs: [
      'A identidade de acesso, sessões renováveis, foto de perfil, documentos de verificação, selfie, dados pessoais do perfil, chave Pix e tokens de notificação são removidos ou anonimizados.',
      'Conteúdos e registros vinculados a eventos podem ser anonimizados para que conversas, reservas e experiências de outras pessoas continuem consistentes.',
    ],
  },
  {
    title: '4. Dados que podem ser mantidos',
    paragraphs: [
      'Registros de pagamentos, reembolsos, saques, prevenção a fraude, suporte e auditoria podem ser conservados pelo período exigido por obrigações legais, regulatórias, fiscais ou para exercício de direitos.',
      'Quando a retenção for necessária, os dados ficam limitados à finalidade aplicável e deixam de ser usados para acesso normal à plataforma.',
    ],
  },
];

export default function AccountDeletionPage() {
  return (
    <main className="legal-page">
      <header className="legal-header shell">
        <a className="wordmark footer-wordmark" href="/" aria-label="Voltar para a Wellcome">wellcome<span>.</span></a>
        <a className="legal-back-link" href="/">Voltar ao site</a>
      </header>

      <section className="legal-hero shell" aria-labelledby="deletion-title">
        <p className="eyebrow">EXCLUSÃO DE CONTA</p>
        <h1 id="deletion-title">Você controla sua conta e seus dados.</h1>
        <p>
          Veja como excluir sua conta Wellcome, quais pendências precisam ser resolvidas e quais registros podem ser mantidos por obrigação legal.
        </p>
      </section>

      <article className="legal-content shell">
        <div className="legal-notice">
          <strong>Canal de suporte:</strong> envie sua solicitação para <a href="mailto:oi@wellcome.app">oi@wellcome.app</a> se não conseguir acessar o aplicativo.
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
