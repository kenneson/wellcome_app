export type LegalDocumentKey = 'terms' | 'privacy' | 'protection';

export interface LegalSection {
    title: string;
    paragraphs: string[];
    bullets?: string[];
}

export interface LegalDocument {
    eyebrow: string;
    title: string;
    updatedAt: string;
    introduction: string;
    sections: LegalSection[];
}

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
    terms: {
        eyebrow: 'TERMOS DE USO',
        title: 'Regras claras para participantes e anfitriões.',
        updatedAt: '23 de agosto de 2026',
        introduction: 'Ao criar uma conta ou usar a Wellcome, você concorda com estas regras e com as políticas apresentadas no aplicativo.',
        sections: [
            {
                title: 'Participação e aprovação',
                paragraphs: [
                    'Em eventos pagos com aprovação, o participante paga primeiro. Após a confirmação do pagamento, a vaga fica reservada enquanto o anfitrião analisa a inscrição. A aprovação conclui a inscrição e libera o ingresso.',
                    'Se o anfitrião recusar a participação, o valor pago será estornado integralmente. Se o pagamento não for concluído no prazo, a inscrição expira e a próxima pessoa da lista de espera pode ser promovida.',
                ],
            },
            {
                title: 'Pagamentos, saldo e saques',
                paragraphs: [
                    'Pagamentos são processados por provedores contratados pela Wellcome. Taxas, valor líquido e condições aplicáveis são apresentados nos fluxos financeiros.',
                    'O saldo do anfitrião permanece retido até 24 horas após o término do evento e pode sofrer ajustes por cancelamento, reembolso, estorno, chargeback ou suspeita de fraude. Saques dependem de KYC aprovado, chave Pix válida, saldo disponível e valor mínimo mostrado na carteira.',
                ],
            },
            {
                title: 'Cancelamentos e reembolsos',
                paragraphs: [
                    'Cancelamentos e reembolsos seguem as regras exibidas no evento, a legislação aplicável e a situação real do pagamento. O histórico financeiro é preservado para auditoria e suporte.',
                    'Valores pagos fora da Wellcome não são processados nem controlados pela plataforma e, por isso, não recebem a Proteção Wellcome.',
                ],
            },
            {
                title: 'Responsabilidades',
                paragraphs: [
                    'O anfitrião deve publicar informações verdadeiras, cumprir as condições anunciadas e observar normas sanitárias, fiscais e de segurança. Depois da primeira venda, preço, data, local, capacidade e outras condições essenciais ficam protegidos contra alterações.',
                    'Participantes devem respeitar as regras do evento e a comunidade. Fraude, assédio, discriminação, violência ou tentativa de burlar a plataforma podem resultar em bloqueio da conta e outras medidas cabíveis.',
                ],
            },
            {
                title: 'Contato',
                paragraphs: [
                    'Para suporte, privacidade, exclusão de conta ou dúvidas sobre estas regras, escreva para oi@wellcome.app.',
                ],
            },
        ],
    },
    privacy: {
        eyebrow: 'POLÍTICA DE PRIVACIDADE',
        title: 'Como a Wellcome trata seus dados.',
        updatedAt: '23 de agosto de 2026',
        introduction: 'Tratamos somente os dados necessários para operar eventos, proteger a comunidade, processar pagamentos e cumprir obrigações legais.',
        sections: [
            {
                title: 'Dados tratados',
                paragraphs: ['Podemos tratar dados de conta e contato, perfil, eventos e inscrições, localização informada, mensagens operacionais, registros de acesso, dados de cobrança e informações de verificação de identidade.'],
                bullets: [
                    'Fotos de documento e selfie podem ser usadas na verificação de identidade.',
                    'Dados completos de cartão são processados pelo provedor de pagamento e não devem ser armazenados pela Wellcome.',
                    'Registros técnicos podem ser usados para segurança, prevenção a fraude e suporte.',
                ],
            },
            {
                title: 'Finalidades e bases',
                paragraphs: [
                    'Usamos os dados para executar o serviço solicitado, cumprir obrigações legais, prevenir fraude, exercer direitos e, quando necessário, com seu consentimento.',
                    'Podemos compartilhar dados estritamente necessários com fornecedores de infraestrutura, identidade, armazenamento, comunicação e pagamentos, incluindo Supabase, AWS e Asaas, sujeitos às regras aplicáveis.',
                ],
            },
            {
                title: 'Retenção e segurança',
                paragraphs: [
                    'Mantemos os dados pelo período necessário às finalidades informadas e aos prazos legais, regulatórios, antifraude, de auditoria ou defesa de direitos. Depois disso, eles são excluídos ou anonimizados quando aplicável.',
                    'Adotamos controles de acesso, autenticação e registro de operações. Nenhum sistema é totalmente imune a riscos; por isso, incidentes relevantes serão tratados conforme a legislação.',
                ],
            },
            {
                title: 'Seus direitos',
                paragraphs: [
                    'Você pode solicitar confirmação do tratamento, acesso, correção, informação sobre compartilhamento, revisão, portabilidade quando aplicável, revogação de consentimento e exclusão, respeitadas as hipóteses legais de conservação.',
                    'Envie sua solicitação para oi@wellcome.app ou use a opção de exclusão de conta nas configurações.',
                ],
            },
        ],
    },
    protection: {
        eyebrow: 'PROTEÇÃO WELLCOME',
        title: 'Mais segurança quando tudo acontece no app.',
        updatedAt: '23 de agosto de 2026',
        introduction: 'A Proteção Wellcome reúne controles financeiros e operacionais que só funcionam quando inscrição e pagamento são feitos dentro da plataforma.',
        sections: [
            {
                title: 'O que você recebe',
                paragraphs: [],
                bullets: [
                    'Aprovação do anfitrião antes do pagamento em eventos moderados.',
                    'Registro verificável do pagamento, cancelamento e eventual reembolso.',
                    'Saldo do anfitrião retido até 24 horas após o evento.',
                    'Expiração automática de vagas não pagas e promoção por ordem da lista de espera.',
                    'Suporte com histórico da transação e das decisões tomadas no app.',
                ],
            },
            {
                title: 'Para anfitriões',
                paragraphs: [
                    'A plataforma organiza inscrições pendentes, aprovadas e pagas, reduz conflitos de capacidade e mostra o saldo disponível, retido e o mínimo necessário para saque.',
                    'Condições essenciais do evento ficam protegidas depois da primeira venda, preservando o acordo feito com os participantes.',
                ],
            },
            {
                title: 'Pagamentos por fora',
                paragraphs: [
                    'Transferências, dinheiro ou cobranças combinadas fora do Wellcome não possuem registro financeiro na plataforma. Nesses casos, não conseguimos confirmar o pagamento, executar reembolso, analisar disputa ou aplicar a retenção de saldo.',
                    'Se alguém solicitar pagamento por fora, não pague e entre em contato pelo e-mail oi@wellcome.app.',
                ],
            },
        ],
    },
};

export function isLegalDocumentKey(value: string): value is LegalDocumentKey {
    return value === 'terms' || value === 'privacy' || value === 'protection';
}
