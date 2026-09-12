// Fonte única de dados mock do Kanban.
// Importado por KanbanPage, LeadModal e HomePage para garantir consistência.

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface CardData {
  id: string
  name: string
  phone: string
  cota: string
  date: string
  agent: string
  source: string
  sourceBg: string
  sourceText: string
  days: string
  daysUrgent: boolean
}

export interface ColumnMeta {
  id: string
  name: string
  headerBg: string
  headerBorder: string
  headerText: string
  countText: string
}

// ── Usuário admin (placeholder até integração com API) ────────────────────────

// Tier do usuário autenticado — fonte única de verdade para toda a UI
export const USER_TIER = 'diamante' as const

export const ADMIN_USER = {
  name: 'Ennyo Café',
  team: 'Porthis',
  photo: '/sara-profile.png',
}

export function getAgentProfile(_name: string) {
  return ADMIN_USER
}

// ── Metadados das colunas ─────────────────────────────────────────────────────

export const COLUMN_META: ColumnMeta[] = [
  {
    id: 'lead',
    name: 'Lead',
    headerBg: 'rgba(226,232,240,0.7)',
    headerBorder: 'rgba(203,213,225,0.5)',
    headerText: '#1e293b',
    countText: '#334155',
  },
  {
    id: 'atendimento',
    name: 'Em Atendimento',
    headerBg: 'rgba(254,243,199,0.7)',
    headerBorder: '#fde68a',
    headerText: '#451a03',
    countText: '#92400e',
  },
  {
    id: 'simulacao',
    name: 'Simulação',
    headerBg: 'rgba(237,233,254,0.7)',
    headerBorder: '#ddd6fe',
    headerText: '#2e1065',
    countText: '#5b21b6',
  },
  {
    id: 'proposta',
    name: 'Proposta',
    headerBg: 'rgba(255,228,230,0.7)',
    headerBorder: '#fecdd3',
    headerText: '#4c0519',
    countText: '#9f1239',
  },
  {
    id: 'fechado',
    name: 'Fechado',
    headerBg: 'rgba(224,242,254,0.7)',
    headerBorder: '#bae6fd',
    headerText: '#082f49',
    countText: '#075985',
  },
  {
    id: 'venda',
    name: 'Venda Concluída',
    headerBg: 'rgba(209,250,229,0.7)',
    headerBorder: '#a7f3d0',
    headerText: '#022c22',
    countText: '#065f46',
  },
]

// ── Board inicial ─────────────────────────────────────────────────────────────

export const INITIAL_BOARD: Record<string, CardData[]> = {
  lead: [
    {
      id: 'c1',
      name: 'Aparecido Oliveira E Silva',
      phone: '(11) 94868-0815',
      cota: 'Cota R$ 350.000 (Imobiliário)',
      date: '01/06/2026',
      agent: ADMIN_USER.name,
      source: 'FACEBOOK',
      sourceBg: '#2563eb',
      sourceText: '#fff',
      days: '101d',
      daysUrgent: true,
    },
    {
      id: 'c2',
      name: 'Yuri Nunes',
      phone: '(11) 98937-8401',
      cota: 'Cota R$ 120.000 (Auto)',
      date: '28/05/2026',
      agent: ADMIN_USER.name,
      source: 'FACEBOOK',
      sourceBg: '#2563eb',
      sourceText: '#fff',
      days: '106d',
      daysUrgent: true,
    },
    {
      id: 'c3',
      name: 'David Alex',
      phone: '(11) 93934-0525',
      cota: 'Cota R$ 500.000 (Imóvel Alto)',
      date: '25/05/2026',
      agent: ADMIN_USER.name,
      source: 'FACEBOOK',
      sourceBg: '#2563eb',
      sourceText: '#fff',
      days: '109d',
      daysUrgent: true,
    },
    {
      id: 'c4',
      name: 'Silvana Dos Santos Saraiva',
      phone: '(11) 97955-9513',
      cota: 'Cota R$ 220.000 (Imobiliário)',
      date: '25/05/2026',
      agent: ADMIN_USER.name,
      source: 'FACEBOOK',
      sourceBg: '#2563eb',
      sourceText: '#fff',
      days: '104d',
      daysUrgent: true,
    },
  ],
  atendimento: [
    {
      id: 'c5',
      name: 'Mario Laurentino De Sa',
      phone: '(11) 91234-5678',
      cota: 'Cota R$ 280.000 (Imobiliário)',
      date: '15/06/2026',
      agent: ADMIN_USER.name,
      source: 'INSTAGRAM',
      sourceBg: '#7c3aed',
      sourceText: '#fff',
      days: '42d',
      daysUrgent: false,
    },
    {
      id: 'c6',
      name: 'Fernanda Lima Costa',
      phone: '(11) 99876-5432',
      cota: 'Cota R$ 180.000 (Pesado)',
      date: '10/06/2026',
      agent: ADMIN_USER.name,
      source: 'INDICAÇÃO',
      sourceBg: '#059669',
      sourceText: '#fff',
      days: '67d',
      daysUrgent: true,
    },
    {
      id: 'c7',
      name: 'Roberto Carlos Meireles',
      phone: '(11) 97654-3210',
      cota: 'Cota R$ 420.000 (Planta)',
      date: '08/06/2026',
      agent: ADMIN_USER.name,
      source: 'FACEBOOK',
      sourceBg: '#2563eb',
      sourceText: '#fff',
      days: '55d',
      daysUrgent: false,
    },
  ],
  simulacao: [
    {
      id: 'c8',
      name: 'Ana Paula Ferreira',
      phone: '(11) 92345-6789',
      cota: 'Cota R$ 300.000 (Imobiliário)',
      date: '20/06/2026',
      agent: ADMIN_USER.name,
      source: 'SITE',
      sourceBg: '#334155',
      sourceText: '#fff',
      days: '28d',
      daysUrgent: false,
    },
    {
      id: 'c9',
      name: 'Carlos Eduardo Souza',
      phone: '(11) 98765-4321',
      cota: 'Cota R$ 150.000 (Veículo)',
      date: '18/06/2026',
      agent: ADMIN_USER.name,
      source: 'FACEBOOK',
      sourceBg: '#2563eb',
      sourceText: '#fff',
      days: '33d',
      daysUrgent: false,
    },
    {
      id: 'c10',
      name: 'Patricia Mendes Rocha',
      phone: '(11) 91111-2222',
      cota: 'Cota R$ 600.000 (Comercial)',
      date: '12/06/2026',
      agent: ADMIN_USER.name,
      source: 'INDICAÇÃO',
      sourceBg: '#059669',
      sourceText: '#fff',
      days: '48d',
      daysUrgent: false,
    },
  ],
  proposta: [
    {
      id: 'c11',
      name: 'Juliana Alves Pinto',
      phone: '(11) 93333-4444',
      cota: 'Cota R$ 250.000 (Condomínio)',
      date: '22/06/2026',
      agent: ADMIN_USER.name,
      source: 'INSTAGRAM',
      sourceBg: '#7c3aed',
      sourceText: '#fff',
      days: '14d',
      daysUrgent: false,
    },
    {
      id: 'c12',
      name: 'Marcos Antonio Lima',
      phone: '(11) 95555-6666',
      cota: 'Cota R$ 190.000 (Terreno)',
      date: '21/06/2026',
      agent: ADMIN_USER.name,
      source: 'FACEBOOK',
      sourceBg: '#2563eb',
      sourceText: '#fff',
      days: '19d',
      daysUrgent: false,
    },
  ],
  fechado: [
    {
      id: 'c13',
      name: 'Luisa Rodrigues Santos',
      phone: '(11) 97777-8888',
      cota: '2 Cotas R$ 400.000 (800k)',
      date: '25/06/2026',
      agent: ADMIN_USER.name,
      source: 'INDICAÇÃO',
      sourceBg: '#059669',
      sourceText: '#fff',
      days: '7d',
      daysUrgent: false,
    },
    {
      id: 'c14',
      name: 'Diego Henrique Barbosa',
      phone: '(11) 99999-0000',
      cota: 'Cota R$ 260.000 (SUV)',
      date: '24/06/2026',
      agent: ADMIN_USER.name,
      source: 'FACEBOOK',
      sourceBg: '#2563eb',
      sourceText: '#fff',
      days: '11d',
      daysUrgent: false,
    },
  ],
  venda: [
    {
      id: 'c15',
      name: 'Beatriz Cunha Moraes',
      phone: '(11) 91234-9876',
      cota: 'Cota R$ 550.000 (Imobiliário)',
      date: '30/06/2026',
      agent: ADMIN_USER.name,
      source: 'INDICAÇÃO',
      sourceBg: '#059669',
      sourceText: '#fff',
      days: '2d',
      daysUrgent: false,
    },
    {
      id: 'c16',
      name: 'Thiago Monteiro Alves',
      phone: '(11) 98765-1234',
      cota: 'Cota R$ 130.000 (Automóvel)',
      date: '28/06/2026',
      agent: ADMIN_USER.name,
      source: 'SITE',
      sourceBg: '#334155',
      sourceText: '#fff',
      days: '5d',
      daysUrgent: false,
    },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extrai segmento e valor da string de cota. Ex: 'Cota R$ 350.000 (Imobiliário)' */
export function parseCotaFields(cota: string): { segmento: string; valor: string } {
  const typeMatch = cota.match(/\((.+)\)/)
  const valueMatch = cota.match(/R\$\s*[\d.,]+/)
  return {
    segmento: typeMatch?.[1] ?? cota,
    valor: valueMatch?.[0] ?? '',
  }
}

// ── Mapeamentos por coluna ────────────────────────────────────────────────────

/** Status que aparece no badge da tabela de tarefas da HomePage */
export const COLUMN_STATUS_LABEL: Record<string, 'Atendimento' | 'Simulação' | 'Proposta'> = {
  lead: 'Atendimento',
  atendimento: 'Atendimento',
  simulacao: 'Simulação',
  proposta: 'Proposta',
  fechado: 'Proposta',
}

/** Próxima ação esperada para cada etapa do funil */
export const COLUMN_TAREFA_LABEL: Record<string, string> = {
  lead: 'Primeiro Contato',
  atendimento: 'Follow-Up',
  simulacao: 'Enviar Simulação',
  proposta: 'Negociar Proposta',
  fechado: 'Formalização',
}
