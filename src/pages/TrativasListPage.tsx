import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getOcorrencias, OcorrenciaItem } from '../api/ocorrencia'
import { useAuth } from '../contexts/AuthContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useOcorrenciasFiltro, PAGE_SIZES } from '../hooks/useOcorrenciasFiltro'
import { Search, AlertTriangle, CheckCircle2, MapPin, Clock, Shield, Calendar } from 'lucide-react'
import CodigoBadge from '../components/CodigoBadge'
import MeuPapelFilter, { PAPEL_OPTIONS } from '../components/MeuPapelFilter'
import EvidenciaThumbnail from '../components/EvidenciaThumbnail'
import Pagination from '../components/Pagination'
import { formatDate } from '../utils/date'
import PrazoBar from '../components/PrazoBar'

type TipoFiltro = 'TODOS' | 'DESVIO' | 'NAO_CONFORMIDADE'
type StatusFiltro = 'TODOS' | 'ABERTAS' | 'AGUARDANDO_TRATATIVA' | 'REPROVADOS' | 'AGUARDANDO_VALIDACAO' | 'CONCLUIDAS' | 'VENCIDAS'

const STATUS_TABS_CONFIG: { key: StatusFiltro; label: string; tipos: TipoFiltro[]; activeColor: string }[] = [
  { key: 'TODOS',                label: 'Todos',             tipos: ['TODOS', 'DESVIO', 'NAO_CONFORMIDADE'], activeColor: 'bg-slate-800 text-white' },
  { key: 'ABERTAS',              label: 'Abertas',           tipos: ['TODOS', 'NAO_CONFORMIDADE'],           activeColor: 'bg-yellow-500 text-white' },
  { key: 'AGUARDANDO_TRATATIVA', label: 'Em Andamento',      tipos: ['TODOS', 'DESVIO', 'NAO_CONFORMIDADE'], activeColor: 'bg-blue-600 text-white' },
  { key: 'REPROVADOS',           label: 'Reprovado',         tipos: ['TODOS', 'NAO_CONFORMIDADE'],           activeColor: 'bg-red-600 text-white' },
  { key: 'AGUARDANDO_VALIDACAO', label: 'Aguard. Validação', tipos: ['TODOS', 'DESVIO', 'NAO_CONFORMIDADE'], activeColor: 'bg-indigo-600 text-white' },
  { key: 'CONCLUIDAS',           label: 'Concluídos',        tipos: ['TODOS', 'DESVIO', 'NAO_CONFORMIDADE'], activeColor: 'bg-green-600 text-white' },
  { key: 'VENCIDAS',             label: 'Vencidas',          tipos: ['TODOS', 'NAO_CONFORMIDADE'],           activeColor: 'bg-red-600 text-white' },
]

export default function TrativasListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>('TODOS')
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('TODOS')

  const isEngenheiro = user?.perfil === 'ENGENHEIRO'
  const isExterno = user?.perfil === 'EXTERNO'
  const isTecnico = user?.perfil === 'TECNICO'
  const { estabelecimento } = useWorkspace()
  const {
    isAdmin, busca, setBusca, meuPapel, setMeuPapel, page, setPage, pageSize, setPageSize,
    dataInicio, setDataInicio, dataFim, setDataFim,
    adminEmpresaId, setAdminEmpresaId, adminEstabelecimentoId, setAdminEstabelecimentoId,
    empresasAdmin, estabelecimentosAdmin, matchBuscaEData,
  } = useOcorrenciasFiltro()

  const estabelecimentoId = isExterno ? undefined : estabelecimento?.id

  const { data: ocorrencias = [], isLoading } = useQuery({
    queryKey: ['ocorrencias', estabelecimentoId, adminEmpresaId, adminEstabelecimentoId, meuPapel],
    queryFn: () => getOcorrencias(
      isAdmin
        ? { empresaId: adminEmpresaId || undefined, estabelecimentoId: adminEstabelecimentoId || undefined, meuPapel: meuPapel ?? undefined }
        : { estabelecimentoId: estabelecimentoId, meuPapel: meuPapel ?? undefined },
    ),
  })

  // Filtra por visibilidade: backend já filtra por papel, frontend apenas exclui NCs para EXTERNO não responsável
  const visiveis = ocorrencias.filter(o => {
    if (o.tipo === 'DESVIO') return true
    if (isEngenheiro || isAdmin || isTecnico) return true
    return o.responsavelTrativaId === user?.id
  })

  function getStatusFiltroLabel(item: OcorrenciaItem): StatusFiltro {
    if (item.tipo === 'DESVIO') {
      if (item.status === 'CONCLUIDO') return 'CONCLUIDAS'
      if (item.status === 'AGUARDANDO_APROVACAO') return 'AGUARDANDO_VALIDACAO'
      if (item.status === 'AGUARDANDO_TRATATIVA') return 'AGUARDANDO_TRATATIVA'
      return 'TODOS'
    }
    if (item.status === 'CONCLUIDO') return 'CONCLUIDAS'
    if (item.status === 'NAO_RESOLVIDA') return 'VENCIDAS'
    if (item.status === 'AGUARDANDO_VALIDACAO_FINAL') return 'AGUARDANDO_VALIDACAO'
    if (item.status === 'ABERTA') return 'ABERTAS'
    if (item.status === 'EM_AJUSTE_PELO_EXTERNO') return 'REPROVADOS'
    if (item.status === 'AGUARDANDO_APROVACAO_PLANO') return 'AGUARDANDO_VALIDACAO'
    if (['EM_EXECUCAO', 'EM_TRATAMENTO'].includes(item.status)) return 'AGUARDANDO_TRATATIVA'
    const dias = getDiasRestantes(item.dataLimiteResolucao)
    if (dias !== null && dias < 0) return 'VENCIDAS'
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

  const filtradas = visiveis.filter(o => {
    const matchTipo = filtroTipo === 'TODOS' || o.tipo === filtroTipo
    const matchStatus = filtroStatus === 'TODOS' || getStatusFiltroLabel(o) === filtroStatus
    return matchTipo && matchStatus && matchBuscaEData(o)
  })

  const totalPages = Math.ceil(filtradas.length / pageSize)
  const paginadas = filtradas.slice((page - 1) * pageSize, page * pageSize)

  const tipoFiltradas = visiveis.filter(o => filtroTipo === 'TODOS' || o.tipo === filtroTipo)
  const contadores = Object.fromEntries(
    STATUS_TABS_CONFIG.map(t => [t.key, tipoFiltradas.filter(o => getStatusFiltroLabel(o) === t.key).length])
  ) as Record<StatusFiltro, number>

  const visibleTabs = STATUS_TABS_CONFIG.filter(t => t.tipos.includes(filtroTipo))

  function getDiasRestantes(dataLimite?: string) {
    if (!dataLimite) return null
    const limite = new Date(dataLimite)
    const hoje = new Date()
    const diff = Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  function getStatusInfo(item: OcorrenciaItem) {
    const map: Record<string, { label: string; color: string }> = {
      ABERTA:                      { label: 'Aberta',                  color: 'text-yellow-600 bg-yellow-50' },
      AGUARDANDO_APROVACAO_PLANO:  { label: 'Aprovação do Plano',      color: 'text-blue-600 bg-blue-50' },
      EM_AJUSTE_PELO_EXTERNO:      { label: 'Reprovado',               color: 'text-red-600 bg-red-50' },
      EM_EXECUCAO:                 { label: 'Em Execução',             color: 'text-purple-600 bg-purple-50' },
      AGUARDANDO_VALIDACAO_FINAL:  { label: 'Validação Final',         color: 'text-indigo-600 bg-indigo-50' },
      CONCLUIDO:                   { label: 'Concluído',               color: 'text-green-600 bg-green-50' },
      EM_TRATAMENTO:               { label: 'Em Tratamento',           color: 'text-blue-600 bg-blue-50' },
      NAO_RESOLVIDA:               { label: 'Não Resolvida',           color: 'text-red-600 bg-red-50' },
      AGUARDANDO_TRATATIVA:        { label: 'Aguard. Tratativa',       color: 'text-orange-600 bg-orange-50' },
      AGUARDANDO_APROVACAO:        { label: 'Aguard. Aprovação',       color: 'text-indigo-600 bg-indigo-50' },
    }
    if (map[item.status]) return map[item.status]
    const dias = getDiasRestantes(item.dataLimiteResolucao)
    if (dias !== null && dias < 0) return { label: 'Vencida', color: 'text-red-600 bg-red-50' }
    return { label: item.status, color: 'text-slate-600 bg-slate-100' }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Tratativas</h2>
          <p className="text-sm text-slate-500">{filtradas.length} ocorrências registradas</p>
        </div>
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
            onClick={() => { setFiltroStatus(tab.key); setPage(1) }}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              filtroStatus === tab.key
                ? tab.activeColor
                : 'text-slate-600 border border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            {tab.label}
            {tab.key !== 'TODOS' && contadores[tab.key] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                filtroStatus === tab.key ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
              }`}>
                {contadores[tab.key]}
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
          const statusInfo = getStatusInfo(item)
          const dias = item.tipo === 'NAO_CONFORMIDADE' ? getDiasRestantes(item.dataLimiteResolucao) : null

          const concluido = item.status === 'CONCLUIDO'
          return (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
              <div className="flex items-start gap-3 sm:gap-5">
                {/* Thumbnail - hidden on mobile */}
                <div className="hidden sm:flex w-24 h-20 bg-gray-100 rounded-lg flex-shrink-0 items-center justify-center overflow-hidden">
                  {item.primeiraEvidenciaId && item.primeiraEvidenciaNome ? (
                    <EvidenciaThumbnail
                      evidenciaId={item.primeiraEvidenciaId}
                      nomeArquivo={item.primeiraEvidenciaNome}
                    />
                  ) : (
                    <div className="space-y-1 px-2 w-full">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-1.5 bg-gray-200 rounded" style={{ width: `${60 + i * 10}%` }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {concluido
                      ? <CheckCircle2 size={16} className="text-green-500" />
                      : <AlertTriangle size={16} className={item.tipo === 'DESVIO' ? 'text-yellow-400' : 'text-red-400'} />
                    }
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      concluido
                        ? 'bg-green-100 text-green-700'
                        : item.tipo === 'DESVIO' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.tipo === 'DESVIO' ? 'Desvio' : 'NC'}
                    </span>
                    {item.regraDeOuro && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                        <Shield size={10} /> Regra de Ouro
                      </span>
                    )}
                    <span className={`text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 ${statusInfo.color}`}>
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
                  <div className="text-sm text-slate-500 truncate">{item.descricao}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                    {item.localizacao && <span className="flex items-center gap-1"><MapPin size={11} />{item.localizacao}</span>}
                    <span className="flex items-center gap-1"><Clock size={11} />{formatDate(item.dataRegistro)}</span>
                  </div>
                  {item.tipo === 'NAO_CONFORMIDADE' && item.dataLimiteResolucao && item.status !== 'CONCLUIDO' && (
                    <div className="mt-2">
                      <PrazoBar dataLimite={item.dataLimiteResolucao} vencida={item.vencida} />
                    </div>
                  )}
                </div>

                {/* Right side - desktop */}
                <button
                  onClick={() => navigate(`/tratativas/${item.tipo}/${item.id}`)}
                  className="hidden sm:block text-sm text-slate-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition whitespace-nowrap flex-shrink-0"
                >
                  Ver Tratativa →
                </button>
              </div>
              {/* Mobile button */}
              <button
                onClick={() => navigate(`/tratativas/${item.tipo}/${item.id}`)}
                className="sm:hidden w-full mt-3 text-sm text-slate-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition text-center"
              >
                Ver Tratativa →
              </button>
            </div>
          )
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  )
}
