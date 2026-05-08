# 🎨 Wellcome App — Design System

> **Referência visual: iFood.**
> O Wellcome se inspira na linguagem visual do iFood: fundo claro, cards com sombra sutil, tipografia ousada, cor de destaque predominante (laranja), e a sensação de um app polido e moderno de consumo. A diferença central é a **dualidade de persona** (Participante vs Anfitrião), que é resolvida com uma paleta secundária elegante.

---

## 1. Paleta de Cores

### 1.1 Participante (Principal — tom laranja)

Essa é a identidade **predominante** do app. Toda tela que o **participante/consumidor** vê usa essa paleta.

| Token                   | Valor       | Uso                                          |
|-------------------------|-------------|----------------------------------------------|
| `primary`               | `#FF8C42`   | Botões CTA, ícones ativos, tab bar, links    |
| `primaryDark`           | `#E07830`   | Botões pressionados, gradientes inferiores    |
| `primaryLight / secondary` | `#FFF3E0` | Fundo de chips/tags, badges, destaques leves |
| `background`            | `#FAFAFA`   | Fundo principal de todas as telas             |
| `surface / card`        | `#FFFFFF`   | Cards, modais, seções de formulário           |
| `textPrimary`           | `#333333`   | Títulos, nomes, valores (grafite)            |
| `textSecondary`         | `#666666`   | Subtítulos, labels, descrições               |
| `textTertiary`          | `#999999`   | Metadados, timestamps, placeholders          |
| `border`                | `#F0F0F0`   | Divisores, bordas de cards                   |
| `borderStrong`          | `#E0E0E0`   | Bordas de inputs, separadores de seção       |
| `error`                 | `#FF3B30`   | Ações destrutivas, erro de validação         |
| `success`               | `#4CAF50`   | Status aprovado, confirmação                 |
| `warning / pending`     | `#F59E0B`   | Status pendente, alertas                     |

### 1.2 Anfitrião (Secundária — tom Slate/Emerald)

Usada **exclusivamente** na aba "Anfitrião" e em telas de gestão do host (edição de evento, painel, scanner).

| Token              | Valor       | Uso                                        |
|--------------------|-------------|--------------------------------------------|
| `host.headerBg`    | `#0F172A`   | Fundo do header (LinearGradient topo)      |
| `host.primary`     | `#1E293B`   | Fundo de elementos fortes, label da tab    |
| `host.accent`      | `#10B981`   | Botões CTA, badges, seleção ativa          |
| `host.accentLight` | `#F0FDF4`   | Fundo de chips selecionados                |
| `host.background`  | `#F8FAFC`   | Fundo da tela                              |
| `host.card`        | `#FFFFFF`   | Cards                                      |
| `host.textPrimary` | `#0F172A`   | Títulos                                    |
| `host.textSecondary` | `#64748B` | Labels, subtítulos                         |
| `host.border`      | `#E2E8F0`   | Bordas, divisores                          |
| `host.pendingBadge` | `#F59E0B`  | Badge de pendentes na tab bar              |

### 1.3 Regra de Ouro

> **Se a tela pertence à experiência de CONSUMIR um evento → paleta laranja.**
> **Se a tela pertence à experiência de GERENCIAR um evento → paleta slate/emerald.**
> **O Perfil é neutro (usa laranja como accent sutil).**

---

## 2. Tipografia

O app roda em React Native, portanto usa as fontes nativas do sistema (`System` no iOS, `Roboto` no Android). Não carregamos fontes externas.

### Escala tipográfica

| Uso                   | fontSize | fontWeight | Exemplo                        |
|-----------------------|----------|------------|--------------------------------|
| Header de tela        | `22`     | `bold`     | "Explorar", "Meus Ingressos"  |
| Título de seção       | `18`     | `bold`     | "Informações Básicas"          |
| Título de card        | `17`     | `bold`     | Nome do evento no feed         |
| Body / Input          | `16`     | `regular`  | Campos de formulário           |
| Subtítulo / Label     | `14`     | `500/600`  | Nome do anfitrião, datas       |
| Caption / Small label | `13`     | `500`      | Local, horário, spots          |
| Section Header (CAPS) | `12`     | `bold`     | "CONFIGURAÇÕES", "CONTA"       |
| Tiny / Badge          | `11`     | `600`      | Texto de tags, badges          |

### Regras

- **Títulos** são sempre `#333333` (grafite) (ou `host.textPrimary` na aba host).
- **Labels de formulário** são `UPPERCASE`, `letterSpacing: 0.5`, `fontSize: 13`, `fontWeight: 600`, `color: textSecondary`.
- **Placeholders** de inputs usam `textTertiary` (`#999`).

---

## 3. Espaçamento (Spacing)

Baseado na escala do `theme.ts`:

| Token  | Valor | Uso principal                                |
|--------|-------|----------------------------------------------|
| `xs`   | `4`   | Gaps internos, margens mínimas               |
| `sm`   | `8`   | Espaço entre ícone e texto, gap de tags      |
| `md`   | `12`  | Padding interno de badges, espaço entre rows |
| `lg`   | `16`  | Padding de card, margem lateral de listas    |
| `xl`   | `20`  | Padding de conteúdo de scroll                |
| `xxl`  | `24`  | Margem lateral principal, espaço de seções   |
| `xxxl` | `32`  | Separação entre grupos maiores               |

### Regra: Padding horizontal de tela

- Telas de conteúdo scrollável: `paddingHorizontal: 24`
- Cards dentro do scroll: `marginHorizontal: 16`

---

## 4. Border Radius

| Token  | Valor  | Uso                                   |
|--------|--------|---------------------------------------|
| `sm`   | `8`    | Inputs, botões pequenos               |
| `md`   | `12`   | Badges, chips, tags, ícone-círculos   |
| `lg`   | `16`   | Cards, grupos de menu, modais         |
| `xl`   | `20`   | Profile card, hero cards              |
| `xxl`  | `24`   | Botões pill, tab switchers            |
| `full` | `9999` | Avatars, botões completamente redondos|

---

## 5. Sombras (Elevação)

Todos os cards e superfícies elevadas usam um padrão consistente de sombra:

```javascript
// Sombra leve (cards, grupos de menu)
shadow: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

// Sombra média (cards de evento, modais)
shadowMedium: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
}

// Sombra de botão CTA (botão primário)
shadowCTA: {
  shadowColor: '#FF8C42',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 4,
}
```

---

## 6. Componentes — Anatomia Visual

### 6.1 Header de Tela

**Participante (Explorar, Ingressos, Perfil):**
- Fundo: transparente (usa o `background` da tela).
- Título: `fontSize: 22`, `fontWeight: bold`, `color: #333333`.
- Ícones de ação: `Ionicons`, `size: 24`, `color: #333333`.
- Layout: `flexDirection: row`, `justifyContent: space-between`, `paddingHorizontal: 24`, `paddingVertical: 16`.

**Anfitrião (Hosting, Edição de Evento):**
- Fundo: `LinearGradient` de `host.headerBg` (#0F172A) para `host.primary` (#1E293B).
- Título: `fontSize: 18`, `fontWeight: bold`, `color: #FFF`.
- Ícones: `color: #FFF`, dentro de círculos `rgba(255,255,255,0.1)`.

**Telas Filhas (Carteira, Chave PIX, Edição de Perfil):**
- Header nativo do Expo Router: `headerShown: false` (OBRIGATÓRIO via `<Stack.Screen options={{ headerShown: false }} />`).
- Header customizado: fundo `#FFF`, bordinha inferior `#F0F0F0`, botão de voltar `chevron-back`, título centralizado.

### 6.2 Cards

**EventCard (feed principal):**
- `borderRadius: 16`
- `borderWidth: 1`, `borderColor: #F0F0F0`
- Imagem no topo, conteúdo com `padding: 16`
- Tags em chips `backgroundColor: #FFF3E0`, `borderColor: #FFE0B2`, `borderRadius: 12`
- Preço em destaque: `fontSize: 18`, `fontWeight: bold`

**Booking/Ticket Card (ingressos):**
- Layout horizontal: imagem `90x100` à esquerda, conteúdo à direita
- `borderRadius: 16`
- Badges de status via componente `<StatusBadge />`

**Menu Item (perfil / configurações):**
- Agrupado em `menuGroup` com `borderRadius: 16`, `backgroundColor: #FFF`
- Cada item: ícone em círculo colorido → texto → chevron
- Ícone-círculo: `width: 36`, `height: 36`, `borderRadius: 12`

### 6.3 Botões

**Botão Primário (CTA):**
```javascript
{
  backgroundColor: '#FF8C42', // ou host.accent para telas do anfitrião
  borderRadius: 12,           // ou 24 para pill
  paddingVertical: 14,
  alignItems: 'center',
  shadowColor: '#FF8C42',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 4,
}
// Texto: color: '#FFF', fontSize: 16, fontWeight: 'bold'
```

**Botão Secundário (Outline):**
```javascript
{
  borderWidth: 1,
  borderColor: '#E0E0E0',
  borderRadius: 20,
  paddingVertical: 8,
  paddingHorizontal: 20,
  backgroundColor: '#FFF',
}
// Texto: color: '#333', fontSize: 14, fontWeight: '600'
```

**Botão Ghost/Link:**
- Sem borda, sem fundo.
- Texto: `color: #FF8C42`, `fontWeight: bold`.

### 6.4 Inputs

```javascript
{
  backgroundColor: '#FFF',
  borderWidth: 1,
  borderColor: '#E0E0E0',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  color: '#333333',
  // Sombra sutil (opcional, para telas de edição)
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
}
```

- **Label acima do input:** `fontSize: 13`, `fontWeight: 600`, `color: #666`, `textTransform: uppercase`, `letterSpacing: 0.5`, `marginBottom: 8`.
- **Placeholder:** `color: #999`.
- **TextArea:** Mesmas props + `height: 120`, `textAlignVertical: 'top'`.

### 6.5 Tab Bar

- `backgroundColor: #FFF`
- `borderTopWidth: 1`, `borderTopColor: #F0F0F0`
- `height: 60 + insets.bottom`
- Ícone ativo (participante): `color: #FF8C42`
- Ícone ativo (anfitrião): `color: #1E293B`
- Ícone inativo: `color: #CDCDE0`
- Label: `fontSize: 11`, `fontWeight: 600`

### 6.6 Tab Switcher (Segmented Control)

```javascript
// Container
{
  flexDirection: 'row',
  marginHorizontal: 24,
  backgroundColor: '#EEEEEE',
  borderRadius: 12,
  padding: 4,
  marginBottom: 16,
}

// Tab ativa
{
  backgroundColor: '#FF8C42', // primary
  borderRadius: 10,
}

// Texto ativo
{
  color: '#FFF',
  fontSize: 14,
  fontWeight: '600',
}
```

### 6.7 SelectionSection (Cards/Pills/Grid)

- **Tema Padrão:** Selecionado → `bg: #FFF5F0`, `border: #FF8C42`, texto `text-orange-700`.
- **Tema Host:** Selecionado → `bg: #F0FDF4`, `border: #10B981`, texto `text-emerald-700`.
- Não selecionado: `bg: #FFF`, `border: gray-100/200`.
- Animação de scale com `react-native-reanimated` (`withSpring`).

### 6.8 Loading / Empty States

**Loading:**
- `<ActivityIndicator size="large" color="#FF8C42" />` (ou `host.accent` nas telas do host).
- Centralizado com `flex: 1, justifyContent: center, alignItems: center`.

**Empty State:**
- Ícone grande em círculo `#F3F4F6` (100x100).
- Título: `fontSize: 18`, `fontWeight: bold`, `textAlign: center`.
- Body: `fontSize: 14`, `color: #666`, `textAlign: center`, `lineHeight: 22`.
- CTA opcional: botão pill `borderRadius: 24` com cor primária.

---

## 7. Ícones

- **Biblioteca:** `@expo/vector-icons` → `Ionicons` (estilo iOS moderno).
- **NÃO usar emojis.** Todos os ícones devem ser `Ionicons`.
- **Tamanhos padrão:**
  - Navegação / Tab bar: `24`
  - Dentro de botões/labels: `16–18`
  - Badges / inline: `12–14`
  - Empty state / destaque: `48`
- **Variantes:** Usar `-outline` para inativo e preenchido para ativo (ex: `ticket-outline` / `ticket`).

---

## 8. Checklist de Consistência

Ao criar ou modificar qualquer tela, verifique:

- [ ] O fundo da tela é `#FAFAFA` (participante) ou `host.background` (anfitrião)?
- [ ] Os cards usam `borderRadius: 16`, sombra leve, `backgroundColor: #FFF`?
- [ ] Os botões primários usam `#FF8C42` com a sombra laranja (ou `host.accent` no host)?
- [ ] Os inputs usam `borderRadius: 12`, `borderColor: #E0E0E0`, `paddingVertical: 14`?
- [ ] Labels de formulário são `uppercase`, `fontSize: 13`, `fontWeight: 600`?
- [ ] O header nativo do Expo Router está oculto (`<Stack.Screen options={{ headerShown: false }} />`)?
- [ ] Todos os ícones são `Ionicons` (nenhum emoji)?
- [ ] O texto de loading usa `ActivityIndicator color={Colors.light.primary}`?
- [ ] O espaçamento lateral é `24` nas telas, `16` nos cards?
- [ ] As cores de texto seguem a hierarquia: `#333333` (grafite) → `#666` → `#999`?

---

## 9. Glossário de Referência nos Arquivos

| Arquivo                 | O que define                               |
|-------------------------|--------------------------------------------|
| `src/shared/constants/theme.ts` | Tokens de cor, spacing, bordas, dimensões |
| `src/components/ui/SelectionSection.tsx` | Componente de seleção com `theme` prop |
| `src/components/ui/EnhancedEventCard.tsx` | Card de evento do feed principal |
| `src/components/ui/StatusBadge.tsx` | Badge de status (aprovado, pendente, etc.) |
| `src/app/(tabs)/_layout.tsx` | Configuração da Tab Bar |
| `DESIGN.md` (este arquivo) | Documentação visual de referência |
