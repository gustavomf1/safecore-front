import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getOcorrencias, OcorrenciaItem, deleteNaoConformidade, deleteDesvio } from '../api/ocorrencia'
import { useAuth } from '../contexts/AuthContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useOcorrenciasFiltro, PAGE_SIZES } from '../hooks/useOcorrenciasFiltro'
import { Search, AlertTriangle, CheckCircle2, MapPin, Clock, Shield, FilePlus, Trash2, Calendar } from 'lucide-react'
import CodigoBadge from '../components/CodigoBadge'
import MeuPapelFilter from '../components/MeuPapelFilter'
import { PAPEL_OPTIONS } from '../components/papelOptions'
import ConfirmActionModal from '../components/ConfirmActionModal'
import EvidenciaThumbnail from '../components/EvidenciaThumbnail'
import Pagination from '../components/Pagination'
import { formatDate } from '../utils/date'
import PrazoBar from '../components/PrazoBar'

type TipoFiltro = 'TODOS' | 'DESVIO' | 'NAO_CONFORMIDADE'
type StatusFiltro = 'TODOS' | 'ABERTAS' | 'AGUARD_DESVIO' | 'EM_ANDAMENTO' | 'REPROVADOS' | 'AGUARDANDO_VALIDACAO' | 'CONCLUIDAS' | 'VENCIDAS'

const STATUS_TABS_CONFIG: { key: StatusFiltro; label: string; tipos: TipoFiltro[]; activeColor: string }[] = [
  { key: 'TODOS',               label: 'Todos',              tipos: ['TODOS', 'DESVIO', 'NAO_CONFORMIDADE'], activeColor: 'bg-slate-800 text-white' },
  { key: 'ABERTAS',             label: 'Abertas',            tipos: ['TODOS', 'NAO_CONFORMIDADE'],           activeColor: 'bg-yellow-500 text-white' },
  { key: 'AGUARD_DESVIO',       label: 'Aguard. Tratativa',  tipos: ['TODOS', 'DESVIO'],                     activeColor: 'bg-orange-500 text-white' },
  { key: 'EM_ANDAMENTO',        label: 'Em Andamento',       tipos: ['TODOS', 'DESVIO', 'NAO_CONFORMIDADE'], activeColor: 'bg-blue-600 text-white' },
  { key: 'REPROVADOS',          label: 'Reprovado',          tipos: ['TODOS', 'NAO_CONFORMIDADE'],           activeColor: 'bg-red-600 text-white' },
  { key: 'AGUARDANDO_VALIDACAO', label: 'Aguard. Validação', tipos: ['TODOS', 'NAO_CONFORMIDADE'],           activeColor: 'bg-indigo-600 text-white' },
  { key: 'CONCLUIDAS',          label: 'Concluídos',         tipos: ['TODOS', 'DESVIO', 'NAO_CONFORMIDADE'], activeColor: 'bg-green-600 text-white' },
  { key: 'VENCIDAS',            label: 'Vencidas',           tipos: ['TODOS', 'NAO_CONFORMIDADE'],           activeColor: 'bg-red-600 text-white' },
]

export default function OcorrenciasPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>('TODOS')
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('TODOS')
  const [excluindo, setExcluindo] = useState<OcorrenciaItem | null>(null)

  const isTecnico = user?.perfil === 'TECNICO'
  const { estabelecimento } = useWorkspace()
  const {
    isAdmin, busca, setBusca, meuPapel, setMeuPapel, page, setPage, pageSize, setPageSize,
    dataInicio, setDataInicio, dataFim, setDataFim,
    adminEmpresaId, setAdminEmpresaId, adminEstabelecimentoId, setAdminEstabelecimentoId,
    empresasAdmin, estabelecimentosAdmin, matchBuscaEData,
  } = useOcorrenciasFiltro()

  const { data: ocorrencias = [], isLoading } = useQuery({
    queryKey: ['ocorrencias', estabelecimento?.id, adminEmpresaId, adminEstabelecimentoId, meuPapel],
    queryFn: () => getOcorrencias(
      isAdmin
        ? { empresaId: adminEmpresaId || undefined, estabelecimentoId: adminEstabelecimentoId || undefined, meuPapel: meuPapel ?? undefined }
        : { estabelecimentoId: estabelecimento?.id, meuPapel: meuPapel ?? undefined },
    ),
  })

  const deleteMutation = useMutation({
    mutationFn: (item: OcorrenciaItem) =>
      item.tipo === 'DESVIO' ? deleteDesvio(item.id) : deleteNaoConformidade(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  function getStatusFiltroLabel(item: OcorrenciaItem): StatusFiltro {
    if (item.tipo === 'DESVIO') {
      if (item.status === 'AGUARDANDO_TRATATIVA') return 'AGUARD_DESVIO'
      if (item.status === 'AGUARDANDO_APROVACAO') return 'EM_ANDAMENTO'
      return 'CONCLUIDAS'
    }
    if (item.status === 'CONCLUIDO') return 'CONCLUIDAS'
    if (item.status === 'NAO_RESOLVIDA') return 'VENCIDAS'
    if (item.status === 'AGUARDANDO_VALIDACAO_FINAL') return 'AGUARDANDO_VALIDACAO'
    if (item.status === 'ABERTA') return 'ABERTAS'
    if (item.status === 'EM_AJUSTE_PELO_EXTERNO') return 'REPROVADOS'
    if (item.status === 'AGUARDANDO_APROVACAO_PLANO') return 'AGUARDANDO_VALIDACAO'
    if (['EM_EXECUCAO', 'EM_TRATAMENTO'].includes(item.status)) return 'EM_ANDAMENTO'
    return 'TODOS'
  }

  function handleTipoChange(tipo: TipoFiltro) {
    const available = STATUS_TABS_CONFIG.filter(t => t.tipos.includes(tipo)).map(t => t.key)
    setFiltroTipo(tipo)
    setPage(1)
    if (!available.includes(filtroStatus)) setFiltroStatus('TODOS')
    const papelCompativel = meuPapel === null || PAPEL_OPTIONS.find(o => o.value === meuPapel)?.tipos.includes(tipo)
    if (!papelCompativel) setMeuPapel(null)
  }

  const filtradas = ocorrencias.filter(o => {
    const matchTipo = filtroTipo === 'TODOS' || o.tipo === filtroTipo
    const matchStatus = filtroStatus === 'TODOS' || getStatusFiltroLabel(o) === filtroStatus
    return matchTipo && matchStatus && matchBuscaEData(o)
  })

  const tipoFiltradas = ocorrencias.filter(o => filtroTipo === 'TODOS' || o.tipo === filtroTipo)
  const contadores = Object.fromEntries(
    STATUS_TABS_CONFIG.map(t => [t.key, tipoFiltradas.filter(o => getStatusFiltroLabel(o) === t.key).length])
  ) as Record<StatusFiltro, number>

  const visibleTabs = STATUS_TABS_CONFIG.filter(t => t.tipos.includes(filtroTipo))
  const totalPages = Math.ceil(filtradas.length / pageSize)
  const paginadas = filtradas.slice((page - 1) * pageSize, page * pageSize)

  function getStatusLabel(item: OcorrenciaItem) {
    const map: Record<string, { label: string; color: string }> = {
      // NCs
      ABERTA: { label: 'Aberta', color: 'text-yellow-600 bg-yellow-50' },
      AGUARDANDO_APROVACAO_PLANO: { label: 'Aguard. Aprovação', color: 'text-blue-600 bg-blue-50' },
      EM_AJUSTE_PELO_EXTERNO: { label: 'Reprovado', color: 'text-red-600 bg-red-50' },
      EM_EXECUCAO: { label: 'Em Execução', color: 'text-purple-600 bg-purple-50' },
      AGUARDANDO_VALIDACAO_FINAL: { label: 'Aguard. Validação', color: 'text-indigo-600 bg-indigo-50' },
      CONCLUIDO: { label: 'Concluído', color: 'text-green-600 bg-green-50' },
      EM_TRATAMENTO: { label: 'Em Tratamento', color: 'text-blue-600 bg-blue-50' },
      NAO_RESOLVIDA: { label: 'Não Resolvida', color: 'text-red-600 bg-red-50' },
      // Desvios
      AGUARDANDO_TRATATIVA: { label: 'Aguard. Tratativa', color: 'text-orange-600 bg-orange-50' },
      AGUARDANDO_APROVACAO: { label: 'Aguard. Aprovação', color: 'text-blue-600 bg-blue-50' },
    }
    return map[item.status] ?? { label: item.status, color: 'text-slate-600 bg-slate-100' }
  }

  function podeExcluir(item: OcorrenciaItem) {
    if (item.status === 'CONCLUIDO' && !isAdmin) return false
    if (isTecnico && item.tipo === 'DESVIO') return false
    if (isTecnico && item.tipo === 'NAO_CONFORMIDADE' && item.status !== 'ABERTA') return false
    return true
  }


  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Ocorrências</h2>
          <p className="text-sm text-slate-500">{filtradas.length} ocorrências registradas</p>
        </div>
        <button
          onClick={() => navigate('/ocorrencias/nova')}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
        >
          <FilePlus size={16} /> Nova Ocorrência
        </button>
      </div>

      {/* Search + filters */}
      <div className="filter-bar">
        <div className="filter-search flex-1">
          <Search size={14} className="text-gray-400" />
          <input
            value={busca}
            onChange={e => { setBusca(e.target.value); setPage(1) }}
            placeholder="Buscar por título, localização ou código (NC-0005)..."
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        {isAdmin && (
          <>
            <select
              className="select-std"
              value={adminEmpresaId}
              onChange={e => { setAdminEmpresaId(e.target.value); setAdminEstabelecimentoId('') }}
            >
              <option value="">Todas as empresas</option>
              {empresasAdmin.map(e => (
                <option key={e.id} value={e.id}>{e.nomeFantasia || e.razaoSocial}</option>
              ))}
            </select>
            <select
              className="select-std disabled:opacity-40 disabled:cursor-not-allowed"
              value={adminEstabelecimentoId}
              disabled={!adminEmpresaId}
              onChange={e => setAdminEstabelecimentoId(e.target.value)}
            >
              <option value="">Todos os estabelecimentos</option>
              {estabelecimentosAdmin.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </>
        )}
        <div className="flex gap-2 flex-wrap">
          {(['TODOS', 'DESVIO', 'NAO_CONFORMIDADE'] as TipoFiltro[]).map(f => (
            <button
              key={f}
              onClick={() => handleTipoChange(f)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${filtroTipo === f ? 'bg-slate-800 text-white' : 'text-slate-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {f === 'TODOS' ? 'Todos' : f === 'DESVIO' ? 'Desvios' : 'NCs'}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro de data + itens por página */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar size={14} className="text-gray-400" />
          <span className="text-xs whitespace-nowrap">Criada de</span>
          <input
            type="date"
            value={dataInicio}
            onChange={e => { setDataInicio(e.target.value); setPage(1) }}
            className="select-std"
          />
          <span className="text-xs whitespace-nowrap">até</span>
          <input
            type="date"
            value={dataFim}
            onChange={e => { setDataFim(e.target.value); setPage(1) }}
            className="select-std"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 ml-auto">
          <span className="whitespace-nowrap text-xs">Por página:</span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }} className="select-std">
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
        {visibleTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setFiltroStatus(tab.key as StatusFiltro); setPage(1) }}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              filtroStatus === tab.key ? tab.activeColor : 'text-slate-600 border border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            {tab.label}
            {tab.key !== 'TODOS' && contadores[tab.key as StatusFiltro] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${filtroStatus === tab.key ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                {contadores[tab.key as StatusFiltro]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filtro Meu Papel */}
      <MeuPapelFilter
        filtroTipo={filtroTipo}
        meuPapel={meuPapel}
        onChange={v => { setMeuPapel(v); setPage(1) }}
      />

      {/* List */}
      {isLoading && <div className="text-center text-slate-400 py-12">Carregando...</div>}
      {!isLoading && filtradas.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-slate-400">
          Nenhuma ocorrência encontrada
        </div>
      )}
      <div className="space-y-3">
        {paginadas.map(item => {
          const statusInfo = getStatusLabel(item)
          const concluido = item.status === 'CONCLUIDO' || item.tipo === 'DESVIO'
          const iconColor = concluido ? 'bg-green-100' : item.tipo === 'DESVIO' ? 'bg-yellow-100' : 'bg-red-100'
          const iconEl = concluido
            ? <CheckCircle2 size={18} className="text-green-500" />
            : <AlertTriangle size={18} className={item.tipo === 'DESVIO' ? 'text-yellow-500' : 'text-red-500'} />

          return (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
              <div className="flex items-start gap-3 sm:gap-5">
                {/* Thumbnail */}
                <div className="hidden sm:flex w-24 h-20 bg-gray-100 rounded-lg flex-shrink-0 items-center justify-center overflow-hidden">
                  {item.primeiraEvidenciaId && item.primeiraEvidenciaNome ? (
                    <EvidenciaThumbnail
                      evidenciaId={item.primeiraEvidenciaId}
                      nomeArquivo={item.primeiraEvidenciaNome}
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor}`}>
                      {iconEl}
                    </div>
                  )}
                </div>
                {/* Mobile icon */}
                <div className={`sm:hidden w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                  {iconEl}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      concluido ? 'bg-green-100 text-green-700' : item.tipo === 'DESVIO' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.tipo === 'DESVIO' ? 'Desvio' : 'NC'}
                    </span>
                    {item.regraDeOuro && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                        <Shield size={10} /> Regra de Ouro
                      </span>
                    )}
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    {item.vencida && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                        Vencida
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <CodigoBadge codigo={item.codigo} size="sm" />
                    <div className="font-semibold text-slate-800 truncate">{item.titulo}</div>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                    {item.localizacao && <span className="flex items-center gap-1"><MapPin size={11} />{item.localizacao}</span>}
                    <span className="flex items-center gap-1"><Clock size={11} />{formatDate(item.dataRegistro)}</span>
                    <span className="text-slate-300 hidden sm:inline">{item.estabelecimentoNome}</span>
                  </div>
                  {item.tipo === 'NAO_CONFORMIDADE' && item.dataLimiteResolucao && item.status !== 'CONCLUIDO' && (
                    <div className="mt-2">
                      <PrazoBar dataLimite={item.dataLimiteResolucao} vencida={item.vencida} />
                    </div>
                  )}
                </div>

                {/* Right - desktop */}
                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                  {podeExcluir(item) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setExcluindo(item) }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/ocorrencias/${item.tipo}/${item.id}`)}
                    className="flex items-center gap-1.5 text-sm text-slate-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
                  >
                    Ver detalhes →
                  </button>
                </div>
              </div>
              {/* Mobile buttons */}
              <div className="sm:hidden flex gap-2 mt-3">
                <button
                  onClick={() => navigate(`/ocorrencias/${item.tipo}/${item.id}`)}
                  className="flex-1 text-sm text-slate-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition text-center"
                >
                  Ver detalhes →
                </button>
                {podeExcluir(item) && (
                  <button
                    onClick={() => setExcluindo(item)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-lg transition"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />

      <ConfirmActionModal
        open={!!excluindo}
        title={excluindo ? `Excluir ${excluindo.tipo === 'DESVIO' ? 'Desvio' : 'Não Conformidade'}` : 'Excluir'}
        message={excluindo ? `Tem certeza que deseja excluir "${excluindo.titulo}"?` : undefined}
        detail={excluindo && excluindo.tipo === 'NAO_CONFORMIDADE' && ((excluindo.quantidadeAtividades ?? 0) > 0 || (excluindo.quantidadeHistorico ?? 0) > 0) ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Esta NC possui tratativas em andamento ou já executadas:</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 text-amber-700">
                  {(excluindo.quantidadeAtividades ?? 0) > 0 && <li>{excluindo.quantidadeAtividades} atividade(s) do plano de ação</li>}
                  {(excluindo.quantidadeHistorico ?? 0) > 0 && <li>{excluindo.quantidadeHistorico} registro(s) no histórico</li>}
                </ul>
                <p className="mt-2 font-medium">Todos esses dados serão apagados permanentemente.</p>
              </div>
            </div>
          </div>
        ) : undefined}
        confirmLabel="Sim, excluir"
        successTitle={excluindo ? `${excluindo.tipo === 'DESVIO' ? 'Desvio' : 'Não Conformidade'} excluído com sucesso` : 'Excluído com sucesso'}
        isLoading={deleteMutation.isPending}
        isSuccess={deleteMutation.isSuccess}
        isError={deleteMutation.isError}
        onConfirm={() => excluindo && deleteMutation.mutate(excluindo)}
        onCancel={() => { setExcluindo(null); deleteMutation.reset() }}
      />
    </div>
  )
}
