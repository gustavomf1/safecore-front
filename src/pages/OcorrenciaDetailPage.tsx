import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDesvio, deleteDesvio, abrirTratativaDesvio } from '../api/desvio'
import { getNaoConformidade, deleteNaoConformidade, ativarNaoConformidade } from '../api/naoConformidade'
import { Desvio, NaoConformidade, Norma } from '../types'
import StatusBadge from '../components/StatusBadge'
import CodigoBadge from '../components/CodigoBadge'
import { getTrechosNorma } from '../api/ncTrechoNorma'
import {
  ArrowLeft, Pencil, X, MapPin, Calendar, Shield, AlertTriangle,
  FileText, User, Building2, Clock, CheckCircle, Ban, BookOpen, RefreshCw, Trash2, Eye,
  FileDown, FileSpreadsheet, Download, ChevronRight
} from 'lucide-react'
import EvidenciaUpload from '../components/EvidenciaUpload'
import { useAuth } from '../contexts/AuthContext'
import { formatDate } from '../utils/date'
import { exportOcorrenciaBundle, exportOcorrenciaToExcel } from '../utils/exportOcorrencia'
import { getEvidencias, getEvidenciasDesvio } from '../api/evidencia'
import NcRiskMatrix from '../components/NcRiskMatrix'
import { missingCamposNc, missingCamposDesvio, CAMPO_OBRIGATORIO_LABELS } from '../utils/camposObrigatorios'

const SEV_LABELS: Record<number, string> = {
  1: 'Insignificante', 2: 'Menor', 3: 'Moderada', 4: 'Maior', 5: 'Catastrófica',
}
const PROB_LABELS: Record<number, string> = {
  1: 'Rara', 2: 'Improvável', 3: 'Possível', 4: 'Provável',
}
const NIVEL_COLORS: Record<string, string> = {
  BAIXO: 'text-emerald-600', MODERADO: 'text-amber-600', ALTO: 'text-orange-500', CRITICO: 'text-red-600',
}

const statusNCMap: Record<string, { label: string; color: string }> = {
  ABERTA:        { label: 'Aberta',        color: 'bg-yellow-100 text-yellow-700' },
  EM_TRATAMENTO: { label: 'Em Tratamento', color: 'bg-blue-100 text-blue-700' },
  CONCLUIDO:     { label: 'Concluído',     color: 'bg-green-100 text-green-700' },
  NAO_RESOLVIDA: { label: 'Vencida',       color: 'bg-red-100 text-red-700' },
}

const nivelMap: Record<string, string> = {
  BAIXO:    'bg-green-100 text-green-700',
  MODERADO: 'bg-yellow-100 text-yellow-700',
  ALTO:     'bg-orange-100 text-orange-700',
  CRITICO:  'bg-red-100 text-red-700',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

export default function OcorrenciaDetailPage() {
  const { tipo, id } = useParams<{ tipo: string; id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isDesvio = tipo === 'DESVIO'
  const isTecnico = user?.perfil === 'TECNICO'
  const isAdmin = user?.isAdmin ?? false

  const [normaModal, setNormaModal] = useState<Norma | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showAvancarModal, setShowAvancarModal] = useState(false)
  const [showCamposFaltantesAviso, setShowCamposFaltantesAviso] = useState(false)

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

  const ocorrencia = isDesvio ? desvio : nc
  const statusAtual = isDesvio ? desvio?.status : nc?.status
  const isAberto = isDesvio ? statusAtual === 'ABERTO' : statusAtual === 'ABERTA'
  const usuarioCriacaoId = (ocorrencia as any)?.usuarioCriacaoId
  const isCriador = user?.id === usuarioCriacaoId && user?.perfil !== 'EXTERNO'
  const podeAvancar = isAberto && (isCriador || isAdmin)
  const podeEditarExcluir = isAberto ? (isCriador || isAdmin) : isAdmin
  const camposFaltantes = ocorrencia
    ? (isDesvio ? missingCamposDesvio(ocorrencia as Desvio) : missingCamposNc(ocorrencia as NaoConformidade))
    : []

  const deleteMutation = useMutation<void, Error, void>({
    mutationFn: () => isDesvio ? deleteDesvio(id!) : deleteNaoConformidade(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] })
      navigate('/ocorrencias')
    },
  })

  const avancarMutation = useMutation<void, Error, void>({
    mutationFn: () => isDesvio ? abrirTratativaDesvio(id!) as any : ativarNaoConformidade(id!) as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [isDesvio ? 'desvio' : 'nc', id] })
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] })
      setShowAvancarModal(false)
    },
  })

  async function handleExportPDF() {
    if (!ocorrencia || !id) return
    setExporting(true)
    setExportMenuOpen(false)
    try {
      const evidencias = isDesvio
        ? await getEvidenciasDesvio(id, 'OCORRENCIA')
        : await getEvidencias(id, 'OCORRENCIA')
      await exportOcorrenciaBundle({ ocorrencia, trechos, isDesvio }, evidencias)
    } catch (err) {
      console.error('[exportPDF]', err)
      alert('Erro ao exportar o relatório. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  if (!ocorrencia) {
    return <div className="text-center py-12 text-slate-400">Carregando...</div>
  }

  const diasRestantes = nc?.dataLimiteResolucao
    ? Math.ceil((new Date(nc.dataLimiteResolucao).getTime() - Date.now()) / 86400000)
    : null
  const prazoColor = diasRestantes === null ? 'text-slate-400'
    : diasRestantes < 7 ? 'text-red-500'
    : diasRestantes < 21 ? 'text-amber-500'
    : 'text-emerald-500'
  const pct = diasRestantes !== null
    ? Math.max(0, Math.min(100, ((30 - diasRestantes) / 30) * 100))
    : 0


  const valueClass = "text-sm text-slate-800 dark:text-slate-200"

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <div className="text-xs text-slate-400 mb-1">{label}</div>
        {children}
      </div>
    )
  }

  const chainNodes = [
    ...(nc?.cadeiaReincidencias ?? []).map(item => ({ ...item, isCurrent: false, isPast: true })),
    ...(nc ? [{ id: nc.id, titulo: nc.titulo, dataRegistro: nc.dataRegistro, status: nc.status, isCurrent: true, isPast: false }] : []),
    ...(nc?.reincidencias ?? []).map(item => ({ ...item, isCurrent: false, isPast: false })),
  ]

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

        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/ocorrencias')} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex gap-2">
            {(() => {
              const isConcluido = isDesvio ? desvio?.status === 'CONCLUIDO' : nc?.status === 'CONCLUIDO'
              const perfil = user?.perfil
              const podeExportar = isConcluido && (isAdmin || perfil === 'ENGENHEIRO' || perfil === 'TECNICO')
              if (!podeExportar) return null
              return (
                <div className="relative">
                  <button onClick={() => setExportMenuOpen(v => !v)} onBlur={() => setTimeout(() => setExportMenuOpen(false), 150)}
                    className="flex items-center gap-2 px-4 py-2 border border-emerald-200 rounded-lg text-sm text-emerald-700 hover:bg-emerald-50 transition">
                    <Download size={15} /> Exportar
                  </button>
                  {exportMenuOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                      <button onMouseDown={e => e.preventDefault()} onClick={handleExportPDF} disabled={exporting}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 transition text-left disabled:opacity-60">
                        <FileDown size={15} className="text-red-500" />
                        {exporting ? 'Exportando...' : 'Exportar PDF'}
                      </button>
                      <button onMouseDown={e => e.preventDefault()}
                        onClick={() => { exportOcorrenciaToExcel({ ocorrencia, trechos, isDesvio }); setExportMenuOpen(false) }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition text-left border-t border-gray-100">
                        <FileSpreadsheet size={15} className="text-emerald-600" /> Exportar Excel
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}

            {!isDesvio && nc && nc.status !== 'ABERTA' && (
              <button onClick={() => navigate(`/tratativas/NC/${id}`)}
                className="flex items-center gap-2 px-4 py-2 border border-purple-200 rounded-lg text-sm text-purple-700 hover:bg-purple-50 transition">
                <Eye size={15} /> Ver tratativa
              </button>
            )}

            {podeAvancar && (
              <button
                onClick={() => {
                  if (camposFaltantes.length > 0) {
                    setShowCamposFaltantesAviso(true)
                  } else {
                    setShowAvancarModal(true)
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition">
                <ChevronRight size={15} /> {isDesvio ? 'Enviar para Tratativa' : 'Enviar para Plano de Ação'}
              </button>
            )}

            {(() => {
              if (!podeEditarExcluir) return null
              const isConcluido = statusAtual === 'CONCLUIDO'
              if (isConcluido) return null
              return (
                <>
                  <button onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 transition">
                    <Trash2 size={15} /> Excluir
                  </button>
                  <button onClick={() => navigate(`/ocorrencias/${tipo}/${id}/editar`)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-slate-700 hover:bg-gray-50 transition">
                    <Pencil size={15} /> Editar
                  </button>
                </>
              )
            })()}
          </div>
        </div>

        {/* Page header: tags + title + subtitle */}
        <div className="overflow-hidden min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <CodigoBadge codigo={(ocorrencia as any).codigo} />
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isDesvio ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
              {isDesvio ? 'Desvio' : 'Não Conformidade'}
            </span>
            {!isDesvio && (ocorrencia as any).regraDeOuro && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                <Shield size={12} /> Regra de Ouro
              </span>
            )}
            {!isDesvio && (ocorrencia as any).reincidencia && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                <RefreshCw size={12} /> Reincidência
              </span>
            )}
            {isDesvio && desvio
              ? <StatusBadge status={desvio.status} type="desvio" />
              : !isDesvio && nc && (
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusNCMap[nc.status]?.color}`}>
                    {statusNCMap[nc.status]?.label}
                  </span>
                )
            }
            {!isDesvio && nc?.vencida && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">Vencida</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1 truncate w-full" title={(ocorrencia as any).titulo}>{(ocorrencia as any).titulo}</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {(ocorrencia as any).estabelecimentoNome}
            {(ocorrencia as any).localizacaoNome ? ` · ${(ocorrencia as any).localizacaoNome}` : ''}
            {' · registrada em '}{formatDate((ocorrencia as any).dataRegistro)}
          </p>
        </div>

        {/* Two-column layout — single column for desvios */}
        <div className={`grid grid-cols-1 ${!isDesvio ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''} gap-4 items-start`}>

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-4">

            {/* IDENTIFICAÇÃO */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Identificação</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Estabelecimento">
                  <div className={`${valueClass} flex items-center gap-1.5`}><Building2 size={13} className="text-slate-400" />{(ocorrencia as any).estabelecimentoNome}</div>
                </Field>
                <Field label="Localização">
                  <div className={`${valueClass} flex items-center gap-1.5`}><MapPin size={13} className="text-slate-400" />{(ocorrencia as any).localizacaoNome || '—'}</div>
                </Field>
                <Field label="Data de Registro">
                  <div className={`${valueClass} flex items-center gap-1.5`}><Calendar size={13} className="text-slate-400" />{formatDate((ocorrencia as any).dataRegistro)}</div>
                </Field>
                {!isDesvio
                  ? (
                    <Field label="Data Limite">
                      <div className={`${valueClass} flex items-center gap-1.5`}><Clock size={13} className="text-slate-400" />{formatDate(nc!.dataLimiteResolucao)}</div>
                    </Field>
                  )
                  : <div />
                }
                <Field label="Registrador">
                  <div className={`${valueClass} flex items-center gap-1.5`}>
                    <User size={13} className="text-slate-400" />
                    {(ocorrencia as any).usuarioCriacaoNome
                      ? `${(ocorrencia as any).usuarioCriacaoNome}${(ocorrencia as any).usuarioCriacaoEmail ? ` (${(ocorrencia as any).usuarioCriacaoEmail})` : ''}`
                      : (ocorrencia as any).tecnicoNome || '—'}
                  </div>
                </Field>
                <Field label="ID">
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">{id?.substring(0, 8)}…</div>
                </Field>
                {!isDesvio && (
                  <Field label="Regra de Ouro">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${(ocorrencia as any).regraDeOuro ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-slate-500'}`}>
                      {(ocorrencia as any).regraDeOuro ? 'Sim' : 'Não'}
                    </span>
                  </Field>
                )}
                <div className="col-span-2">
                  <Field label="Descrição">
                    <div className={`${valueClass} whitespace-pre-wrap break-words overflow-hidden`}>{(ocorrencia as any).descricao || '—'}</div>
                  </Field>
                </div>
                {!isDesvio && nc!.normas && nc!.normas.length > 0 && (
                  <div className="col-span-2">
                    <Field label="Normas Vinculadas">
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {nc!.normas.map(n => {
                          const count = trechos.filter(t => t.normaId === n.id).length
                          return (
                            <button key={n.id} type="button" onClick={() => setNormaModal(n)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer">
                              <BookOpen size={11} />{n.titulo}
                              {count > 0 && (
                                <span className="ml-0.5 bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full text-xs font-semibold">{count}</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </Field>
                  </div>
                )}
              </div>
            </div>

            {/* RESPONSÁVEIS (Desvio) */}
            {isDesvio && (desvio?.responsavelDesvioNome || desvio?.responsavelTrativaNome) && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Responsáveis</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {desvio?.responsavelDesvioNome
                      ? (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-purple-700 dark:text-purple-300">{getInitials(desvio.responsavelDesvioNome)}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Resp. pelo Desvio</div>
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{desvio.responsavelDesvioNome}</div>
                          </div>
                        </div>
                      )
                      : <div className={valueClass}>—</div>
                    }
                  </div>
                  <div>
                    {desvio?.responsavelTrativaNome
                      ? (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{getInitials(desvio.responsavelTrativaNome)}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Resp. pela Tratativa</div>
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{desvio.responsavelTrativaNome}</div>
                          </div>
                        </div>
                      )
                      : <div className={valueClass}>—</div>
                    }
                  </div>
                </div>
              </div>
            )}

            {/* RESPONSÁVEIS (NC only) */}
            {!isDesvio && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Responsáveis</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {nc!.responsavelTrativaNome || nc!.responsavelTrativaEmail
                      ? (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                              {getInitials(nc!.responsavelTrativaNome || nc!.responsavelTrativaEmail || '?')}
                            </span>
                          </div>
                          <div className="min-w-0">
                            {nc!.responsavelTrativaPerfil && (
                              <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">{nc!.responsavelTrativaPerfil}</div>
                            )}
                            {nc!.responsavelTrativaNome && <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{nc!.responsavelTrativaNome}</div>}
                            {nc!.responsavelTrativaEmail && <div className="text-xs text-slate-400 truncate">{nc!.responsavelTrativaEmail}</div>}
                          </div>
                        </div>
                      )
                      : <div className={valueClass}>—</div>
                    }
                  </div>
                  <div>
                    {nc!.responsavelNcNome || nc!.responsavelNcEmail
                      ? (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                              {getInitials(nc!.responsavelNcNome || nc!.responsavelNcEmail || '?')}
                            </span>
                          </div>
                          <div className="min-w-0">
                            {nc!.responsavelNcPerfil && (
                              <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">{nc!.responsavelNcPerfil}</div>
                            )}
                            {nc!.responsavelNcNome && <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{nc!.responsavelNcNome}</div>}
                            {nc!.responsavelNcEmail && <div className="text-xs text-slate-400 truncate">{nc!.responsavelNcEmail}</div>}
                          </div>
                        </div>
                      )
                      : <div className={valueClass}>—</div>
                    }
                  </div>
                </div>
              </div>
            )}

            {/* EVIDÊNCIAS */}
            {id && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
                <EvidenciaUpload
                  {...(isDesvio ? { desvioId: id } : { naoConformidadeId: id })}
                  tipoEvidencia="OCORRENCIA"
                  readOnly={isTecnico && (isDesvio || (!!nc && nc.status !== 'ABERTA'))}
                  titulo="Evidências da Ocorrência"
                />
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN (NC only) ── */}
          {!isDesvio && (<div className="space-y-4">

            {/* PRAZO (NC only) */}
            {!isDesvio && nc?.dataLimiteResolucao && (
              <div className="relative overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-4">
                <div className="prazo-shimmer absolute inset-0 pointer-events-none rounded-xl" />
                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className={prazoColor} />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Prazo</span>
                  </div>
                  <div className={`text-sm font-bold ${prazoColor}`}>
                    {diasRestantes === null ? '—'
                      : diasRestantes < 0 ? `${Math.abs(diasRestantes)}d vencido`
                      : diasRestantes === 0 ? 'Vence hoje'
                      : `${diasRestantes}d restantes`}
                  </div>
                </div>
                <div className="relative mt-3 h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${
                    diasRestantes !== null && diasRestantes < 7 ? 'bg-red-500'
                    : diasRestantes !== null && diasRestantes < 21 ? 'bg-amber-400'
                    : 'bg-emerald-500'
                  }`} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  Vence em {formatDate(nc.dataLimiteResolucao)}
                </div>
              </div>
            )}

            {/* ANÁLISE DE RISCO (NC only) */}
            {!isDesvio && nc?.severidade != null && nc?.probabilidade != null && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Análise de Risco</div>
                <div className="flex justify-center mb-3">
                  <NcRiskMatrix severidade={nc.severidade} probabilidade={nc.probabilidade} />
                </div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-200 dark:border-slate-600 flex-wrap gap-2">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-slate-400 dark:text-slate-500">SEV.</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{nc.severidade}</span>
                    <span className="text-slate-400 dark:text-slate-500">{SEV_LABELS[nc.severidade] ?? ''}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-slate-400 dark:text-slate-500">PROB.</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{nc.probabilidade}</span>
                    <span className="text-slate-400 dark:text-slate-500">{PROB_LABELS[nc.probabilidade] ?? ''}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-slate-400 dark:text-slate-500">NÍVEL</span>
                    <span className={`font-bold ${NIVEL_COLORS[nc.nivelRisco] ?? ''}`}>{nc.nivelRisco}</span>
                  </div>
                </div>
              </div>
            )}
            {!isDesvio && (nc?.severidade == null || nc?.probabilidade == null) && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
                <Field label="Nível de Risco">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${nivelMap[nc!.nivelRisco]}`}>{nc!.nivelRisco}</span>
                </Field>
              </div>
            )}

            {/* RASTRO DE REINCIDÊNCIAS (NC only) */}
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
                          <button onClick={() => navigate(`/ocorrencias/NAO_CONFORMIDADE/${node.id}`)}
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

            {/* HISTÓRICO DA TRATATIVA (NC only) */}
            {!isDesvio && (nc!.devolutivas?.length > 0 || nc!.execucoes?.length > 0 || nc!.validacoes?.length > 0) && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Histórico da Tratativa</h3>
                {nc!.devolutivas?.map((d, i) => (
                  <div key={d.id} className="flex gap-3 mb-4">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText size={13} className="text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-blue-600 font-medium">Plano de Ação #{i + 1}</div>
                      <div className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 break-words overflow-hidden">{d.descricaoPlanoAcao}</div>
                      <div className="text-xs text-slate-400 mt-1">{d.engenheiroNome ?? '-'} · {formatDate(d.dataDevolutiva)}</div>
                    </div>
                  </div>
                ))}
                {nc!.execucoes?.map((e, i) => (
                  <div key={e.id} className="flex gap-3 mb-4">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle size={13} className="text-orange-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-orange-600 font-medium">Execução #{i + 1}</div>
                      <div className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 break-words overflow-hidden">{e.descricaoAcaoExecutada}</div>
                      <div className="text-xs text-slate-400 mt-1">{e.engenheiroNome ?? '-'} · {formatDate(e.dataExecucao)}</div>
                    </div>
                  </div>
                ))}
                {nc!.validacoes?.map((v, i) => (
                  <div key={v.id} className="flex gap-3 mb-4">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${v.parecer === 'APROVADO' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {v.parecer === 'APROVADO'
                        ? <CheckCircle size={13} className="text-green-600" />
                        : <Ban size={13} className="text-red-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-medium ${v.parecer === 'APROVADO' ? 'text-green-600' : 'text-red-600'}`}>
                        Validação #{i + 1} — {v.parecer === 'APROVADO' ? 'Aprovada' : 'Reprovada'}
                      </div>
                      {v.observacao && <div className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 break-words overflow-hidden">{v.observacao}</div>}
                      <div className="text-xs text-slate-400 mt-1">{v.engenheiroNome ?? '-'} · {formatDate(v.dataValidacao)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>)}
        </div>
      </div>

      {/* Modal — Avançar status */}
      {showAvancarModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAvancarModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-800">
                {isDesvio ? 'Enviar para Tratativa' : 'Enviar para Plano de Ação'}
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
                <p className="flex gap-1 min-w-0"><span className="text-slate-500 shrink-0">Título:</span> <strong className="truncate" title={(ocorrencia as any)?.titulo}>{(ocorrencia as any)?.titulo}</strong></p>
                <p><span className="text-slate-500">Estabelecimento:</span> {(ocorrencia as any)?.estabelecimentoNome}</p>
              </div>
              <p className="text-sm text-orange-700 bg-orange-50 rounded-lg p-3">
                Após confirmar, <strong>não será possível editar</strong> os dados desta {isDesvio ? 'ocorrência' : 'NC'}.
              </p>
              {avancarMutation.isError && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  Erro: {(() => {
                    const data = (avancarMutation.error as { response?: { data?: { message?: string; camposFaltantes?: string[] } } } | null)?.response?.data
                    if (data?.camposFaltantes?.length) {
                      return (
                        <ul className="list-disc list-inside">
                          {data.camposFaltantes.map(codigo => (
                            <li key={codigo}>{CAMPO_OBRIGATORIO_LABELS[codigo] ?? codigo}</li>
                          ))}
                        </ul>
                      )
                    }
                    return data?.message || avancarMutation.error?.message || 'Tente novamente.'
                  })()}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <button onClick={() => setShowAvancarModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
              <button onClick={() => avancarMutation.mutate()} disabled={avancarMutation.isPending}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-60 transition">
                {avancarMutation.isPending ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Campos obrigatórios faltantes */}
      {showCamposFaltantesAviso && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCamposFaltantesAviso(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800">Faltam campos obrigatórios</h3>
            <p className="text-sm text-slate-600">
              Preencha os campos abaixo antes de {isDesvio ? 'enviar para tratativa' : 'enviar para o Plano de Ação'}:
            </p>
            <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
              {camposFaltantes.map(codigo => (
                <li key={codigo}>{CAMPO_OBRIGATORIO_LABELS[codigo] ?? codigo}</li>
              ))}
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCamposFaltantesAviso(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg"
              >
                Fechar
              </button>
              <button
                onClick={() => navigate(`/ocorrencias/${tipo}/${id}/editar`)}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Trash2 size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Excluir {isDesvio ? 'Desvio' : 'Não Conformidade'}</h3>
                  <p className="text-xs text-slate-400">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Tem certeza que deseja excluir <strong>"{(ocorrencia as any).titulo}"</strong>?
              </p>
              {!isDesvio && nc && (nc.atividades?.length > 0 || nc.execucoes?.length > 0 || nc.devolutivas?.length > 0 || nc.historico?.length > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">Esta NC possui tratativas em andamento ou já executadas:</p>
                      <ul className="list-disc list-inside text-xs space-y-0.5 text-amber-700">
                        {nc.atividades?.length > 0 && <li>{nc.atividades.length} atividade(s) do plano de ação</li>}
                        {nc.devolutivas?.length > 0 && <li>{nc.devolutivas.length} devolutiva(s)</li>}
                        {nc.execucoes?.length > 0 && <li>{nc.execucoes.length} execução(ões)</li>}
                        {nc.historico?.length > 0 && <li>{nc.historico.length} registro(s) no histórico</li>}
                      </ul>
                      <p className="mt-2 font-medium">Todos esses dados serão apagados permanentemente.</p>
                    </div>
                  </div>
                </div>
              )}
              {deleteMutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                  Erro ao excluir: {deleteMutation.error?.message || 'Tente novamente.'}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
              <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-60 transition">
                {deleteMutation.isPending ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhes da norma */}
      {normaModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setNormaModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col" style={{height: '80vh'}} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <BookOpen size={18} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{normaModal.titulo}</h3>
                  <p className="text-xs text-slate-400">Norma / Regulamento</p>
                </div>
              </div>
              <button onClick={() => setNormaModal(null)} className="text-slate-400 hover:text-slate-600 transition p-1"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {normaModal.descricao ? (
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed break-words">{normaModal.descricao}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">Nenhuma descrição cadastrada para esta norma.</p>
              )}
              {trechos.filter(t => t.normaId === normaModal.id).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Trechos Vinculados à NC</p>
                  <div className="space-y-3">
                    {trechos.filter(t => t.normaId === normaModal.id).map(t => (
                      <div key={t.id} className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                        {t.clausulaReferencia && <p className="text-xs font-semibold text-blue-700 mb-1.5">{t.clausulaReferencia}</p>}
                        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">{t.textoEditado}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end p-6 pt-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setNormaModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg transition">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
