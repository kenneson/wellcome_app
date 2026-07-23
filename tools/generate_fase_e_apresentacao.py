"""Gera o relatorio de fase e a apresentacao corporativa (docs/)."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Sequence, Tuple

sys.path.insert(0, str(Path(__file__).parent))

import generate_store_release_pdf as base
from generate_store_release_pdf import (
    DARK,
    LIGHT,
    LINE,
    MARGIN_X,
    MID,
    ORANGE,
    PALE_BLUE,
    PALE_GREEN,
    PALE_ORANGE,
    SimplePDF,
    bullet_list,
    draw_footer,
    draw_header,
    wrap_text,
)

DATE_LABEL = "02/07/2026"


def stat_card(pdf: SimplePDF, x: float, y: float, w: float, label: str, value: str,
              fill, stroke, label_color, value_size: float = 17) -> None:
    pdf.rect(x, y, w, 78, fill=fill, stroke=stroke, line_width=0.5)
    pdf.text(x + 14, y + 24, label, size=9, font="F2", color=label_color)
    pdf.text(x + 14, y + 52, value, size=value_size, font="F2", color=DARK)


def table(pdf: SimplePDF, y: float, headers: Sequence[str], col_w: Sequence[float],
          rows: Sequence[Tuple[str, ...]], highlight_rows: int = 0,
          row_h: float = 42, size: float = 8.4, x: float = MARGIN_X) -> float:
    pdf.rect(x, y, sum(col_w), 24, fill=DARK)
    cx = x
    for i, header in enumerate(headers):
        pdf.text(cx + 7, y + 16, header, size=8.6, font="F2", color=(1, 1, 1))
        cx += col_w[i]
    y += 24
    for idx, row in enumerate(rows):
        fill = PALE_ORANGE if idx < highlight_rows else (1, 1, 1)
        pdf.rect(x, y, sum(col_w), row_h, fill=fill, stroke=LINE, line_width=0.4)
        cx = x
        for i, cell in enumerate(row):
            lines = wrap_text(cell, col_w[i] - 12, size)
            ty = y + 14
            for line in lines[:4]:
                color = ORANGE if cell == "Alta" else DARK
                pdf.text(cx + 6, ty, line, size=size,
                         font="F2" if i == 0 or cell in ("Alta", "Media") else "F1", color=color)
                ty += size + 1.8
            cx += col_w[i]
            if i < len(row) - 1:
                pdf.line(cx, y, cx, y + row_h, color=LINE, width=0.35)
        y += row_h
    return y


# ---------------------------------------------------------------- relatorio

def build_report(output_path: Path) -> None:
    pdf = SimplePDF()
    content_w = base.PAGE_W - 2 * MARGIN_X

    # Pagina 1 - capa e leitura executiva
    pdf.add_page()
    pdf.rect(0, 0, base.PAGE_W, 165, fill=DARK)
    pdf.text(MARGIN_X, 58, "RELATÓRIO DE FASE", size=11, font="F2", color=ORANGE)
    pdf.text(MARGIN_X, 88, "Wellcome: situação atual do projeto", size=26, font="F2", color=(1, 1, 1))
    pdf.text(MARGIN_X, 116, "O que está pronto e o que falta para a primeira versão nas lojas", size=12, color=(0.88, 0.88, 0.88))
    pdf.text(MARGIN_X, 145, f"Preparado em {DATE_LABEL} · atualiza o relatório de 29/04/2026", size=8.5, color=(0.74, 0.74, 0.74))

    stat_card(pdf, MARGIN_X, 192, 156, "Fase atual", "Pré-lançamento", PALE_ORANGE, (1.0, 0.78, 0.65), ORANGE, 15)
    stat_card(pdf, MARGIN_X + 172, 192, 156, "Prontidão para loja", "~65%", PALE_BLUE, (0.74, 0.84, 0.95), (0.12, 0.36, 0.68), 20)
    stat_card(pdf, MARGIN_X + 344, 192, 156, "Esforço restante", "3 a 5 semanas", PALE_GREEN, (0.70, 0.86, 0.72), (0.12, 0.48, 0.22), 15)

    y = 315
    pdf.text(MARGIN_X, y, "Leitura executiva", size=15, font="F2", color=DARK)
    y += 22
    y = pdf.paragraph(
        MARGIN_X, y,
        "O produto está funcionalmente completo: cadastro e login, criação e descoberta de eventos, inscrições com "
        "pagamento PIX, ingressos com QR code e check-in, avaliações, notificações, carteira com saques, verificação "
        "de identidade (KYC) e painel administrativo. Desde o último relatório, a principal evolução foi o "
        "endurecimento de segurança do backend. O trabalho restante não é desenvolvimento de funcionalidades: é a "
        "camada de conformidade legal, moderação e materiais de loja exigida por Apple e Google.",
        content_w, size=10.2, line_height=14.2, color=DARK,
    )

    y += 24
    pdf.text(MARGIN_X, y, "O que mudou desde 29/04/2026", size=15, font="F2", color=DARK)
    y += 20
    y = bullet_list(pdf, MARGIN_X, y, [
        "Todas as rotas do backend passaram a exigir token de sessão válido: o servidor não confia mais em identidades enviadas pelo aplicativo.",
        "Verificação de propriedade adicionada em eventos, inscrições, ingressos, saques, avaliações e notificações: cada usuário só altera o que é dele.",
        "Papel de administrador criado no banco e exigido nas rotas administrativas; painel admin ganhou tela de login própria.",
        "Chave privilegiada (service role) removida do painel administrativo: o navegador só usa a chave pública.",
        "Certificado PIX retirado do repositório de código.",
    ], content_w, size=9.4)

    y += 14
    pdf.rect(MARGIN_X, y, content_w, 58, fill=LIGHT, stroke=LINE, line_width=0.4)
    pdf.text(MARGIN_X + 16, y + 20, "Ponto de atenção", size=10, font="F2", color=ORANGE)
    pdf.paragraph(
        MARGIN_X + 16, y + 38,
        "O projeto está sem alterações desde 29/04/2026 (cerca de 2 meses). O prazo de 3 a 5 semanas conta a partir da retomada do trabalho, não a partir de hoje.",
        content_w - 32, size=9, line_height=12, color=MID,
    )
    draw_footer(pdf)

    # Pagina 2 - estado do produto
    pdf.add_page()
    draw_header(pdf, "Estado do produto", 2)
    y = 84
    pdf.text(MARGIN_X, y, "Funcionalidades entregues", size=18, font="F2", color=DARK)
    y += 30

    col_w2 = content_w / 2 - 10
    pdf.text(MARGIN_X, y, "Aplicativo (Android e iOS)", size=11, font="F2", color=ORANGE)
    y_left = bullet_list(pdf, MARGIN_X, y + 18, [
        "Cadastro e login com e-mail e Google.",
        "Criação de eventos em etapas: detalhes, cardápio, local e configurações.",
        "Descoberta de eventos, inscrição e pagamento via PIX.",
        "Ingresso com QR code e scanner de check-in para o anfitrião.",
        "Avaliações de eventos, notificações push e perfil público.",
        "Carteira do anfitrião com chave PIX e saques.",
        "Verificação de identidade (KYC) com documento e selfie.",
        "Exclusão de conta dentro do aplicativo.",
    ], col_w2, size=9)

    x2 = MARGIN_X + content_w / 2 + 10
    pdf.text(x2, y, "Plataforma e operação", size=11, font="F2", color=ORANGE)
    y_right = bullet_list(pdf, x2, y + 18, [
        "Backend próprio (Node/Fastify) com autenticação e controle de acesso por papel.",
        "Pagamentos e saques PIX integrados ao provedor Efí, com webhooks.",
        "Painel administrativo web com login, aprovação de KYC e gestão financeira.",
        "Banco e autenticação no Supabase; armazenamento de imagens e documentos.",
        "Builds de produção configurados no Expo/EAS para as duas lojas.",
        "Ícones, splash screen e textos de permissão (câmera, fotos, localização, notificações) prontos.",
    ], col_w2, size=9)

    y = max(y_left, y_right) + 20
    pdf.text(MARGIN_X, y, "Qualidade e verificação", size=15, font="F2", color=DARK)
    y += 20
    y = bullet_list(pdf, MARGIN_X, y, [
        "Análise estática do código do app: aprovada (apenas avisos).",
        "Compilação do backend: aprovada.",
        "Testes automatizados do backend: aprovados.",
        "Pendente: rodada de testes em celulares reais cobrindo push, KYC, upload de imagens, PIX e exclusão de conta.",
    ], content_w, size=9.4)
    draw_footer(pdf)

    # Pagina 3 - pendencias, riscos e cronograma
    pdf.add_page()
    draw_header(pdf, "Pendências e cronograma", 3)
    y = 84
    pdf.text(MARGIN_X, y, "O que falta para submeter às lojas", size=18, font="F2", color=DARK)
    y += 26
    y = table(
        pdf, y,
        headers=["#", "Pendência", "Prior.", "Por que importa"],
        col_w=[28, 165, 48, 260],
        highlight_rows=6,
        row_h=44,
        size=8.2,
        rows=[
            ("1", "Política de Privacidade pública", "Alta", "Obrigatória nas duas lojas; precisa cobrir KYC, fotos, localização, pagamentos, push e exclusão de dados."),
            ("2", "Termos de Uso públicos", "Alta", "Definem regras para anfitriões e convidados: cancelamentos, taxas, PIX, responsabilidades e conduta."),
            ("3", "Página web de exclusão de conta", "Alta", "O Google exige canal fora do app. A tela interna já existe; falta a URL pública."),
            ("4", "Denúncia e bloqueio de conteúdo", "Alta", "Eventos, perfis e avaliações são conteúdo de usuários; as lojas exigem moderação e resposta a abuso."),
            ("5", "Sign in with Apple no iOS", "Alta", "Como existe login Google, a Apple exige uma opção equivalente de login (diretriz 4.8)."),
            ("6", "Contas de desenvolvedor", "Alta", "Google Play (US$ 25, única) e Apple Developer (US$ 99/ano) em nome da empresa."),
            ("7", "Materiais de loja", "Media", "Descrições, screenshots reais, formulários de privacidade de dados e notas para o revisor com conta de teste."),
            ("8", "Ambiente de produção validado", "Media", "Backend, Supabase, PIX e push estáveis e com variáveis de produção conferidas durante a revisão."),
            ("9", "Beta fechado no Google", "Media", "Contas pessoais novas exigem 12 testadores por 14 dias antes da produção; conta empresarial dispensa."),
        ],
    )

    y += 18
    pdf.text(MARGIN_X, y, "Cronograma proposto (a partir da retomada)", size=13, font="F2", color=DARK)
    y += 20
    y = bullet_list(pdf, MARGIN_X, y, [
        "Semana 1: criar contas de desenvolvedor, publicar política de privacidade, termos e página de exclusão.",
        "Semana 2: implementar denúncia/bloqueio e Sign in with Apple.",
        "Semana 3: ambiente de produção, builds finais e testes em celulares reais; screenshots e textos das lojas.",
        "Semanas 4-5: beta fechado (se necessário), envio para revisão e correções de eventuais reprovações.",
    ], content_w, size=9.2)

    y += 8
    pdf.rect(MARGIN_X, y, content_w, 92, fill=PALE_GREEN, stroke=(0.70, 0.86, 0.72), line_width=0.5)
    pdf.text(MARGIN_X + 16, y + 22, "Conclusão", size=11, font="F2", color=(0.12, 0.48, 0.22))
    pdf.paragraph(
        MARGIN_X + 16, y + 40,
        "O aplicativo está pronto como produto. Publicar a primeira versão é um projeto curto de conformidade e operação: 3 a 5 semanas de trabalho e cerca de R$ 620 de custos obrigatórios no primeiro ano. Apoios opcionais: design das novas páginas web (R$ 800 a 2.500, pontual) e Claude Code Pro (US$ 20/mês) para acelerar o desenvolvimento.",
        content_w - 32, size=9.2, line_height=12.5, color=DARK,
    )
    draw_footer(pdf)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdf.save(output_path)


# ------------------------------------------------------------ apresentacao

SLIDE_W = base.PAGE_H  # paisagem
SLIDE_H = base.PAGE_W
SLIDE_MX = 56


def slide_base(pdf: SimplePDF, kicker: str, title: str, page_no: int) -> float:
    pdf.add_page()
    pdf.rect(0, 0, SLIDE_W, SLIDE_H, fill=(1, 1, 1))
    pdf.rect(0, 0, SLIDE_W, 6, fill=ORANGE)
    pdf.text(SLIDE_MX, 52, kicker.upper(), size=10, font="F2", color=ORANGE)
    pdf.text(SLIDE_MX, 86, title, size=24, font="F2", color=DARK)
    pdf.line(SLIDE_MX, 104, SLIDE_W - SLIDE_MX, 104, color=LINE, width=0.6)
    pdf.text(SLIDE_W - 150, SLIDE_H - 24, f"Wellcome · {page_no}", size=8, color=MID)
    return 136


def build_deck(output_path: Path) -> None:
    pdf = SimplePDF()
    content_w = SLIDE_W - 2 * SLIDE_MX

    # Slide 1 - capa
    pdf.add_page()
    pdf.rect(0, 0, SLIDE_W, SLIDE_H, fill=DARK)
    pdf.rect(0, SLIDE_H - 10, SLIDE_W, 10, fill=ORANGE)
    pdf.text(SLIDE_MX, 200, "APRESENTAÇÃO EXECUTIVA", size=12, font="F2", color=ORANGE)
    pdf.text(SLIDE_MX, 250, "Wellcome", size=44, font="F2", color=(1, 1, 1))
    pdf.text(SLIDE_MX, 290, "O caminho para a primeira versão nas lojas oficiais", size=16, color=(0.88, 0.88, 0.88))
    pdf.text(SLIDE_MX, 340, f"Preparado para os fundadores · {DATE_LABEL}", size=10, color=(0.72, 0.72, 0.72))

    # Slide 2 - onde estamos
    y = slide_base(pdf, "Situação", "Onde o projeto está hoje", 2)
    card_w = (content_w - 40) / 3
    stat_card(pdf, SLIDE_MX, y, card_w, "Fase atual", "Pré-lançamento", PALE_ORANGE, (1.0, 0.78, 0.65), ORANGE, 16)
    stat_card(pdf, SLIDE_MX + card_w + 20, y, card_w, "Prontidão para loja", "~65%", PALE_BLUE, (0.74, 0.84, 0.95), (0.12, 0.36, 0.68), 20)
    stat_card(pdf, SLIDE_MX + 2 * (card_w + 20), y, card_w, "Esforço restante", "3 a 5 semanas", PALE_GREEN, (0.70, 0.86, 0.72), (0.12, 0.48, 0.22), 16)
    y += 108
    y = pdf.paragraph(
        SLIDE_MX, y,
        "O aplicativo está funcionalmente completo e a segurança do servidor foi reforçada. O que separa o projeto "
        "das lojas não é desenvolvimento de produto: são exigências legais e de conformidade da Apple e do Google, "
        "materiais de divulgação e a validação final em celulares reais.",
        content_w, size=12, line_height=17, color=DARK,
    )
    y += 16
    pdf.rect(SLIDE_MX, y, content_w, 54, fill=LIGHT, stroke=LINE, line_width=0.4)
    pdf.text(SLIDE_MX + 16, y + 21, "Ponto de atenção", size=10, font="F2", color=ORANGE)
    pdf.paragraph(
        SLIDE_MX + 16, y + 38,
        "O projeto está pausado desde 29/04/2026. O prazo de 3 a 5 semanas vale a partir da retomada.",
        content_w - 32, size=10, line_height=13, color=MID,
    )

    # Slide 3 - o que ja esta construido
    y = slide_base(pdf, "Produto", "O que já está construído", 3)
    col_w = content_w / 2 - 16
    pdf.text(SLIDE_MX, y, "Experiência do usuário", size=12, font="F2", color=ORANGE)
    bullet_list(pdf, SLIDE_MX, y + 20, [
        "Cadastro e login (e-mail e Google).",
        "Criação de eventos gastronômicos com cardápio, local e vagas.",
        "Inscrição e pagamento via PIX.",
        "Ingresso com QR code e check-in pelo anfitrião.",
        "Avaliações, notificações e perfis.",
        "Carteira do anfitrião com saques PIX.",
        "Verificação de identidade (KYC) com documento e selfie.",
    ], col_w, size=10.5)
    x2 = SLIDE_MX + content_w / 2 + 16
    pdf.text(x2, y, "Bastidores e operação", size=12, font="F2", color=ORANGE)
    bullet_list(pdf, x2, y + 20, [
        "Servidor próprio com autenticação e controle de acesso reforçados.",
        "Painel administrativo com aprovação de KYC e gestão financeira.",
        "Integração PIX (Efí) para cobranças e repasses.",
        "Infraestrutura de dados e login no Supabase.",
        "Builds de publicação configurados para as duas lojas.",
        "Testes automatizados do servidor aprovados.",
    ], col_w, size=10.5)

    # Slide 4 - o que falta
    y = slide_base(pdf, "Pendências", "O que falta para lançar", 4)
    table(
        pdf, y,
        headers=["Bloqueadores de submissão (prioridade alta)", "Responsável típico"],
        col_w=[content_w * 0.68, content_w * 0.32],
        highlight_rows=6,
        row_h=34,
        size=10,
        x=SLIDE_MX,
        rows=[
            ("Política de Privacidade publicada na web", "Jurídico + dev"),
            ("Termos de Uso publicados na web", "Jurídico + dev"),
            ("Página pública para exclusão de conta (exigência Google)", "Dev"),
            ("Denúncia e bloqueio de conteúdo no app", "Dev"),
            ("Sign in with Apple no iOS (exigência Apple)", "Dev"),
            ("Contas Google Play e Apple Developer em nome da empresa", "Fundadores"),
            ("Materiais de loja: descrições, screenshots, conta de teste", "Dev + design"),
            ("Validação em celulares reais: PIX, KYC, push, exclusão", "Dev + QA"),
        ],
    )

    # Slide 5 - investimento
    y = slide_base(pdf, "Investimento", "Quanto custa publicar", 5)
    boxes = [
        ("Obrigatório", "~R$ 620 no 1º ano", [
            "Google Play: US$ 25 (pagamento único).",
            "Apple Developer: US$ 99 por ano.",
            "Domínio e páginas legais: ~R$ 40/ano.",
        ], PALE_ORANGE),
        ("Recomendado (mensal)", "US$ 20 a 64/mês", [
            "Claude Code (plano Pro, US$ 20/mês) como apoio de IA no desenvolvimento.",
            "Supabase Pro e/ou Expo Starter (US$ 0 a 44/mês).",
            "Reduz risco de indisponibilidade e acelera as pendências técnicas.",
        ], PALE_BLUE),
        ("Pontual (opcional)", "R$ 3.100 a 10.500", [
            "Design das novas páginas web: privacidade, termos e exclusão de conta (R$ 800 a 2.500).",
            "Apoio jurídico para política e termos.",
            "Design profissional de screenshots e revisão final de QA.",
        ], PALE_GREEN),
    ]
    box_w = (content_w - 40) / 3
    for i, (title, cost, bullets, fill) in enumerate(boxes):
        bx = SLIDE_MX + i * (box_w + 20)
        pdf.rect(bx, y, box_w, 190, fill=fill, stroke=LINE, line_width=0.5)
        pdf.text(bx + 14, y + 24, title, size=11, font="F2", color=DARK)
        pdf.text(bx + 14, y + 46, cost, size=13, font="F2", color=ORANGE)
        bullet_list(pdf, bx + 14, y + 68, bullets, box_w - 28, size=8.8)
    y += 210
    pdf.paragraph(
        SLIDE_MX, y,
        "Fora deste orçamento: marketing, impostos, taxas por transação PIX e custos de escala após tração.",
        content_w, size=9.5, line_height=13, color=MID,
    )

    # Slide 6 - cronograma
    y = slide_base(pdf, "Plano", "Cronograma proposto", 6)
    steps = [
        ("Semana 1", "Contas de desenvolvedor + política de privacidade, termos e página de exclusão publicadas."),
        ("Semana 2", "Denúncia/bloqueio de conteúdo e Sign in with Apple implementados."),
        ("Semana 3", "Ambiente de produção, builds finais, testes em celulares reais e materiais de loja."),
        ("Semanas 4-5", "Beta fechado (se necessário), envio para revisão das lojas e correções."),
    ]
    for label, desc in steps:
        pdf.rect(SLIDE_MX, y, 110, 54, fill=ORANGE)
        pdf.text(SLIDE_MX + 12, y + 32, label, size=11, font="F2", color=(1, 1, 1))
        pdf.rect(SLIDE_MX + 110, y, content_w - 110, 54, fill=(0.99, 0.99, 0.99), stroke=LINE, line_width=0.4)
        pdf.paragraph(SLIDE_MX + 126, y + 24, desc, content_w - 150, size=10.5, line_height=14, color=DARK)
        y += 66

    # Slide 7 - decisoes dos fundadores
    y = slide_base(pdf, "Próximos passos", "Decisões que precisamos de vocês", 7)
    decisions = [
        ("1. Orçamento", "Aprovar o custo obrigatório (~R$ 620/ano) e escolher o cenário: mínimo, recomendado ou profissional."),
        ("2. Titularidade das contas", "Definir se as contas Apple/Google ficam no CNPJ ou em pessoa física. Conta pessoal nova no Google exige beta com 12 testadores por 14 dias."),
        ("3. Textos legais", "Decidir se política de privacidade e termos serão feitos com apoio jurídico ou a partir de modelos revisados internamente."),
        ("4. Data-alvo", "Fixar a data de retomada do desenvolvimento; a partir dela, o lançamento fica a 3-5 semanas."),
    ]
    for title, desc in decisions:
        pdf.text(SLIDE_MX, y, title, size=12.5, font="F2", color=ORANGE)
        y = pdf.paragraph(SLIDE_MX, y + 18, desc, content_w, size=10.5, line_height=14, color=DARK)
        y += 18
    y += 6
    pdf.rect(SLIDE_MX, y, content_w, 58, fill=PALE_GREEN, stroke=(0.70, 0.86, 0.72), line_width=0.5)
    pdf.text(SLIDE_MX + 16, y + 23, "Mensagem final", size=10, font="F2", color=(0.12, 0.48, 0.22))
    pdf.paragraph(
        SLIDE_MX + 16, y + 41,
        "O produto está pronto. Com as decisões acima tomadas, a primeira versão do Wellcome chega às lojas em 3 a 5 semanas de trabalho.",
        content_w - 32, size=10, line_height=13, color=DARK,
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdf.save(output_path)


if __name__ == "__main__":
    build_report(Path("docs/relatorio-fase-atual.pdf"))
    # paisagem para os slides; SimplePDF le as dimensoes do modulo na hora de desenhar/salvar
    base.PAGE_W, base.PAGE_H = SLIDE_W, SLIDE_H
    build_deck(Path("docs/apresentacao-lancamento-fundadores.pdf"))
    print("ok")
