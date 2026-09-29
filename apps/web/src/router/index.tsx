// Router — configuração de rotas do SyloCRM.
//
// Estrutura:
//   /login        → público; redireciona para /app se já autenticado
//   /app/*        → protegido (requer autenticação via ProtectedRoute)
//   *             → 404 (redireciona para /login)
//
// Lazy loading: todas as páginas são carregadas sob demanda via React.lazy +
// Suspense, reduzindo o bundle inicial. O fallback é um div vazio — a transição
// é imperceptível em conexões normais e o skeleton da própria página cobre o
// estado de carregamento.

import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'

const LoginPage = lazy(() =>
  import('../pages/login/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const HomePage = lazy(() => import('../pages/home/HomePage').then((m) => ({ default: m.HomePage })))
const MetasPage = lazy(() =>
  import('../pages/metas/MetasPage').then((m) => ({ default: m.MetasPage })),
)
const KanbanPage = lazy(() =>
  import('../pages/kanban/KanbanPage').then((m) => ({ default: m.KanbanPage })),
)
const ComingSoonPage = lazy(() =>
  import('../pages/coming-soon/ComingSoonPage').then((m) => ({ default: m.ComingSoonPage })),
)
const PerfilPage = lazy(() =>
  import('../pages/perfil/PerfilPage').then((m) => ({ default: m.PerfilPage })),
)
const AdminPage = lazy(() =>
  import('../pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })),
)
const AdminOrganizationDetailPage = lazy(() =>
  import('../pages/admin/AdminOrganizationDetailPage').then((m) => ({
    default: m.AdminOrganizationDetailPage,
  })),
)
const TarefasPage = lazy(() =>
  import('../pages/tarefas/TarefasPage').then((m) => ({ default: m.TarefasPage })),
)
const ConfigPage = lazy(() =>
  import('../pages/config/ConfigPage').then((m) => ({ default: m.ConfigPage })),
)

export function AppRouter() {
  return (
    <Suspense fallback={<div style={{ height: '100vh' }} />}>
      <Routes>
        {/* Rota pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rotas protegidas */}
        <Route path="/app" element={<ProtectedRoute />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="metas" element={<MetasPage />} />
          <Route path="kanban" element={<KanbanPage />} />
          <Route path="tarefas" element={<TarefasPage />} />
          {/* Equipe (era uma página própria) virou uma aba dentro de Configurações */}
          <Route path="usuarios" element={<Navigate to="/app/config" replace />} />
          <Route path="fila" element={<ComingSoonPage />} />
          <Route path="config" element={<ConfigPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="admin/:id" element={<AdminOrganizationDetailPage />} />
          <Route path="ajuda" element={<ComingSoonPage />} />
          <Route path="perfil" element={<PerfilPage />} />
        </Route>

        {/* Raiz → home */}
        <Route path="/" element={<Navigate to="/app/home" replace />} />

        {/* 404 → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}
