# Wellcome Landing Design System

## Visual Thesis
Uma campanha clara e solar, com laranja Wellcome usado como sinal de acao, tons de manteiga e argila para a narrativa editorial, tipografia serifada expressiva contra sans direta, espacamento arejado e superficies planas com bordas discretas.

## Interaction Thesis
Transicoes curtas de 160ms com `cubic-bezier(0.2, 0, 0, 1)`, hover de elevacao maxima de 2px e deslocamento lateral de 3px em links, rolagem nativa suave e nenhuma animacao elastica, gradiente decorativo ou movimento que prejudique a leitura.

## Color Tokens

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#281914` | Titulos, botoes e secoes de contraste |
| Ink soft | `#5E4A41` | Texto corrido |
| Paper | `#FFF8F3` | Fundo principal |
| Paper strong | `#FFFDFB` | Superficies |
| Wellcome orange | `#FF8C42` | Marca e acao |
| Orange deep | `#C94E16` | Hover e textos de destaque |
| Coral | `#EC6D45` | Bloco de anfitrioes |
| Butter | `#F5D777` | Bloco editorial de descoberta |
| Green | `#1F6D5D` | Confirmacao e confianca |
| Line | `#E8D9D0` | Bordas e divisores |

## Typography

- Display: `Georgia, Times New Roman, serif`, peso 400, tracking entre `-0.055em` e `-0.07em`.
- Interface e texto: `Arial, Helvetica, sans-serif`, peso 400 a 800.
- Corpo: 0.92rem a 1.1rem, line-height 1.55 a 1.7.
- Eyebrow: 0.69rem, peso 800, tracking 0.16em.

## Layout Tokens

- Conteudo: `min(100% - 2rem, 75rem)`.
- Espacos: 8, 16, 24, 32, 48 e 80px.
- Raio de card: 12px; botoes e tags: 999px.
- Sombra: `0 24px 60px rgba(69, 35, 20, 0.16)` apenas para o telefone do produto.

## Responsive Rules

- Mobile abaixo de 760px: uma coluna, nave compacta, componentes de toque com ao menos 48px.
- Desktop: hero de ao menos 752px, grids de duas ou tres colunas conforme a secao.

## Accessibility

- Todo controle possui foco visivel em laranja profundo.
- Texto sobre superfices mantem contraste alto.
- `prefers-reduced-motion` desativa transicoes e rolagem suave.
