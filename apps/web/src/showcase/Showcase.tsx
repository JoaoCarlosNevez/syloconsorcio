import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  DataTable,
  Divider,
  Drawer,
  Dropdown,
  EmptyState,
  FilterButton,
  Input,
  KpiCard,
  Modal,
  NavLink,
  Pagination,
  ProgressBar,
  ProgressCard,
  Skeleton,
  SkeletonCard,
  SkeletonText,
  StatusDot,
  Switch,
  Tabs,
  TierBadge,
  ToastProvider,
  Tooltip,
  useToast,
} from '@sylocrm/ui'
import type { ColumnDef } from '@sylocrm/ui'
/**
 * Design system showcase — visual test page for all UI components.
 * Not a product screen. Route: accessible via a query param or direct URL in dev.
 */
import { useState } from 'react'
import type { ReactNode } from 'react'

interface SampleRow {
  id: string
  name: string
  tier: string
  status: string
  value: string
}

const TABLE_COLUMNS: ColumnDef<SampleRow>[] = [
  { key: 'name', header: 'Nome', sortable: true, render: (r) => r.name },
  {
    key: 'tier',
    header: 'Tier',
    render: (r) => <TierBadge tier={r.tier as 'platina' | 'diamante' | 'rubi' | 'turmalina'} />,
  },
  {
    key: 'status',
    header: 'Status',
    render: (r) => (
      <Badge variant="green" dot>
        {r.status}
      </Badge>
    ),
  },
  { key: 'value', header: 'Valor', render: (r) => r.value },
]

const TABLE_DATA: SampleRow[] = [
  { id: '1', name: 'Ana Souza', tier: 'platina', status: 'Ativo', value: 'R$ 45.000' },
  { id: '2', name: 'Carlos Lima', tier: 'diamante', status: 'Ativo', value: 'R$ 120.000' },
  { id: '3', name: 'Maria Oliveira', tier: 'rubi', status: 'Ativo', value: 'R$ 28.000' },
]

function ToastDemo() {
  const { toast } = useToast()
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          toast({
            type: 'success',
            title: 'Salvo com sucesso!',
            description: 'As alterações foram aplicadas.',
          })
        }
      >
        Success
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          toast({
            type: 'error',
            title: 'Erro ao salvar',
            description: 'Verifique sua conexão e tente novamente.',
          })
        }
      >
        Error
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          toast({ type: 'warning', title: 'Atenção', description: 'Este campo está incompleto.' })
        }
      >
        Warning
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          toast({ type: 'info', title: 'Dica', description: 'Você pode filtrar por período.' })
        }
      >
        Info
      </Button>
    </div>
  )
}

export function Showcase() {
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [checked, setChecked] = useState(false)
  const [switchOn, setSwitchOn] = useState(false)
  const [page, setPage] = useState(1)
  const [filterActive, setFilterActive] = useState(false)
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function handleSort(key: string) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <ToastProvider>
      <div
        style={{
          fontFamily: 'var(--font-family-base)',
          color: 'var(--color-text-primary)',
          padding: '2rem',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <h1 style={{ marginBottom: '0.25rem' }}>SyloCRM — Design System</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '3rem', fontSize: '0.875rem' }}>
          Showcase de componentes — Etapa 05
        </p>

        {/* ── TOKENS ── */}
        <Section title="Tokens — Cores">
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              ['--color-accent', '#ffa705', 'Accent'],
              ['--color-accent-light', '#ffeab1', 'Accent Light'],
              ['--color-text-primary', '#0f172a', 'Text Primary'],
              ['--color-text-secondary', '#475569', 'Text Secondary'],
              ['--color-bg-card', '#fff', 'BG Card'],
              ['--color-bg-subtle', '#f8fafc', 'BG Subtle'],
              ['--color-emerald-500', '#10b981', 'Emerald'],
              ['--color-error', '#ef4444', 'Error'],
            ].map(([, hex, label]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    background: hex,
                    border: '1px solid var(--color-border-default)',
                  }}
                />
                <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Divider label="Componentes Figma" />

        {/* ── BUTTON ── */}
        <Section title="Button">
          <Row>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </Row>
          <Row>
            <Button fullWidth>Full Width</Button>
          </Row>
        </Section>

        {/* ── INPUT ── */}
        <Section title="Input">
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: 600 }}
          >
            <Input
              label="Email"
              placeholder="consultor@empresa.com"
              type="email"
              leftIcon={<MailIcon />}
            />
            <Input
              label="Senha"
              type="password"
              passwordToggle
              placeholder="••••••••"
              leftIcon={<LockIcon />}
            />
            <Input
              label="CNPJ"
              placeholder="00.000.000/0001-00"
              helperText="Digite apenas números"
            />
            <Input
              label="Campo com erro"
              errorMessage="Este campo é obrigatório"
              defaultValue="valor inválido"
            />
          </div>
        </Section>

        {/* ── CHECKBOX + SWITCH ── */}
        <Section title="Checkbox & Switch">
          <Row>
            <Checkbox
              label="Aceito os termos"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <Checkbox label="Desabilitado" disabled />
            <Checkbox label="Marcado" defaultChecked />
            <Checkbox label="Indeterminate" indeterminate />
          </Row>
          <Row>
            <Switch
              label="Notificações"
              checked={switchOn}
              onChange={(e) => setSwitchOn(e.target.checked)}
            />
            <Switch label="Modo escuro" defaultChecked />
            <Switch label="Desabilitado" disabled />
          </Row>
        </Section>

        {/* ── BADGE ── */}
        <Section title="Badge">
          <Row>
            <Badge variant="amber" dot>
              Pendente
            </Badge>
            <Badge variant="green" dot>
              Ativo
            </Badge>
            <Badge variant="blue" dot>
              Em análise
            </Badge>
            <Badge variant="red">Cancelado</Badge>
            <Badge variant="slate">Rascunho</Badge>
            <Badge variant="purple">Beta</Badge>
          </Row>
        </Section>

        {/* ── TIER BADGE ── */}
        <Section title="TierBadge">
          <Row>
            <TierBadge tier="platina" />
            <TierBadge tier="diamante" />
            <TierBadge tier="rubi" />
            <TierBadge tier="turmalina" />
          </Row>
        </Section>

        {/* ── AVATAR ── */}
        <Section title="Avatar">
          <Row>
            <Avatar initials="AS" size="sm" />
            <Avatar initials="CL" size="md" tier="platina" />
            <Avatar initials="MO" size="lg" tier="diamante" showStatus />
            <Avatar initials="JP" size="xl" tier="rubi" />
          </Row>
        </Section>

        {/* ── STATUS DOT ── */}
        <Section title="StatusDot">
          <Row>
            <StatusDot status="online" />
            <span style={{ fontSize: '0.875rem' }}>Online</span>
            <StatusDot status="online" pulse />
            <span style={{ fontSize: '0.875rem' }}>Online + pulse</span>
            <StatusDot status="busy" />
            <span style={{ fontSize: '0.875rem' }}>Ocupado</span>
            <StatusDot status="offline" />
            <span style={{ fontSize: '0.875rem' }}>Offline</span>
          </Row>
        </Section>

        {/* ── PROGRESS BAR ── */}
        <Section title="ProgressBar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
            <ProgressBar value={72} label="Meta do time" showValue />
            <ProgressBar value={45} label="Cotas vendidas" showValue variant="amber" />
            <ProgressBar value={90} label="Clientes ativos" showValue variant="blue" />
            <ProgressBar value={20} label="Inadimplência" showValue variant="red" />
          </div>
        </Section>

        {/* ── DIVIDER ── */}
        <Section title="Divider">
          <Divider />
          <div style={{ marginTop: '0.75rem' }}>
            <Divider label="ou continue com" />
          </div>
        </Section>

        <Divider label="Componentes Extensão" />

        {/* ── SKELETON ── */}
        <Section title="Skeleton">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
              maxWidth: 600,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                SkeletonText
              </p>
              <SkeletonText lines={3} />
            </div>
            <div>
              <p
                style={{
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                SkeletonCard
              </p>
              <SkeletonCard height="6rem" />
            </div>
            <div>
              <p
                style={{
                  fontSize: '0.75rem',
                  marginBottom: '0.5rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                Circle
              </p>
              <Skeleton variant="circle" width="3rem" height="3rem" />
            </div>
          </div>
        </Section>

        {/* ── TOOLTIP ── */}
        <Section title="Tooltip">
          <Row>
            <Tooltip content="Salvar alterações" position="top">
              <Button size="sm" variant="secondary">
                Hover me (top)
              </Button>
            </Tooltip>
            <Tooltip content="Ir para relatórios" position="right">
              <Button size="sm" variant="secondary">
                Hover me (right)
              </Button>
            </Tooltip>
            <Tooltip content="Excluir permanentemente" position="bottom">
              <Button size="sm" variant="danger">
                Hover me (bottom)
              </Button>
            </Tooltip>
          </Row>
        </Section>

        {/* ── MODAL ── */}
        <Section title="Modal">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Abrir modal
          </Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Confirmar ação"
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setModalOpen(false)}>Confirmar</Button>
              </>
            }
          >
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Tem certeza que deseja realizar esta operação? Esta ação não pode ser desfeita.
            </p>
          </Modal>
        </Section>

        {/* ── DRAWER ── */}
        <Section title="Drawer">
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
            Abrir drawer
          </Button>
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Filtros avançados"
            side="right"
            footer={
              <>
                <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
                  Limpar
                </Button>
                <Button onClick={() => setDrawerOpen(false)}>Aplicar</Button>
              </>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input label="Período" type="date" />
              <Input label="CNPJ" placeholder="00.000.000/0001-00" />
              <Checkbox label="Somente ativos" defaultChecked />
              <Checkbox label="Incluir cancelados" />
            </div>
          </Drawer>
        </Section>

        {/* ── TOAST ── */}
        <Section title="Toast">
          <ToastDemo />
        </Section>

        {/* ── TABS ── */}
        <Section title="Tabs">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'overview',
                label: 'Visão geral',
                content: (
                  <p style={{ color: 'var(--color-text-secondary)' }}>
                    Conteúdo da aba Visão geral.
                  </p>
                ),
              },
              {
                key: 'details',
                label: 'Detalhes',
                content: (
                  <p style={{ color: 'var(--color-text-secondary)' }}>Conteúdo da aba Detalhes.</p>
                ),
              },
              {
                key: 'history',
                label: 'Histórico',
                content: (
                  <p style={{ color: 'var(--color-text-secondary)' }}>Conteúdo da aba Histórico.</p>
                ),
              },
              { key: 'disabled', label: 'Desabilitado', disabled: true, content: null },
            ]}
          />
        </Section>

        {/* ── DROPDOWN ── */}
        <Section title="Dropdown">
          <Row>
            <Dropdown
              trigger={
                <Button variant="secondary" size="sm">
                  Ações ▾
                </Button>
              }
              items={[
                { key: 'edit', label: 'Editar', onSelect: () => alert('Edit') },
                { key: 'copy', label: 'Duplicar', onSelect: () => alert('Copy') },
                { key: 'sep', type: 'separator' },
                { key: 'delete', label: 'Excluir', danger: true, onSelect: () => alert('Delete') },
              ]}
            />
            <Dropdown
              align="right"
              trigger={<Button size="sm">Conta ▾</Button>}
              items={[
                { key: 'lbl', type: 'label', label: 'Minha conta' },
                { key: 'profile', label: 'Perfil', onSelect: () => {} },
                { key: 'settings', label: 'Configurações', onSelect: () => {} },
                { key: 'sep', type: 'separator' },
                { key: 'logout', label: 'Sair', danger: true, onSelect: () => {} },
              ]}
            />
          </Row>
        </Section>

        {/* ── PAGINATION ── */}
        <Section title="Pagination">
          <Pagination page={page} totalPages={12} onPageChange={setPage} showInfo />
        </Section>

        {/* ── FILTER BUTTON ── */}
        <Section title="FilterButton">
          <Row>
            <FilterButton
              active={filterActive}
              count={filterActive ? 3 : 0}
              onClick={() => setFilterActive((v) => !v)}
            >
              Filtros
            </FilterButton>
            <FilterButton>Período</FilterButton>
            <FilterButton disabled>Desabilitado</FilterButton>
          </Row>
        </Section>

        <Divider label="Padrões (Patterns)" />

        {/* ── KPI CARDS ── */}
        <Section title="KpiCard">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <KpiCard
              label="Total de vendas"
              value="R$ 248.000"
              delta="+12% vs mês anterior"
              deltaDirection="positive"
              footer="Últimos 30 dias"
            />
            <KpiCard
              label="Novos clientes"
              value="38"
              delta="-4% vs mês anterior"
              deltaDirection="negative"
            />
            <KpiCard
              label="Taxa de conversão"
              value="24,5%"
              delta="Estável"
              deltaDirection="neutral"
            />
            <KpiCard
              label="Ticket médio"
              value="R$ 6.526"
              delta="+8% vs mês anterior"
              deltaDirection="positive"
            />
          </div>
        </Section>

        {/* ── PROGRESS CARDS ── */}
        <Section title="ProgressCard">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            <ProgressCard
              title="Meta do time — Julho"
              value={72}
              badge={<Badge variant="green">No prazo</Badge>}
            />
            <ProgressCard
              title="Cotas individuais"
              value={48}
              badge={<Badge variant="amber">Atenção</Badge>}
              variant="amber"
            />
            <ProgressCard title="Clientes fidelizados" value={91} variant="blue" />
          </div>
        </Section>

        {/* ── NAV LINK ── */}
        <Section title="NavLink">
          <div style={{ background: '#17351f', borderRadius: 12, padding: '1rem', width: 240 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <NavLink label="Dashboard" href="#" active icon={<HomeIcon />} />
              <NavLink label="Consultores" href="#" icon={<UsersIcon />} />
              <NavLink
                label="Relatórios"
                href="#"
                icon={<BarIcon />}
                badge={<Badge variant="amber">3</Badge>}
              />
              <NavLink label="Configurações" href="#" icon={<SettingsIcon />} />
            </div>
          </div>
        </Section>

        {/* ── DATA TABLE ── */}
        <Section title="DataTable">
          <DataTable
            columns={TABLE_COLUMNS}
            data={TABLE_DATA}
            rowKey={(r) => r.id}
            sortKey={sortKey}
            sortDirection={sortDir}
            onSort={handleSort}
          />
          <div style={{ marginTop: '1.5rem' }}>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                marginBottom: '0.5rem',
              }}
            >
              Estado vazio:
            </p>
            <DataTable
              columns={TABLE_COLUMNS}
              data={[]}
              rowKey={(r) => r.id}
              emptyTitle="Nenhum consultor encontrado"
              emptyDescription="Ajuste os filtros ou adicione um novo consultor."
            />
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                marginBottom: '0.5rem',
              }}
            >
              Estado loading:
            </p>
            <DataTable
              columns={TABLE_COLUMNS}
              data={[]}
              rowKey={(r) => r.id}
              isLoading
              skeletonRows={3}
            />
          </div>
        </Section>

        {/* ── EMPTY STATE ── */}
        <Section title="EmptyState">
          <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 12 }}>
            <EmptyState
              title="Nenhum resultado encontrado"
              description="Tente ajustar os filtros ou realizar uma nova busca com outros critérios."
              action={<Button size="sm">Limpar filtros</Button>}
            />
          </div>
        </Section>
      </div>
    </ToastProvider>
  )
}

// ── Section layout helpers ──
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-text-muted)',
          marginBottom: '1rem',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
        marginBottom: '0.75rem',
      }}
    >
      {children}
    </div>
  )
}

// ── Inline SVG icons for demo only ──
function MailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function HomeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function BarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
function SettingsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
