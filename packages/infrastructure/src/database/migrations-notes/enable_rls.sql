-- Ativa Row Level Security em todas as tabelas do schema public, sem criar
-- nenhuma policy (default-deny para os roles anon/authenticated do PostgREST).
--
-- Contexto (ADR-12 §8): o backend acessa o banco com a service key do
-- Supabase, que ignora RLS (BYPASSRLS) — a autorização real é aplicada na
-- camada Application (authMiddleware/tenantMiddleware/permissions). Sem RLS,
-- porém, qualquer pessoa de posse da anon key pública (embutida no bundle do
-- frontend, necessária para o Supabase Auth) conseguia ler essas tabelas
-- direto pela API REST do PostgREST, pulando o backend inteiro — foi
-- confirmado que organizations, users, organization_memberships e leads
-- estavam totalmente legíveis dessa forma antes desta migration.
--
-- Aplicado manualmente em produção em 2026-09-15 (fora do fluxo normal de
-- db:push, que só reflete diffs de schema.ts — RLS não é modelado no Drizzle
-- aqui). Este arquivo documenta a mudança para manter o histórico e cobrir
-- ambientes futuros.
--
-- Fica fora de migrations/ (não migrations-notes/) de propósito: drizzle-kit
-- numera migrations reais só pelo journal, sem olhar o filesystem, então um
-- arquivo manual numerado ali colide cedo ou tarde com a próxima migration
-- real gerada (já aconteceu 3x nesta sequência: 0005→0006→0007→0008→0009).

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
