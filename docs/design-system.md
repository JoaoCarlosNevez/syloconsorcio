# SyloCRM 2.0 — Design System Audit

> Auditoria realizada via Figma MCP na Etapa 04.
> Arquivo Figma: `u9GSQPJHgNmTY64fgFXkFT` (SYLOAPP)
> Página inspecionada: **APPWEB** (`0:1`)
> Data: 2026-09-09

---

## 1. Visão Geral

O design do SyloCRM 2.0 é um sistema de CRM B2B voltado a consultores de consórcio.
A identidade visual é clean, moderna e data-driven, com foco em dashboards de metas e gamificação por tiers de performance.

**Características centrais:**
- Sidebar de navegação fixa à esquerda (256px)
- Conteúdo principal com largura de 1024px (área útil)
- Tema claro como padrão (toggle Claro/Escuro presente na sidebar, sem telas dark no Figma)
- Personagem mascote "Sara IA" integrada em múltiplas telas
- Sistema de gamificação com 4 tiers: Turmalina, Rubi, Platina, Diamante
- Tipografia exclusivamente Inter
- Paleta baseada em Tailwind Slate + Amber + Emerald

---

## 2. Inventário de Telas

Todas as telas têm largura de **1280px**. Nenhuma versão mobile ou tablet foi encontrada no Figma.

| # | Frame ID | Nome | Dimensões | Área |
|---|----------|------|-----------|------|
| 1 | `208:2`    | Sylo CRM - Home & Metas (Light Mode) Platina 3   | 1280×1082 | Dashboard |
| 2 | `219:1050` | Sylo CRM - Home & Metas (Light Mode) Rubi 2      | 1280×1082 | Dashboard |
| 3 | `219:540`  | Sylo CRM - Home & Metas (Light Mode) Diamante 4  | 1280×1082 | Dashboard |
| 4 | `219:1557` | Sylo CRM - Home & Metas (Light Mode) Turmalina 1 | 1280×1082 | Dashboard |
| 5 | `208:583`  | Sylo CRM - Perfil, Nível & Conquistas            | 1280×2120 | Perfil |
| 6 | `208:1297` | Sylo CRM - Login com Sara IA                     | 1280×1024 | Auth |
| 7 | `208:1406` | Sylo CRM - Pódio & Ranking Geral de Vendas (TV)  | 1280×1151 | Ranking |
| 8 | `208:2431` | Sylo CRM - Recuperação de Senha                  | 1280×877  | Auth |
| 9 | `208:2527` | Sylo CRM - Erro 404 (Sara com Binóculo)          | 1280×1024 | Erro |

### Inventário por área funcional

**Authentication**
- Login com Sara IA
- Recuperação de Senha

**Dashboard / Home**
- Home & Metas — 4 variantes por tier (Turmalina 1, Rubi 2, Platina 3, Diamante 4)

**Perfil / Gamificação**
- Perfil, Nível & Conquistas

**Ranking / TV**
- Pódio & Ranking Geral de Vendas (Versão TV)

**Erros**
- 404 (Sara com Binóculo)

**Nao identificadas no Figma (areas existentes na nav mas sem telas):**
- Kanban
- Leads
- Tarefas (tela dedicada — apenas tabela na Home)
- Usuários
- Fila
- Configurações
- Administração
- Notificações
- Ajuda

---

## 3. Inventário de Componentes

### 3.1 Componentes confirmados no Figma

| Componente | Variantes/Estados observados | Contexto de uso |
|---|---|---|
| Button (primary amber) | default | Login submit, Quick action CTA |
| Button (secondary outline) | default | Google Workspace SSO |
| Button (ghost/transparent) | default | Links da sidebar |
| Input (text) | placeholder, filled, password-toggle | Login email/senha, Recuperação |
| Checkbox | unchecked | Lembrar de mim |
| Badge/Tag status (pill) | amber (Atendimento), blue (Simulação), green (Proposta) | Tabela de tarefas |
| Tier Badge | Platina, Rubi, Diamante, Turmalina | Avatar hero, sidebar user |
| Progress Bar | amber gradient (pessoal), green gradient (equipe) | Cards de meta |
| Progress Card | Meta Pessoal, Meta da Representação | Home section 2 |
| KPI Card | com trend positivo, sem trend | Home section 4 |
| Data Table | header + body rows | Home Tarefas |
| Sidebar Navigation | — | Todas as telas autenticadas |
| Navigation Link | active (bg slate-200/80%), inactive | Sidebar |
| Avatar (com tier ring) | Platina ring (blue gradient) | Hero home, sidebar bottom |
| Online Status Indicator | online (emerald + pulse) | Sidebar bottom |
| Theme Toggle | Claro / Escuro (segmented) | Sidebar bottom |
| User Profile Row | avatar + nome + tier | Sidebar bottom |
| Sara IA Floating Badge | frosted glass, status online | Login topo esquerdo |
| "Chamar Sara IA" Button | special amber outline | Home hero |
| Sara IA Nav Item | BETA badge azul | Sidebar |
| Divider horizontal | simples, com texto central | Login form |
| Filter Button | dropdown-like | Home tabela |
| WhatsApp Action Button | green icon | Tabela — ação direta |
| Footer (segurança) | shield + help link | Login |
| Metric Highlights Strip | 3 colunas com dividers | Login painel esquerdo |
| Floating Status Badge | frosted glass pill | Login |
| Podium Card | 1º, 2º, 3º lugar | Ranking TV |
| Vertical Divider | rgba white 15% | Login metrics |

### 3.2 Componentes NÃO encontrados no Figma

> Não identificado no Figma — decisão necessária na implementação:

- Modal / Dialog
- Drawer / Sheet
- Dropdown / Select
- Combobox
- Radio button
- Switch/Toggle (exceto theme toggle)
- Tabs
- Tooltip
- Toast / Snackbar
- Alert / Banner
- Skeleton / Loading state
- Empty state
- Breadcrumbs
- Pagination
- Search input
- Date picker
- Multi-select

---

## 4. Design Tokens

### 4.1 Cores

> Confirmado pelo Figma via get_design_context (valores exatos extraídos do código gerado).

#### Escala Slate (base neutro)

| Token | Valor hex | Tailwind equiv. | Uso |
|---|---|---|---|
| `--color-bg-main` | `#f8fafc` | slate-50 | Fundo principal da app |
| `--color-bg-subtle` | `#f1f5f9` | slate-100 | Progress track, fundo sutil |
| `--color-border` | `#e2e8f0` | slate-200 | Bordas de cards, inputs |
| `--color-border-input` | `#cbd5e1` | slate-300 | Borda de inputs, separadores |
| `--color-text-disabled` | `#94a3b8` | slate-400 | Placeholder, cabeçalhos de tabela |
| `--color-text-muted` | `#64748b` | slate-500 | Labels KPI, descrições |
| `--color-text-option` | `#475569` | slate-600 | Labels sutis |
| `--color-text-secondary` | `#334155` | slate-700 | Valores de tabela, KPIs |
| `--color-text-user` | `#1e293b` | slate-800 | Nome do usuário no sidebar |
| `--color-text-primary` | `#0f172a` | slate-900 | Headings, texto principal |
| `--color-bg-panel-dark` | `#020617` | slate-950 | Painel esquerdo do Login |

#### Escala Amber (accent / primary action)

| Token | Valor hex | Tailwind equiv. | Uso |
|---|---|---|---|
| `--color-accent-subtle` | `#fffbeb` | amber-50 | Badge Atendimento bg |
| `--color-accent-light` | `#ffeab1` | amber-100~ | Button gradient from |
| `--color-accent-border-badge` | `#fde68a` | amber-200 | Badge Atendimento border |
| `--color-accent-border-btn` | `#fcd34d` | amber-300 | Button border Sara IA |
| `--color-accent` | `#ffa705` | amber-500~ | Button gradient to |
| `--color-accent-link` | `#d97706` | amber-600 | Links, "Esqueceu senha?" |
| `--color-accent-badge-text` | `#b45309` | amber-700 | Badge Atendimento text |

#### Escala Emerald (success / positive)

| Token | Valor hex | Tailwind equiv. | Uso |
|---|---|---|---|
| `--color-success-subtle` | `#ecfdf5` | emerald-50 | WA button bg, green badge bg |
| `--color-success-border` | `#a7f3d0` | emerald-200 | WA button border, green badge border |
| `--color-success-pulse` | `#34d399` | emerald-400 | Online indicator pulse |
| `--color-success` | `#10b981` | emerald-500 | Online indicator, progress team fill |
| `--color-success-text` | `#059669` | emerald-600 | Trend positivo, SLA text |
| `--color-success-dark` | `#047857` | emerald-700 | Badge Proposta text |

#### Escala Blue (info / Tier Platina)

| Token | Valor hex | Tailwind equiv. | Uso |
|---|---|---|---|
| `--color-info-subtle` | `#eff6ff` | blue-50 | Badge Simulação bg |
| `--color-info-border` | `#bfdbfe` | blue-200 | Badge Simulação border |
| `--color-info-text` | `#1d4ed8` | blue-700 | Badge Simulação text |
| `--color-tier-platina-from` | `#9ecbff` | blue-300~ | Tier ring gradient, Avatar border |
| `--color-tier-platina-to` | `#005ecc` | blue-700~ | Tier ring gradient |
| `--color-company-icon-bg` | `#0075ff` | — | Sidebar company icon bg |
| `--color-beta-bg` | `#d1e8fa` | — | BETA badge bg |
| `--color-beta-text` | `#042d78` | — | BETA badge text |

#### Cores especiais

| Token | Valor | Uso |
|---|---|---|
| `--color-card-bg` | `#ffffff` | Cards, painel direito login |
| Login left panel overlay | `linear-gradient(180deg, rgba(15,23,42,0.35) 0%, rgba(15,23,42,0.1) 40%, rgba(15,23,42,0.85) 80%, rgba(15,23,42,0.98) 100%)` | Overlay Sara IA |
| Button gradient | `linear-gradient(to right, #ffeab1, #ffa705)` | Botão primário amber |
| Progress personal | Gradient image (não extraído) | Meta Pessoal |
| Progress team | `linear-gradient(to right, #34d399, #10b981)` | Meta da Representação |

---

### 4.2 Tipografia

**Família exclusiva:** `Inter` (Google Fonts / system)

| Estilo | Size | Weight | Tracking | Line-height | Uso |
|---|---|---|---|---|---|
| Display Hero | 36px | ExtraBold (800) | -0.9px | 40px | Login headline |
| H1 | 30px | ExtraBold (800) | -0.75px | 36px | Login "Entrar", KPI valores |
| H2 | 24px | Bold (700) | -0.6px | 32px | Hero home nome do usuário |
| H3 | 20px | Bold (700) | — | 28px | Porcentagem progress cards |
| H4 / Card Title | 16px | SemiBold (600) | — | 24px | Títulos de seção em cards |
| Body Large | 18px | Regular (400) | — | 28px | Login hero subtitle |
| Body | 14px | Regular (400) | — | 22.75px | Descrições, corpo |
| Body Medium | 14px | Medium (500) | — | 20px | Google Workspace button |
| Body SemiBold | 14px | SemiBold (600) | — | 20px | Button label, nav items |
| Body Bold | 14px | Bold (700) | — | 20px | Valores financeiros na tabela |
| Label | 13px | Regular (400) | — | 18px | Metadata do perfil |
| Small | 12px | Regular (400) | — | 16px | Descrições secundárias, footer |
| Small Medium | 12px | Medium (500) | — | 16px | Status text, sidebar items |
| Small SemiBold | 12px | SemiBold (600) | 0.6px | 16px | Input labels (uppercase) |
| Small Bold | 12px | Bold (700) | — | 16px | Tier badge label |
| Micro | 11px | Regular (400) | — | 20px | Metadados de tabela |
| Micro SemiBold | 11px | SemiBold (600) | 0.55px | 16.5px | Section sub-labels uppercase |
| Micro Bold | 11px | Bold (700) | 0.55px | 16.5px | Table column headers (uppercase) |
| Tiny | 10px | SemiBold (600) | 0.25px | 15px | SLA badge text |
| Nano | 8px | Regular (400) | — | 16px | Task/Follow-up labels |
| Nano SemiBold | 8px | SemiBold (600) | — | 16px | Status badge text |
| BETA | 10px | Bold (700) | — | 20px | BETA badge |

**Padrões observados:**
- Labels de input: UPPERCASE, tracking-[0.6px], 12px SemiBold, cor `#334155`
- Cabeçalhos de tabela: UPPERCASE, tracking-[0.55px], 11px Bold, cor `#94a3b8`
- KPI sublabels: UPPERCASE, tracking-[0.6px], 12px SemiBold, cor `#64748b`

---

### 4.3 Espaçamento

**Escala observada (px):**
```
4 · 6 · 8 · 9 · 10 · 12 · 13 · 14 · 15 · 16 · 17 · 20 · 21 · 24 · 25 · 32 · 40 · 48 · 64 · 80
```

**Referências importantes:**
- Padding interno de cards: `21px` (único — não é múltiplo de 4 exato)
- Padding do main content: `32px`
- Gap entre seções do main: `24px`
- Padding do sidebar: `px-16 pt-16 pb-50`
- Gap entre nav links: `4px`
- Padding de nav links: `px-12 py-10`
- Gap dentro de nav links (icon + label): `12px`
- Padding de inputs: `pb-15 pl-45 pr-17 pt-14` (email field)
- Padding do botão primário: `px-20 py-12`
- Padding do Google button: `pb-11 pt-15 px-17`
- Login main content padding: `px-80 py-32`

> **Inferencia técnica:** O valor `21px` de padding dos cards sugere que o design não usa uma escala de espaçamento puramente de 4px. Pode haver margem visual (21 ≈ 20+1 de ajuste visual). Na implementação, padronizar para `p-5` (20px) ou `p-[21px]` conforme fidelidade necessária.

---

### 4.4 Border Radius

| Elemento | Radius | Tailwind |
|---|---|---|
| Inputs | 8px | rounded-lg |
| Botão primário / secundário | 8px | rounded-lg |
| Checkbox | 4px | rounded |
| Cards / KPI | 16px | rounded-2xl |
| Nav links | 12px | rounded-xl |
| Sidebar container | 10px | rounded-[10px] |
| Theme toggle outer | 12px | rounded-xl |
| Theme toggle buttons | 8px | rounded-lg |
| Company icon | 8px | rounded-lg |
| Icon containers (KPI) | 12px | rounded-xl |
| WhatsApp action button | 8px | rounded-lg |
| Status badges / tier / pill | 9999px | rounded-full |
| Avatar | 9999px | rounded-full |
| Online indicator | 9999px | rounded-full |
| Progress bar track | 9999px | rounded-full |
| Progress bar fill | 9999px | rounded-full |
| Floating status badge | 9999px | rounded-full |

---

### 4.5 Shadows / Effects

| Elemento | Shadow |
|---|---|
| Input | `0px 1px 2px 0px rgba(0,0,0,0.05)` |
| Botão primário amber | `0px 4px 6px -1px rgba(245,158,11,0.25), 0px 2px 4px -2px rgba(245,158,11,0.25)` |
| Google button | `0px 1px 1px rgba(0,0,0,0.05)` |
| Sidebar card | `0px 1px 2px 0px rgba(0,0,0,0.05)` |
| Login status floating badge | `0px 20px 25px -5px rgba(0,0,0,0.1), 0px 8px 10px -6px rgba(0,0,0,0.1)` |
| Avatar tier ring | `inset 0px 2px 4px 0px rgba(0,0,0,0.05)` |
| WhatsApp button | `drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]` (inferido) |

**Efeitos especiais:**
- Overlay Sara IA (login): cinematic gradient 4 stops
- Frosted glass (status badge): `backdrop-blur-[6px]` + bg `rgba(15,23,42,0.65)` + border `rgba(255,255,255,0.15)`
- Progress bar pessoal: imagem de gradiente (não cor pura)
- Avatar ring: gradiente radial azul (`#9ecbff` → `#005ecc`)

---

### 4.6 Breakpoints / Layout

> **Nao identificado no Figma** — decisão necessária posteriormente.
> Apenas versões desktop (1280px de canvas) foram encontradas. Nenhuma tela mobile ou tablet existe no Figma.

**Layout confirmado (desktop):**
- Canvas total: 1280px
- Sidebar: 256px (fixed left, offset 15px left = posição: `left-[15px]`)
- Main content area: 1024px
- Main content max-width interno: 1600px (flexível)
- Main content padding: 32px
- Grid de KPIs: 4 colunas flex, gap-[20px]
- Grid de Progress Cards: 2 colunas flex, gap-[24px]

**Breakpoints para implementação (inferência técnica — não confirmado pelo Figma):**
A implementação precisará definir breakpoints. Sugestão baseada no layout:
- `xl`: 1280px+ (layout com sidebar visível)
- `lg`: 1024px (sidebar colapsada ou overlay)
- `md`: 768px (mobile-first)
- `sm`: 640px

---

## 5. Estados

### Estados confirmados no Figma

| Componente | Estados presentes |
|---|---|
| Navigation Link | active (bg slate-200/80% + text-primary), inactive (text-secondary) |
| Online Indicator | online (emerald + pulse animation) |
| Theme Toggle | claro (selecionado), escuro (não selecionado) |
| Input | placeholder (visible), filled (implied) |
| Password Input | obscured (dots), toggle visível |
| Checkbox | unchecked (visible) |
| Progress Bar | filled vs empty track |
| Button primary | default |
| Button secondary | default |

### Estados NÃO identificados no Figma

> Não identificado no Figma — decisão necessária na implementação:

- Navigation Link: hover
- Button: hover, focus, disabled, loading
- Input: focus (ring/glow), error, disabled
- Checkbox: checked, indeterminate, focus
- Card: hover
- Table row: hover
- Badge: nenhum estado adicional
- Tema escuro (dark mode): toggle presente na sidebar, mas zero telas dark no Figma

---

## 6. Responsividade

> **Nao identificado no Figma.**
> Todas as 9 telas são exclusivamente desktop (1280px). Nenhuma versão mobile ou tablet existe no arquivo.

Pontos que precisarão de definição na implementação:
- Sidebar: collapse / hambúrguer no mobile
- Tabelas: scroll horizontal ou cards no mobile
- KPI grid: 4 colunas → 2 → 1
- Progress cards: 2 colunas → 1
- Login split-screen: empilhado no mobile
- Hero section: reorganização do avatar + quick action

---

## 7. Padrões de UX

### Confirmados no Figma

| Padrão | Onde | Notas |
|---|---|---|
| Split-screen layout | Login, Recuperação de Senha | 60% imagem Sara IA + 40% form |
| Sara IA como personagem | Login, Recuperação, 404, Sidebar | Mascote integrada ao produto |
| Gamificação por tier | Home (4 variantes), Sidebar bottom, Avatar | Turmalina 1 < Rubi 2 < Platina 3 < Diamante 4 |
| Floating status badge (frosted glass) | Login | Sara IA online indicator |
| Cinematic gradient overlay | Login, Recuperação, 404 | Sobre a imagem da Sara |
| Metric highlights strip | Login painel esquerdo | 3 métricas com dividers verticais |
| Progress bars (metas) | Home | Visual de andamento de meta |
| KPI cards (4 por linha) | Home | Indicadores rápidos |
| Data table com ação rápida | Home | WhatsApp direto na linha |
| Status badges coloridos | Tabela | Amber/blue/green por estágio |
| "Chamar Sara IA" CTA | Home hero | Destaque amber outline |
| Tier ring no avatar | Home hero, Sidebar | Ring colorido por tier |
| Online/SLA indicator | Sidebar bottom | Status do vendedor |
| Theme toggle (Claro/Escuro) | Sidebar bottom | Segmented control |
| Company branding na sidebar | Sidebar | Logo/nome da representação |
| BETA badge | Sara IA nav item | Pill azul |
| Acesso via Google Workspace | Login | SSO corporativo |
| Security badge | Login footer | Shield + "Ambiente seguro" |

### NÃO identificados no Figma

- Feedback de ações (toast, snackbar)
- Loading/skeleton states
- Empty states
- Modais de confirmação
- Ações destrutivas (confirmação)
- Mensagens de erro em inputs
- Notificações / alertas
- Paginação
- Busca global
- Filtros avançados

---

## 8. Acessibilidade

> Análise preliminar baseada exclusivamente no que é observável no Figma.
> Nenhuma alteração no design está sendo proposta nesta etapa.

| Ponto | Observação | Prioridade |
|---|---|---|
| Labels de input UPPERCASE 12px | Contraste aparente OK com `#334155`, mas tamanho pequeno | Verificar na implementação |
| Status badges coloridos | Texto presente em todos — não depende só de cor | OK |
| Input icons sem label | Ícone de email/lock sem aria-label visível | Precisa de `aria-label` na implementação |
| "Esqueceu sua senha?" | Amber `#d97706` sobre branco — verificar ratio 4.5:1 | Verificar contraste |
| Checkbox 16×16px | Área clicável aceitável, mas estado focus não definido | Definir na implementação |
| Online indicator | Usa cor + texto ("Vendedor Online") — OK | OK |
| Frosted glass badge | Texto `#f1f5f9` sobre fundo escuro — contraste OK | OK |
| Avatar ring | Puramente decorativo — OK | OK |
| Dark left panel | Texto branco/slate-200 sobre dark — OK | OK |
| Hierarquia de headings | H1 > H2 > Body visível e consistente | OK |
| Ícones sem texto | Varios SVGs sem label visível (nav icons) | Precisa de `aria-label` |
| Focus states | Não definidos no Figma para nenhum componente | Definir na implementação |

---

## 9. Branding / White-Label

O sistema tem hierarquia de representações (Sylo > Incorporadora > Master > Representação).

### Pontos de extensão identificados no Figma

| Elemento | Localização | Configurável? |
|---|---|---|
| Logo da representação | Sidebar (Quick Action CTA) | Sim — imagem `marca_3_phs_plataforma` |
| Nome da representação | Sidebar (Quick Action CTA) | Sim — "Porthis Consórcio" |
| Avatar do usuário | Hero, Sidebar bottom | Sim |
| Tier badge | Hero, Sidebar bottom | Sim — por nível do usuário |
| Tier ring no avatar | Hero | Sim — cor por tier |
| Sara IA logo | Sidebar nav, Home CTA, Login | Fixo — mascote do produto |
| Logo Sylo CRM | Sidebar topo, Login, Ranking TV | Fixo |

### NÃO identificado no Figma — decisão necessária

- Customização de cor primária por organização (o amber parece fixo no design)
- Favicon por organização
- Nome do produto white-label (o design usa "Sylo CRM" fixo)
- Dark/light mode por organização

---

## 10. Motion

> **NÃO identificado no Figma** — sem especificações de animação nas telas auditadas.

**Referência externa encontrada em anotação de canvas:**
O designer deixou uma nota no canvas do Figma referenciando:
> `github.com/kylezantos/design-principles` — "motion principles"

A nota também instrui:
> "garanta que toda interface do sistema tem skeleton, lazyloading, smooth animation de entrada, saída, carregamento, progresso em todos os elementos"

**Pontos a implementar (inferência técnica baseada na anotação):**
- Skeleton loading em todos os componentes de dados
- Lazy loading de imagens (Sara IA, avatares)
- Smooth transition nas rotas (entrada/saída)
- Animação de progresso nas progress bars
- Online indicator: pulse animation (emerald)
- `prefers-reduced-motion` deve ser respeitado em toda implementação

**Valores de motion para definição futura (não identificado no Figma):**
- Duração: não especificada
- Easing: não especificado
- Animações de componentes: não especificadas

---

## 11. Arquitetura Conceitual de Componentes

```
Design Tokens (CSS variables / Tailwind config)
      ↓
Primitives (packages/ui)
  - Text
  - Icon
  - Avatar
  - Separator
  - Badge
      ↓
Components (packages/ui)
  - Button (primary, secondary, ghost)
  - Input (text, password)
  - Checkbox
  - ProgressBar
  - StatusDot (online indicator)
  - TierBadge (Turmalina/Rubi/Platina/Diamante)
  - ThemeToggle
  - Card
  - Table / TableRow / TableCell
  - DataBadge (status pill)
      ↓
Patterns (packages/ui ou apps/web)
  - FormField (Label + Input + Error)
  - KPICard
  - ProgressCard (Meta)
  - NavLink
  - Sidebar
  - SaraIABadge
  - UserProfileRow
  - MetricHighlightsStrip
  - SplitScreenLayout
      ↓
Page Components (apps/web)
  - LoginForm
  - PasswordRecoveryForm
  - HomeHero
  - HomeMetasSection
  - HomeTarefasTable
  - HomeKPIsSection
  - SidebarNavigation
      ↓
Screens (apps/web)
  - LoginPage
  - PasswordRecoveryPage
  - DashboardPage
  - ProfilePage
  - RankingPage
  - NotFoundPage
```

---

## 12. Especificação do Login

> Frame: `208:1297` — "Sylo CRM - Login com Sara IA"
> Dimensões: 1280×1024px

### Estrutura

**Layout:** Split-screen 768px (esquerda) + 512px (direita)

---

### Painel Esquerdo (768×1024px)

| Elemento | Detalhe |
|---|---|
| Fundo base | `#020617` (slate-950) |
| Imagem | Sara IA (personagem 3D) — ocupa largura full com deslocamento |
| Overlay gradiente | `linear-gradient(180deg, rgba(15,23,42,0.35) 0%, rgba(15,23,42,0.1) 40%, rgba(15,23,42,0.85) 80%, rgba(15,23,42,0.98) 100%)` |
| Topo direito | Floating badge frosted glass: "Sara IA" + dot verde online |
| Floating badge bg | `rgba(15,23,42,0.65)` + `backdrop-blur-[6px]` + borda `rgba(255,255,255,0.15)` |
| Floating badge pill | `rounded-full`, px-17 py-9 |
| Online dot | 10×10px, `#10b981` com pulse `#34d399` opacity-75 |
| Headline | "Potencialize suas vendas com o Sylo CRM" |
| Headline font | 36px Inter ExtraBold, tracking-[-0.9px], branca |
| Headline line-height | 40px |
| Subtitle | 18px Inter Regular, `#e2e8f0`, line-height 28px |
| Metrics strip | 3 itens: "+38% Taxa de Conversão", "2.4x Velocidade Pipeline", "24/7 Mentoria Comercial IA" |
| Metric values | 24px Inter Bold, branco (exceto 24/7 em `#fbbf24`) |
| Metric labels | 12px Inter Regular, `#cbd5e1` |
| Metric dividers | 1px, `rgba(255,255,255,0.15)`, h-32px |
| Strip border-top | `rgba(255,255,255,0.1)` |
| Padding geral | 48px |

---

### Painel Direito (512×1024px)

| Elemento | Detalhe |
|---|---|
| Fundo | `#ffffff` |
| Padding | px-80 py-32 |
| Logo | Sylo CRM logo, 128×40px, topo do form |
| Heading "Entrar" | 30px Inter Bold, tracking-[-0.75px], `#0f172a` |
| Heading line-height | 36px |
| Subtítulo | "Bem-vindo ao Sylo CRM..." — 14px Regular, `#64748b`, line-height 22.75px |
| **Email field** | |
| Label | "E-MAIL CORPORATIVO" — 12px SemiBold, `#334155`, uppercase, tracking-[0.6px] |
| Input height | 46px |
| Input border | `#cbd5e1`, 1px |
| Input border-radius | 8px |
| Input bg | `#ffffff` |
| Input shadow | `0px 1px 2px 0px rgba(0,0,0,0.05)` |
| Placeholder | "seu.email@empresa.com.br" — 14px Regular, `#94a3b8` |
| Left icon | envelope SVG, 20×20px, left-14px, centrado verticalmente |
| **Senha field** | |
| Label | "SENHA" — mesmo estilo de email |
| Placeholder | "············" — mesmo estilo |
| Left icon | lock SVG, 20×20px |
| Right icon | eye SVG (toggle visibilidade), right-14px |
| **Options row** | |
| Checkbox | 16×16px, `border-[#cbd5e1]`, `rounded-[4px]` |
| Checkbox label | "Lembrar de mim" — 12px Medium, `#475569` |
| Forgot password | "Esqueceu sua senha?" — 12px SemiBold, `#d97706` |
| **Submit button** | |
| Label | "Acessar Plataforma" + arrow icon |
| Height | 44px |
| Gradient | `from-[#ffeab1] to-[#ffa705]` (left → right) |
| Border-radius | 8px |
| Text | 14px SemiBold, `#000000` |
| Shadow | `0px 4px 6px -1px rgba(245,158,11,0.25), 0px 2px 4px -2px rgba(245,158,11,0.25)` |
| Arrow icon | 16×16px |
| **Divider** | |
| Texto | "OU CONTINUE COM" — 12px Medium, `#94a3b8`, uppercase |
| Linha | `#e2e8f0`, 1px |
| **Google button** | |
| Height | 46px |
| Border | `#cbd5e1` |
| Bg | `#ffffff` |
| Border-radius | 8px |
| Shadow | `drop-shadow([0px_1px_1px_rgba(0,0,0,0.05)])` |
| Google logo | 16×16px |
| Label | "Google Workspace" — 14px Medium, `#334155` |
| **Notice** | |
| Texto | "Seu acesso e credenciais chegam por e-mail corporativo assim que o plano da sua equipe for liberado." |
| Estilo | 12px Regular, `#94a3b8`, centralizado |
| **Footer** | |
| Border top | `#f1f5f9` |
| Security badge | Shield icon + "Ambiente seguro" — 12px Regular, `#475569` |
| Help link | "Precisa de ajuda? Fale com o suporte" — "Fale com o suporte" em `#d97706` underline |

---

## 13. Sidebar — Especificação Detalhada

| Elemento | Valor |
|---|---|
| Largura | 256px |
| Posição | Absolute, `left-[15px]`, `top-[25px]` |
| Altura | 1026px |
| Background | `#ffffff` |
| Border right | `#e2e8f0`, 1px |
| Border-radius | 10px |
| Shadow | `0px 1px 2px 0px rgba(0,0,0,0.05)` |
| Padding | px-16 pt-16 pb-50 |
| Overflow | auto |

**Seção: Logo Brand**
- Logo Sylo CRM: 102×32px, px-8 pt-4

**Seção: Company CTA**
- Bg: `#f8fafc`, border `rgba(226,232,240,0.8)`, rounded-xl, p-9
- Icon: 32×32px azul `#0075ff`, rounded-lg
- Nome: 12px SemiBold, `#0f172a`
- Seta: 8×17px, color inferida

**Seção: Navigation Tabs**
- Gap entre items: 4px
- Item ativo: bg `rgba(226,232,240,0.8)`, rounded-xl, px-12 py-10
- Item ativo texto: 14px Medium, `#0f172a`
- Item inativo: sem bg, px-12 py-10, rounded-xl
- Item inativo texto: 14px Medium, `#334155`
- Icon: 20×20px SVG

**Itens de navegação (em ordem):**
1. Início
2. Kanban
3. Leads
4. Tarefas
5. Usuários
6. Fila
7. Configurações
8. Administração
9. Notificações
10. Ajuda
11. Sara IA `[BETA]` — badge `#d1e8fa` / `#042d78`, 10px Bold

**Seção bottom (separador borda top `#e2e8f0`):**

1. **Agent Connection Status**
   - Bg `#f8fafc`, border `rgba(226,232,240,0.8)`, rounded-lg
   - Online dot: 10px emerald
   - Label: "Vendedor Online" — 12px Medium, `#334155`
   - SLA: "99.8% SLA" — 10px SemiBold, `#059669`, tracking-[0.25px]

2. **Theme Toggle (Claro/Escuro)**
   - Outer: bg `#f1f5f9`, border `#e2e8f0`, rounded-xl, p-5px
   - Ativo (Claro): bg white, rounded-lg — texto gradient amber
   - Inativo (Escuro): sem bg — texto 12px Medium, `#64748b`

3. **User Profile Row**
   - Bg `#f8fafc`, border `rgba(226,232,240,0.7)`, rounded-xl
   - Avatar: 36×36px, rounded-full, border `#9ecbff`
   - Nome: 12px SemiBold, `#1e293b`
   - Tier: 11px Regular, `#64748b`
   - Chevron button: 11×7px

---

## 14. Home — Estrutura de Seções

**Background geral:** `#f8fafc`
**Main content:** 1024px, p-32px, gap-24px entre seções

| Seção | ID | Conteúdo |
|---|---|---|
| Hero | `208:28` | Avatar com tier ring + nome + badge + username + equipe + data • CTA "Chamar Sara IA" |
| Metas | `208:53` | 2 progress cards (Meta Pessoal + Meta Representação), gap-24 |
| Tarefas | `208:308` | Table com: CLIENTE / SEGMENTO / VALOR / TAREFA / STATUS / AÇÃO DIRETA |
| KPIs | `208:115` | 4 KPI cards: Cartas em Andamento / Novos Leads / Volume Contemplado / Ticket Médio |

**Variantes de tier (4 telas Home):**
- Turmalina 1: tier mais baixo
- Rubi 2
- Platina 3: variante principal documentada
- Diamante 4: tier mais alto

---

## 15. Lacunas Identificadas

| Lacuna | Impacto | Prioridade |
|---|---|---|
| Nenhuma tela mobile ou tablet | Alto — sistema precisa de responsividade | Crítica |
| Dark mode sem telas (toggle existe mas sem design) | Alto — toggle está na sidebar | Alta |
| Faltam 9 telas de área funcional (Kanban, Leads, etc.) | Alto — são as rotas principais do produto | Alta |
| Sem estados de erro em inputs | Médio — UX de validação indefinida | Alta |
| Sem estados de hover/focus em componentes | Médio — interatividade indefinida | Alta |
| Sem loading/skeleton states | Médio — UX de carregamento indefinida | Alta |
| Sem empty states | Médio — tabela vazia, sem leads, etc. | Média |
| Sem modais ou drawers | Médio — ações CRUD precisam de modal | Média |
| Sem toast/notificações | Médio — feedback de ações indefinido | Média |
| Sem paginação | Médio — tabela de dados infinita | Média |
| Sem search input | Médio — presente na nav mas sem tela | Média |
| Sem dropdown / select | Médio — filtros precisam de select | Média |
| Checagem de contraste | Baixo — WCAG não verificado | Baixa |
| Motion sem especificação | Baixo — referência externa apenas | Baixa |

---

## 16. Dúvidas que Precisam de Decisão

1. **Responsividade:** Qual é o comportamento esperado em tablet e mobile? Sidebar collapsa ou vira hambúrguer?

2. **Dark mode:** As telas dark precisam ser desenhadas no Figma antes da implementação ou serão definidas na implementação via CSS?

3. **Telas faltantes:** Quando serão desenhadas Kanban, Leads, Tarefas, Usuários, Fila, Configurações, Administração, Notificações, Ajuda?

4. **Paleta amber como primary:** O amber é fixo para todas as organizações (white-label) ou é configurável por representação?

5. **Focus/hover states:** Serão definidos no Figma ou deixados para decisão da implementação seguindo o sistema?

6. **Onboarding flow:** Existe? Não identificado no Figma.

7. **Error states:** Validação de formulários (email inválido, senha errada) — sem especificação de estilo de erro.

8. **Tier Rubi:** Qual é a cor do tier ring do Rubi? Apenas Platina (azul) foi confirmada visualmente.

9. **Tiers Turmalina/Diamante:** Mesma dúvida — cores do ring para esses tiers não estão explícitas nos frames auditados.

10. **Sara IA integration:** O chat com Sara IA abre modal, drawer lateral ou nova tela?

---

## 17. Confirmações Finais da Auditoria

| Item | Status |
|---|---|
| Figma MCP utilizado | Confirmado — `get_metadata`, `get_design_context`, `get_screenshot` |
| Arquivo analisado | `u9GSQPJHgNmTY64fgFXkFT` (SYLOAPP) |
| Página auditada | APPWEB (`0:1`) |
| Frames/telas identificados | 9 frames de topo |
| Design context extraído | Login (`208:1297`) + Home Platina 3 (`208:2`) — valores exatos de CSS |
| Screenshots capturados | Perfil, Pódio TV, Recuperação de Senha, Erro 404 |
| Componentes mapeados | 21 confirmados, 19+ não identificados |
| Tokens extraídos | Cores, tipografia, spacing, radius, shadows |
| Login especificado | Sim — completo |
| Sidebar especificada | Sim — completa |
| Nenhuma implementação realizada | Confirmado |
| Nenhum design system implementado | Confirmado |
| Nenhuma funcionalidade de negócio implementada | Confirmado |
