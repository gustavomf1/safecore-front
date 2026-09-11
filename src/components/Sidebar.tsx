import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useTheme } from '../contexts/ThemeContext'
import { getOcorrencias } from '../api/ocorrencia'
import { useState } from 'react'
import {
  Shield, LayoutDashboard, FilePlus, ClipboardList, LogOut,
  Building2, MapPin, Users, RefreshCw, X, Navigation, Sun, Moon,
  ChevronsLeft, ChevronsRight, Mail, ChevronDown, ChevronUp, BookOpen, Briefcase, FileBarChart2
} from 'lucide-react'
import safecoreIcon from '../assets/branding/safecore-icon.png'

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function Sidebar({ mobileOpen, onMobileClose, collapsed, onToggleCollapse }: SidebarProps) {
  const { user, logout } = useAuth()
  const { empresa, estabelecimento, empresaFilha, limpar } = useWorkspace()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const { data: ocorrencias = [] } = useQuery({
    queryKey: ['ocorrencias'],
    queryFn: () => getOcorrencias(),
  })

  const pendentesValidacao = ocorrencias.filter(o => {
    if (o.tipo !== 'NAO_CONFORMIDADE') return false
    const aguardandoAcao = o.status === 'AGUARDANDO_APROVACAO_PLANO' || o.status === 'AGUARDANDO_VALIDACAO_FINAL'
    if (!aguardandoAcao) return false
    return o.responsavelNcId === user?.id
  }).length

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const [perfilAberto, setPerfilAberto] = useState(false)

  function handleNav() {
    onMobileClose()
  }

  // No mobile drawer, nunca colapsado
  const isCollapsed = collapsed

  function SidebarInner({ mobile }: { mobile?: boolean }) {
    const show = mobile || !isCollapsed
    const compact = isCollapsed && !mobile

    const navItemClass = ({ isActive }: { isActive: boolean }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
        compact ? 'justify-center' : ''
      } ${
        isActive
          ? 'sidebar-active text-white font-medium'
          : 'sidebar-nav-item'
      }`

    return (
      <div className={`${mobile ? 'w-64' : isCollapsed ? 'w-16' : 'w-56'} sidebar-bg h-full flex flex-col py-6 ${compact ? 'px-1.5' : 'px-3'} flex-shrink-0 overflow-y-auto transition-all duration-200`}>
        {/* Logo */}
        <div className={`flex items-center ${compact ? 'justify-center' : 'justify-between'} px-2 mb-6`}>
          {show ? (
            <div className="flex items-center gap-2.5">
              <img src={safecoreIcon} alt="SafeCore" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              <div>
                <div className="text-white font-bold text-sm">
                  Safe<span className="text-blue-400">Core</span>
                </div>
                <div className="sidebar-muted text-xs">Sistema de Gestão</div>
              </div>
            </div>
          ) : (
            <img src={safecoreIcon} alt="SafeCore" className="w-8 h-8 rounded-lg object-cover mx-auto" />
          )}
          {mobile && (
            <button onClick={onMobileClose} className="p-1 sidebar-item-text hover:text-white">
              <X size={20} />
            </button>
          )}
          {!mobile && show && (
            <button onClick={onToggleCollapse} className="p-1 sidebar-item-text hover:text-white hidden lg:block">
              <ChevronsLeft size={18} />
            </button>
          )}
        </div>

        {/* User info */}
        <div className="mb-4 pb-4 sidebar-divider">
          <button
            onClick={() => !compact && setPerfilAberto(!perfilAberto)}
            className={`flex items-center ${compact ? 'justify-center' : 'gap-2.5'} px-2 w-full text-left rounded-lg hover:bg-white/10 py-2 transition`}
            title={compact ? `${user?.nome} — ${user?.email}` : undefined}
          >
            <div className="w-8 h-8 rounded-full sidebar-avatar flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.nome?.charAt(0).toUpperCase()}
            </div>
            {show && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="text-white text-sm font-medium truncate">{user?.nome}</div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                    <span className="sidebar-item-text text-xs">Online</span>
                  </div>
                </div>
                {perfilAberto ? <ChevronUp size={14} className="text-white/60" /> : <ChevronDown size={14} className="text-white/60" />}
              </>
            )}
          </button>
          {show && perfilAberto && (
            <div className="mt-2 mx-2 sidebar-workspace rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-blue-400 flex-shrink-0" />
                <span className="text-xs sidebar-workspace-text truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={13} className="text-blue-400 flex-shrink-0" />
                <span className="text-xs sidebar-workspace-text">
                  {user?.perfil === 'ENGENHEIRO' ? 'Engenheiro' : user?.perfil === 'TECNICO' ? 'Técnico' : 'Externo'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Workspace info */}
        {user?.perfil !== 'EXTERNO' && empresa && estabelecimento && show && (
          <div className="px-2 mb-6 pb-6 sidebar-divider">
            <div className="sidebar-workspace rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Building2 size={13} className="text-blue-400 flex-shrink-0" />
                <span className="text-xs sidebar-workspace-text truncate">{empresa.nomeFantasia || empresa.razaoSocial}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-blue-400 flex-shrink-0" />
                <span className="text-xs sidebar-workspace-text truncate">{estabelecimento.nome}</span>
              </div>
              {empresaFilha && (
                <div className="flex items-center gap-2">
                  <Briefcase size={13} className="text-blue-400 flex-shrink-0" />
                  <span className="text-xs sidebar-workspace-text truncate">{empresaFilha.nomeFantasia || empresaFilha.razaoSocial}</span>
                </div>
              )}
              <button
                onClick={() => { limpar(); navigate('/selecionar'); onMobileClose() }}
                className="flex items-center gap-1.5 text-xs sidebar-muted hover:text-blue-400 transition mt-1"
              >
                <RefreshCw size={11} />
                Trocar
              </button>
            </div>
          </div>
        )}

        {/* Collapsed workspace indicator */}
        {user?.perfil !== 'EXTERNO' && empresa && estabelecimento && compact && (
          <div className="px-1 mb-4 pb-4 sidebar-divider flex justify-center">
            <div className="w-8 h-8 sidebar-workspace rounded-lg flex items-center justify-center" title={`${empresa.nomeFantasia || empresa.razaoSocial} / ${estabelecimento.nome}${empresaFilha ? ` / ${empresaFilha.nomeFantasia || empresaFilha.razaoSocial}` : ''}`}>
              <Building2 size={14} className="text-blue-400" />
            </div>
          </div>
        )}

        {/* Main nav */}
        <nav className="flex-1 space-y-1">
          {user?.perfil !== 'EXTERNO' && (
            <NavLink to="/dashboard" className={navItemClass} onClick={handleNav} title={compact ? 'Dashboard' : undefined}>
              <LayoutDashboard size={16} />
              {show && 'Dashboard'}
            </NavLink>
          )}
          {user?.perfil !== 'EXTERNO' && (
            <NavLink to="/ocorrencias" className={navItemClass} onClick={handleNav} title={compact ? 'Ocorrências' : undefined}>
              <FilePlus size={16} />
              {show && 'Ocorrências'}
            </NavLink>
          )}
          <NavLink to="/tratativas" className={navItemClass} onClick={handleNav} title={compact ? 'Tratativas' : undefined}>
            {({ isActive }) => (
              <>
                <ClipboardList size={16} />
                {show && <span className="flex-1">Tratativas</span>}
                {show && user?.perfil === 'ENGENHEIRO' && pendentesValidacao > 0 && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-orange-400 text-white' : 'bg-orange-500 text-white'
                  }`}>
                    {pendentesValidacao}
                  </span>
                )}
                {!show && user?.perfil === 'ENGENHEIRO' && pendentesValidacao > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendentesValidacao}
                  </span>
                )}
              </>
            )}
          </NavLink>

          {/* Admin section - ADMIN only */}
          {user?.isAdmin && (
            <>
              {show && (
                <div className="pt-4 pb-1 px-2">
                  <span className="sidebar-section text-xs uppercase tracking-wider">Administração</span>
                </div>
              )}
              {!show && <div className="pt-3" />}
              <NavLink to="/empresas" className={navItemClass} onClick={handleNav} title={compact ? 'Empresas' : undefined}>
                <Building2 size={15} />
                {show && 'Empresas'}
              </NavLink>
              <NavLink to="/estabelecimentos" className={navItemClass} onClick={handleNav} title={compact ? 'Estabelecimentos' : undefined}>
                <MapPin size={15} />
                {show && 'Estabelecimentos'}
              </NavLink>
              <NavLink to="/localizacoes" className={navItemClass} onClick={handleNav} title={compact ? 'Localizações' : undefined}>
                <Navigation size={15} />
                {show && 'Localizações'}
              </NavLink>
              <NavLink to="/usuarios" className={navItemClass} onClick={handleNav} title={compact ? 'Usuários' : undefined}>
                <Users size={15} />
                {show && 'Usuários'}
              </NavLink>
              <NavLink to="/normas" className={navItemClass} onClick={handleNav} title={compact ? 'Normas' : undefined}>
                <BookOpen size={15} />
                {show && 'Normas'}
              </NavLink>
              <NavLink to="/emails-padrao" className={navItemClass} onClick={handleNav} title={compact ? 'Emails Padrão' : undefined}>
                <Mail size={15} />
                {show && 'Emails Padrão'}
              </NavLink>
              <NavLink to="/relatorios" className={navItemClass} onClick={handleNav} title={compact ? 'Relatórios' : undefined}>
                <FileBarChart2 size={15} />
                {show && 'Relatórios'}
              </NavLink>
            </>
          )}
        </nav>

        {/* Bottom */}
        <div className="space-y-1 mt-4 sidebar-divider-top pt-4">
          {/* Expand button when collapsed */}
          {compact && (
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-center w-full py-2.5 rounded-lg text-sm sidebar-btn transition-all"
              title="Expandir menu"
            >
              <ChevronsRight size={16} />
            </button>
          )}
          <button
            onClick={toggleTheme}
            className={`flex items-center ${compact ? 'justify-center' : 'gap-3'} px-3 py-2.5 w-full rounded-lg text-sm sidebar-btn transition-all`}
            title={compact ? (theme === 'light' ? 'Tema Escuro' : 'Tema Claro') : undefined}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {show && (theme === 'light' ? 'Tema Escuro' : 'Tema Claro')}
          </button>
          <button
            onClick={handleLogout}
            className={`flex items-center ${compact ? 'justify-center' : 'gap-3'} px-3 py-2.5 w-full rounded-lg text-sm sidebar-btn transition-all`}
            title={compact ? 'Sair do Sistema' : undefined}
          >
            <LogOut size={16} />
            {show && 'Sair do Sistema'}
          </button>
          {show && (
            <div className="text-center sidebar-section text-xs">
              <div>Versao 1.0.0</div>
              <div>&copy; 2026 SafeCore</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <SidebarInner />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={onMobileClose} />
          <div className="fixed inset-y-0 left-0 z-50">
            <SidebarInner mobile />
          </div>
        </div>
      )}
    </>
  )
}
