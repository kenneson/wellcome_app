from __future__ import annotations

from pathlib import Path
from typing import Iterable, List, Sequence, Tuple


PAGE_W = 595.28
PAGE_H = 841.89
MARGIN_X = 48

ORANGE = (1.0, 0.42, 0.16)
DARK = (0.10, 0.11, 0.13)
MID = (0.33, 0.36, 0.40)
LIGHT = (0.96, 0.94, 0.91)
PALE_ORANGE = (1.0, 0.93, 0.88)
PALE_GREEN = (0.90, 0.97, 0.93)
PALE_BLUE = (0.90, 0.95, 1.0)
LINE = (0.84, 0.84, 0.84)


def _pdf_num(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".")


def _escape_pdf_text(text: str) -> bytes:
    data = text.encode("cp1252", errors="replace")
    data = data.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")
    return data


def _rgb(color: Tuple[float, float, float]) -> str:
    return " ".join(_pdf_num(c) for c in color)


class SimplePDF:
    def __init__(self) -> None:
        self.pages: List[bytearray] = []
        self.current: bytearray | None = None

    def add_page(self) -> None:
        self.current = bytearray()
        self.pages.append(self.current)

    def _write(self, command: bytes | str) -> None:
        if self.current is None:
            self.add_page()
        assert self.current is not None
        if isinstance(command, str):
            command = command.encode("ascii")
        self.current.extend(command)

    def rect(
        self,
        x: float,
        y_top: float,
        w: float,
        h: float,
        fill: Tuple[float, float, float] | None = None,
        stroke: Tuple[float, float, float] | None = None,
        line_width: float = 1,
    ) -> None:
        y = PAGE_H - y_top - h
        self._write("q\n")
        self._write(f"{_pdf_num(line_width)} w\n")
        if fill:
            self._write(f"{_rgb(fill)} rg\n")
        if stroke:
            self._write(f"{_rgb(stroke)} RG\n")
        op = "B" if fill and stroke else ("f" if fill else "S")
        self._write(
            f"{_pdf_num(x)} {_pdf_num(y)} {_pdf_num(w)} {_pdf_num(h)} re {op}\n"
        )
        self._write("Q\n")

    def line(
        self,
        x1: float,
        y1_top: float,
        x2: float,
        y2_top: float,
        color: Tuple[float, float, float] = LINE,
        width: float = 1,
    ) -> None:
        y1 = PAGE_H - y1_top
        y2 = PAGE_H - y2_top
        self._write("q\n")
        self._write(f"{_rgb(color)} RG\n{_pdf_num(width)} w\n")
        self._write(
            f"{_pdf_num(x1)} {_pdf_num(y1)} m {_pdf_num(x2)} {_pdf_num(y2)} l S\n"
        )
        self._write("Q\n")

    def text(
        self,
        x: float,
        y_top: float,
        text: str,
        size: float = 10,
        font: str = "F1",
        color: Tuple[float, float, float] = DARK,
    ) -> None:
        y = PAGE_H - y_top
        safe = _escape_pdf_text(text)
        prefix = (
            f"BT /{font} {_pdf_num(size)} Tf "
            f"{_rgb(color)} rg "
            f"{_pdf_num(x)} {_pdf_num(y)} Td ("
        ).encode("ascii")
        self._write(prefix + safe + b") Tj ET\n")

    def paragraph(
        self,
        x: float,
        y_top: float,
        text: str,
        width: float,
        size: float = 10,
        line_height: float | None = None,
        color: Tuple[float, float, float] = DARK,
        font: str = "F1",
    ) -> float:
        line_height = line_height or size * 1.35
        lines = wrap_text(text, width, size)
        y = y_top
        for line in lines:
            self.text(x, y, line, size=size, font=font, color=color)
            y += line_height
        return y

    def save(self, path: Path) -> None:
        objects: List[bytes] = []

        # 1 catalog, 2 pages, 3 font normal, 4 font bold.
        objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
        kids = " ".join(f"{5 + i * 2} 0 R" for i in range(len(self.pages)))
        objects.append(
            f"<< /Type /Pages /Kids [{kids}] /Count {len(self.pages)} >>".encode("ascii")
        )
        objects.append(
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
        )
        objects.append(
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
        )

        for idx, page in enumerate(self.pages):
            content_obj = 6 + idx * 2
            page_obj = (
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {_pdf_num(PAGE_W)} {_pdf_num(PAGE_H)}] "
                f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {content_obj} 0 R >>"
            )
            objects.append(page_obj.encode("ascii"))
            stream = bytes(page)
            objects.append(
                b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"endstream"
            )

        out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = [0]
        for i, obj in enumerate(objects, start=1):
            offsets.append(len(out))
            out.extend(f"{i} 0 obj\n".encode("ascii"))
            out.extend(obj)
            out.extend(b"\nendobj\n")

        xref_offset = len(out)
        out.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
        out.extend(b"0000000000 65535 f \n")
        for offset in offsets[1:]:
            out.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
        out.extend(
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode(
                "ascii"
            )
        )
        path.write_bytes(out)


def approx_text_width(text: str, size: float) -> float:
    width = 0.0
    for char in text:
        if char in "ilI.,' ":
            width += size * 0.25
        elif char in "mwMW":
            width += size * 0.78
        elif char.isupper():
            width += size * 0.58
        else:
            width += size * 0.49
    return width


def wrap_text(text: str, width: float, size: float) -> List[str]:
    result: List[str] = []
    for raw_line in text.split("\n"):
        words = raw_line.split()
        if not words:
            result.append("")
            continue
        line = words[0]
        for word in words[1:]:
            candidate = f"{line} {word}"
            if approx_text_width(candidate, size) <= width:
                line = candidate
            else:
                result.append(line)
                line = word
        result.append(line)
    return result


def money_table(pdf: SimplePDF, y: float) -> float:
    rows = [
        ("Conta Google Play", "US$ 25", "Uma vez", "Obrigatório para publicar Android."),
        ("Conta Apple Developer", "US$ 99", "Por ano", "Obrigatório para publicar iOS."),
        ("Expo/EAS", "US$ 0 a US$ 19/mês", "Mensal", "Plano gratuito pode bastar no começo; Starter acelera builds."),
        ("Supabase produção", "US$ 0 a US$ 25/mês", "Mensal", "Free no beta; Pro recomendado para lançamento público."),
        ("VPS Hostinger", "R$ 43,99/mês", "Mensal", "Servidor inicial previsto para hospedar a API/backend."),
        ("Domínio e páginas legais", "R$ 40/ano", "Anual", "Páginas públicas para privacidade, termos, suporte e exclusão de conta."),
    ]
    x = MARGIN_X
    col_w = [150, 105, 75, 205]
    headers = ["Item", "Valor estimado", "Recorrência", "Observação"]
    pdf.rect(x, y, sum(col_w), 24, fill=ORANGE)
    cx = x
    for i, header in enumerate(headers):
        pdf.text(cx + 8, y + 16, header, size=8.7, font="F2", color=(1, 1, 1))
        cx += col_w[i]
    y += 24
    for idx, row in enumerate(rows):
        fill = (0.99, 0.99, 0.99) if idx % 2 else (1, 1, 1)
        row_h = 35
        pdf.rect(x, y, sum(col_w), row_h, fill=fill, stroke=LINE, line_width=0.4)
        cx = x
        for i, cell in enumerate(row):
            lines = wrap_text(cell, col_w[i] - 14, 8.6)
            ty = y + 14
            for line in lines[:3]:
                pdf.text(cx + 7, ty, line, size=8.6, color=DARK if i != 1 else ORANGE, font="F2" if i == 1 else "F1")
                ty += 10.5
            cx += col_w[i]
            if i < len(row) - 1:
                pdf.line(cx, y, cx, y + row_h, color=LINE, width=0.35)
        y += row_h
    return y


def step_table(pdf: SimplePDF, y: float) -> float:
    rows = [
        ("1", "Publicar Política de Privacidade", "Alta", "Obrigatório nas duas lojas; precisa cobrir KYC, fotos, localização, pagamentos, push e exclusão de dados."),
        ("2", "Publicar Termos de Uso", "Alta", "Define regras para anfitriões, convidados, conteúdo, cancelamentos, segurança, PIX, taxas e responsabilidades."),
        ("3", "Criar página web de exclusão de conta", "Alta", "Google exige canal fora do app para pedir exclusão. O app já tem tela interna; falta URL pública."),
        ("4", "Adicionar denúncia e bloqueio", "Alta", "Eventos, perfis, fotos e avaliações são conteúdo de usuários. As lojas pedem moderação e resposta a abuso."),
        ("5", "Adicionar Sign in with Apple no iOS", "Alta", "Como existe login Google, a Apple pode exigir opção equivalente de login com privacidade."),
        ("6", "Fechar vazamentos e permissões do backend", "Alta", "Evitar exposição de telefone, email, token push e dados de reservas em telas públicas."),
        ("7", "Preparar ambiente de produção", "Média", "Backend, Supabase, KYC, push, storage e PIX precisam estar online e estáveis durante a revisão."),
        ("8", "Preparar materiais das lojas", "Média", "Descrição, screenshots reais, ícone, imagem promocional Google, suporte, categoria, idade e notas para reviewer."),
        ("9", "Executar beta fechado", "Média", "No Google, contas pessoais novas podem exigir 12 testers por 14 dias antes da produção."),
    ]
    x = MARGIN_X
    col_w = [28, 165, 48, 260]
    headers = ["#", "Pendência", "Prior.", "Por que importa"]
    pdf.rect(x, y, sum(col_w), 24, fill=DARK)
    cx = x
    for i, header in enumerate(headers):
        pdf.text(cx + 7, y + 16, header, size=8.6, font="F2", color=(1, 1, 1))
        cx += col_w[i]
    y += 24
    for idx, row in enumerate(rows):
        row_h = 46
        fill = PALE_ORANGE if idx < 6 else (1, 1, 1)
        pdf.rect(x, y, sum(col_w), row_h, fill=fill, stroke=LINE, line_width=0.4)
        cx = x
        for i, cell in enumerate(row):
            lines = wrap_text(cell, col_w[i] - 12, 8.2)
            ty = y + 14
            for line in lines[:4]:
                color = ORANGE if i == 2 and cell == "Alta" else DARK
                pdf.text(cx + 6, ty, line, size=8.2, font="F2" if i in (0, 2) else "F1", color=color)
                ty += 10
            cx += col_w[i]
            if i < len(row) - 1:
                pdf.line(cx, y, cx, y + row_h, color=LINE, width=0.35)
        y += row_h
    return y


def draw_header(pdf: SimplePDF, title: str, page_no: int) -> None:
    pdf.rect(0, 0, PAGE_W, 54, fill=DARK)
    pdf.text(MARGIN_X, 34, "Wellcome", size=15, font="F2", color=(1, 1, 1))
    pdf.text(130, 34, title, size=9.5, color=(0.88, 0.88, 0.88))
    pdf.text(PAGE_W - 78, 34, f"Página {page_no}", size=8.5, color=(0.78, 0.78, 0.78))


def draw_footer(pdf: SimplePDF) -> None:
    pdf.line(MARGIN_X, 805, PAGE_W - MARGIN_X, 805, color=LINE, width=0.5)
    pdf.text(MARGIN_X, 820, "Documento executivo para planejamento de publicação. Valores em USD/BRL são estimativas e podem variar.", size=7.2, color=MID)


def bullet_list(pdf: SimplePDF, x: float, y: float, items: Sequence[str], width: float, size: float = 9.2) -> float:
    for item in items:
        pdf.text(x, y, "-", size=size, font="F2", color=ORANGE)
        y = pdf.paragraph(x + 12, y, item, width - 12, size=size, line_height=size * 1.32, color=DARK)
        y += 5
    return y


def build_pdf(output_path: Path) -> None:
    pdf = SimplePDF()

    # Page 1
    pdf.add_page()
    pdf.rect(0, 0, PAGE_W, 165, fill=DARK)
    pdf.text(MARGIN_X, 58, "RELATÓRIO EXECUTIVO", size=11, font="F2", color=ORANGE)
    pdf.text(MARGIN_X, 88, "Publicação do Wellcome nas lojas", size=27, font="F2", color=(1, 1, 1))
    pdf.text(MARGIN_X, 116, "Passos, custos e riscos restantes para Play Store e App Store", size=12, color=(0.88, 0.88, 0.88))
    pdf.text(MARGIN_X, 145, "Preparado em 29/04/2026", size=8.5, color=(0.74, 0.74, 0.74))

    pdf.rect(MARGIN_X, 192, 156, 78, fill=PALE_ORANGE, stroke=(1.0, 0.78, 0.65), line_width=0.5)
    pdf.text(MARGIN_X + 14, 218, "Status atual", size=9, font="F2", color=ORANGE)
    pdf.text(MARGIN_X + 14, 246, "Beta avançado", size=18, font="F2", color=DARK)

    pdf.rect(MARGIN_X + 172, 192, 156, 78, fill=PALE_BLUE, stroke=(0.74, 0.84, 0.95), line_width=0.5)
    pdf.text(MARGIN_X + 186, 218, "Prontidão para loja", size=9, font="F2", color=(0.12, 0.36, 0.68))
    pdf.text(MARGIN_X + 186, 246, "50-60%", size=20, font="F2", color=DARK)

    pdf.rect(MARGIN_X + 344, 192, 156, 78, fill=PALE_GREEN, stroke=(0.70, 0.86, 0.72), line_width=0.5)
    pdf.text(MARGIN_X + 358, 218, "Prazo realista", size=9, font="F2", color=(0.12, 0.48, 0.22))
    pdf.text(MARGIN_X + 358, 246, "3 a 5 semanas", size=17, font="F2", color=DARK)

    y = 315
    pdf.text(MARGIN_X, y, "Leitura executiva", size=15, font="F2", color=DARK)
    y += 22
    summary = (
        "O app já possui uma base forte de produto: login, criação de eventos, KYC, pagamentos PIX, carteira, notificações, "
        "admin e fluxo de anfitrião/convidado. O principal trabalho restante não é criar o app do zero; é preparar a "
        "camada de publicação, conformidade, segurança e operação para reduzir risco de rejeição nas lojas."
    )
    y = pdf.paragraph(MARGIN_X, y, summary, PAGE_W - 2 * MARGIN_X, size=10.2, line_height=14.2, color=DARK)

    y += 28
    pdf.text(MARGIN_X, y, "Custos obrigatórios e operacionais", size=15, font="F2", color=DARK)
    y += 18
    y = money_table(pdf, y)
    y += 18
    pdf.text(MARGIN_X, y, "Observação de câmbio", size=9, font="F2", color=DARK)
    pdf.paragraph(
        MARGIN_X + 102,
        y,
        "Para planejamento rápido, US$ 124 no primeiro ano equivale a aproximadamente R$ 620 usando câmbio arredondado de R$ 5,00/US$. O valor real depende do câmbio e impostos no dia do pagamento.",
        PAGE_W - 2 * MARGIN_X - 102,
        size=8.2,
        line_height=11,
        color=MID,
    )
    draw_footer(pdf)

    # Page 2
    pdf.add_page()
    draw_header(pdf, "Pendências antes da submissão", 2)
    y = 84
    pdf.text(MARGIN_X, y, "O que ainda precisa ser feito", size=18, font="F2", color=DARK)
    y += 26
    pdf.paragraph(
        MARGIN_X,
        y,
        "Abaixo estão os itens que mais influenciam aprovação, confiança do usuário e risco operacional. Eles estão escritos em linguagem de negócio e não em linguagem técnica.",
        PAGE_W - 2 * MARGIN_X,
        size=10,
        line_height=13.5,
        color=MID,
    )
    y += 48
    y = step_table(pdf, y)
    draw_footer(pdf)

    # Page 3
    pdf.add_page()
    draw_header(pdf, "Orçamento e plano de ação", 3)
    y = 84
    pdf.text(MARGIN_X, y, "Cenários de orçamento", size=18, font="F2", color=DARK)
    y += 28

    scenarios = [
        (
            "Mínimo para tentar publicar",
            "US$ 124 no primeiro ano + custos internos",
            [
                "Contas oficiais da Apple e Google.",
                "Usar planos gratuitos quando possível.",
                "Equipe interna produz política, termos, screenshots e testes.",
                "Maior risco de retrabalho se privacidade/moderação não estiverem maduros.",
            ],
            PALE_BLUE,
        ),
        (
            "Recomendado para lançamento controlado",
            "US$ 124 + US$ 25-44/mês + R$ 2.300 a R$ 8.000 pontuais",
            [
                "Supabase Pro e/ou Expo Starter para reduzir risco operacional.",
                "Apoio externo para política/termos, design de screenshots e revisão final.",
                "Mais adequado para uma primeira versão pública com reputação protegida.",
            ],
            PALE_GREEN,
        ),
        (
            "Profissional com folga operacional",
            "US$ 124 + US$ 224+/mês + orçamento dedicado de QA/compliance",
            [
                "Expo Production, Supabase Pro, monitoramento e rotina de QA.",
                "Indicado se houver campanha de lançamento, volume alto ou investimento maior.",
                "Menor risco de indisponibilidade e melhor velocidade de correção pós-lançamento.",
            ],
            PALE_ORANGE,
        ),
    ]

    for title, cost, bullets, fill in scenarios:
        box_h = 130
        pdf.rect(MARGIN_X, y, PAGE_W - 2 * MARGIN_X, box_h, fill=fill, stroke=LINE, line_width=0.5)
        pdf.text(MARGIN_X + 16, y + 22, title, size=12, font="F2", color=DARK)
        pdf.text(MARGIN_X + 16, y + 43, cost, size=11, font="F2", color=ORANGE)
        bullet_list(pdf, MARGIN_X + 16, y + 65, bullets, PAGE_W - 2 * MARGIN_X - 32, size=8.4)
        y += box_h + 14

    y += 4
    pdf.text(MARGIN_X, y, "Plano sugerido", size=15, font="F2", color=DARK)
    y += 22
    plan = [
        "Semana 1: fechar política de privacidade, termos, URL de exclusão e conteúdo das lojas.",
        "Semana 2: implementar denúncia/bloqueio, Sign in with Apple e ajustes de segurança.",
        "Semana 3: ambiente de produção, build EAS, testes em dispositivos reais e screenshots.",
        "Semanas 4-5: teste fechado Google quando aplicável, envio para review e correções de reprovação.",
    ]
    y = bullet_list(pdf, MARGIN_X, y, plan, PAGE_W - 2 * MARGIN_X, size=9.2)

    y += 10
    pdf.rect(MARGIN_X, y, PAGE_W - 2 * MARGIN_X, 70, fill=LIGHT, stroke=LINE, line_width=0.4)
    pdf.text(MARGIN_X + 16, y + 22, "Fora deste orçamento", size=10, font="F2", color=DARK)
    pdf.paragraph(
        MARGIN_X + 16,
        y + 42,
        "Marketing pago, impostos, taxas de adquirência/PIX/EFI, suporte ao cliente, parecer jurídico regulatório detalhado e custos de escala após tração.",
        PAGE_W - 2 * MARGIN_X - 32,
        size=8.8,
        line_height=12,
        color=MID,
    )

    y += 92
    pdf.text(MARGIN_X, y, "Fontes oficiais consultadas", size=9, font="F2", color=DARK)
    sources = [
        "Apple Developer Program: US$ 99/ano.",
        "Google Play Console: US$ 25 uma vez.",
        "Google Play: teste fechado de 12 testers por 14 dias para contas pessoais novas.",
        "Apple/Google: privacidade, exclusão de conta, moderação de conteúdo e regras de pagamento.",
        "Expo e Supabase: planos gratuitos e pagos variam conforme uso.",
    ]
    pdf.paragraph(MARGIN_X, y + 15, " ".join(sources), PAGE_W - 2 * MARGIN_X, size=7.2, line_height=9.5, color=MID)
    draw_footer(pdf)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdf.save(output_path)


if __name__ == "__main__":
    build_pdf(Path("docs/relatorio-publicacao-lojas-ceo.pdf"))
