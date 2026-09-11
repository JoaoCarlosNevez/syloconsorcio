// Router — configuração de rotas do SyloCRM.
//
// Estrutura:
//   /login        → público; redireciona para /app se já autenticado
//   /app/*        → protegido (requer autenticação via ProtectedRoute)
//   /app/dashboard → área mínima da Etapa 07 para provar o fluxo
//   *             → 404 (redireciona para /login)
//
// ADR-12: ProtectedRoute verifica sessão antes de renderizar área autenticada.

import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import { ComingSoonPage } from '../pages/coming-soon/ComingSoonPage'
import { HomePage } from '../pages/home/HomePage'
import { LoginPage } from '../pages/login/LoginPage'
import { MetasPage } from '../pages/metas/MetasPage'

export function AppRouter() {
  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rotas protegidas */}
      <Route path="/app" element={<ProtectedRoute />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home"     element={<HomePage />} />
        <Route path="metas"    element={<MetasPage />} />
        {/* Rotas em desenvolvimento — exibem ComingSoonPage */}
        <Route path="kanban"   element={<ComingSoonPage />} />
        <Route path="tarefas"  element={<ComingSoonPage />} />
        <Route path="usuarios" element={<ComingSoonPage />} />
        <Route path="fila"     element={<ComingSoonPage />} />
        <Route path="config"   element={<ComingSoonPage />} />
        <Route path="admin"    element={<ComingSoonPage />} />
        <Route path="ajuda"    element={<ComingSoonPage />} />
        <Route path="sara"     element={<ComingSoonPage />} />
      </Route>

      {/* Raiz → home */}
      <Route path="/" element={<Navigate to="/app/home" replace />} />

      {/* 404 → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
