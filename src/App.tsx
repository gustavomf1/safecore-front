import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import PrivateRoute from './components/PrivateRoute'
import WorkspaceRoute from './components/WorkspaceRoute'
import RoleRoute from './components/RoleRoute'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import SeletorPage from './pages/SeletorPage'
import DashboardPage from './pages/DashboardPage'
import OcorrenciasPage from './pages/OcorrenciasPage'
import OcorrenciaDetailPage from './pages/OcorrenciaDetailPage'
import RegistroOcorrenciaPage from './pages/RegistroOcorrenciaPage'
import TrativasListPage from './pages/TrativasListPage'
import TrativaDetailPage from './pages/TrativaDetailPage'
import EmpresaListPage from './pages/empresa/EmpresaListPage'
import EmpresaFormPage from './pages/empresa/EmpresaFormPage'
import EstabelecimentoListPage from './pages/estabelecimento/EstabelecimentoListPage'
import EstabelecimentoFormPage from './pages/estabelecimento/EstabelecimentoFormPage'
import UsuarioListPage from './pages/usuario/UsuarioListPage'
import UsuarioFormPage from './pages/usuario/UsuarioFormPage'
import LocalizacaoListPage from './pages/localizacao/LocalizacaoListPage'
import LocalizacaoFormPage from './pages/localizacao/LocalizacaoFormPage'
import NormaListPage from './pages/norma/NormaListPage'
import NormaFormPage from './pages/norma/NormaFormPage'
import NormaDetailPage from './pages/norma/NormaDetailPage'
import ConvitePage from './pages/ConvitePage'
import EmailPadraoPage from './pages/emailPadrao/EmailPadraoPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import RelatoriosPage from './pages/relatorios/RelatoriosPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import AccountDeletionPage from './pages/AccountDeletionPage'

function DefaultRedirect() {
  const { user } = useAuth()
  if (user?.perfil === 'EXTERNO') return <Navigate to="/tratativas" replace />
  if (user?.isAdmin) return <Navigate to="/empresas" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <WorkspaceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/convite/:token" element={<ConvitePage />} />
            <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
            <Route path="/privacidade" element={<PrivacyPolicyPage />} />
            <Route path="/exclusao-de-conta" element={<AccountDeletionPage />} />
            <Route path="/selecionar" element={
              <PrivateRoute>
                <SeletorPage />
              </PrivateRoute>
            } />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <WorkspaceRoute>
                    <Layout />
                  </WorkspaceRoute>
                </PrivateRoute>
              }
            >
              <Route index element={<DefaultRedirect />} />
              <Route path="dashboard" element={<RoleRoute allowed={['ENGENHEIRO', 'TECNICO']}><DashboardPage /></RoleRoute>} />
              <Route path="ocorrencias" element={<RoleRoute allowed={['ENGENHEIRO', 'TECNICO']}><OcorrenciasPage /></RoleRoute>} />
              <Route path="ocorrencias/nova" element={<RoleRoute allowed={['ENGENHEIRO', 'TECNICO']}><RegistroOcorrenciaPage /></RoleRoute>} />
              <Route path="ocorrencias/:tipo/:id" element={<RoleRoute allowed={['ENGENHEIRO', 'TECNICO']}><OcorrenciaDetailPage /></RoleRoute>} />
              <Route path="ocorrencias/:tipo/:id/editar" element={<RoleRoute allowed={['ENGENHEIRO', 'TECNICO']}><RegistroOcorrenciaPage /></RoleRoute>} />
              <Route path="tratativas" element={<RoleRoute allowed={['ENGENHEIRO', 'EXTERNO', 'TECNICO']}><TrativasListPage /></RoleRoute>} />
              <Route path="tratativas/:tipo/:id" element={<RoleRoute allowed={['ENGENHEIRO', 'EXTERNO', 'TECNICO']}><TrativaDetailPage /></RoleRoute>} />
              <Route path="empresas" element={<AdminRoute><EmpresaListPage /></AdminRoute>} />
              <Route path="empresas/novo" element={<AdminRoute><EmpresaFormPage /></AdminRoute>} />
              <Route path="empresas/:id/editar" element={<AdminRoute><EmpresaFormPage /></AdminRoute>} />
              <Route path="estabelecimentos" element={<AdminRoute><EstabelecimentoListPage /></AdminRoute>} />
              <Route path="estabelecimentos/novo" element={<AdminRoute><EstabelecimentoFormPage /></AdminRoute>} />
              <Route path="estabelecimentos/:id/editar" element={<AdminRoute><EstabelecimentoFormPage /></AdminRoute>} />
              <Route path="localizacoes" element={<AdminRoute><LocalizacaoListPage /></AdminRoute>} />
              <Route path="localizacoes/novo" element={<AdminRoute><LocalizacaoFormPage /></AdminRoute>} />
              <Route path="localizacoes/:id/editar" element={<AdminRoute><LocalizacaoFormPage /></AdminRoute>} />
              <Route path="usuarios" element={<AdminRoute><UsuarioListPage /></AdminRoute>} />
              <Route path="usuarios/novo" element={<AdminRoute><UsuarioFormPage /></AdminRoute>} />
              <Route path="usuarios/:id/editar" element={<AdminRoute><UsuarioFormPage /></AdminRoute>} />
              <Route path="normas" element={<AdminRoute><NormaListPage /></AdminRoute>} />
              <Route path="normas/nova" element={<AdminRoute><NormaFormPage /></AdminRoute>} />
              <Route path="normas/novo" element={<AdminRoute><NormaFormPage /></AdminRoute>} />
              <Route path="normas/:id" element={<AdminRoute><NormaDetailPage /></AdminRoute>} />
              <Route path="normas/:id/editar" element={<AdminRoute><NormaFormPage /></AdminRoute>} />
              <Route path="emails-padrao" element={<AdminRoute><EmailPadraoPage /></AdminRoute>} />
              <Route path="relatorios" element={<AdminRoute><RelatoriosPage /></AdminRoute>} />
            </Route>
            <Route path="*" element={<DefaultRedirect />} />
          </Routes>
        </BrowserRouter>
      </WorkspaceProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}
