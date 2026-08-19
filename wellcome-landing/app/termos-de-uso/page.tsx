import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso | Wellcome',
  description: 'Termos de Uso da plataforma Wellcome para participantes e anfitrioes.',
};

const sections = [
  {
    title: '1. Aceite dos termos',
    paragraphs: [
      'Ao criar uma conta, acessar ou usar a Wellcome, voce declara que leu, entendeu e concorda com estes Termos de Uso. Se voce nao concordar com qualquer regra, nao use a plataforma.',
      'A Wellcome pode atualizar estes termos para refletir mudancas no produto, na legislacao ou em exigencias operacionais. Quando a alteracao for relevante, poderemos comunicar voce pelo aplicativo, por e-mail ou por outro meio disponivel.',
    ],
  },
  {
    title: '2. O que e a Wellcome',
    paragraphs: [
      'A Wellcome e uma plataforma que conecta pessoas interessadas em participar de experiencias gastronomicas, encontros e eventos presenciais com anfitrioes que desejam criar e organizar essas experiencias.',
      'A Wellcome fornece tecnologia para cadastro, descoberta, reserva, comunicacao, pagamento e gestao dos eventos. A execucao do evento, a veracidade das informacoes publicadas e o cumprimento das condicoes anunciadas sao responsabilidades do respectivo anfitriao, sem prejuizo das medidas de moderacao que a Wellcome possa adotar.',
    ],
  },
  {
    title: '3. Conta, cadastro e seguranca',
    paragraphs: [
      'Para usar recursos da plataforma, voce deve criar uma conta com informacoes verdadeiras, completas e atualizadas. Voce e responsavel por manter a confidencialidade do seu acesso e por todas as atividades realizadas na sua conta.',
      'Voce nao deve compartilhar sua conta, criar cadastro com dados de terceiros, tentar acessar contas de outras pessoas, burlar mecanismos de seguranca ou usar a Wellcome para finalidade ilegal, abusiva ou incompativel com estes termos.',
    ],
  },
  {
    title: '4. Verificacao de identidade',
    paragraphs: [
      'A Wellcome pode exigir verificacao de identidade para aumentar a seguranca da comunidade, reduzir fraudes, liberar recursos de anfitriao, processar pagamentos, permitir repasses e cumprir obrigacoes legais ou regulatorias.',
      'A verificacao pode envolver envio de foto de documento, selfie, dados cadastrais e analise automatizada ou manual. O envio de informacoes falsas, adulteradas, desatualizadas ou de terceiros pode resultar em rejeicao da verificacao, suspensao da conta, cancelamento de eventos ou bloqueio de valores quando permitido por lei.',
    ],
  },
  {
    title: '5. Participantes',
    paragraphs: [
      'Ao solicitar ou confirmar participacao em um evento, voce deve observar as regras, horarios, endereco, politica de acesso, preco, itens inclusos e demais condicoes divulgadas pelo anfitriao.',
      'Voce deve agir com respeito, boa-fe e seguranca durante a experiencia. Condutas ofensivas, discriminatorias, violentas, fraudulentas, assediadoras ou que coloquem outras pessoas em risco podem levar a remocao do evento, suspensao da conta e comunicacao as autoridades competentes quando necessario.',
    ],
  },
  {
    title: '6. Anfitrioes e eventos',
    paragraphs: [
      'Ao publicar um evento, o anfitriao declara que possui capacidade para realizar a experiencia anunciada e que as informacoes sobre local, horario, cardapio, preco, vagas, regras, restricoes alimentares, politica de cancelamento e requisitos de participacao sao corretas.',
      'O anfitriao e responsavel por cumprir leis, normas sanitarias, regras de seguranca, obrigacoes fiscais, direitos de terceiros e demais exigencias aplicaveis ao evento. A Wellcome pode revisar, ocultar, cancelar ou remover eventos que violem estes termos, politicas da plataforma ou a legislacao aplicavel.',
    ],
  },
  {
    title: '7. Pagamentos, taxas e repasses',
    paragraphs: [
      'Eventos pagos podem ser processados por provedores de pagamento contratados pela Wellcome, como Asaas ou outros parceiros. Ao pagar por uma experiencia, voce concorda com a cobranca do valor informado no aplicativo, incluindo eventuais taxas apresentadas antes da confirmacao.',
      'A Wellcome pode reter taxa de servico, comissao ou outros valores informados ao anfitriao. Repasses ao anfitriao dependem de verificacao de identidade aprovada, chave Pix valida, saldo disponivel, ausencia de bloqueios, antifraude e processamento pelo provedor de pagamento.',
      'Pagamentos por eventos presenciais, alimentacao, experiencias ou ingressos para eventos ao vivo podem ser processados fora do sistema de faturamento do Google Play, quando permitido pelas politicas aplicaveis da loja.',
    ],
  },
  {
    title: '8. Cancelamentos, reembolsos e estornos',
    paragraphs: [
      'As condicoes de cancelamento e reembolso podem variar conforme o evento, prazo, status da reserva, regras do anfitriao, regras do provedor de pagamento e legislacao aplicavel.',
      'Quando um evento for cancelado pelo anfitriao ou pela Wellcome, poderemos notificar os participantes e avaliar as medidas cabiveis, incluindo reembolso total ou parcial quando aplicavel. Estornos e chargebacks podem afetar saldos, repasses e disponibilidade da conta do anfitriao.',
      'A Wellcome pode bloquear, compensar ou descontar valores de repasses futuros quando houver fraude, disputa, chargeback, cancelamento, erro operacional ou violacao destes termos.',
    ],
  },
  {
    title: '9. Conteudo do usuario',
    paragraphs: [
      'Voce pode enviar ou publicar informacoes, textos, imagens, fotos, respostas, avaliacoes, descricoes de eventos e outros conteudos. Voce declara possuir os direitos necessarios sobre esse conteudo e autoriza a Wellcome a usa-lo para operar, exibir, divulgar, moderar e melhorar a plataforma.',
      'Nao e permitido publicar conteudo ilegal, enganoso, discriminatorio, ofensivo, sexualmente exploratorio, violento, que viole privacidade, propriedade intelectual ou direitos de terceiros, ou que incentive atividade perigosa ou ilegal.',
    ],
  },
  {
    title: '10. Privacidade e dados pessoais',
    paragraphs: [
      'O tratamento de dados pessoais pela Wellcome e descrito na Politica de Privacidade. Podemos tratar dados de conta, contato, perfil, localizacao aproximada ou precisa quando autorizada, fotos, documentos de verificacao, dados de pagamento, registros de uso, mensagens operacionais e informacoes necessarias para seguranca e suporte.',
      'Ao usar a plataforma, voce reconhece que determinados dados podem ser necessarios para cadastro, verificacao de identidade, reservas, pagamentos, repasses, prevencao a fraude, atendimento, cumprimento legal e funcionamento dos recursos oferecidos.',
    ],
  },
  {
    title: '11. Moderacao, suspensao e encerramento',
    paragraphs: [
      'A Wellcome pode moderar conteudos, limitar recursos, cancelar eventos, recusar pagamentos, suspender ou encerrar contas quando houver suspeita de fraude, risco a usuarios, violacao destes termos, descumprimento de politicas da plataforma, ordem legal ou necessidade de proteger a comunidade.',
      'Voce pode solicitar a exclusao da sua conta pelos meios disponibilizados no aplicativo ou nos canais publicos da Wellcome. Algumas informacoes podem ser mantidas pelo prazo necessario para cumprimento legal, prevencao a fraude, defesa de direitos, auditoria de pagamentos ou obrigacoes regulatorias.',
    ],
  },
  {
    title: '12. Responsabilidades e limitacoes',
    paragraphs: [
      'A Wellcome trabalha para manter a plataforma segura e funcional, mas nao garante disponibilidade ininterrupta, ausencia de erros, compatibilidade com todos os dispositivos ou que todos os eventos ocorram exatamente como anunciados.',
      'Na maxima extensao permitida por lei, a Wellcome nao se responsabiliza por danos decorrentes de condutas de usuarios, informacoes fornecidas por anfitrioes ou participantes, falhas de terceiros, indisponibilidade de provedores, caso fortuito, forca maior ou uso da plataforma em desacordo com estes termos.',
    ],
  },
  {
    title: '13. Atendimento e contato',
    paragraphs: [
      'Para duvidas, solicitacoes, suporte, privacidade, exclusao de conta ou comunicacoes relacionadas a estes termos, entre em contato pelo e-mail oi@wellcome.app.',
      'Estes termos sao regidos pelas leis da Republica Federativa do Brasil. Eventuais controversias deverao observar a legislacao aplicavel e os direitos garantidos ao consumidor quando cabiveis.',
    ],
  },
];

export default function TermsOfUsePage() {
  return (
    <main className="legal-page">
      <header className="legal-header shell">
        <a className="wordmark footer-wordmark" href="/" aria-label="Voltar para a Wellcome">wellcome<span>.</span></a>
        <a className="legal-back-link" href="/">Voltar ao site</a>
      </header>

      <section className="legal-hero shell" aria-labelledby="terms-title">
        <p className="eyebrow">TERMOS DE USO</p>
        <h1 id="terms-title">Regras para usar a Wellcome com seguranca e clareza.</h1>
        <p>
          Ultima atualizacao: 19 de agosto de 2026. Este documento descreve as condicoes de uso da plataforma Wellcome por participantes, anfitrioes e visitantes.
        </p>
      </section>

      <article className="legal-content shell">
        <div className="legal-notice">
          <strong>Aviso importante:</strong> este texto e um rascunho operacional para publicacao e revisao. Por envolver pagamentos, KYC, eventos presenciais e dados pessoais, recomendamos revisao juridica antes do lancamento publico.
        </div>

        {sections.map((section) => (
          <section key={section.title} className="legal-section">
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}