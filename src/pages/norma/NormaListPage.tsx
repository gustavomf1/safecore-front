import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowUpDown,
  BookOpen,
  Calendar,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import { deleteNorma, getNormas, reativarNorma } from '../../api/norma'
import NormaDeactivateModal from '../../components/NormaDeactivateModal'
import { Norma } from '../../types'
import { NormaIcon, StatusPill } from './NormasCommon'
import {
  firstName,
  formatAuditShort,
  formatCount,
  hasConteudo,
} from './normasHelpers'
import '../../styles/normas.css'

type StatusFilter = 'all' | 'ativo' | 'inativo'

const PAGE_SIZE = 15

export default function NormaListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('ativo')
  const [page, setPage] = useState(1)
  const [confirmando, setConfirmando] = useState<Norma | null>(null)

  const { data: normas = [], isLoading } = useQuery({
    queryKey: ['normas', 'all'],
    queryFn: () => getNormas(),
  })

  const counts = useMemo(() => ({
    all: normas.length,
    ativo: normas.filter(n => n.ativo).length,
    inativo: normas.filter(n => !n.ativo).length,
  }), [normas])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return normas.filter(n => {
      if (status === 'ativo' && !n.ativo) return false
      if (status === 'inativo' && n.ativo) return false
      if (!q) return true
      return n.titulo.toLowerCase().includes(q) || (n.descricao ?? '').toLowerCase().includes(q)
    })
  }, [normas, query, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const paginated = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE)

  const deleteMutation = useMutation({
    mutationFn: deleteNorma,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['normas'] })
      setConfirmando(null)
    },
  })

  const reativarMutation = useMutation({
    mutationFn: reativarNorma,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['normas'] })
    },
  })

  function setStatusFilter(next: StatusFilter) {
    setStatus(next)
    setPage(1)
  }

  function setSearch(next: string) {
    setQuery(next)
    setPage(1)
  }

  return (
    <div className="nm-screen">
      <div className="nm-page">
        <div className="nm-pageheader">
          <div className="nm-pageheader-icon">
            <BookOpen size={22} />
          </div>
          <div className="nm-pageheader-text">
            <h1 className="nm-pageheader-title">Normas e Regulamentos</h1>
            <p className="nm-pageheader-sub">
              Biblioteca de normas vinculáveis a ocorrências e não conformidades.{' '}
              <strong>{counts.ativo} ativas</strong> ·{' '}
              <strong>{formatCount(normas.reduce((sum, n) => sum + (n.totalOcorrencias ?? 0), 0))} ocorrências</strong> vinculadas.
            </p>
          </div>
          <div className="nm-pageheader-actions">
            <button className="nm-btn nm-btn-primary" onClick={() => navigate('/normas/nova')}>
              <Plus size={14} />
              Nova Norma
            </button>
          </div>
        </div>

        <div className="nm-toolbar">
          <div className="nm-toolbar-search">
            <span className="nm-input-icon"><Search size={14} /></span>
            <input
              className="nm-input"
              placeholder="Buscar por título ou descrição..."
              value={query}
              onChange={event => setSearch(event.target.value)}
            />
          </div>

          <div className="nm-filter-chips">
            <button className={`nm-chip ${status === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
              Todas <span className="nm-chip-count">{counts.all}</span>
            </button>
            <button className={`nm-chip ${status === 'ativo' ? 'active' : ''}`} onClick={() => setStatusFilter('ativo')}>
              Ativas <span className="nm-chip-count">{counts.ativo}</span>
            </button>
            <button className={`nm-chip ${status === 'inativo' ? 'active' : ''}`} onClick={() => setStatusFilter('inativo')}>
              Inativas <span className="nm-chip-count">{counts.inativo}</span>
            </button>
          </div>
        </div>

        <div className="nm-table">
          <div className="nm-table-row norma-list-row head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Título e descrição <ArrowUpDown size={11} />
            </div>
            <div>Vínculos</div>
            <div>Última atualização</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Ações</div>
          </div>

          {isLoading && (
            <div className="nm-empty">
              <div className="nm-empty-icon"><BookOpen size={22} /></div>
              <div className="nm-empty-title">Carregando normas</div>
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="nm-empty">
              <div className="nm-empty-icon"><AlertCircle size={22} /></div>
              <div className="nm-empty-title">Nenhuma norma encontrada</div>
              <div className="nm-empty-sub">Ajuste os filtros ou crie uma nova norma.</div>
            </div>
          )}

          {!isLoading && paginated.map(norma => (
            <div
              key={norma.id}
              className="nm-table-row norma-list-row"
              onClick={() => navigate(`/normas/${norma.id}`)}
            >
              <div style={{ minWidth: 0 }}>
                <div className="nm-norm-title-wrap">
                  <NormaIcon />
                  <div style={{ minWidth: 0 }}>
                    <div className="nm-norm-title">{norma.titulo}</div>
                    <div className="nm-norm-desc">{norma.descricao || 'Sem descrição cadastrada'}</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="nm-norm-num">{formatCount(norma.totalOcorrencias)}</div>
                <div className="nm-norm-num-sub">{formatCount(norma.totalNcsAtivas)} NCs ativas</div>
              </div>
              <div className="nm-norm-meta">
                <Calendar size={11} />
                <div>
                  <div className="nm-list-date">{formatAuditShort(norma.atualizadoEm)}</div>
                  <div className="nm-list-user">por {firstName(norma.atualizadoPorNome)}</div>
                </div>
              </div>
              <div className="nm-status-stack">
                <StatusPill ativo={norma.ativo} />
                {hasConteudo(norma) && <span className="nm-pill nm-pill-purple">Texto</span>}
              </div>
              <div className="nm-row-actions" onClick={event => event.stopPropagation()}>
                <button className="nm-btn nm-btn-icon primary" title="Ver detalhes" onClick={() => navigate(`/normas/${norma.id}`)}>
                  <Eye size={15} />
                </button>
                <button className="nm-btn nm-btn-icon" title="Editar" onClick={() => navigate(`/normas/${norma.id}/editar`)}>
                  <Pencil size={14} />
                </button>
                {norma.ativo ? (
                  <button className="nm-btn nm-btn-icon danger" title="Desativar" onClick={() => setConfirmando(norma)}>
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <button
                    className="nm-btn nm-btn-icon primary"
                    title="Reativar"
                    disabled={reativarMutation.isPending}
                    onClick={() => reativarMutation.mutate(norma.id)}
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="nm-table-foot">
            <span>
              <strong>{filtered.length}</strong> de {normas.length} normas
            </span>
            <div className="nm-pagi">
              <span style={{ marginRight: 8 }}>Página {pageSafe} de {totalPages}</span>
              <button className="nm-pagi-btn" disabled={pageSafe === 1} onClick={() => setPage(pageSafe - 1)}>‹</button>
              <button className="nm-pagi-btn active">{pageSafe}</button>
              <button className="nm-pagi-btn" disabled={pageSafe === totalPages} onClick={() => setPage(pageSafe + 1)}>›</button>
            </div>
          </div>
        </div>
      </div>

      <NormaDeactivateModal
        item={confirmando}
        isLoading={deleteMutation.isPending}
        isError={deleteMutation.isError}
        onCancel={() => {
          setConfirmando(null)
          deleteMutation.reset()
        }}
        onConfirm={norma => deleteMutation.mutate(norma.id)}
      />
    </div>
  )
}
