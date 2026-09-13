# SyloCRM — Auditoria de UI/UX

**Data:** 2026-09-12
**Escopo:** `apps/web/src` — todas as páginas e componentes do frontend
**Metodologia:** leitura estática de cada arquivo + mapeamento de handlers

---

## 1. Status das Páginas

| Página | Visual | Interatividade | Dados reais | Geral |
|--------|--------|----------------|-------------|-------|
| Login | ✅ 100% | ✅ 95% | ✅ Real (Supabase Auth) | **98%** |
| MetasPage | ✅ 100% | ✅ 100% (read-only) | ❌ Mock | **95%** visual-only |
| KanbanPage | ✅ 100% | 🔶 65% | ❌ Mock | **60%** |
| TarefasPage | ✅ 100% | 🔶 55% | ❌ Mock | **55%** |
| ConfigPage | ✅ 100% | 🔶 50% | ❌ Mock | **55%** |
| PerfilPage | ✅ 100% | 🔴 20% | ❌ Mock | **40%** |
| HomePage | ✅ 100% | 🔴 30% | ❌ Mock | **40%** |
| Fila / Admin / Ajuda / Sara | 🔶 Stub | 🔶 Stub | — | **10%** |

---

## 2. Rotas Mapeadas

| Rota | Página | Status |
|------|--------|--------|
| `/login` | LoginPage | ✅ Implementada + Auth real |
| `/app/home` | HomePage | ✅ Implementada |
| `/app/kanban` | KanbanPage | ✅ Implementada |
| `/app/tarefas` | TarefasPage | ✅ Implementada |
| `/app/metas` | MetasPage | ✅ Implementada |
| `/app/perfil` | PerfilPage | ✅ Implementada |
| `/app/config` | ConfigPage | ✅ Implementada |
| `/app/usuarios` | ConfigPage | ✅ Redireciona para Config |
| `/app/fila` | ComingSoonPage | 🔶 Stub |
| `/app/admin` | ComingSoonPage | 🔶 Stub |
| `/app/ajuda` | ComingSoonPage | 🔶 Stub |
| `/app/sara` | ComingSoonPage | 🔶 Stub |

---

## 3. Mapa de Cliques — O que cada ação faz

### AppLayout (Sidebar)

| Elemento | Comportamento | Status |
|----------|---------------|--------|
| Logo Sylo | Noop | ❌ |
| Seletor de empresa "Porthis" | Noop — não abre dropdown | ❌ |
| Nav → Início | Navega para `/app/home` | ✅ |
| Nav → Kanban | Navega para `/app/kanban` | ✅ |
| Nav → Tarefas | Navega para `/app/tarefas` | ✅ |
| Nav → Fila | Navega para `/app/fila` (ComingSoon) | ✅ |
| Nav → Configurações | Navega para `/app/config` | ✅ |
| Nav → Administração | Navega para `/app/admin` (ComingSoon) | ✅ |
| Nav → Ajuda | Navega para `/app/ajuda` (ComingSoon) | ✅ |
| Nav → Sara IA | Navega para `/app/sara` (ComingSoon) | ✅ |
| Toggle Claro / Escuro | Noop — hardcoded "Claro" ativo | ❌ |
| User card (foto + nome) | Navega para `/app/perfil` | ✅ |

---

### HomePage

| Elemento | Comportamento | Status |
|----------|---------------|--------|
| Bell de notificações | Noop | ❌ |
| Botão "Chamar Sara IA" | Noop | ❌ |
| "Ver tudo" (seção tarefas) | Navega para `/app/tarefas` | ✅ |
| "Filtrar" (seção tarefas) | Noop | ❌ |
| Ícone WhatsApp por tarefa | Noop | ❌ |
| Ícone Eye por tarefa | Noop | ❌ |

---

### KanbanPage

| Elemento | Comportamento | Status |
|----------|---------------|--------|
| Toggle Kanban / Lista | Muda `viewMode` | ✅ |
| Drag de card entre colunas | Reordena (@dnd-kit) | ✅ |
| Click em card | Abre `LeadModal` | ✅ |
| Filtros (Em Aberto, Tags, Transferência) | Noop | ❌ |
| Botão "Novo Lead" | Noop | ❌ |
| Ícone WhatsApp no card | Noop | ❌ |
| Grupos colapsáveis (vista lista) | Alternam visibilidade | ✅ |
| LeadModal — Concluir / Editar / Excluir | Noop | ❌ |
| LeadModal — campo de comentário | Sem submit | ❌ |
| LeadModal — fechar (X, Escape, backdrop) | Fecha modal | ✅ |

---

### TarefasPage

| Elemento | Comportamento | Status |
|----------|---------------|--------|
| Toggle Lista / Calendário / Gantt | Muda view | ✅ |
| Chips de status (Pendente, Atrasada…) | Filtra tarefas | ✅ |
| Calendário prev/next + "Hoje" | Navega mês | ✅ |
| Click em tarefa (lista) | Abre `TaskModal` | ✅ |
| Search input | Noop — sem handler | ❌ |
| Botão "Nova atividade" | Noop | ❌ |
| Seletor de período | Noop | ❌ |
| TaskModal — Concluir / Editar / Excluir | Noop | ❌ |
| TaskModal — campo de comentário | Sem submit | ❌ |
| TaskModal — fechar (X, Escape, backdrop) | Fecha modal | ✅ |
| Gantt — setas de semana (prev/next) | Noop | ❌ |

---

### MetasPage

| Elemento | Comportamento | Status |
|----------|---------------|--------|
| (nenhum elemento clicável) | — | — |
| Stepper de níveis | Visual apenas | ✅ |
| Cards de meta | Visual apenas | ✅ |

---

### PerfilPage

| Elemento | Comportamento | Status |
|----------|---------------|--------|
| Bell de notificações | Noop | ❌ |
| Settings icon | Noop | ❌ |
| Botão "Compartilhar Perfil" | Noop | ❌ |
| Botão "Editar Perfil" (no banner) | Noop | ❌ |
| Botão "Registrar Atividade de Hoje" | Noop | ❌ |
| Badges de conquistas | Noop — sem modal de detalhe | ❌ |

---

### ConfigPage

| Elemento | Comportamento | Status |
|----------|---------------|--------|
| Hub items (Preferências, Equipe…) | Navega para sub-view interna | ✅ |
| Breadcrumb "Configurações" (voltar) | Volta para hub | ✅ |
| Sub-views: Preferências / Notificações / Segurança / Organização / Atividade | Renderiza stub "Em desenvolvimento" | 🔶 Stub |
| Equipe — search | Filtra usuários localmente | ✅ |
| Equipe — context menu (…) | Abre / fecha menu | ✅ |
| Equipe — "Editar permissões" | Noop | ❌ |
| Equipe — "Redefinir senha" | Noop | ❌ |
| Equipe — "Desativar usuário" | Noop | ❌ |
| "Adicionar usuário" | Noop | ❌ |
| "Filtros" | Noop | ❌ |
| "Alterar forma de pagamento" | Noop | ❌ |
| Faturas "Baixar PDF" | Noop | ❌ |
| "Cancelar assinatura" | Noop | ❌ |

---

### LoginPage

| Elemento | Comportamento | Status |
|----------|---------------|--------|
| Input Email | Validação frontend (regex) | ✅ |
| Input Senha | Validação frontend (min 6 chars) | ✅ |
| Toggle visibilidade senha | Alterna `type="text/password"` | ✅ |
| Checkbox "Lembrar de mim" | Estado local | ✅ |
| "Esqueceu sua senha?" | `href="/recuperar-senha"` — rota não existe | ❌ |
| Botão "Acessar Plataforma" | `signIn` mutation — Supabase Auth real | ✅ |
| Botão "Google Workspace" | Noop | ❌ |
| "Fale com o suporte" link | `href="/suporte"` — rota não existe | ❌ |

---

## 4. Modais Implementados

### LeadModal (KanbanPage)
- **Abre ao:** clicar em qualquer card do Kanban ou da Vista Lista
- **Fecha ao:** botão X, tecla Escape, click no backdrop
- **Conteúdo:** dados do lead (nome, tipo, status, lead, data), detalhes, histórico, comentário
- **Ações funcionais:** fechar
- **Ações sem handler:** Concluir, Editar, Excluir, submit do comentário

### TaskModal (TarefasPage)
- **Abre ao:** clicar em tarefa na Vista Lista
- **Fecha ao:** botão X, tecla Escape, click no backdrop
- **Conteúdo:** breadcrumb, título, status badge, meta strip (lead + data), botões de ação, detalhes (6 attrs em grid), observações, histórico de atividades, campo de comentário
- **Ações funcionais:** fechar
- **Ações sem handler:** Concluir, Editar, Excluir, submit do comentário

### ComingSoonPage — Modal de feedback
- **Abre ao:** clicar em "Não vejo necessidade"
- **Fecha ao:** "Sair sem comentar" ou "Enviar feedback" (ambos voltam para `-1`)
- **Conteúdo:** textarea de motivo, 2 botões
- **Observação:** envio real para API marcado como TODO no código

---

## 5. Dados: Mock vs Real

| Fonte de dados | Status |
|----------------|--------|
| Autenticação (login/logout) | ✅ Supabase Auth real |
| Usuário logado (nome, email) | ⚠️ Nome hardcoded "Ennyo Café" — deve vir da sessão |
| Tier do usuário (`USER_TIER`) | ❌ Hardcoded `'diamante'` em `kanban-mock.ts` |
| Leads do Kanban (`INITIAL_BOARD`) | ❌ Mock em `kanban-mock.ts` |
| Tarefas (`TASKS`) | ❌ Mock em `TarefasPage.tsx` |
| Metas (`MOCK_METAS`) | ❌ Mock em `MetasPage.tsx` |
| Dados de perfil (XP, badges, streak) | ❌ Mock em `PerfilPage.tsx` |
| Equipe (Config) | ❌ Mock em `ConfigPage.tsx` |
| Faturas (Config) | ❌ Mock em `ConfigPage.tsx` |

---

## 6. Mapa de Melhorias Priorizadas

### 🔴 P1 — Crítico (quebra o fluxo do usuário)

| # | Onde | Problema | Solução |
|---|------|----------|---------|
| 1 | KanbanPage | "Novo Lead" sem ação | Modal/drawer de criação de lead com campos básicos |
| 2 | TarefasPage | "Nova atividade" sem ação | Modal de criação de tarefa |
| 3 | TarefasPage | Search sem handler | Ligar input ao filtro de `TASKS` por título/lead |
| 4 | TaskModal | Concluir / Editar / Excluir sem ação | Handlers que atualizam estado local (mock-first) |
| 5 | LeadModal | Concluir / Editar / Excluir sem ação | Idem — handlers com estado local |
| 6 | Config/Equipe | "Adicionar usuário" sem ação | Modal de convite por e-mail |
| 7 | Config/Equipe | Editar / Desativar sem ação | Handlers com atualização local do array de usuários |
| 8 | Sidebar | Toggle Claro/Escuro não funciona | Implementar dark mode via CSS custom properties + `data-theme` no `<html>` |

### 🟡 P2 — Importante (confunde ou frustra)

| # | Onde | Problema | Solução |
|---|------|----------|---------|
| 9 | Sidebar | Logo sem ação | Logo → navega para `/app/home` |
| 10 | Sidebar | Company selector sem dropdown | Dropdown com lista de workspaces (mock) |
| 11 | PerfilPage | "Editar Perfil" sem ação | Formulário inline ou modal com campos editáveis |
| 12 | PerfilPage | Badges sem detalhe | Modal de badge (descrição, progresso, como desbloquear) |
| 13 | TarefasPage | Gantt setas sem ação | Navegação de semana no estado local |
| 14 | Config | "Cancelar assinatura" sem confirmação | Modal de confirmação com campo de motivo |
| 15 | Config | "Baixar PDF" sem ação | Toast "Em breve" ou link placeholder |
| 16 | HomePage | WhatsApp / Eye sem ação | WhatsApp → `window.open` com link; Eye → abre TaskModal |
| 17 | LoginPage | "Esqueceu a senha?" aponta para rota inexistente | Implementar rota `/recuperar-senha` ou modal inline |
| 18 | LoginPage | Botão Google sem handler | Toast "Disponível em breve" |

### 🟢 P3 — UX Polish

| # | Onde | Problema | Solução |
|---|------|----------|---------|
| 19 | Global | Nenhum empty state | Ilustração + texto quando lista vazia |
| 20 | Tarefas / Kanban | Sem "nenhum resultado" ao filtrar | Estado vazio de busca com sugestão de limpar filtro |
| 21 | TaskModal / LeadModal | Comentário sem envio | Botão "Enviar" ou submit com Enter |
| 22 | Config/Equipe | Paginação fake (2 páginas mock) | Paginação funcional com slice dos dados |
| 23 | Config | Sub-views são stubs | Implementar Preferências (tema, idioma) e Segurança (troca de senha) |
| 24 | Kanban | Sem highlight de drop zone durante drag | Highlight visual da coluna-alvo no DnD |
| 25 | Kanban | Filtros inertes | Ao menos filtro "Em Aberto" funcional |
| 26 | PerfilPage | "Registrar Atividade" sem ação | Seletor rápido de tipo de atividade |
| 27 | Global | Sem toast de feedback após ações | Sistema de toast (sucesso / erro) |
| 28 | Config | Links do footer sem destino | Rotas ou links externos reais |
| 29 | Global | Dados do usuário logado hardcoded | Ler nome/email da sessão Supabase |
| 30 | Global | Tier hardcoded em `kanban-mock.ts` | Ler tier via API ou sessão |

---

## 7. Stubs Dentro do ConfigPage

As seguintes sub-views dentro de `/app/config` renderizam apenas mensagem "Em desenvolvimento":

- **Preferências** — idioma, fuso horário, aparência
- **Notificações** — e-mail, push, alertas
- **Segurança** — senha, 2FA, sessões ativas
- **Organização** — nome, logo, dados da empresa
- **Atividade** — log de auditoria

---

## 8. Observações Finais

- O app tem **excelente cobertura visual** — todas as páginas principais estão implementadas e fidelizadas ao design Figma
- A **camada de interatividade** é o maior gap: maioria dos botões de ação são no-ops
- A **próxima fase** deve focar em P1 para o app se sentir "vivo" mesmo com dados mock, antes de integrar com API real
- O **dark mode** é o item de maior retorno de percepção de qualidade (sidebar já tem toggle, só falta o handler)
