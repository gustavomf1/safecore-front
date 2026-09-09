import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  GitCommit,
  Pencil,
  PowerOff,
  RotateCcw,
  Sparkles,
  User,
} from 'lucide-react'
import { deleteNorma, getNorma, reativarNorma } from '../../api/norma'
import { getNaoConformidades } from '../../api/naoConformidade'
import NormaDeactivateModal from '../../components/NormaDeactivateModal'
import { Avatar, StatusPill } from './NormasCommon'
import {
  firstName,
  formatAuditDate,
  formatAuditShort,
  formatCount,
  hasConteudo,
  riscoMeta,
  statusNcMeta,
} from './normasHelpers'
import '../../styles/normas.css'

type DetailTab = 'texto' | 'ocorrencias'

export default function NormaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<DetailTab>('texto')
  const [confirmando, setConfirmando] = useState(false)

  const { data: norma, isLoading } = useQuery({
    queryKey: ['norma', id],
    queryFn: () => getNorma(id!),
    enabled: !!id,
  })

  const { data: ncs = [], isLoading: loadingNcs } = useQuery({
    queryKey: ['nao-conformidades', 'norma', id],
    queryFn: () => getNaoConformidades(),
    enabled: !!id && tab === 'ocorrencias',
  })

  const linkedNcs = useMemo(() => {
    if (!id) return []
    return ncs.filter(nc => nc.normas?.some(n => n.id === id))
  }, [id, ncs])

  const deactivateMutation = useMutation({
    mutationFn: deleteNorma,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['normas'] })
      queryClient.invalidateQueries({ queryKey: ['norma', id] })
      setConfirmando(false)
    },
  })

  const reativarMutation = useMutation({
    mutationFn: reativarNorma,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['normas'] })
      queryClient.invalidateQueries({ queryKey: ['norma', id] })
    },
  })

  function copyText() {
    if (norma?.conteudo) navigator.clipboard?.writeText(norma.conteudo)
  }

  if (isLoading || !norma) {
    return (
      <div className="nm-screen">
        <div className="nm-page">
          <div className="nm-card">
            <div className="nm-empty">
              <div className="nm-empty-icon"><BookOpen size={22} /></div>
              <div className="nm-empty-title">Carregando norma</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="nm-screen">
      <div className="nm-page" style={{ maxWidth: 1320 }}>
        <div className="nm-pageheader">
          <button className="nm-pageheader-back" onClick={() => navigate('/normas')} title="Voltar">
            <ArrowLeft size={16} />
          </button>
          <div className="nm-pageheader-text">
            <div className="nm-pageheader-kicker">
              <BookOpen size={11} />
              <span>Normas</span>
              <ChevronRight size={11} />
              <span>{norma.titulo}</span>
            </div>
            <h1 className="nm-pageheader-title">{norma.titulo}</h1>
          </div>
          <div className="nm-pageheader-actions">
            <button className="nm-btn nm-btn-primary" onClick={() => navigate(`/normas/${norma.id}/editar`)}>
              <Pencil size={14} />
              Editar
            </button>
          </div>
        </div>

        <div className="nm-detail-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section className="nm-card">
              <div className="nm-detail-hero">
                <div className="nm-detail-hero-id">
                  <BookOpen size={26} />
                </div>
                <div className="nm-detail-hero-text">
                  <div className="nm-detail-hero-top">
                    <StatusPill ativo={norma.ativo} />
                    {hasConteudo(norma) && (
                      <span className="nm-pill nm-pill-purple">
                        <Sparkles size={9} />
                        Texto completo
                      </span>
                    )}
                  </div>
                  <div className="nm-detail-hero-sub">{norma.descricao || 'Sem descrição cadastrada.'}</div>
                </div>
              </div>

              <div className="nm-stat-strip">
                <div className="nm-stat">
                  <div className="nm-stat-label">Ocorrências vinculadas</div>
                  <div className="nm-stat-value">
                    <span className="nm-stat-num">{formatCount(norma.totalOcorrencias)}</span>
                  </div>
                  <div className="nm-stat-foot">desde {formatAuditShort(norma.criadoEm)}</div>
                </div>
                <div className="nm-stat">
                  <div className="nm-stat-label">NCs ativas</div>
                  <div className="nm-stat-value">
                    <span className={`nm-stat-num ${norma.totalNcsAtivas > 5 ? 'warn' : ''}`}>{formatCount(norma.totalNcsAtivas)}</span>
                  </div>
                  <div className="nm-stat-foot">em tratamento neste momento</div>
                </div>
                <div className="nm-stat">
                  <div className="nm-stat-label">Última atualização</div>
                  <div className="nm-stat-value">
                    <span className="nm-stat-num" style={{ fontSize: 16 }}>{formatAuditShort(norma.atualizadoEm)}</span>
                  </div>
                  <div className="nm-stat-foot">por {norma.atualizadoPorNome || '—'}</div>
                </div>
              </div>

              <div className="nm-tabs-row">
                <button className={`nm-tab ${tab === 'texto' ? 'active' : ''}`} onClick={() => setTab('texto')}>
                  <FileText size={14} />
                  Texto da norma
                </button>
                <button className={`nm-tab ${tab === 'ocorrencias' ? 'active' : ''}`} onClick={() => setTab('ocorrencias')}>
                  <AlertTriangle size={14} />
                  Ocorrências
                  <span className="nm-tab-count">{formatCount(norma.totalOcorrencias)}</span>
                </button>
              </div>

              <div className="nm-detail-body">
                {tab === 'texto' && (
                  hasConteudo(norma) ? (
                    <div className="nm-text-panel">
                      <div className="nm-text-panel-head">
                        <span>Texto Integral</span>
                        <div className="nm-text-panel-head-actions">
                          <button className="nm-btn nm-btn-icon" title="Copiar" onClick={copyText}><Copy size={13} /></button>
                          <button className="nm-btn nm-btn-icon" title="Editar" onClick={() => navigate(`/normas/${norma.id}/editar`)}><Pencil size={13} /></button>
                        </div>
                      </div>
                      <div className="nm-text-content nm-text-content-pre">{norma.conteudo}</div>
                    </div>
                  ) : (
                    <div className="nm-empty">
                      <div className="nm-empty-icon"><FileText size={22} /></div>
                      <div className="nm-empty-title">Nenhum texto integral cadastrado</div>
                      <div className="nm-empty-sub">Adicione o conteúdo completo para habilitar busca de trechos nas NCs.</div>
                      <button className="nm-btn nm-btn-soft" onClick={() => navigate(`/normas/${norma.id}/editar`)} style={{ marginTop: 8 }}>
                        <Pencil size={13} />
                        Adicionar texto
                      </button>
                    </div>
                  )
                )}

                {tab === 'ocorrencias' && (
                  loadingNcs ? (
                    <div className="nm-empty">
                      <div className="nm-empty-icon"><AlertTriangle size={22} /></div>
                      <div className="nm-empty-title">Carregando ocorrências</div>
                    </div>
                  ) : linkedNcs.length === 0 ? (
                    <div className="nm-empty">
                      <div className="nm-empty-icon"><AlertTriangle size={22} /></div>
                      <div className="nm-empty-title">Nenhuma ocorrência vinculada</div>
                      <div className="nm-empty-sub">Quando uma NC usar esta norma, ela aparecerá aqui.</div>
                    </div>
                  ) : (
                    <div>
                      {linkedNcs.map(nc => {
                        const risk = riscoMeta(nc.nivelRisco)
                        const status = statusNcMeta(nc.status)
                        return (
                          <div key={nc.id} className="nm-link-row" onClick={() => navigate(`/ocorrencias/NAO_CONFORMIDADE/${nc.id}`)}>
                            <div className={`nm-link-row-icon ${risk?.tone || 'amber'}`}>
                              <AlertTriangle size={15} />
                            </div>
                            <div className="nm-link-row-text">
                              <div className="nm-link-row-title">{nc.titulo}</div>
                              <div className="nm-link-row-sub">
                                <span>{nc.estabelecimentoNome}</span>
                                {nc.localizacaoNome && <span>{nc.localizacaoNome}</span>}
                                <span>{formatAuditShort(nc.dataRegistro)}</span>
                              </div>
                            </div>
                            {risk && <span className={`nm-pill ${risk.pill}`}>{risk.label}</span>}
                            <span className={`nm-pill ${status.pill}`}>{status.label}</span>
                            <button className="nm-btn nm-btn-icon" title="Abrir">
                              <ExternalLink size={14} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                )}
              </div>
            </section>
          </div>

          <aside className="nm-sticky-side">
            <div className="nm-side-card">
              <div className="nm-side-card-head">Metadados</div>
              <div className="nm-side-card-body">
                <div className="nm-meta-list">
                  <div className="nm-meta-row">
                    <span className="nm-meta-label"><BookOpen size={11} />ID</span>
                    <span className="nm-meta-value nm-meta-value-mono">{norma.id}</span>
                  </div>
                  <div className="nm-meta-row">
                    <span className="nm-meta-label"><Calendar size={11} />Criada em</span>
                    <span className="nm-meta-value">{formatAuditDate(norma.criadoEm)}</span>
                  </div>
                  <div className="nm-meta-row">
                    <span className="nm-meta-label"><User size={11} />Criada por</span>
                    <span className="nm-meta-value">
                      {norma.criadoPorNome ? (
                        <>
                          <Avatar name={norma.criadoPorNome} size={20} />
                          {norma.criadoPorNome}
                        </>
                      ) : '—'}
                    </span>
                  </div>
                  <div className="nm-meta-row">
                    <span className="nm-meta-label"><GitCommit size={11} />Atualizada em</span>
                    <span className="nm-meta-value">{formatAuditDate(norma.atualizadoEm)}</span>
                  </div>
                  <div className="nm-meta-row">
                    <span className="nm-meta-label"><User size={11} />Atualizada por</span>
                    <span className="nm-meta-value">
                      {norma.atualizadoPorNome ? (
                        <>
                          <Avatar name={norma.atualizadoPorNome} size={20} />
                          {norma.atualizadoPorNome}
                        </>
                      ) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="nm-side-card">
              <div className="nm-side-card-head">Ações rápidas</div>
              <div className="nm-side-card-body">
                <button className="nm-quick-action" onClick={() => navigator.clipboard?.writeText(norma.id)}>
                  <Copy size={14} />
                  Copiar ID
                </button>
                <button className="nm-quick-action" onClick={() => navigate(`/normas/${norma.id}/editar`)}>
                  <Pencil size={14} />
                  Editar norma
                </button>
                {norma.ativo ? (
                  <button className="nm-quick-action warn" onClick={() => setConfirmando(true)}>
                    <PowerOff size={14} />
                    Inativar norma
                  </button>
                ) : (
                  <button className="nm-quick-action ok" onClick={() => reativarMutation.mutate(norma.id)} disabled={reativarMutation.isPending}>
                    <RotateCcw size={14} />
                    {reativarMutation.isPending ? 'Reativando...' : 'Reativar norma'}
                  </button>
                )}
              </div>
            </div>

            {norma.atualizadoPorNome && (
              <div className="nm-tip">
                <div className="nm-tip-icon"><User size={14} /></div>
                <div>
                  <div className="nm-tip-title">Última edição</div>
                  <div>{firstName(norma.atualizadoPorNome)} atualizou esta norma em {formatAuditShort(norma.atualizadoEm)}.</div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      <NormaDeactivateModal
        item={confirmando ? norma : null}
        isLoading={deactivateMutation.isPending}
        isError={deactivateMutation.isError}
        onCancel={() => {
          setConfirmando(false)
          deactivateMutation.reset()
        }}
        onConfirm={item => deactivateMutation.mutate(item.id)}
      />
    </div>
  )
}
