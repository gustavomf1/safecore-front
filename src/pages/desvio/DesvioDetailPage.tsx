import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { getDesvio, submeterTrativaDesvio, aprovarDesvio, reprovarDesvio, abrirTratativaDesvio, deleteDesvio } from '../../api/desvio'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../../components/StatusBadge'
import { ArrowLeft, Shield, CheckCircle, XCircle, Clock, Upload, Pencil, Trash2 } from 'lucide-react'
import { formatDateTime } from '../../utils/date'

export default function DesvioDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [observacao, setObservacao] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [motivoReprovacao, setMotivoReprovacao] = useState('')
  const [showReprovarModal, setShowReprovarModal] = useState(false)
  const [showAbrirTratativaModal, setShowAbrirTratativaModal] = useState(false)
  const [emailsManuaisSubmeter, setEmailsManuaisSubmeter] = useState<string[]>([])
  const [emailsManuaisAprovar, setEmailsManuaisAprovar] = useState<string[]>([])
  const [emailsManuaisReprovar, setEmailsManuaisReprovar] = useState<string[]>([])
  const [novoEmailSubmeter, setNovoEmailSubmeter] = useState('')
  const [novoEmailAprovar, setNovoEmailAprovar] = useState('')
  const [novoEmailReprovar, setNovoEmailReprovar] = useState('')

  const { data: desvio, isLoading } = useQuery({
    queryKey: ['desvio', id],
    queryFn: () => getDesvio(id!),
    enabled: !!id,
  })

  const submeterMutation = useMutation({
    mutationFn: () => submeterTrativaDesvio(desvio!.id,
      emailsManuaisSubmeter.length > 0 ? { emailsManuais: emailsManuaisSubmeter } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['desvio', id] })
      setObservacao('')
      setArquivo(null)
      setEmailsManuaisSubmeter([])
      setNovoEmailSubmeter('')
    },
    onError: (err) => {
      console.error('Erro ao submeter tratativa:', err)
    },
  })

  const aprovarMutation = useMutation({
    mutationFn: () => aprovarDesvio(desvio!.id, {
      emailsManuais: emailsManuaisAprovar.length > 0 ? emailsManuaisAprovar : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['desvio', id] })
      setEmailsManuaisAprovar([])
      setNovoEmailAprovar('')
    },
  })

  const abrirTrativaMutation = useMutation({
    mutationFn: () => abrirTratativaDesvio(desvio!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['desvio', id] })
      setShowAbrirTratativaModal(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteDesvio(desvio!.id),
    onSuccess: () => navigate('/ocorrencias'),
  })

  const reprovarMutation = useMutation({
    mutationFn: () => reprovarDesvio(desvio!.id, {
      itens: [],
      emailsManuais: emailsManuaisReprovar.length > 0 ? emailsManuaisReprovar : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['desvio', id] })
      setShowReprovarModal(false)
      setMotivoReprovacao('')
      setEmailsManuaisReprovar([])
      setNovoEmailReprovar('')
    },
  })

  if (isLoading) {
    return <div className="text-slate-400 py-8 text-center">Carregando...</div>
  }

  if (!desvio) {
    return <div className="text-red-500 py-8 text-center">Desvio não encontrado</div>
  }

  const isResponsavelTratativa = user?.id === desvio.responsavelTratativaId
  const isResponsavelDesvio = user?.id === desvio.responsavelDesvioId
  const isAdmin = user?.isAdmin
  const isCriador = user?.id === desvio.usuarioCriacaoId && user?.perfil !== 'EXTERNO'
  const podeEditarExcluir = desvio.status === 'ABERTO' && (isCriador || !!isAdmin)

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-bold text-slate-800">Desvio</h2>
          <StatusBadge status={desvio.status} type="desvio" />
          {desvio.regraDeOuro && (
            <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-medium">
              <Shield size={12} />
              Regra de Ouro
            </span>
          )}
        </div>
        {podeEditarExcluir && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/ocorrencias/DESVIO/${desvio.id}/editar`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <Pencil size={14} /> Editar
            </button>
            <button
              onClick={() => { if (window.confirm('Tem certeza que deseja excluir este desvio?')) deleteMutation.mutate() }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
            >
              <Trash2 size={14} /> Excluir
            </button>
          </div>
        )}
      </div>

      {/* Dados gerais */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-sm">
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Estabelecimento</p>
            <p className="text-slate-800 font-medium">{desvio.estabelecimentoNome}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Usuário de Registro</p>
            <p className="text-slate-800">{desvio.usuarioCriacaoNome || '—'}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Data de Registro</p>
            <p className="text-slate-800">{formatDateTime(desvio.dataRegistro)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Responsável pelo Desvio</p>
            <p className="text-slate-800">{desvio.responsavelDesvioNome || '—'}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Responsável pela Tratativa</p>
            <p className="text-slate-800">{desvio.responsavelTrativaNome || '—'}</p>
          </div>
          {desvio.localizacaoNome && (
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Localização</p>
              <p className="text-slate-800 font-medium">{desvio.localizacaoNome}</p>
            </div>
          )}
          <div className="sm:col-span-2">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Descrição do Desvio</p>
            <p className="text-slate-800">{desvio.descricao}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Orientação Realizada</p>
            <p className="text-slate-800">{desvio.orientacaoRealizada}</p>
          </div>
        </div>
      </div>

      {/* Seção de Tratativa */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Tratativa</h3>

        {desvio.status === 'ABERTO' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-700 bg-blue-50 rounded-lg p-4 text-sm">
              <Clock size={16} className="shrink-0" />
              <span>Desvio registrado e aguardando envio para tratativa.</span>
            </div>
            {(isCriador || isAdmin) && (
              <button
                onClick={() => setShowAbrirTratativaModal(true)}
                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition"
              >
                Enviar para Tratativa →
              </button>
            )}
          </div>
        )}

        {desvio.status === 'AGUARDANDO_TRATATIVA' && (
          <>
            {(isResponsavelTratativa || isAdmin) ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Observação da Tratativa *
                  </label>
                  <textarea
                    value={observacao}
                    onChange={e => setObservacao(e.target.value)}
                    rows={4}
                    placeholder="Descreva a tratativa realizada..."
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:bg-white transition resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Evidência (foto ou documento) *
                  </label>
                  <label className="flex items-center gap-3 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-slate-400 transition">
                    <Upload size={18} className="text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-500 truncate">
                      {arquivo ? arquivo.name : 'Clique para selecionar arquivo'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={e => setArquivo(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
                {submeterMutation.isError && (
                  <p className="text-red-500 text-sm">
                    {(submeterMutation.error as Error).message}
                  </p>
                )}
                {/* Email manual — Submeter */}
                <div className="flex gap-2 mb-2">
                  <input
                    type="email"
                    placeholder="Email adicional (opcional)"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={novoEmailSubmeter}
                    onChange={e => setNovoEmailSubmeter(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const em = novoEmailSubmeter.trim()
                        if (em && !emailsManuaisSubmeter.includes(em)) {
                          setEmailsManuaisSubmeter(prev => [...prev, em])
                          setNovoEmailSubmeter('')
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const em = novoEmailSubmeter.trim()
                      if (em && !emailsManuaisSubmeter.includes(em)) {
                        setEmailsManuaisSubmeter(prev => [...prev, em])
                        setNovoEmailSubmeter('')
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
                  >
                    +
                  </button>
                </div>
                {emailsManuaisSubmeter.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {emailsManuaisSubmeter.map(e => (
                      <span key={e} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        {e}
                        <button type="button" onClick={() => setEmailsManuaisSubmeter(prev => prev.filter(x => x !== e))} className="hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => submeterMutation.mutate()}
                  disabled={submeterMutation.isPending}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition"
                >
                  {submeterMutation.isPending ? 'Enviando...' : 'Submeter Tratativa'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-700 bg-orange-50 rounded-lg p-4 text-sm">
                <Clock size={16} className="shrink-0" />
                <span>Aguardando tratativa de <strong>{desvio.responsavelTrativaNome || '—'}</strong></span>
              </div>
            )}
          </>
        )}

        {desvio.status === 'AGUARDANDO_APROVACAO' && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-xs uppercase text-slate-500 tracking-wide">Observação submetida</p>
              <p className="text-sm text-slate-800">{desvio.observacaoTratativa}</p>
              {desvio.evidenciaTrativaUrl && (
                <a
                  href={desvio.evidenciaTrativaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                >
                  Ver evidência: {desvio.evidenciaTrativaNome}
                </a>
              )}
            </div>

            {(isResponsavelDesvio || isAdmin) ? (
              <div className="space-y-2">
                {/* Email manual — Aprovar */}
                <div className="flex gap-2 mb-2">
                  <input
                    type="email"
                    placeholder="Email adicional (opcional)"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={novoEmailAprovar}
                    onChange={e => setNovoEmailAprovar(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const em = novoEmailAprovar.trim()
                        if (em && !emailsManuaisAprovar.includes(em)) {
                          setEmailsManuaisAprovar(prev => [...prev, em])
                          setNovoEmailAprovar('')
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const em = novoEmailAprovar.trim()
                      if (em && !emailsManuaisAprovar.includes(em)) {
                        setEmailsManuaisAprovar(prev => [...prev, em])
                        setNovoEmailAprovar('')
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
                  >
                    +
                  </button>
                </div>
                {emailsManuaisAprovar.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {emailsManuaisAprovar.map(e => (
                      <span key={e} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        {e}
                        <button type="button" onClick={() => setEmailsManuaisAprovar(prev => prev.filter(x => x !== e))} className="hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => aprovarMutation.mutate()}
                    disabled={aprovarMutation.isPending}
                    className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
                  >
                    <CheckCircle size={16} />
                    {aprovarMutation.isPending ? 'Aprovando...' : 'Aprovar'}
                  </button>
                  <button
                    onClick={() => setShowReprovarModal(true)}
                    className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 transition"
                  >
                    <XCircle size={16} />
                    Reprovar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-indigo-700 bg-indigo-50 rounded-lg p-4 text-sm">
                <Clock size={16} className="shrink-0" />
                <span>Aguardando aprovação de <strong>{desvio.responsavelDesvioNome || '—'}</strong></span>
              </div>
            )}
          </div>
        )}

        {desvio.status === 'CONCLUIDO' && desvio.observacaoTratativa && (
          <div className="bg-green-50 rounded-lg p-4 space-y-2">
            <p className="text-xs uppercase text-green-700 tracking-wide font-medium">Tratativa aprovada</p>
            <p className="text-sm text-slate-800">{desvio.observacaoTratativa}</p>
            {desvio.evidenciaTrativaUrl && (
              <a
                href={desvio.evidenciaTrativaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                Ver evidência: {desvio.evidenciaTrativaNome}
              </a>
            )}
          </div>
        )}

        {(desvio.status === 'CONCLUIDO' && !desvio.observacaoTratativa) && (
          <p className="text-sm text-slate-400 italic">Desvio concluído (registro anterior ao fluxo de tratativa).</p>
        )}
      </div>

      {/* Histórico de reprovações */}
      {desvio.historico && desvio.historico.filter(h => h.tipo === 'REPROVADO').length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Histórico de Reprovações</h3>
          <div className="space-y-3">
            {desvio.historico
              .filter(h => h.tipo === 'REPROVADO')
              .map(h => (
                <div key={h.id} className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Reprovado por <strong>{h.usuarioNome}</strong></span>
                    <span>{formatDateTime(h.dataAcao)}</span>
                  </div>
                  <p className="text-slate-800 font-medium">{h.comentario}</p>
                  {h.snapshotObservacao && (
                    <p className="text-slate-600 text-xs italic">
                      Observação reprovada: "{h.snapshotObservacao}"
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Modal — Enviar para Tratativa */}
      {showAbrirTratativaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Enviar para Tratativa</h3>
            <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
              <p><span className="text-slate-500">Título:</span> <strong>{desvio.titulo}</strong></p>
              <p><span className="text-slate-500">Responsável pelo Desvio:</span> {desvio.responsavelDesvioNome}</p>
              <p><span className="text-slate-500">Responsável pela Tratativa:</span> {desvio.responsavelTrativaNome}</p>
            </div>
            <p className="text-sm text-orange-700 bg-orange-50 rounded-lg p-3">
              Após confirmar, <strong>não será possível editar</strong> os dados do desvio.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAbrirTratativaModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => abrirTrativaMutation.mutate()}
                disabled={abrirTrativaMutation.isPending}
                className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition"
              >
                {abrirTrativaMutation.isPending ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reprovar */}
      {showReprovarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Reprovar Tratativa</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Motivo da reprovação *
              </label>
              <textarea
                value={motivoReprovacao}
                onChange={e => setMotivoReprovacao(e.target.value)}
                rows={4}
                placeholder="Descreva o motivo da reprovação..."
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
            {/* Email manual — Reprovar */}
            <div className="flex gap-2 mb-2">
              <input
                type="email"
                placeholder="Email adicional (opcional)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={novoEmailReprovar}
                onChange={e => setNovoEmailReprovar(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const em = novoEmailReprovar.trim()
                    if (em && !emailsManuaisReprovar.includes(em)) {
                      setEmailsManuaisReprovar(prev => [...prev, em])
                      setNovoEmailReprovar('')
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const em = novoEmailReprovar.trim()
                  if (em && !emailsManuaisReprovar.includes(em)) {
                    setEmailsManuaisReprovar(prev => [...prev, em])
                    setNovoEmailReprovar('')
                  }
                }}
                className="px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
              >
                +
              </button>
            </div>
            {emailsManuaisReprovar.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {emailsManuaisReprovar.map(e => (
                  <span key={e} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    {e}
                    <button type="button" onClick={() => setEmailsManuaisReprovar(prev => prev.filter(x => x !== e))} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowReprovarModal(false); setMotivoReprovacao('') }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => reprovarMutation.mutate()}
                disabled={!motivoReprovacao.trim() || reprovarMutation.isPending}
                className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
              >
                {reprovarMutation.isPending ? 'Reprovando...' : 'Confirmar Reprovação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
