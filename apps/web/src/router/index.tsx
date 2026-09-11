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
import { HomePage } from '../pages/home/HomePage'
import { MetasPage } from '../pages/metas/MetasPage'
import { LoginPage } from '../pages/login/LoginPage'

export function AppRouter() {
  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rotas protegidas */}
      <Route path="/app" element={<ProtectedRoute />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<HomePage />} />
        <Route path="metas" element={<MetasPage />} />
        {/* Futuras rotas: pipeline, clientes, relatorios */}
      </Route>

      {/* Raiz → home */}
      <Route path="/" element={<Navigate to="/app/home" replace />} />

      {/* 404 → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
