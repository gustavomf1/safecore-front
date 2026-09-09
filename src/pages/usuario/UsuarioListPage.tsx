import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsuarios, deleteUsuario, reativarUsuario, criarUsuarioDireto } from '../../api/usuario'
import { Link } from 'react-router-dom'
import { Pencil, Trash2, RotateCcw, Users, Search, Eye, X, Building2, Phone, Mail, Calendar, ShieldCheck, Link2, Copy, Check, Clock, CheckCircle2, UserPlus } from 'lucide-react'
import { formatCnpj, formatTelefone } from '../../utils/date'
import { criarConvite } from '../../api/convite'
import { getEmpresas } from '../../api/empresa'
import { useAuth } from '../../contexts/AuthContext'
import ConfirmActionModal from '../../components/ConfirmActionModal'
import ConfirmModalUsuario from '../../components/ConfirmModalUsuario'
import Pagination from '../../components/Pagination'
import { Usuario, PerfilUsuario } from '../../types'

const PAGE_SIZES = [15, 25, 50, 100, 200]

const perfilLabels = { ENGENHEIRO: 'Engenheiro', TECNICO: 'Técnico', EXTERNO: 'Externo' }
const perfilColors = {
  ENGENHEIRO: 'bg-blue-100 text-blue-700',
  TECNICO: 'bg-purple-100 text-purple-700',
  EXTERNO: 'bg-orange-100 text-orange-700',
}

export default function UsuarioListPage() {
  const { user } = useAuth()
  const isAdmin = user?.isAdmin === true
  const queryClient = useQueryClient()
  const [filtroStatus, setFiltroStatus] = useState<string>('true')
  const [busca, setBusca] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [adminEmpresaId, setAdminEmpresaId] = useState('')

  const ativoParam = filtroStatus === '' ? undefined : filtroStatus === 'true'

  const { data: empresasAdmin = [] } = useQuery({
    queryKey: ['empresas-admin-filter'],
    queryFn: () => getEmpresas(),
    enabled: isAdmin,
  })

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios', filtroStatus, adminEmpresaId],
    queryFn: () => getUsuarios(ativoParam, isAdmin && adminEmpresaId ? adminEmpresaId : undefined),
  })

  const filtrados = usuarios.filter(u => {
    const q = busca.toLowerCase()
    return !q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const totalPages = Math.ceil(filtrados.length / pageSize)
  const paginados = filtrados.slice((page - 1) * pageSize, page * pageSize)

  function handleBusca(v: string) { setBusca(v); setPage(1) }
  function handlePageSize(v: number) { setPageSize(v); setPage(1) }

  const [visualizando, setVisualizando] = useState<Usuario | null>(null)
  const [confirmando, setConfirmando] = useState<Usuario | null>(null)
  const [conviteOpen, setConviteOpen] = useState(false)
  const [conviteForm, setConviteForm] = useState({ empresaId: '', perfil: 'EXTERNO', minutos: 30 })
  const [conviteLink, setConviteLink] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const { data: empresas = [] } = useQuery({ queryKey: ['empresas'], queryFn: () => getEmpresas(true) })

  const conviteMutation = useMutation({
    mutationFn: () => criarConvite({
      empresaId: conviteForm.empresaId,
      perfil: conviteForm.perfil,
      minutos: conviteForm.minutos,
    }),
    onSuccess: (data) => {
      const link = `${window.location.origin}/convite/${data.token}`
      setConviteLink(link)
    },
  })

  function handleCopiar() {
    if (!conviteLink) return
    navigator.clipboard.writeText(conviteLink)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function handleConviteClose() {
    setConviteOpen(false)
    setConviteLink(null)
    setConviteForm({ empresaId: '', perfil: 'EXTERNO', minutos: 30 })
  }

  const deleteMutation = useMutation({
    mutationFn: deleteUsuario,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['usuarios'] }) },
  })

  const reativarMutation = useMutation({
    mutationFn: reativarUsuario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  const [showCriarModal, setShowCriarModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [criarForm, setCriarForm] = useState({
    nome: '', email: '', senha: '', telefone: '',
    perfil: 'ENGENHEIRO' as PerfilUsuario,
    empresaId: '', isAdmin: false
  })
  const [criarErro, setCriarErro] = useState<string | null>(null)

  const { data: todasEmpresas = [] } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: () => getEmpresas(),
    enabled: showCriarModal
  })

  const empresaNomeParaConfirm = useMemo(
    () => (todasEmpresas as Array<{ id: string; razaoSocial: string; nomeFantasia?: string }>)
      .find(e => e.id === criarForm.empresaId)?.nomeFantasia
      || (todasEmpresas as Array<{ id: string; razaoSocial: string; nomeFantasia?: string }>)
        .find(e => e.id === criarForm.empresaId)?.razaoSocial
      || '',
    [criarForm.empresaId, todasEmpresas]
  )

  const criarDiretoMutation = useMutation({
    mutationFn: criarUsuarioDireto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      setCriarErro(msg ?? 'Erro ao criar usuário. Verifique os dados e tente novamente.')
    }
  })

  function handleConfirmClose() {
    setShowConfirmModal(false)
    setCriarForm({ nome: '', email: '', senha: '', telefone: '', perfil: 'ENGENHEIRO', empresaId: '', isAdmin: false })
    setCriarErro(null)
    criarDiretoMutation.reset()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Usuários</h2>
          <p className="text-slate-500 text-sm mt-1">Gerencie os usuários do sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPage(1) }} className="select-std">
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
            <option value="">Todos</option>
          </select>
          {user?.perfil === 'ENGENHEIRO' && (
            <>
              <button
                onClick={() => setConviteOpen(true)}
                className="flex items-center gap-2 border border-gray-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                <Link2 size={16} /> Gerar Convite
              </button>
              {user?.isAdmin && (
                <button
                  onClick={() => setShowCriarModal(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <UserPlus size={16} />
                  Criar Usuário
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-search">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            value={busca}
            onChange={e => handleBusca(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder-gray-400"
          />
        </div>
        {isAdmin && (
          <select className="select-std" value={adminEmpresaId} onChange={e => { setAdminEmpresaId(e.target.value); setPage(1) }}>
            <option value="">Todas as empresas</option>
            {empresasAdmin.map(e => (
              <option key={e.id} value={e.id}>{e.nomeFantasia || e.razaoSocial}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-2 text-sm text-slate-500 ml-auto">
          <span className="whitespace-nowrap text-xs">Por página:</span>
          <select value={pageSize} onChange={e => handlePageSize(Number(e.target.value))} className="select-std">
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-slate-400 py-8 text-center">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{busca ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Perfil</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Empresa</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Criado em</th>
                  {user?.perfil === 'ENGENHEIRO' && (
                    <th className="px-4 py-3 text-right font-medium text-slate-600">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginados.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.nome}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${perfilColors[u.perfil]}`}>{perfilLabels[u.perfil]}</span>
                        {u.isAdmin && <span className="nc-pill nc-pill-amber">Admin</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.empresaNome}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.dtCriacao ? new Date(u.dtCriacao).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    {user?.perfil === 'ENGENHEIRO' && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setVisualizando(u)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-gray-100 rounded" title="Ver detalhes"><Eye size={15} /></button>
                          <Link to={`/usuarios/${u.id}/editar`} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-gray-100 rounded"><Pencil size={15} /></Link>
                          {u.ativo ? (
                            <button onClick={() => setConfirmando(u)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
                          ) : (
                            <button onClick={() => reativarMutation.mutate(u.id)} className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded"><RotateCcw size={15} /></button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
            <span>{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>
            <Pagination page={page} totalPages={totalPages} onPage={setPage} />
            <span>Página {page} de {totalPages}</span>
          </div>
        </>
      )}

      {/* Modal de convite */}
      {conviteOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={handleConviteClose}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Link2 size={18} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Gerar Link de Convite</h3>
                  <p className="text-xs text-slate-400">O link expira automaticamente</p>
                </div>
              </div>
              <button onClick={handleConviteClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>

            {!conviteLink ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Empresa *</label>
                  <select
                    value={conviteForm.empresaId}
                    onChange={e => setConviteForm(f => ({ ...f, empresaId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione a empresa</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.razaoSocial}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Perfil *</label>
                  <select
                    value={conviteForm.perfil}
                    onChange={e => setConviteForm(f => ({ ...f, perfil: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ENGENHEIRO">Engenheiro</option>
                    <option value="TECNICO">Técnico</option>
                    <option value="EXTERNO">Externo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Validade: <span className="font-bold text-slate-800">{conviteForm.minutos} min</span>
                  </label>
                  <input
                    type="range"
                    min={1} max={60}
                    value={conviteForm.minutos}
                    onChange={e => setConviteForm(f => ({ ...f, minutos: Number(e.target.value) }))}
                    className="w-full accent-slate-800"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                    <span>1 min</span><span>60 min</span>
                  </div>
                </div>

                {conviteMutation.isError && (
                  <p className="text-xs text-red-500">Erro ao gerar convite. Tente novamente.</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={handleConviteClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                  <button
                    onClick={() => conviteMutation.mutate()}
                    disabled={!conviteForm.empresaId || conviteMutation.isPending}
                    className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition"
                  >
                    {conviteMutation.isPending ? 'Gerando...' : 'Gerar Link'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                  <CheckCircle2 size={28} className="text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-green-700">Link gerado com sucesso!</p>
                  <p className="text-xs text-green-600 mt-0.5 flex items-center justify-center gap-1">
                    <Clock size={11} /> Expira em {conviteForm.minutos} minuto{conviteForm.minutos !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-slate-600 break-all">
                  {conviteLink}
                </div>

                <button
                  onClick={handleCopiar}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition ${copiado ? 'bg-green-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                >
                  {copiado ? <><Check size={16} /> Copiado!</> : <><Copy size={16} /> Copiar Link</>}
                </button>

                <button onClick={handleConviteClose} className="w-full text-sm text-slate-500 hover:text-slate-700 py-1">
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de visualização */}
      {visualizando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setVisualizando(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-slate-600">{visualizando.nome.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{visualizando.nome}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${perfilColors[visualizando.perfil]}`}>
                      {perfilLabels[visualizando.perfil]}
                    </span>
                    {visualizando.isAdmin && <span className="nc-pill nc-pill-amber">Admin</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => setVisualizando(null)} className="text-slate-400 hover:text-slate-600 transition p-1">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {/* Email */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Mail size={15} className="text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="text-sm font-medium text-slate-700">{visualizando.email}</p>
                </div>
              </div>

              {/* Telefone */}
              {visualizando.telefone && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Phone size={15} className="text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Telefone</p>
                    <p className="text-sm font-medium text-slate-700">{formatTelefone(visualizando.telefone)}</p>
                  </div>
                </div>
              )}

              {/* Empresa */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Building2 size={15} className="text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Empresa</p>
                  <p className="text-sm font-medium text-slate-700">{visualizando.empresaNome}</p>
                  {visualizando.empresaCnpj && (
                    <p className="text-xs text-slate-400 mt-0.5">CNPJ: {formatCnpj(visualizando.empresaCnpj)}</p>
                  )}
                </div>
              </div>

              {/* Status + datas */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${visualizando.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {visualizando.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {visualizando.dtCriacao && (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                    <Calendar size={13} className="text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Criado em</p>
                      <p className="text-xs font-medium text-slate-700">
                        {new Date(visualizando.dtCriacao).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {visualizando.dtInativacao && (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                  <ShieldCheck size={15} className="text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-red-400">Inativado em</p>
                    <p className="text-sm font-medium text-red-600">
                      {new Date(visualizando.dtInativacao).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-5">
              <button onClick={() => setVisualizando(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg transition">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCriarModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowCriarModal(false)
            setCriarForm({ nome: '', email: '', senha: '', telefone: '', perfil: 'ENGENHEIRO', empresaId: '', isAdmin: false })
            setCriarErro(null)
          }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                  <UserPlus size={18} className="text-slate-600" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Criar Usuário</h3>
              </div>
              <button
                onClick={() => {
                  setShowCriarModal(false)
                  setCriarForm({ nome: '', email: '', senha: '', telefone: '', perfil: 'ENGENHEIRO', empresaId: '', isAdmin: false })
                  setCriarErro(null)
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault()
                setCriarErro(null)
                setShowCriarModal(false)
                setShowConfirmModal(true)
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nome *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  required value={criarForm.nome}
                  onChange={e => setCriarForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  type="email" required value={criarForm.email}
                  onChange={e => setCriarForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Telefone</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  type="tel" placeholder="(00) 00000-0000" value={criarForm.telefone}
                  onChange={e => setCriarForm(f => ({ ...f, telefone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Senha temporária *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  type="password" required value={criarForm.senha}
                  onChange={e => setCriarForm(f => ({ ...f, senha: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Empresa *</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  required value={criarForm.empresaId}
                  onChange={e => setCriarForm(f => ({ ...f, empresaId: e.target.value }))}>
                  <option value="">Selecione a empresa</option>
                  {todasEmpresas?.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nomeFantasia || emp.razaoSocial}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Perfil *</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  value={criarForm.perfil}
                  onChange={e => {
                    const perfil = e.target.value as PerfilUsuario
                    setCriarForm(f => ({
                      ...f,
                      perfil,
                      isAdmin: perfil !== 'ENGENHEIRO' ? false : f.isAdmin
                    }))
                  }}>
                  <option value="ENGENHEIRO">Engenheiro</option>
                  <option value="TECNICO">Técnico</option>
                  <option value="EXTERNO">Externo</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={criarForm.isAdmin}
                  disabled={criarForm.perfil !== 'ENGENHEIRO'}
                  onChange={e => setCriarForm(f => ({ ...f, isAdmin: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label
                  htmlFor="isAdmin"
                  className={`text-xs font-medium text-slate-700 ${criarForm.perfil !== 'ENGENHEIRO' ? 'opacity-40' : ''}`}
                >
                  É administrador
                </label>
              </div>
              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg transition"
                  onClick={() => {
                    setShowCriarModal(false)
                    setCriarForm({ nome: '', email: '', senha: '', telefone: '', perfil: 'ENGENHEIRO', empresaId: '', isAdmin: false })
                    setCriarErro(null)
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition"
                  disabled={criarDiretoMutation.isPending}
                >
                  {criarDiretoMutation.isPending ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModalUsuario
        open={showConfirmModal}
        onClose={handleConfirmClose}
        nome={criarForm.nome}
        email={criarForm.email}
        telefone={criarForm.telefone || undefined}
        perfil={criarForm.perfil}
        empresaNome={empresaNomeParaConfirm}
        isAdmin={criarForm.isAdmin}
        isPending={criarDiretoMutation.isPending}
        isSuccess={criarDiretoMutation.isSuccess}
        isError={criarDiretoMutation.isError}
        errorMessage={criarErro ?? undefined}
        onConfirm={() => criarDiretoMutation.mutate(criarForm)}
      />

      <ConfirmActionModal
        open={!!confirmando}
        title="Desativar Usuário"
        description="O usuário ficará inativo e não conseguirá mais acessar o sistema."
        detail={confirmando && (
          <div>
            <p className="text-sm font-medium text-slate-700">{confirmando.nome}</p>
            <p className="text-xs text-slate-400 mt-0.5">{confirmando.email}</p>
          </div>
        )}
        confirmLabel="Desativar"
        successTitle="Usuário desativado com sucesso"
        isLoading={deleteMutation.isPending}
        isSuccess={deleteMutation.isSuccess}
        isError={deleteMutation.isError}
        onConfirm={() => confirmando && deleteMutation.mutate(confirmando.id)}
        onCancel={() => { setConfirmando(null); deleteMutation.reset() }}
      />
    </div>
  )
}
