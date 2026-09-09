import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDesvio } from '../api/desvio'
import DesvioTrativaSection from './desvio/DesvioTrativaSection'
import { getTrechosNorma } from '../api/ncTrechoNorma'
import {
  getNaoConformidade,
  submeterInvestigacao,
  aprovarPlano,
  rejeitarPlano,
  revisarAtividades,
  submeterExecucao,
  revisarExecucao,
} from '../api/naoConformidade'
import { useAuth } from '../contexts/AuthContext'
import {
  ArrowLeft, MapPin, Calendar, Shield, AlertTriangle, FileText,
  CheckCircle, XCircle, Clock, Eye, Building2, User, BookOpen,
  RefreshCw, Plus, Trash2, History, ChevronDown, ChevronUp, ChevronRight,
  Download, FileDown,
} from 'lucide-react'
import EvidenciaUpload from '../components/EvidenciaUpload'
import { downloadEvidencia } from '../api/evidencia'
import StatusBadge from '../components/StatusBadge'
import CodigoBadge from '../components/CodigoBadge'
import RiscoBadge from '../components/RiscoBadge'
import { formatDate, formatDateTime } from '../utils/date'
import { exportTratativaBundle } from '../utils/exportTratativa'
import { TipoAcaoHistorico } from '../types'
import NcRiskMatrix from '../components/NcRiskMatrix'

function SnapEvidImage({ id, nome, onClick }: { id: string; nome: string; onClick: () => void }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let url = ''
    downloadEvidencia(id).then(blob => { url = URL.createObjectURL(blob); setSrc(url) }).catch(() => {})
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [id])
  const isImg = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(nome)
  if (!isImg) return (
    <button onClick={onClick} className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 max-w-[180px]">
      <FileText size={11} className="shrink-0" /><span className="truncate">{nome}</span>
    </button>
  )
  return (
    <button onClick={onClick} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-purple-400 transition shrink-0 bg-slate-100">
      {src ? <img src={src} alt={nome} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><div className="w-4 h-4 border-2 border-slate-300 border-t-purple-500 rounded-full animate-spin" /></div>}
    </button>
  )
}

const acaoLabels: Record<TipoAcaoHistorico, string> = {
  CRIACAO: 'NC Criada',
  SUBMISSAO_INVESTIGACAO: 'Investigação Submetida',
  APROVACAO_PLANO: 'Plano Aprovado',
  REJEICAO_PLANO: 'Plano Rejeitado',
  SUBMISSAO_EVIDENCIAS: 'Evidências Submetidas',
  APROVACAO_EVIDENCIAS: 'Evidências Aprovadas',
  REJEICAO_EVIDENCIAS: 'Evidências Rejeitadas',
}

const acaoColors: Record<TipoAcaoHistorico, string> = {
  CRIACAO: 'bg-slate-100 text-slate-600 border-slate-200',
  SUBMISSAO_INVESTIGACAO: 'bg-blue-50 text-blue-700 border-blue-200',
  APROVACAO_PLANO: 'bg-green-50 text-green-700 border-green-200',
  REJEICAO_PLANO: 'bg-red-50 text-red-700 border-red-200',
  SUBMISSAO_EVIDENCIAS: 'bg-purple-50 text-purple-700 border-purple-200',
  APROVACAO_EVIDENCIAS: 'bg-green-50 text-green-700 border-green-200',
  REJEICAO_EVIDENCIAS: 'bg-red-50 text-red-700 border-red-200',
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

export default function TrativaDetailPage() {
  const { tipo, id } = useParams<{ tipo: string; id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isDesvio = tipo === 'DESVIO'
  const isEngenheiro = user?.perfil === 'ENGENHEIRO'
  const isExterno = user?.perfil === 'EXTERNO'
  const isTecnico = user?.perfil === 'TECNICO'

  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [porques, setPorques] = useState<{ pergunta: string; resposta: string }[]>([
    { pergunta: '', resposta: '' },
  ])
  const [causaRaiz, setCausaRaiz] = useState('')
  const [atividades, setAtividades] = useState<{ titulo: string; descricao: string }[]>([{ titulo: '', descricao: '' }])
  const [decisoes, setDecisoes] = useState<Record<string, { status: 'APROVADA' | 'REJEITADA'; motivo: string }>>({})
  const [comentarioRevisao, setComentarioRevisao] = useState('')
  const [normaAberta, setNormaAberta] = useState<string | null>(null)
  const [execucaoDescricoes, setExecucaoDescricoes] = useState<Record<string, string>>({})
  const [decisoesExecucao, setDecisoesExecucao] = useState<Record<string, { status: 'APROVADA' | 'REJEITADA'; motivo: string }>>({})
  const [comentarioRevisaoExecucao, setComentarioRevisaoExecucao] = useState('')
  const [decisaoPorques, setDecisaoPorques] = useState<'APROVADA' | 'REJEITADA' | undefined>(undefined)
  const [atividadesMovidas, setAtividadesMovidas] = useState<Set<string>>(new Set())

  const [expandedSnapshotIds, setExpandedSnapshotIds] = useState<Set<string>>(new Set())
  const toggleSnapshot = (id: string) => setExpandedSnapshotIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [comentarioAprovacao, setComentarioAprovacao] = useState('')
  const [confirmarEnvio, setConfirmarEnvio] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const initialized = useRef(false)

  const toggleNorma = useCallback((nId: string) => {
    setNormaAberta(prev => prev === nId ? null : nId)
  }, [])

  async function handleExportPDF() {
    if (!nc) return
    setExporting(true)
    setExportMenuOpen(false)
    try {
      await exportTratativaBundle(nc, trechos)
    } catch (err) {
      console.error('[exportTratativa]', err)
      alert('Erro ao exportar o relatório. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadEvidencia = async (evidenciaId: string, nomeArquivo: string) => {
    const blob = await downloadEvidencia(evidenciaId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomeArquivo
    a.click()
    URL.revokeObjectURL(url)
  }

  const { data: desvio } = useQuery({
    queryKey: ['desvio', id],
    queryFn: () => getDesvio(id!),
    enabled: isDesvio,
  })

  const { data: nc } = useQuery({
    queryKey: ['nc', id],
    queryFn: () => getNaoConformidade(id!),
    enabled: !isDesvio,
  })

  const { data: trechos = [] } = useQuery({
    queryKey: ['trechos-norma', id],
    queryFn: () => getTrechosNorma(id!),
    enabled: !isDesvio && !!id,
  })

  useEffect(() => {
    const aprovadas = nc?.atividades?.filter(a => a.statusExecucao === 'APROVADA') ?? []
    if (aprovadas.length === 0) return
    setDecisoesExecucao(prev => {
      const next = { ...prev }
      aprovadas.forEach(a => { if (!next[a.id]) next[a.id] = { status: 'APROVADA', motivo: '' } })
      return next
    })
  }, [nc?.id, nc?.atividades])

  useEffect(() => {
    if (nc && !initialized.current) {
      initialized.current = true
      if (nc.porqueUm) {
        setPorques([
          { pergunta: nc.porqueUm, resposta: nc.porqueUmResposta ?? '' },
          ...(nc.porqueDois ? [{ pergunta: nc.porqueDois, resposta: nc.porqueDoisResposta ?? '' }] : []),
          ...(nc.porqueTres ? [{ pergunta: nc.porqueTres, resposta: nc.porqueTresResposta ?? '' }] : []),
          ...(nc.porqueQuatro ? [{ pergunta: nc.porqueQuatro, resposta: nc.porqueQuatroResposta ?? '' }] : []),
          ...(nc.porqueCinco ? [{ pergunta: nc.porqueCinco, resposta: nc.porqueCincoResposta ?? '' }] : []),
        ])
      }
      if (nc.causaRaiz) setCausaRaiz(nc.causaRaiz)
      const descricoes: Record<string, string> = {}
      nc.atividades?.forEach(a => {
        if (a.descricaoExecucao) descricoes[a.id] = a.descricaoExecucao
      })
      if (Object.keys(descricoes).length > 0) setExecucaoDescricoes(descricoes)
      if (nc.status === 'EM_AJUSTE_PELO_EXTERNO') {
        const rejeitadas = nc.atividades?.filter(a => a.status === 'REJEITADA') ?? []
        setAtividades(rejeitadas.length > 0
          ? rejeitadas.map(a => ({ titulo: a.titulo || '', descricao: a.descricao }))
          : [{ titulo: '', descricao: '' }]
        )
      } else if (nc.atividades?.length > 0) {
        setAtividades(nc.atividades.map(a => ({ titulo: a.titulo || '', descricao: a.descricao })))
      }
    }
  }, [nc])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ocorrencias'] })
    queryClient.invalidateQueries({ queryKey: ['nc', id] })
  }

  const mutSubmeterInvestigacao = useMutation({
    mutationFn: () => submeterInvestigacao(id!, {
      porques,
      causaRaiz,
      atividades: atividades.filter(a => a.titulo.trim() && a.descricao.trim()),
    }),
    onSuccess: () => { invalidate(); setConfirmarEnvio(false) },
  })

  const mutRevisarAtividades = useMutation({
    mutationFn: () => {
      const porqueRejeitado = decisaoPorques === 'REJEITADA'
      return revisarAtividades(id!, {
        decisoes: Object.entries(decisoes).map(([atividadeId, d]) => ({ atividadeId, status: d.status, motivo: d.motivo || undefined })),
        comentario: comentarioRevisao || undefined,
        porqueRejeitado,
      })
    },
    onSuccess: () => { invalidate(); setDecisoes({}); setComentarioRevisao(''); setDecisaoPorques(undefined) },
  })

  const mutAprovarPlano = useMutation({
    mutationFn: () => aprovarPlano(id!, { comentario: comentarioAprovacao || undefined }),
    onSuccess: () => { invalidate(); setComentarioAprovacao('') },
  })

  const mutRejeitarPlano = useMutation({
    mutationFn: () => rejeitarPlano(id!, { motivo: motivoRejeicao }),
    onSuccess: () => { invalidate(); setMotivoRejeicao('') },
  })

  const mutSubmeterExecucao = useMutation({
    mutationFn: () => submeterExecucao(id!, {
      atividades: (nc?.atividades ?? [])
        .filter(a => a.status === 'APROVADA' && a.statusExecucao !== 'APROVADA')
        .map(a => ({ atividadeId: a.id, descricaoExecucao: execucaoDescricoes[a.id] || '' })),
    }),
    onSuccess: () => { invalidate() },
  })

  const mutRevisarExecucao = useMutation({
    mutationFn: () => revisarExecucao(id!, {
      decisoes: Object.entries(decisoesExecucao).map(([atividadeId, d]) => ({ atividadeId, status: d.status, motivo: d.motivo || undefined })),
      comentario: comentarioRevisaoExecucao || undefined,
    }),
    onSuccess: () => { invalidate(); setDecisoesExecucao({}); setComentarioRevisaoExecucao('') },
  })

  function getDiasRestantes(dataLimite?: string) {
    if (!dataLimite) return null
    const limite = new Date(dataLimite)
    const hoje = new Date()
    return Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  }

  const ocorrencia = isDesvio ? desvio : nc
  if (!ocorrencia) return <div className="text-center py-12 text-slate-400">Carregando...</div>

  const dias = !isDesvio ? getDiasRestantes(nc?.dataLimiteResolucao) : null
  const prazoVencido = dias !== null && dias < 0 && nc?.status !== 'CONCLUIDO'
  const prazoColor = dias === null ? 'text-slate-400'
    : dias < 7 ? 'text-red-500'
    : dias < 21 ? 'text-amber-500'
    : 'text-emerald-500'
  const prazoPct = dias !== null ? Math.max(0, Math.min(100, ((30 - dias) / 30) * 100)) : 0
  const chainNodes = [
    ...(nc?.cadeiaReincidencias ?? []).map(item => ({ ...item, isCurrent: false, isPast: true })),
    ...(nc ? [{ id: nc.id, titulo: nc.titulo, dataRegistro: nc.dataRegistro, status: nc.status, isCurrent: true, isPast: false }] : []),
    ...(nc?.reincidencias ?? []).map(item => ({ ...item, isCurrent: false, isPast: false })),
  ]

  const showInvestigacaoForm = !isDesvio && (nc?.status === 'AGUARDANDO_TRATATIVA' || nc?.status === 'EM_AJUSTE_PELO_EXTERNO') && isExterno
  const showAguardandoTratativa = !isDesvio && nc?.status === 'AGUARDANDO_TRATATIVA' && !isExterno
  const showAguardandoAprovacaoPlano = !isDesvio && nc?.status === 'AGUARDANDO_APROVACAO_PLANO' && isExterno
  const showAprovacaoPlanoForm = !isDesvio && nc?.status === 'AGUARDANDO_APROVACAO_PLANO' && isEngenheiro
  const showExecucaoForm = !isDesvio && nc?.status === 'EM_EXECUCAO' && isExterno
  const showEngenheiroAguardaExecucao = !isDesvio && nc?.status === 'EM_EXECUCAO' && isEngenheiro
  const showAguardandoValidacaoFinal = !isDesvio && nc?.status === 'AGUARDANDO_VALIDACAO_FINAL' && isExterno
  const showAprovacaoEvidenciasForm = !isDesvio && nc?.status === 'AGUARDANDO_VALIDACAO_FINAL' && isEngenheiro
  const showNcAguardandoAtivacao = !isDesvio && nc?.status === 'ABERTA'
  const showDesvioAberto = isDesvio && desvio?.status === 'ABERTO'

  const investigacaoValida = porques.every(p => p.pergunta.trim() && p.resposta.trim()) && causaRaiz.trim() && atividades.some(a => a.titulo.trim() && a.descricao.trim())

  return (
    <>
    <style>{`
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      .prazo-shimmer {
        background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.4) 50%, transparent 75%);
        background-size: 200% auto;
        animation: shimmer 2.5s linear infinite;
      }
    `}</style>
    <div className="space-y-5">

      {/* Back + Export */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/tratativas')} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="flex gap-2">
          {(() => {
            const podeExportar = nc?.status === 'CONCLUIDO' && (user?.perfil === 'ENGENHEIRO' || user?.perfil === 'TECNICO' || user?.isAdmin)
            if (!podeExportar) return null
            return (
              <div className="relative">
                <button onClick={() => setExportMenuOpen(v => !v)} onBlur={() => setTimeout(() => setExportMenuOpen(false), 150)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Download size={15} /> Exportar
                </button>
                {exportMenuOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={handleExportPDF} disabled={exporting}>
                      <FileDown size={15} className="text-sky-600" />
                      {exporting ? 'Exportando...' : 'Exportar PDF'}
                    </button>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Page header: tags + title + subtitle */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <CodigoBadge codigo={ocorrencia.codigo} />
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isDesvio ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
            {isDesvio ? 'Desvio' : 'Não Conformidade'}
          </span>
          {!isDesvio && nc && (
            <>
              <StatusBadge status={nc.status} type="nc" />
              <RiscoBadge nivel={nc.nivelRisco} />
              {nc.vencida && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">Vencida</span>
              )}
            </>
          )}
          {isDesvio && desvio && <StatusBadge status={desvio.status} type="desvio" />}
          {ocorrencia.regraDeOuro && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1">
              <Shield size={12} /> Regra de Ouro
            </span>
          )}
          {!isDesvio && nc?.reincidencia && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
              <RefreshCw size={12} /> Reincidência
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1 break-words overflow-hidden">{ocorrencia.titulo}</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          {ocorrencia.estabelecimentoNome}
          {ocorrencia.localizacaoNome ? ` · ${ocorrencia.localizacaoNome}` : ''}
          {' · registrada em '}{formatDateTime(ocorrencia.dataRegistro)}
        </p>
      </div>

      {/* Two-column layout */}
      <div className={`grid grid-cols-1 ${!isDesvio ? 'lg:grid-cols-[3fr_2fr]' : ''} gap-4 items-start`}>

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-4">

          {/* IDENTIFICAÇÃO */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Identificação</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Building2 size={11} /> Estabelecimento</p>
                <p className="text-slate-800 dark:text-slate-200 font-medium">{ocorrencia.estabelecimentoNome}</p>
              </div>
              {ocorrencia.localizacaoNome && (
                <div>
                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><MapPin size={11} /> Localização</p>
                  <p className="text-slate-800 dark:text-slate-200 font-medium">{ocorrencia.localizacaoNome}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar size={11} /> Data de Registro</p>
                <p className="text-slate-800 dark:text-slate-200">{formatDateTime(ocorrencia.dataRegistro)}</p>
              </div>
              {!isDesvio && nc?.dataLimiteResolucao && (
                <div>
                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar size={11} /> Prazo</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium ${prazoVencido ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>{formatDate(nc.dataLimiteResolucao)}</p>
                    {dias !== null && dias >= 0 && nc.status !== 'CONCLUIDO' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{dias}d restantes</span>
                    )}
                    {prazoVencido && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Vencido</span>}
                  </div>
                </div>
              )}
              {(ocorrencia.tecnicoNome || ocorrencia.usuarioCriacaoNome) && (
                <div>
                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><User size={11} /> Registrado por</p>
                  <p className="text-slate-800 dark:text-slate-200 break-words">
                    {ocorrencia.usuarioCriacaoNome
                      ? `${ocorrencia.usuarioCriacaoNome}${ocorrencia.usuarioCriacaoEmail ? ` (${ocorrencia.usuarioCriacaoEmail})` : ''}`
                      : ocorrencia.tecnicoNome}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 mb-1">ID</p>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{id?.substring(0, 8)}…</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400 mb-1">Descrição</p>
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words overflow-hidden">{ocorrencia.descricao}</p>
              </div>
              {!isDesvio && nc && nc.normas.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><BookOpen size={11} /> Normas Vinculadas</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {nc.normas.map(n => {
                      const count = trechos.filter(t => t.normaId === n.id).length
                      return (
                        <button key={n.id} type="button" onClick={() => toggleNorma(n.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition">
                          <BookOpen size={11} />{n.titulo}
                          {count > 0 && (
                            <span className="ml-0.5 bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full text-xs font-semibold">{count}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {normaAberta && nc.normas.find(n => n.id === normaAberta) && (() => {
                    const n = nc.normas.find(n => n.id === normaAberta)!
                    const trechosNorma = trechos.filter(t => t.normaId === n.id)
                    return (
                      <div className="mt-2 border border-indigo-100 dark:border-indigo-900/30 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 overflow-hidden">
                        {n.descricao && <p className="text-xs text-slate-600 px-3 pt-2 pb-2 break-words whitespace-pre-wrap">{n.descricao}</p>}
                        {trechosNorma.length > 0 && (
                          <div className={`divide-y divide-blue-100 ${n.descricao ? 'border-t border-indigo-100' : ''}`}>
                            {trechosNorma.map(t => (
                              <div key={t.id} className="px-3 py-2.5 bg-blue-50/50">
                                {t.clausulaReferencia && <p className="text-xs font-semibold text-blue-700 mb-1">{t.clausulaReferencia}</p>}
                                <p className="text-xs text-slate-700 whitespace-pre-wrap break-words">{t.textoEditado}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* RESPONSÁVEIS — Desvio */}
          {isDesvio && (desvio?.responsavelDesvioNome || desvio?.responsavelTrativaNome) && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Responsáveis</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {desvio?.responsavelDesvioNome ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300">{getInitials(desvio.responsavelDesvioNome)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Resp. pelo Desvio</div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{desvio.responsavelDesvioNome}</div>
                      </div>
                    </div>
                  ) : <div className="text-sm text-slate-400">—</div>}
                </div>
                <div>
                  {desvio?.responsavelTrativaNome ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{getInitials(desvio.responsavelTrativaNome)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Resp. pela Tratativa</div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{desvio.responsavelTrativaNome}</div>
                      </div>
                    </div>
                  ) : <div className="text-sm text-slate-400">—</div>}
                </div>
              </div>
            </div>
          )}

          {/* RESPONSÁVEIS — NC */}
          {!isDesvio && (nc?.responsavelTrativaNome || nc?.responsavelNcNome) && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Responsáveis</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {nc?.responsavelTrativaNome || nc?.responsavelTrativaEmail ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300">{getInitials(nc!.responsavelTrativaNome || nc!.responsavelTrativaEmail || '?')}</span>
                      </div>
                      <div className="min-w-0">
                        {nc!.responsavelTrativaPerfil && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{nc!.responsavelTrativaPerfil}</div>}
                        {nc!.responsavelTrativaNome && <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{nc!.responsavelTrativaNome}</div>}
                        {nc!.responsavelTrativaEmail && <div className="text-xs text-slate-400 truncate">{nc!.responsavelTrativaEmail}</div>}
                      </div>
                    </div>
                  ) : <div className="text-sm text-slate-400">—</div>}
                </div>
                <div>
                  {nc?.responsavelNcNome || nc?.responsavelNcEmail ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{getInitials(nc!.responsavelNcNome || nc!.responsavelNcEmail || '?')}</span>
                      </div>
                      <div className="min-w-0">
                        {nc!.responsavelNcPerfil && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{nc!.responsavelNcPerfil}</div>}
                        {nc!.responsavelNcNome && <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{nc!.responsavelNcNome}</div>}
                        {nc!.responsavelNcEmail && <div className="text-xs text-slate-400 truncate">{nc!.responsavelNcEmail}</div>}
                      </div>
                    </div>
                  ) : <div className="text-sm text-slate-400">—</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN (NC only) ── */}
        {!isDesvio && (
          <div className="space-y-4">

            {/* PRAZO widget */}
            {nc?.dataLimiteResolucao && nc.status !== 'CONCLUIDO' && (
              <div className="relative overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="prazo-shimmer absolute inset-0 pointer-events-none rounded-xl" />
                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className={prazoColor} />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Prazo</span>
                  </div>
                  <div className={`text-sm font-bold ${prazoColor}`}>
                    {dias === null ? '—'
                      : dias < 0 ? `${Math.abs(dias)}d vencido`
                      : dias === 0 ? 'Vence hoje'
                      : `${dias}d restantes`}
                  </div>
                </div>
                <div className="relative mt-3 h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${
                    dias !== null && dias < 7 ? 'bg-red-500'
                    : dias !== null && dias < 21 ? 'bg-amber-400'
                    : 'bg-emerald-500'
                  }`} style={{ width: `${prazoPct}%` }} />
                </div>
                <div className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  Vence em {formatDate(nc.dataLimiteResolucao)}
                </div>
              </div>
            )}

            {/* Risco */}
            {nc?.severidade != null && nc?.probabilidade != null && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Análise de Risco</div>
                <div className="flex justify-center mb-3">
                  <NcRiskMatrix severidade={nc.severidade} probabilidade={nc.probabilidade} />
                </div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-200 dark:border-slate-600 flex-wrap gap-2">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-slate-400 dark:text-slate-500">SEV.</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{nc.severidade}</span>
                    <span className="text-slate-400 dark:text-slate-500">{{1:'Insignificante',2:'Menor',3:'Moderada',4:'Maior',5:'Catastrófica'}[nc.severidade] ?? ''}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-slate-400 dark:text-slate-500">PROB.</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{nc.probabilidade}</span>
                    <span className="text-slate-400 dark:text-slate-500">{{1:'Rara',2:'Improvável',3:'Possível',4:'Provável'}[nc.probabilidade] ?? ''}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-slate-400 dark:text-slate-500">NÍVEL</span>
                    <span className={`font-bold ${{BAIXO:'text-emerald-600',MODERADO:'text-amber-600',ALTO:'text-orange-500',CRITICO:'text-red-600'}[nc.nivelRisco] ?? ''}`}>{nc.nivelRisco}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* EVIDÊNCIAS — full width */}
      {!isDesvio && id && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
          <EvidenciaUpload naoConformidadeId={id} tipoEvidencia="OCORRENCIA" readOnly titulo="Evidências da Ocorrência" />
        </div>
      )}

      {/* RASTRO DE REINCIDÊNCIAS — vertical timeline */}
      {!isDesvio && nc && (nc.reincidencia || (nc.reincidencias?.length ?? 0) > 0) && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/40 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={15} className="text-red-500" />
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Rastro de Reincidências</h3>
            <span className="text-xs text-slate-400">({(nc.cadeiaReincidencias?.length ?? 0) + 1 + (nc.reincidencias?.length ?? 0)} ocorrência(s))</span>
          </div>
          <div className="relative pl-6">
            <div className="absolute left-2.5 top-2 bottom-2 w-px bg-red-200 dark:bg-red-800/40" />
            {chainNodes.map((node, idx) => {
              const isLast = idx === chainNodes.length - 1
              return (
                <div key={node.id} className={`relative mb-0 ${!isLast ? 'pb-5' : ''}`}>
                  <div className={`absolute -left-3.5 top-1.5 w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                    node.isCurrent
                      ? 'bg-red-600 border-red-600 ring-2 ring-red-200 dark:ring-red-800'
                      : node.isPast
                      ? 'bg-white dark:bg-slate-800 border-red-400'
                      : 'bg-white dark:bg-slate-800 border-orange-400'
                  }`} />
                  {node.isCurrent ? (
                    <div className="ml-1 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">Esta NC (atual)</div>
                      <div className="text-sm font-medium text-red-800 dark:text-red-200">{node.titulo}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{formatDate(node.dataRegistro)}</div>
                    </div>
                  ) : (
                    <button onClick={() => navigate(`/tratativas/NAO_CONFORMIDADE/${node.id}`)}
                      className={`ml-1 w-full text-left flex items-center justify-between px-3 py-2 rounded-lg border transition group ${
                        node.isPast
                          ? 'border-red-100 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'border-orange-100 dark:border-orange-900/40 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                      }`}>
                      <div>
                        <div className={`text-xs font-medium mb-0.5 ${node.isPast ? 'text-red-500 dark:text-red-400' : 'text-orange-500 dark:text-orange-400'}`}>
                          {node.isPast ? 'Anterior' : 'Posterior'}
                        </div>
                        <div className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[260px]">{node.titulo}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{formatDate(node.dataRegistro)}</div>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-slate-400 mt-3">Clique em qualquer NC para ver seus detalhes</p>
        </div>
      )}

      {/* INVESTIGAÇÃO — histórico de submissões */}
      {!isDesvio && nc && nc.investigacaoSnapshots?.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900/40 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-blue-500" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">Análise de Causa Raiz — 5 Porquês</h3>
            {nc.investigacaoSnapshots.length > 1 && (
              <span className="text-xs text-slate-400 ml-1">({nc.investigacaoSnapshots.length} submissões)</span>
            )}
          </div>
          <div className="space-y-3">
            {nc.investigacaoSnapshots.map((snap, idx) => {
              const isLatest = idx === nc.investigacaoSnapshots.length - 1
              const isExpanded = isLatest || expandedSnapshotIds.has(snap.id)
              const statusColor = snap.status === 'APROVADO'
                ? 'bg-green-50 text-green-700 border-green-200'
                : snap.status === 'REPROVADO'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              const statusLabel = snap.status === 'APROVADO' ? 'Aprovada' : snap.status === 'REPROVADO' ? 'Reprovada' : 'Pendente'
              return (
                <div key={snap.id} className={`rounded-lg border ${isLatest ? 'border-blue-200' : 'border-gray-200'}`}>
                  <button
                    className={`w-full flex items-center justify-between px-4 py-3 text-left gap-3 ${!isLatest ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'} rounded-lg`}
                    onClick={() => !isLatest && toggleSnapshot(snap.id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-500">Submissão {idx + 1}</span>
                      <span className="text-xs text-slate-400">{formatDateTime(snap.dataSubmissao)}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor}`}>{statusLabel}</span>
                    </div>
                    {!isLatest && (isExpanded ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />)}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {snap.comentarioRevisao && (
                        <div className={`rounded-lg px-3 py-2 text-xs border ${snap.status === 'REPROVADO' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                          <span className="font-semibold">{snap.status === 'REPROVADO' ? 'Motivo da reprovação: ' : 'Comentário: '}</span>
                          {snap.comentarioRevisao}
                        </div>
                      )}
                      <div className="space-y-3">
                        {[
                          { pergunta: snap.porqueUm, resposta: snap.porqueUmResposta },
                          { pergunta: snap.porqueDois, resposta: snap.porqueDoisResposta },
                          { pergunta: snap.porqueTres, resposta: snap.porqueTresResposta },
                          { pergunta: snap.porqueQuatro, resposta: snap.porqueQuatroResposta },
                          { pergunta: snap.porqueCinco, resposta: snap.porqueCincoResposta },
                        ].map((p, i) => p.pergunta && (
                          <div key={i} className="flex gap-3">
                            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-1">{i + 1}</span>
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-sm font-medium text-slate-800 break-words">{p.pergunta}</p>
                              {p.resposta && <p className="text-sm text-slate-600 break-words pl-3 border-l-2 border-blue-200">{p.resposta}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t border-blue-100">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Causa Raiz Identificada</p>
                        <p className="text-sm font-medium text-slate-800 bg-blue-50 rounded-lg px-3 py-2 break-words">{snap.causaRaiz}</p>
                      </div>
                      {snap.atividades?.length > 0 && (
                        <div className="pt-3 border-t border-blue-100">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Plano de Atividades</p>
                          <div className="space-y-2">
                            {isLatest
                              ? nc.atividades?.map((a) => (
                                <div key={a.id} className={`flex gap-3 items-start rounded-lg border p-2 ${
                                  a.status === 'APROVADA' ? 'border-green-200 bg-green-50'
                                  : a.status === 'REJEITADA' ? 'border-red-200 bg-red-50'
                                  : 'border-blue-100 bg-blue-50/40'
                                }`}>
                                  <span className="w-6 h-6 rounded bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{a.ordem}</span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-medium text-slate-800 break-words min-w-0">{a.titulo}</p>
                                      {a.status === 'APROVADA' && <span className="flex items-center gap-0.5 text-xs text-green-700 font-medium shrink-0"><CheckCircle size={11} /> Aprovada</span>}
                                      {a.status === 'REJEITADA' && <span className="flex items-center gap-0.5 text-xs text-red-700 font-medium shrink-0"><XCircle size={11} /> Rejeitada</span>}
                                    </div>
                                    <p className="text-xs text-slate-600 break-words mt-0.5">{a.descricao}</p>
                                    {a.motivoRejeicao && <p className="text-xs text-red-600 break-words mt-1">Motivo: {a.motivoRejeicao}</p>}
                                  </div>
                                </div>
                              ))
                              : snap.atividades.map((a, i) => {
                                const splitStatus = a.split(' || ')
                                const body = splitStatus[0]
                                const statusRaw = splitStatus[1] ?? ''
                                const isAprovada = statusRaw.startsWith('APROVADA')
                                const isRejeitada = statusRaw.startsWith('REJEITADA')
                                const motivoHist = isRejeitada && statusRaw.includes(': ') ? statusRaw.slice(statusRaw.indexOf(': ') + 2) : ''
                                const sepIdx = body.indexOf(' — ')
                                const titulo = sepIdx >= 0 ? body.slice(0, sepIdx) : body
                                const descricao = sepIdx >= 0 ? body.slice(sepIdx + 3) : ''
                                return (
                                  <div key={i} className={`flex gap-3 items-start rounded-lg border p-2 ${
                                    isAprovada ? 'border-green-200 bg-green-50'
                                    : isRejeitada ? 'border-red-200 bg-red-50'
                                    : 'border-blue-100 bg-blue-50/40'
                                  }`}>
                                    <span className="w-6 h-6 rounded bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-slate-800 break-words min-w-0">{titulo}</p>
                                        {isAprovada && <span className="flex items-center gap-0.5 text-xs text-green-700 font-medium shrink-0"><CheckCircle size={11} /> Aprovada</span>}
                                        {isRejeitada && <span className="flex items-center gap-0.5 text-xs text-red-700 font-medium shrink-0"><XCircle size={11} /> Rejeitada</span>}
                                      </div>
                                      {descricao && <p className="text-xs text-slate-600 break-words mt-0.5">{descricao}</p>}
                                      {motivoHist && <p className="text-xs text-red-600 break-words mt-1">Motivo: {motivoHist}</p>}
                                    </div>
                                  </div>
                                )
                              })
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* EXECUÇÃO — histórico de submissões */}
      {!isDesvio && nc && nc.execucaoSnapshots?.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-purple-200 dark:border-purple-900/40 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={16} className="text-purple-500" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">O que foi executado</h3>
            {nc.execucaoSnapshots.length > 1 && (
              <span className="text-xs text-slate-400 ml-1">({nc.execucaoSnapshots.length} submissões)</span>
            )}
          </div>
          <div className="space-y-3">
            {nc.execucaoSnapshots.map((snap, idx) => {
              const isLatest = idx === nc.execucaoSnapshots.length - 1
              const isExpanded = isLatest || expandedSnapshotIds.has(snap.id)
              const statusColor = snap.status === 'APROVADO'
                ? 'bg-green-50 text-green-700 border-green-200'
                : snap.status === 'REPROVADO'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              const statusLabel = snap.status === 'APROVADO' ? 'Aprovada' : snap.status === 'REPROVADO' ? 'Reprovada' : 'Pendente'
              return (
                <div key={snap.id} className={`rounded-lg border ${isLatest ? 'border-purple-200' : 'border-gray-200'}`}>
                  <button
                    className={`w-full flex items-center justify-between px-4 py-3 text-left gap-3 ${!isLatest ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'} rounded-lg`}
                    onClick={() => !isLatest && toggleSnapshot(snap.id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-500">Submissão {idx + 1}</span>
                      <span className="text-xs text-slate-400">{formatDateTime(snap.dataSubmissao)}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor}`}>{statusLabel}</span>
                    </div>
                    {!isLatest && (isExpanded ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />)}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {snap.comentarioRevisao && (
                        <div className={`rounded-lg px-3 py-2 text-xs border ${snap.status === 'REPROVADO' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                          <span className="font-semibold">{snap.status === 'REPROVADO' ? 'Motivo da reprovação: ' : 'Comentário: '}</span>
                          {snap.comentarioRevisao}
                        </div>
                      )}
                      {isLatest ? (
                        <div className="space-y-2">
                          {nc.atividades?.map(a => (
                            <div key={a.id} className={`rounded-lg border p-3 ${
                              a.statusExecucao === 'APROVADA' ? 'border-green-200 bg-green-50'
                              : a.statusExecucao === 'REJEITADA' ? 'border-red-200 bg-red-50'
                              : 'border-gray-200 bg-gray-50'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                {a.statusExecucao === 'APROVADA' && <CheckCircle size={13} className="text-green-500 shrink-0" />}
                                {a.statusExecucao === 'REJEITADA' && <XCircle size={13} className="text-red-500 shrink-0" />}
                                {!a.statusExecucao && <Clock size={13} className="text-slate-400 shrink-0" />}
                                <p className="text-xs font-semibold text-slate-800 break-words min-w-0">{a.titulo}</p>
                              </div>
                              {a.descricaoExecucao && <p className="text-xs text-slate-600 break-words italic ml-5">"{a.descricaoExecucao}"</p>}
                              {a.motivoRejeicaoExecucao && <p className="text-xs text-red-600 break-words ml-5 mt-1">Motivo: {a.motivoRejeicaoExecucao}</p>}
                              {a.evidencias?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2 ml-5">
                                  {a.evidencias.map(ev => (
                                    <SnapEvidImage key={ev.id} id={ev.id} nome={ev.nomeArquivo} onClick={() => handleDownloadEvidencia(ev.id, ev.nomeArquivo)} />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : snap.atividades?.length > 0 ? (
                        <div className="space-y-2">
                          {snap.atividades.map((a, i) => {
                            const evSplit = a.split(' §§ ')
                            const mainPart = evSplit[0]
                            const evIds = evSplit[1]?.split(',').filter(Boolean) ?? []
                            const splitStatus = mainPart.split(' || ')
                            const body = splitStatus[0]
                            const statusRaw = splitStatus[1] ?? ''
                            const isAprovada = statusRaw.startsWith('APROVADA')
                            const isRejeitada = statusRaw.startsWith('REJEITADA')
                            const motivoHist = isRejeitada && statusRaw.includes(': ') ? statusRaw.slice(statusRaw.indexOf(': ') + 2) : ''
                            const sepIdx = body.indexOf(' — ')
                            const titulo = sepIdx >= 0 ? body.slice(0, sepIdx) : body
                            const descExec = sepIdx >= 0 ? body.slice(sepIdx + 3) : ''
                            // Usa snap.evidencias como fonte primária (preserva histórico mesmo após unlink)
                            const snapEvPool = [...(snap.evidencias ?? []), ...(nc.atividades?.flatMap(at => at.evidencias ?? []) ?? [])]
                            const seen = new Set<string>()
                            const allEvPool = snapEvPool.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
                            const evs = evIds.length > 0 ? evIds.map(id => allEvPool.find(e => e.id === id)).filter(Boolean) as typeof allEvPool : []
                            return (
                              <div key={i} className={`rounded-lg border p-3 ${isAprovada ? 'border-green-200 bg-green-50' : isRejeitada ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  {isAprovada && <CheckCircle size={13} className="text-green-500 shrink-0" />}
                                  {isRejeitada && <XCircle size={13} className="text-red-500 shrink-0" />}
                                  {!isAprovada && !isRejeitada && <Clock size={13} className="text-slate-400 shrink-0" />}
                                  <p className="text-xs font-semibold text-slate-800 break-words min-w-0 flex-1">{titulo}</p>
                                  {isAprovada && <span className="text-xs text-green-700 font-medium shrink-0">Aprovada</span>}
                                  {isRejeitada && <span className="text-xs text-red-700 font-medium shrink-0">Rejeitada</span>}
                                </div>
                                {descExec && <p className="text-xs text-slate-600 break-words italic ml-5">"{descExec}"</p>}
                                {motivoHist && <p className="text-xs text-red-600 break-words ml-5 mt-1">Motivo: {motivoHist}</p>}
                                {evs.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2 ml-5">
                                    {evs.map(ev => (
                                      <SnapEvidImage key={ev.id} id={ev.id} nome={ev.nomeArquivo} onClick={() => handleDownloadEvidencia(ev.id, ev.nomeArquivo)} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Detalhe por atividade não disponível para esta submissão.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* HISTÓRICO DE DECISÕES */}
      {!isDesvio && nc && nc.historico?.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <button onClick={() => setHistoricoAberto(v => !v)}
            className="w-full flex items-center justify-between gap-2 px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-2">
              <History size={16} className="text-slate-500" />
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">Histórico</h3>
              <span className="text-xs text-slate-400">({nc.historico.length})</span>
            </div>
            <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${historicoAberto ? 'rotate-180' : ''}`} />
          </button>
          {historicoAberto && (
            <div className="px-6 pb-6 space-y-2">
              {nc.historico.map(h => (
                <div key={h.id} className={`border rounded-lg p-3 ${acaoColors[h.acao]}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-semibold">{acaoLabels[h.acao]}</span>
                    <span className="text-xs opacity-70 min-w-0 break-words">{formatDateTime(h.dataAcao)}{h.usuarioNome ? ` — ${h.usuarioNome}` : ''}</span>
                  </div>
                  {h.comentario && <p className="text-xs mt-1.5 break-words">{h.comentario}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ ÁREA DE AÇÃO ═══ */}

      {showDesvioAberto && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-center gap-4">
          <Clock size={32} className="text-blue-400 shrink-0" />
          <div>
            <div className="font-bold text-blue-800 text-base">Desvio ainda não enviado para tratativa</div>
            <div className="text-sm text-blue-600 mt-0.5">O criador do desvio precisa confirmar o envio para tratativa antes que ações possam ser realizadas aqui.</div>
          </div>
        </div>
      )}

      {isDesvio && desvio && desvio.status !== 'ABERTO' && (!isTecnico || desvio.responsavelTratativaId === user?.id) && (
        <DesvioTrativaSection
          desvio={desvio}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['desvio', id] })
            queryClient.invalidateQueries({ queryKey: ['ocorrencias'] })
          }}
        />
      )}

      {showNcAguardandoAtivacao && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-center gap-4">
          <Clock size={32} className="text-blue-400 shrink-0" />
          <div>
            <div className="font-bold text-blue-800 text-base">NC aguardando envio para plano de ação</div>
            <div className="text-sm text-blue-600 mt-0.5">O criador da NC precisa confirmar o envio para plano de ação antes que o formulário de investigação fique disponível.</div>
          </div>
        </div>
      )}

      {showAguardandoTratativa && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 flex items-center gap-4">
          <Clock size={32} className="text-orange-400 shrink-0" />
          <div>
            <div className="font-bold text-orange-800 text-base">Aguardando investigação pelo responsável</div>
            <div className="text-sm text-orange-600 mt-0.5">O responsável pela tratativa deve preencher o plano de investigação (5 Porquês, Causa Raiz e Atividades).</div>
          </div>
        </div>
      )}

      {showInvestigacaoForm && (
        <div className="bg-white rounded-xl border-2 border-blue-400 shadow-md p-6 ring-2 ring-blue-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText size={16} className="text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {nc?.status === 'EM_AJUSTE_PELO_EXTERNO' ? 'Ajustar Investigação e Plano de Ação' : 'Preencher Investigação e Plano de Ação'}
            </h3>
          </div>
          {nc?.status === 'EM_AJUSTE_PELO_EXTERNO' && (
            <div className="mb-5 ml-11">
              <p className="text-sm text-orange-600">Corrija as atividades rejeitadas e reenvie o plano.</p>
            </div>
          )}
          {nc?.reincidencia && (nc?.cadeiaReincidencias?.length ?? 0) > 0 && (
            <div className="mb-5 bg-orange-50 border border-orange-300 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw size={14} className="text-orange-600 shrink-0" />
                <p className="text-sm font-bold text-orange-700 min-w-0 break-words">Esta é a {(nc.cadeiaReincidencias?.length ?? 0) + 1}ª ocorrência do mesmo problema</p>
              </div>
              <p className="text-xs text-orange-600">Proponha uma solução diferente que ataque a causa raiz.</p>
            </div>
          )}
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Análise dos Porquês * <span className="text-xs font-normal text-slate-400">(mín. 1, máx. 5)</span></p>
                {porques.length < 5 && (
                  <button type="button" onClick={() => setPorques([...porques, { pergunta: '', resposta: '' }])}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <Plus size={13} /> Adicionar porquê
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {porques.map((p, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-2">{i + 1}</span>
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Pergunta *</label>
                        <input type="text" value={p.pergunta}
                          onChange={e => { const novo = [...porques]; novo[i] = { ...novo[i], pergunta: e.target.value }; setPorques(novo) }}
                          placeholder={`Por que ${i + 1}?`}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Resposta *</label>
                        <input type="text" value={p.resposta}
                          onChange={e => { const novo = [...porques]; novo[i] = { ...novo[i], resposta: e.target.value }; setPorques(novo) }}
                          placeholder="Resposta..."
                          className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white transition" />
                      </div>
                    </div>
                    {porques.length > 1 && (
                      <button type="button" onClick={() => setPorques(porques.filter((_, j) => j !== i))}
                        className="mt-2 text-slate-400 hover:text-red-500 transition shrink-0">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Causa Raiz Identificada *</label>
              <textarea value={causaRaiz} onChange={e => setCausaRaiz(e.target.value)} rows={3}
                placeholder="Descreva a causa raiz identificada pela análise dos 5 Porquês..."
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Plano de Atividades *</p>
                <button type="button" onClick={() => setAtividades([...atividades, { titulo: '', descricao: '' }])}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                  <Plus size={13} /> Adicionar atividade
                </button>
              </div>
              <div className="space-y-3">
                {atividades.map((a, i) => {
                  const ncRejeitadas = nc?.atividades?.filter(at => at.status === 'REJEITADA') ?? []
                  const motivoRejeicao = ncRejeitadas[i]?.motivoRejeicao
                  return (
                    <div key={i} className={`rounded-lg border p-3 ${motivoRejeicao ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        {motivoRejeicao && (
                          <span className="text-xs text-red-600 font-medium flex items-center gap-1 min-w-0"><XCircle size={11} className="shrink-0" /><span className="break-words">{motivoRejeicao}</span></span>
                        )}
                        {atividades.length > 1 && (
                          <button type="button" onClick={() => setAtividades(atividades.filter((_, j) => j !== i))} className="ml-auto text-slate-400 hover:text-red-500 transition">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <input type="text" value={a.titulo}
                          onChange={e => { const novas = [...atividades]; novas[i] = { ...novas[i], titulo: e.target.value }; setAtividades(novas) }}
                          placeholder={`Título da atividade ${i + 1}...`}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition font-medium" />
                        <textarea value={a.descricao}
                          onChange={e => { const novas = [...atividades]; novas[i] = { ...novas[i], descricao: e.target.value }; setAtividades(novas) }}
                          placeholder="Descrição detalhada da atividade..." rows={2}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
                      </div>
                    </div>
                  )
                })}
              </div>
              {nc?.status === 'EM_AJUSTE_PELO_EXTERNO' && nc.atividades?.some(a => a.status === 'APROVADA' && !atividadesMovidas.has(a.id)) && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Aprovadas (não precisam de ajuste)</p>
                  {nc.atividades.filter(a => a.status === 'APROVADA' && !atividadesMovidas.has(a.id)).map(a => (
                    <div key={a.id} className="flex gap-2 items-start p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-green-800 break-words">{a.titulo}</p>
                        <p className="text-xs text-green-600 break-words">{a.descricao}</p>
                      </div>
                      <button type="button"
                        onClick={() => {
                          setAtividadesMovidas(prev => new Set([...prev, a.id]))
                          setAtividades(prev => [...prev, { titulo: a.titulo || '', descricao: a.descricao }])
                        }}
                        className="shrink-0 text-xs text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-300 px-2 py-1 rounded-lg transition">
                        Editar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => navigate('/tratativas')} className="flex-1 py-3 border border-gray-200 rounded-lg text-sm text-slate-600 hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={() => setConfirmarEnvio(true)} disabled={!investigacaoValida}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition flex items-center justify-center gap-2">
                <Eye size={16} /> Revisar e Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAguardandoAprovacaoPlano && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={20} className="text-amber-600 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-amber-800">Aguardando Aprovação do Plano</h3>
              <p className="text-sm text-amber-600">Sua investigação e plano de atividades estão sendo analisados pelo engenheiro.</p>
            </div>
          </div>
        </div>
      )}

      {showAprovacaoPlanoForm && (
        <div className="bg-white rounded-xl border-2 border-green-400 shadow-md p-6 ring-2 ring-green-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={16} className="text-green-600" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Aprovação do Plano de Ação</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                if (nc?.porqueUm) setDecisaoPorques('APROVADA')
                const novasAtv: Record<string, { status: 'APROVADA' | 'REJEITADA'; motivo: string }> = {}
                nc?.atividades?.filter(a => a.status === 'PENDENTE').forEach(a => { novasAtv[a.id] = { status: 'APROVADA', motivo: '' } })
                setDecisoes(novasAtv)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-300 hover:bg-green-100 transition"
            >
              <CheckCircle size={13} /> Aprovar Tudo
            </button>
          </div>
          <p className="text-sm text-green-600 mb-5 ml-11">Revise a investigação e o plano de atividades acima e aprove ou rejeite.</p>
          <div className="space-y-3">
            {/* 5 Porquês */}
            {nc?.porqueUm && (
              <div className={`rounded-xl border p-4 transition ${decisaoPorques === 'REJEITADA' ? 'border-red-300 bg-red-50' : decisaoPorques === 'APROVADA' ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">5 Porquês</p>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setDecisaoPorques('APROVADA')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${decisaoPorques === 'APROVADA' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}>
                      <CheckCircle size={12} /> Aprovar
                    </button>
                    <button type="button" onClick={() => setDecisaoPorques('REJEITADA')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${decisaoPorques === 'REJEITADA' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'}`}>
                      <XCircle size={12} /> Reprovar
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: nc.porqueUm, resp: nc.porqueUmResposta },
                    { label: nc.porqueDois, resp: nc.porqueDoisResposta },
                    { label: nc.porqueTres, resp: nc.porqueTresResposta },
                    { label: nc.porqueQuatro, resp: nc.porqueQuatroResposta },
                    { label: nc.porqueCinco, resp: nc.porqueCincoResposta },
                  ].filter(p => p.label).map((p, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 break-words">{p.label}</p>
                        {p.resp && <p className="text-xs text-slate-500 mt-0.5 break-words pl-2 border-l-2 border-blue-200">{p.resp}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                {nc.causaRaiz && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Causa Raiz Identificada</p>
                    <p className="text-sm text-slate-800 break-words">{nc.causaRaiz}</p>
                  </div>
                )}
              </div>
            )}
            {nc?.porqueUm && <hr className="border-gray-200" />}
            {nc?.porqueUm && <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Atividades do Plano</p>}
            {nc?.atividades?.some(a => a.status === 'APROVADA') && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Já aprovadas</p>
                {nc.atividades.filter(a => a.status === 'APROVADA').map(a => (
                  <div key={a.id} className="flex gap-2 items-start p-3 bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                    <CheckCircle size={15} className="text-green-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-green-800 break-words">{a.titulo}</p>
                      <p className="text-xs text-green-700 mt-0.5 break-words">{a.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {nc?.atividades?.filter(a => a.status === 'PENDENTE').map(a => {
              const decisao = decisoes[a.id]
              return (
                <div key={a.id} className={`rounded-lg border p-3 transition ${
                  decisao?.status === 'APROVADA' ? 'border-green-300 bg-green-50'
                  : decisao?.status === 'REJEITADA' ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
                }`}>
                  <p className="text-sm font-semibold text-slate-800 break-words mb-0.5">{a.titulo}</p>
                  <p className="text-xs text-slate-600 break-words mb-3">{a.descricao}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setDecisoes(prev => ({ ...prev, [a.id]: { status: 'APROVADA', motivo: '' } }))}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${decisao?.status === 'APROVADA' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}>
                      <CheckCircle size={13} /> Aprovar
                    </button>
                    <button type="button" onClick={() => setDecisoes(prev => ({ ...prev, [a.id]: { status: 'REJEITADA', motivo: prev[a.id]?.motivo ?? '' } }))}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${decisao?.status === 'REJEITADA' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'}`}>
                      <XCircle size={13} /> Rejeitar
                    </button>
                  </div>
                  {decisao?.status === 'REJEITADA' && (
                    <textarea value={decisao.motivo}
                      onChange={e => setDecisoes(prev => ({ ...prev, [a.id]: { ...prev[a.id], motivo: e.target.value } }))}
                      placeholder="Motivo da rejeição *" rows={2}
                      className="mt-2 w-full border border-red-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-400 transition" />
                  )}
                </div>
              )
            })}
            {(() => {
              const temReprovacao = Object.values(decisoes).some(d => d.status === 'REJEITADA') || decisaoPorques === 'REJEITADA'
              return (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: temReprovacao ? '#dc2626' : '#64748b' }}>
                    {temReprovacao ? 'Motivo geral da reprovação *' : 'Comentário geral (opcional)'}
                  </label>
                  <textarea value={comentarioRevisao} onChange={e => setComentarioRevisao(e.target.value)} rows={3}
                    placeholder={temReprovacao ? 'Descreva o motivo geral da reprovação do plano...' : 'Comentário sobre esta revisão...'}
                    className={`w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${temReprovacao ? 'border border-red-300 bg-red-50 focus:ring-red-400' : 'border border-gray-200 bg-gray-50 focus:ring-green-400 focus:bg-white'}`} />
                </div>
              )
            })()}
            <div className="flex gap-3 pt-1">
              <button onClick={() => navigate('/tratativas')} className="flex-1 py-3 border border-gray-200 rounded-lg text-sm text-slate-600 hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={() => mutRevisarAtividades.mutate()}
                disabled={
                  (nc?.porqueUm != null && decisaoPorques == null) ||
                  (nc?.atividades?.filter(a => a.status === 'PENDENTE') ?? []).some(a => !decisoes[a.id]) ||
                  Object.values(decisoes).some(d => d.status === 'REJEITADA' && !d.motivo.trim()) ||
                  ((Object.values(decisoes).some(d => d.status === 'REJEITADA') || decisaoPorques === 'REJEITADA') && !comentarioRevisao.trim()) ||
                  mutRevisarAtividades.isPending
                }
                className="flex-[2] bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition flex items-center justify-center gap-2">
                <CheckCircle size={16} /> {mutRevisarAtividades.isPending ? 'Enviando...' : 'Confirmar Revisão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showExecucaoForm && (
        <div className="bg-white rounded-xl border-2 border-purple-400 shadow-md p-6 ring-2 ring-purple-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <FileText size={16} className="text-purple-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Execução das Atividades</h3>
          </div>
          <p className="text-sm text-purple-600 mb-5 ml-11">Para cada atividade, descreva o que foi feito e anexe as evidências.</p>
          <div className="space-y-4">
            {nc?.atividades?.some(a => a.statusExecucao === 'APROVADA') && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Já validadas pelo engenheiro</p>
                {nc.atividades.filter(a => a.statusExecucao === 'APROVADA').map(a => (
                  <div key={a.id} className="p-3 bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                    <div className="flex gap-2 items-start mb-1">
                      <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-green-800 break-words">{a.titulo}</p>
                        <p className="text-xs text-green-700 break-words">{a.descricao}</p>
                      </div>
                    </div>
                    {a.descricaoExecucao && <p className="text-xs text-green-700 ml-5 break-words italic">"{a.descricaoExecucao}"</p>}
                  </div>
                ))}
              </div>
            )}
            {nc?.atividades?.filter(a => a.status === 'APROVADA' && a.statusExecucao !== 'APROVADA').map(a => {
              const rejeitada = a.statusExecucao === 'REJEITADA'
              return (
              <div key={a.id} className={`rounded-lg border p-4 space-y-3 transition ${rejeitada ? 'border-red-300 bg-red-50/40' : 'border-purple-200 bg-purple-50/30'}`}>
                <div className="flex gap-2 items-start justify-between">
                  <div className="flex gap-2 items-start min-w-0">
                    <span className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center shrink-0 ${rejeitada ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>{a.ordem}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 break-words">{a.titulo}</p>
                      <p className="text-xs text-slate-600 break-words">{a.descricao}</p>
                    </div>
                  </div>
                  {rejeitada && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-red-700 text-xs font-bold shrink-0">
                      <XCircle size={11} /> Reprovada
                    </span>
                  )}
                </div>
                {rejeitada && a.motivoRejeicaoExecucao && (
                  <div className="flex gap-2 items-start p-2.5 bg-red-100 border border-red-200 rounded-lg">
                    <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-700">Motivo da reprovação</p>
                      <p className="text-xs text-red-600 break-words">{a.motivoRejeicaoExecucao}</p>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{rejeitada ? 'Corrija e descreva o que foi feito *' : 'O que foi feito *'}</label>
                  <textarea value={execucaoDescricoes[a.id] ?? ''}
                    onChange={e => setExecucaoDescricoes(prev => ({ ...prev, [a.id]: e.target.value }))}
                    rows={3} placeholder="Descreva as ações realizadas para esta atividade..."
                    className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 transition ${rejeitada ? 'border-red-200 focus:ring-red-300' : 'border-gray-200 focus:ring-purple-400'}`} />
                </div>
                <EvidenciaUpload atividadeId={a.id} tipoEvidencia="TRATATIVA" titulo={rejeitada ? 'Atualize as evidências' : 'Evidências desta atividade'} />
              </div>
            )})}
            <div className="flex gap-3 pt-2">
              <button onClick={() => navigate('/tratativas')} className="flex-1 py-3 border border-gray-200 rounded-lg text-sm text-slate-600 hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={() => mutSubmeterExecucao.mutate()}
                disabled={
                  (nc?.atividades ?? []).filter(a => a.status === 'APROVADA' && a.statusExecucao !== 'APROVADA').some(a => !execucaoDescricoes[a.id]?.trim()) ||
                  mutSubmeterExecucao.isPending
                }
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-60 transition flex items-center justify-center gap-2">
                <CheckCircle size={16} /> {mutSubmeterExecucao.isPending ? 'Enviando...' : 'Enviar para Validação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEngenheiroAguardaExecucao && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 flex items-center gap-4">
          <Clock size={32} className="text-purple-500 shrink-0" />
          <div>
            <div className="font-bold text-purple-800 text-base">Plano Aprovado — Aguardando Execução</div>
            <div className="text-sm text-purple-600 mt-0.5">O responsável está executando as atividades e irá enviar as evidências quando concluir.</div>
          </div>
        </div>
      )}

      {showAguardandoValidacaoFinal && (
        <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={20} className="text-indigo-600 shrink-0" />
            <div>
              <h3 className="font-bold text-indigo-800">Aguardando Validação Final</h3>
              <p className="text-sm text-indigo-600">Suas evidências foram enviadas e estão sendo validadas pelo engenheiro.</p>
            </div>
          </div>
        </div>
      )}

      {showAprovacaoEvidenciasForm && (
        <div className="bg-white rounded-xl border-2 border-purple-400 shadow-md p-6 ring-2 ring-purple-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <CheckCircle size={16} className="text-purple-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Validação da Execução</h3>
          </div>
          <p className="text-sm text-purple-600 mb-5 ml-11">Revise a execução de cada atividade. Aprove ou rejeite individualmente.</p>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Atividades Executadas</p>
            {nc?.atividades?.some(a => a.statusExecucao === 'APROVADA') && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Já aprovadas anteriormente</p>
                {nc.atividades.filter(a => a.statusExecucao === 'APROVADA').map(a => {
                  const decisao = decisoesExecucao[a.id]
                  const rejeitando = decisao?.status === 'REJEITADA'
                  return (
                    <div key={a.id} className={`rounded-lg border p-3 transition ${rejeitando ? 'border-red-300 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <CheckCircle size={12} className="text-green-500 shrink-0" />
                        <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Já aprovada</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 break-words mb-0.5">{a.titulo}</p>
                      {a.descricaoExecucao && <p className="text-xs text-slate-600 break-words mb-2 italic">"{a.descricaoExecucao}"</p>}
                      {a.evidencias?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {a.evidencias.map((ev) => (
                            <button key={ev.id} onClick={() => handleDownloadEvidencia(ev.id, ev.nomeArquivo)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 max-w-[180px]">
                              <FileText size={11} className="shrink-0" />
                              <span className="truncate">{ev.nomeArquivo}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setDecisoesExecucao(prev => ({ ...prev, [a.id]: { status: 'APROVADA', motivo: '' } }))}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${!rejeitando ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}>
                          <CheckCircle size={13} /> Manter aprovada
                        </button>
                        <button type="button" onClick={() => setDecisoesExecucao(prev => ({ ...prev, [a.id]: { status: 'REJEITADA', motivo: prev[a.id]?.motivo ?? '' } }))}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${rejeitando ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'}`}>
                          <XCircle size={13} /> Rejeitar
                        </button>
                      </div>
                      {rejeitando && (
                        <textarea value={decisao.motivo}
                          onChange={e => setDecisoesExecucao(prev => ({ ...prev, [a.id]: { ...prev[a.id], motivo: e.target.value } }))}
                          placeholder="Motivo da rejeição *" rows={2}
                          className="mt-2 w-full border border-red-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-400 transition" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {nc?.atividades?.filter(a => a.statusExecucao === 'PENDENTE').map(a => {
              const decisao = decisoesExecucao[a.id]
              return (
                <div key={a.id} className={`rounded-lg border p-3 transition ${
                  decisao?.status === 'APROVADA' ? 'border-green-300 bg-green-50'
                  : decisao?.status === 'REJEITADA' ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
                }`}>
                  <p className="text-sm font-semibold text-slate-800 break-words mb-0.5">{a.titulo}</p>
                  {a.descricaoExecucao && <p className="text-xs text-slate-600 break-words mb-2 italic">"{a.descricaoExecucao}"</p>}
                  {a.evidencias?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {a.evidencias.map(ev => (
                        <button key={ev.id} onClick={() => handleDownloadEvidencia(ev.id, ev.nomeArquivo)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 max-w-[180px]">
                          <FileText size={11} className="shrink-0" />
                          <span className="truncate">{ev.nomeArquivo}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setDecisoesExecucao(prev => ({ ...prev, [a.id]: { status: 'APROVADA', motivo: '' } }))}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${decisao?.status === 'APROVADA' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}>
                      <CheckCircle size={13} /> Aprovar
                    </button>
                    <button type="button" onClick={() => setDecisoesExecucao(prev => ({ ...prev, [a.id]: { status: 'REJEITADA', motivo: prev[a.id]?.motivo ?? '' } }))}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${decisao?.status === 'REJEITADA' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'}`}>
                      <XCircle size={13} /> Rejeitar
                    </button>
                  </div>
                  {decisao?.status === 'REJEITADA' && (
                    <textarea value={decisao.motivo}
                      onChange={e => setDecisoesExecucao(prev => ({ ...prev, [a.id]: { ...prev[a.id], motivo: e.target.value } }))}
                      placeholder="Motivo da rejeição *" rows={2}
                      className="mt-2 w-full border border-red-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-400 transition" />
                  )}
                </div>
              )
            })}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Comentário geral (opcional)</label>
              <textarea value={comentarioRevisaoExecucao} onChange={e => setComentarioRevisaoExecucao(e.target.value)} rows={2}
                placeholder="Comentário sobre esta revisão..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => navigate('/tratativas')} className="flex-1 py-3 border border-gray-200 rounded-lg text-sm text-slate-600 hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={() => mutRevisarExecucao.mutate()}
                disabled={
                  (nc?.atividades?.filter(a => a.statusExecucao === 'PENDENTE') ?? []).some(a => !decisoesExecucao[a.id]) ||
                  Object.values(decisoesExecucao).some(d => d.status === 'REJEITADA' && !d.motivo.trim()) ||
                  mutRevisarExecucao.isPending
                }
                className="flex-[2] bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition flex items-center justify-center gap-2">
                <CheckCircle size={16} /> {mutRevisarExecucao.isPending ? 'Enviando...' : 'Confirmar Revisão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isDesvio && nc?.status === 'CONCLUIDO' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-4">
          <CheckCircle size={32} className="text-green-500 shrink-0" />
          <div>
            <div className="font-bold text-green-800 text-base">Não Conformidade Concluída</div>
            <div className="text-sm text-green-600 mt-0.5">Esta ocorrência foi tratada e validada com sucesso.</div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de envio */}
      {confirmarEnvio && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmarEnvio(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Confirmar Envio</h3>
                  <p className="text-sm text-slate-500">Verifique antes de enviar. Você poderá ajustar caso o engenheiro solicite.</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">5 Porquês</p>
                <div className="space-y-3">
                  {porques.map((p, i) => p.pergunta && (
                    <div key={i} className="flex gap-2">
                      <span className="font-semibold text-slate-500 shrink-0 text-sm">{i + 1}.</span>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-slate-700 break-words">{p.pergunta}</p>
                        {p.resposta && <p className="text-sm text-slate-500 break-words pl-2 border-l-2 border-blue-200">{p.resposta}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Causa Raiz</p>
                <p className="text-sm text-slate-700 bg-gray-50 rounded-lg p-3 break-words">{causaRaiz}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Atividades do Plano</p>
                <div className="space-y-2">
                  {atividades.filter(a => a.titulo.trim() && a.descricao.trim()).map((a, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="font-semibold text-slate-500 shrink-0 text-sm">{i + 1}.</span>
                      <div>
                        <p className="text-sm font-medium text-slate-700 break-words">{a.titulo}</p>
                        <p className="text-sm text-slate-500 break-words">{a.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={() => setConfirmarEnvio(false)} className="flex-1 py-3 border border-gray-200 rounded-lg text-sm text-slate-600 hover:bg-gray-50 transition">Voltar e Revisar</button>
              <button onClick={() => mutSubmeterInvestigacao.mutate()} disabled={mutSubmeterInvestigacao.isPending}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition flex items-center justify-center gap-2">
                <CheckCircle size={16} />
                {mutSubmeterInvestigacao.isPending ? 'Enviando...' : 'Confirmar Envio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
