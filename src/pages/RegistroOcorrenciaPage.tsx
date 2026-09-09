import './registro-ocorrencia.css'
import { useState, useEffect, useMemo, useCallback, type CSSProperties, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createDesvio, updateDesvio, getDesvio } from '../api/desvio'
import { createNaoConformidade, updateNaoConformidade, getNaoConformidade, getNaoConformidades, buscarNcParaReincidencia } from '../api/naoConformidade'
import { uploadEvidencia, uploadEvidenciaDesvio } from '../api/evidencia'
import { getLocalizacoes } from '../api/localizacao'
import { getUsuarios } from '../api/usuario'
import { getNormas } from '../api/norma'
import { vincularTrechoNorma } from '../api/ncTrechoNorma'
import { getEmpresasMae } from '../api/empresa'
import { getEstabelecimentos, getEmpresasDoEstabelecimento } from '../api/estabelecimento'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useAuth } from '../contexts/AuthContext'
import {
  Camera, AlertCircle, FileText, Calendar, Search, X, PenLine,
  ArrowLeft, ChevronRight, ChevronDown, Activity, Check, Crown,
  Repeat, ShieldAlert, BookOpen, Users, Send, Building2,
} from 'lucide-react'
import SearchableSelect from '../components/SearchableSelect'
import AsyncSearchableSelect from '../components/AsyncSearchableSelect'
import StatusBadge from '../components/StatusBadge'
import BuscaTrechoModal from '../components/BuscaTrechoModal'
import TrechoManualModal from '../components/TrechoManualModal'
import NcRiskMatrix from '../components/NcRiskMatrix'
import ConfirmModalOcorrencia from '../components/ConfirmModalOcorrencia'
import { getEmailsPadrao } from '../api/emailPadrao'
import type { EmailPadrao, StatusNaoConformidade } from '../types'

// ─── Local UI components ──────────────────────────────────────────────────────

function Section({ num, title, subtitle, icon, accent = '#58a6ff', children }: {
  num: number; title: string; subtitle?: string; icon?: ReactNode; accent?: string; children: ReactNode
}) {
  return (
    <section className="nc-section">
      <header className="nc-section-header">
        <div className="nc-section-num" style={{ color: accent, borderColor: accent + '55' }}>
          {String(num).padStart(2, '0')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="nc-section-title">{title}</h3>
          {subtitle && <p className="nc-section-sub">{subtitle}</p>}
        </div>
        {icon && <div className="nc-section-icon" style={{ color: accent }}>{icon}</div>}
      </header>
      <div className="nc-section-body">{children}</div>
    </section>
  )
}

function Field({ label, required, helper, error, children, style }: {
  label: string; required?: boolean; helper?: string; error?: string; children: ReactNode; style?: CSSProperties
}) {
  return (
    <div className="nc-field" style={style}>
      <label className="nc-label">
        {label}{required && <span className="nc-required">*</span>}
      </label>
      {children}
      {helper && !error && <p className="nc-helper">{helper}</p>}
      {error && <p className="nc-error">{error}</p>}
    </div>
  )
}

type Tipo = 'DESVIO' | 'NAO_CONFORMIDADE'

function TypeToggle({ value, onChange, disabled }: { value: Tipo; onChange: (v: Tipo) => void; disabled?: boolean }) {
  const side = value === 'NAO_CONFORMIDADE' ? 'right' : 'left'
  return (
    <div className="nc-type-toggle">
      <div className="nc-type-toggle-bg" data-side={side} />
      {([['DESVIO', 'Desvio', 'Situação pontual', <AlertCircle size={20} />],
        ['NAO_CONFORMIDADE', 'Não Conformidade', 'Requer tratativa formal', <FileText size={20} />]] as const).map(
        ([v, label, sub, ico]) => (
          <button
            key={v}
            type="button"
            className={`nc-type-option ${value === v ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && onChange(v as Tipo)}
          >
            <span className="nc-type-icon">{ico}</span>
            <span className="nc-type-text">
              <span className="nc-type-label">{label}</span>
              <span className="nc-type-sub">{sub}</span>
            </span>
          </button>
        )
      )}
    </div>
  )
}

const SEV_OPTS = [
  { value: 1, label: 'Insignificante', color: '#3fb950' },
  { value: 2, label: 'Pequena',        color: '#3fb950' },
  { value: 3, label: 'Moderada',       color: '#d29922' },
  { value: 4, label: 'Alta',           color: '#f97316' },
  { value: 5, label: 'Catastrófica',   color: '#f85149' },
]
const PROB_OPTS = [
  { value: 1, label: 'Rara',       color: '#3fb950' },
  { value: 2, label: 'Improvável', color: '#3fb950' },
  { value: 3, label: 'Possível',   color: '#d29922' },
  { value: 4, label: 'Provável',   color: '#f97316' },
]

function RampPicker({ value, onChange, options }: {
  value: number
  onChange: (v: number) => void
  options: typeof SEV_OPTS
}) {
  return (
    <div className="nc-ramp-picker">
      {options.map(o => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            className={`nc-ramp-pill ${active ? 'active' : ''}`}
            style={active ? { '--ramp-color': o.color, '--ramp-color-bg': o.color + '22' } as CSSProperties : {}}
            onClick={() => onChange(active ? 0 : o.value)}
            title={active ? `${o.label} (clique para desmarcar)` : o.label}
          >
            <span className="nc-ramp-num">{o.value}</span>
            <span className="nc-ramp-label">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function NormCheck({ code, name, checked, hasConteudo, onToggle, onSearch, onWrite }: {
  code: string; name: string; checked: boolean; hasConteudo: boolean
  onToggle: () => void; onSearch: () => void; onWrite: () => void
}) {
  return (
    <div className={`nc-norm-row ${checked ? 'checked' : ''}`}>
      <button type="button" className="nc-norm-row-main" onClick={onToggle}>
        <span className={`nc-checkbox ${checked ? 'checked' : ''}`}>
          {checked && <Check size={12} strokeWidth={3} />}
        </span>
        <span className="nc-norm-meta">
          <span className="nc-norm-code">{code}</span>
          <span className="nc-norm-name">{name}</span>
        </span>
      </button>
      {checked && (
        <div className="nc-norm-actions">
          {hasConteudo && (
            <button type="button" onClick={onSearch} className="nc-btn nc-btn-blue-soft" style={{ fontSize: 12, padding: '6px 10px' }}>
              <Search size={13} /> Buscar trecho
            </button>
          )}
          <button type="button" onClick={onWrite} className="nc-btn nc-btn-ghost-soft" style={{ fontSize: 12, padding: '6px 10px' }}>
            <PenLine size={13} /> Escrever manual
          </button>
        </div>
      )}
    </div>
  )
}

function ToggleRow({ checked, onChange, title, sub, accent = '#58a6ff', icon, children }: {
  checked: boolean; onChange: (v: boolean) => void; title: string; sub: string
  accent?: string; icon?: ReactNode; children?: ReactNode
}) {
  return (
    <div className={`nc-toggle-row ${checked ? 'on' : ''}`} style={{ '--toggle-accent': accent } as CSSProperties}>
      <button type="button" className="nc-toggle-row-head" onClick={() => onChange(!checked)}>
        <span className={`nc-checkbox ${checked ? 'checked' : ''}`} style={checked ? { background: accent, borderColor: accent } : {}}>
          {checked && <Check size={12} strokeWidth={3} />}
        </span>
        <span className="nc-toggle-row-text">
          <span className="nc-toggle-row-title" style={{ color: checked ? accent : undefined }}>
            {icon}{title}
          </span>
          <span className="nc-toggle-row-sub">{sub}</span>
        </span>
      </button>
      {checked && children && <div className="nc-toggle-row-body">{children}</div>}
    </div>
  )
}

// ─── Form schema & types ──────────────────────────────────────────────────────

interface TrechoPendente {
  normaId: string
  normaTitulo: string
  clausulaReferencia?: string
  textoEditado: string
}

const schema = z.object({
  titulo: z.string().min(1, 'Título obrigatório'),
  localizacaoId: z.string().min(1, 'Localização obrigatória'),
  descricao: z.string().optional(),
  estabelecimentoId: z.string().min(1, 'Selecione um estabelecimento'),
  responsavelTrativaId: z.string().optional(),
  responsavelNcId: z.string().optional(),
  responsavelDesvioId: z.string().optional(),
  responsavelTratativaId: z.string().optional(),
})
type FormData = z.infer<typeof schema>

type MutationPayload = { formData: FormData; emailsManuais: string[]; emailsPadraoExcluidos: string[] }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegistroOcorrenciaPage() {
  const { tipo: tipoParam, id } = useParams<{ tipo?: string; id?: string }>()
  const isEditing = !!id && !!tipoParam
  const [tipo, setTipo] = useState<Tipo>(tipoParam === 'NAO_CONFORMIDADE' ? 'NAO_CONFORMIDADE' : 'DESVIO')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [normasSelecionadas, setNormasSelecionadas] = useState<string[]>([])
  const [isReincidencia, setIsReincidencia] = useState(false)
  const [isRegraDeOuro, setIsRegraDeOuro] = useState(false)
  const [ncAnteriorId, setNcAnteriorId] = useState<string>('')
  const [trechosPendentes, setTrechosPendentes] = useState<TrechoPendente[]>([])
  const [buscaModal, setBuscaModal] = useState<{ normaId: string; normaTitulo: string } | null>(null)
  const [manualModal, setManualModal] = useState<{ normaId: string; normaTitulo: string } | null>(null)
  const [adminEmpresaId, setAdminEmpresaId] = useState('')
  const [adminEstabelecimentoId, setAdminEstabelecimentoId] = useState('')
  const [adminEmpresaFilhaId, setAdminEmpresaFilhaId] = useState('')
  const [severidade, setSeveridade] = useState(0)
  const [probabilidade, setProbabilidade] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [formDataPendente, setFormDataPendente] = useState<FormData | null>(null)
  const [normaSearch, setNormaSearch] = useState('')
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { estabelecimento: estabelecimentoSelecionado, empresaFilha } = useWorkspace()
  const { user } = useAuth()

  const { data: empresasAdmin = [] } = useQuery({
    queryKey: ['empresas-mae-admin'],
    queryFn: () => getEmpresasMae(true),
    enabled: !!user?.isAdmin,
  })
  const { data: estabelecimentosAdmin = [] } = useQuery({
    queryKey: ['estabelecimentos-admin', adminEmpresaId],
    queryFn: () => getEstabelecimentos(true, adminEmpresaId),
    enabled: !!user?.isAdmin && !!adminEmpresaId,
  })
  const { data: empresasFilhaAdmin = [] } = useQuery({
    queryKey: ['empresas-filha-admin', adminEstabelecimentoId],
    queryFn: () => getEmpresasDoEstabelecimento(adminEstabelecimentoId),
    enabled: !!user?.isAdmin && !!adminEstabelecimentoId,
  })

  const estabelecimentoEfetivo = useMemo(
    () => user?.isAdmin ? { id: adminEstabelecimentoId } : estabelecimentoSelecionado,
    [user?.isAdmin, adminEstabelecimentoId, estabelecimentoSelecionado]
  )
  const empresaFilhaEfetiva = useMemo(
    () => user?.isAdmin ? { id: adminEmpresaFilhaId } : empresaFilha,
    [user?.isAdmin, adminEmpresaFilhaId, empresaFilha]
  )

  const { data: localizacoes = [] } = useQuery({
    queryKey: ['localizacoes', estabelecimentoEfetivo?.id],
    queryFn: () => getLocalizacoes(estabelecimentoEfetivo?.id),
    enabled: !!estabelecimentoEfetivo?.id,
  })
  const localizacoesAtivas = (localizacoes as Array<{ id: string; nome: string; ativo: boolean; estabelecimentoId: string }>)
    .filter(l => l.ativo && l.estabelecimentoId === estabelecimentoEfetivo?.id)

  const { data: usuarios = [] } = useQuery({ queryKey: ['usuarios'], queryFn: () => getUsuarios(true) })
  const { data: usuariosFilha = [] } = useQuery({
    queryKey: ['usuarios', 'empresa', empresaFilhaEfetiva?.id],
    queryFn: () => getUsuarios(true, empresaFilhaEfetiva?.id ?? ''),
    enabled: !!empresaFilhaEfetiva?.id,
  })

  type UsuarioItem = { id: string; nome: string; email: string; perfil: string; ativo: boolean }
  const engenheiros = (usuarios as UsuarioItem[]).filter(u => (u.perfil === 'ENGENHEIRO' || u.perfil === 'TECNICO') && u.ativo)
  const externos = (usuariosFilha as UsuarioItem[]).filter(u => (u.perfil === 'EXTERNO' || u.perfil === 'ENGENHEIRO') && u.ativo)

  const { data: normas = [] } = useQuery({ queryKey: ['normas'], queryFn: () => getNormas(true) })

  const { data: ncsEstabelecimento = [] } = useQuery({
    queryKey: ['nao-conformidades', 'estabelecimento', estabelecimentoEfetivo?.id],
    queryFn: () => getNaoConformidades({ estabelecimentoId: estabelecimentoEfetivo?.id }),
    enabled: tipo === 'NAO_CONFORMIDADE' && !!estabelecimentoEfetivo?.id,
  })

  const { data: emailsPadrao = [] } = useQuery<EmailPadrao[]>({
    queryKey: ['emails-padrao', estabelecimentoEfetivo?.id, empresaFilhaEfetiva?.id],
    queryFn: () => getEmailsPadrao(estabelecimentoEfetivo!.id, empresaFilhaEfetiva!.id),
    enabled: !isEditing && !!estabelecimentoEfetivo?.id && !!empresaFilhaEfetiva?.id,
  })

  type NcItem = { id: string; codigo: string; titulo: string; status: string; dataRegistro: string; ncAnteriorId?: string }
  type NcOption = { id: string; label: string; codigo: string; titulo: string; status: StatusNaoConformidade }
  const fetchNcsParaAnterior = useCallback(
    (q: string): Promise<NcOption[]> => {
      if (!estabelecimentoEfetivo?.id) return Promise.resolve([])
      return buscarNcParaReincidencia({ estabelecimentoId: estabelecimentoEfetivo.id, q, excludeId: id }).then(
        list => list.map(nc => ({
          id: nc.id, codigo: nc.codigo, titulo: nc.titulo, status: nc.status,
          label: `${nc.codigo} — ${nc.titulo} — ${nc.status}`,
        }))
      )
    },
    [estabelecimentoEfetivo?.id, id]
  )
  type NormaItem = { id: string; titulo: string; descricao?: string; conteudo?: string }
  const filteredNormas = useMemo(
    () => (normas as NormaItem[]).filter(n =>
      n.titulo.toLowerCase().includes(normaSearch.toLowerCase()) ||
      (n.descricao || '').toLowerCase().includes(normaSearch.toLowerCase())
    ),
    [normas, normaSearch]
  )
  const reincidenciaWarning = useMemo(() => {
    if (!ncAnteriorId) return null
    const allNcs = ncsEstabelecimento as NcItem[]
    const successor = allNcs.find(nc => nc.ncAnteriorId === ncAnteriorId && nc.id !== id)
    if (!successor) return null
    let fim = successor
    // loop intencional: percorre a cadeia de sucessores até não achar mais nenhum
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const prox = allNcs.find(nc => nc.ncAnteriorId === fim.id && nc.id !== id)
      if (!prox) break
      fim = prox
    }
    return fim
  }, [ncAnteriorId, ncsEstabelecimento, id])

  const { data: ncAnteriorData } = useQuery({
    queryKey: ['nc-anterior-preview', ncAnteriorId],
    queryFn: () => getNaoConformidade(ncAnteriorId),
    enabled: isReincidencia && !!ncAnteriorId,
  })
  const ncAnteriorSelecionadaLabel = ncAnteriorData
    ? `${ncAnteriorData.codigo} — ${ncAnteriorData.titulo} — ${ncAnteriorData.status}`
    : undefined

  const { data: desvioData } = useQuery({
    queryKey: ['desvio', id],
    queryFn: () => getDesvio(id!),
    enabled: isEditing && tipoParam === 'DESVIO',
  })
  const { data: ncData } = useQuery({
    queryKey: ['nc', id],
    queryFn: () => getNaoConformidade(id!),
    enabled: isEditing && tipoParam === 'NAO_CONFORMIDADE',
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { estabelecimentoId: estabelecimentoSelecionado?.id || '' },
  })

  useEffect(() => {
    if (desvioData) {
      reset({
        titulo: desvioData.titulo, localizacaoId: desvioData.localizacaoId || '',
        descricao: desvioData.descricao, estabelecimentoId: desvioData.estabelecimentoId,
        responsavelDesvioId: desvioData.responsavelDesvioId || '',
        responsavelTratativaId: desvioData.responsavelTratativaId || '',
      })
      setIsRegraDeOuro(desvioData.regraDeOuro ?? false)
      if (desvioData.estabelecimentoId) setAdminEstabelecimentoId(desvioData.estabelecimentoId)
      if (desvioData.empresaContratadaId) setAdminEmpresaFilhaId(desvioData.empresaContratadaId)
    }
  }, [desvioData, reset])

  useEffect(() => {
    if (ncData) {
      reset({
        titulo: ncData.titulo, localizacaoId: ncData.localizacaoId || '',
        descricao: ncData.descricao, estabelecimentoId: ncData.estabelecimentoId,
        responsavelTrativaId: ncData.responsavelTrativaId ?? '',
        responsavelNcId: ncData.responsavelNcId ?? '',
      })
      if (ncData.normas) setNormasSelecionadas(ncData.normas.map((n: { id: string }) => n.id))
      setIsReincidencia(ncData.reincidencia ?? false)
      setNcAnteriorId(ncData.ncAnteriorId ?? '')
      setIsRegraDeOuro(ncData.regraDeOuro ?? false)
      if (ncData.estabelecimentoId) setAdminEstabelecimentoId(ncData.estabelecimentoId)
      if (ncData.empresaContratadaId) setAdminEmpresaFilhaId(ncData.empresaContratadaId)
      if (ncData.severidade) setSeveridade(ncData.severidade)
      if (ncData.probabilidade) setProbabilidade(ncData.probabilidade)
    }
  }, [ncData, reset])

  useEffect(() => {
    if (user?.isAdmin && !isEditing) setValue('estabelecimentoId', adminEstabelecimentoId)
  }, [adminEstabelecimentoId, user?.isAdmin, isEditing, setValue])

  const dataLimite = new Date()
  dataLimite.setDate(dataLimite.getDate() + 30)
  const dataLimiteStr = dataLimite.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const mutation = useMutation({
    mutationFn: async ({ formData: data, emailsManuais, emailsPadraoExcluidos }: MutationPayload) => {
      const base = {
        titulo: data.titulo,
        localizacaoId: data.localizacaoId,
        descricao: data.descricao || '',
        estabelecimentoId: data.estabelecimentoId,
        regraDeOuro: isRegraDeOuro,
      }
      let result
      if (tipo === 'DESVIO') {
        const req = {
          ...base,
          orientacaoRealizada: data.descricao || '',
          responsavelDesvioId: data.responsavelDesvioId || undefined,
          responsavelTratativaId: data.responsavelTratativaId || undefined,
          emailsManuais: emailsManuais.length > 0 ? emailsManuais : undefined,
          emailsPadraoExcluidos: emailsPadraoExcluidos.length > 0 ? emailsPadraoExcluidos : undefined,
          empresaContratadaId: empresaFilhaEfetiva?.id,
        }
        result = isEditing ? await updateDesvio(id!, req) : await createDesvio(req)
      } else {
        const req = {
          ...base,
          descricao: data.descricao || undefined,
          severidade: severidade > 0 ? severidade : undefined,
          probabilidade: probabilidade > 0 ? probabilidade : undefined,
          responsavelTrativaId: data.responsavelTrativaId || undefined,
          responsavelNcId: data.responsavelNcId || undefined,
          normaIds: normasSelecionadas.length > 0 ? normasSelecionadas : undefined,
          reincidencia: isReincidencia,
          ncAnteriorId: isReincidencia && ncAnteriorId ? ncAnteriorId : undefined,
          emailsManuais: emailsManuais.length > 0 ? emailsManuais : undefined,
          emailsPadraoExcluidos: emailsPadraoExcluidos.length > 0 ? emailsPadraoExcluidos : undefined,
          empresaContratadaId: empresaFilhaEfetiva?.id,
        }
        result = isEditing ? await updateNaoConformidade(id!, req) : await createNaoConformidade(req)
      }
      if (arquivos.length > 0 && result?.id) {
        for (const file of arquivos) {
          if (tipo === 'DESVIO') await uploadEvidenciaDesvio(result.id, file)
          else await uploadEvidencia(result.id, file)
        }
      }
      if (tipo === 'NAO_CONFORMIDADE' && result?.id && trechosPendentes.length > 0) {
        for (const t of trechosPendentes) {
          await vincularTrechoNorma(result.id, {
            normaId: t.normaId,
            clausulaReferencia: t.clausulaReferencia,
            textoEditado: t.textoEditado,
          })
        }
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: [tipo === 'DESVIO' ? 'desvio' : 'nc', id] })
        navigate('/ocorrencias')
      }
    },
  })

  // ── Progress ──────────────────────────────────────────────────────────────
  const watchAll = watch()
  const estabelecimentoId = user?.isAdmin ? adminEstabelecimentoId : estabelecimentoSelecionado?.id || ''
  const requiredValues = [watchAll.titulo, estabelecimentoId, watchAll.localizacaoId, !!empresaFilhaEfetiva?.id]
  const filledCount = requiredValues.filter(Boolean).length
  const totalRequired = requiredValues.length
  const progress = Math.round((filledCount / totalRequired) * 100)

  const missingFields = tipo === 'NAO_CONFORMIDADE'
    ? [
        severidade === 0 && 'Severidade',
        probabilidade === 0 && 'Probabilidade',
        !empresaFilhaEfetiva?.id && 'Empresa Contratada',
      ].filter((v): v is string => !!v)
    : [
        !watchAll.responsavelDesvioId && 'Responsável pelo Desvio',
        !watchAll.responsavelTratativaId && 'Responsável pela Tratativa',
        !empresaFilhaEfetiva?.id && 'Empresa Contratada',
      ].filter((v): v is string => !!v)

  // ── Score ─────────────────────────────────────────────────────────────────
  const score = severidade * probabilidade
  const scoreColor = score <= 4 ? '#3fb950' : score <= 9 ? '#d29922' : score <= 16 ? '#f97316' : '#f85149'

  // ── Estabelecimento name ──────────────────────────────────────────────────
  const estabelecimentoNome = useMemo(() => {
    if (isEditing) return (desvioData?.estabelecimentoNome ?? ncData?.estabelecimentoNome ?? '') as string
    if (user?.isAdmin)
      return (estabelecimentosAdmin as Array<{ id: string; nome: string }>).find(e => e.id === adminEstabelecimentoId)?.nome ?? ''
    return estabelecimentoSelecionado?.nome ?? ''
  }, [isEditing, desvioData, ncData, user?.isAdmin, adminEstabelecimentoId, estabelecimentosAdmin, estabelecimentoSelecionado])

  // ── Localização name ──────────────────────────────────────────────────────
  const localizacaoNome = localizacoesAtivas.find(l => l.id === watchAll.localizacaoId)?.nome

  // ── Dynamic recipients for modal ──────────────────────────────────────────
  const dynamicRecipients = useMemo(() => {
    const list: { name: string; email: string; tag: string }[] = []
    if (user?.email) list.push({ name: (user as { nome: string }).nome, email: user.email, tag: 'você' })
    if (tipo === 'DESVIO') {
      const rd = engenheiros.find(u => u.id === watchAll.responsavelDesvioId)
      if (rd) list.push({ name: rd.nome, email: rd.email, tag: 'Resp. Desvio' })
      const rt = [...engenheiros, ...externos].find(u => u.id === watchAll.responsavelTratativaId)
      if (rt) list.push({ name: rt.nome, email: rt.email, tag: 'Resp. Tratativa' })
    } else {
      const rc = externos.find(u => u.id === watchAll.responsavelTrativaId)
      if (rc) list.push({ name: rc.nome, email: rc.email, tag: 'Resp. Tratativa' })
      const rv = engenheiros.find(u => u.id === watchAll.responsavelNcId)
      if (rv) list.push({ name: rv.nome, email: rv.email, tag: 'Resp. NC' })
    }
    return list
  }, [tipo, engenheiros, externos, watchAll, user])

  // ── Submit handlers ───────────────────────────────────────────────────────
  const onFormValid = (data: FormData) => {
    setSubmitAttempted(true)
    if (!empresaFilhaEfetiva?.id) return

    if (isEditing) {
      mutation.mutate({ formData: data, emailsManuais: [], emailsPadraoExcluidos: [] })
      return
    }
    setFormDataPendente(data)
    setModalOpen(true)
  }

  const descricaoLen = (watchAll.descricao || '').length
  const descricaoMax = tipo === 'NAO_CONFORMIDADE' ? 1000 : 400

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="nc-app">
      {/* Header */}
      <header className="nc-app-header">
        <button type="button" className="nc-btn-back" onClick={() => navigate('/ocorrencias')}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="nc-app-header-text">
          <div className="nc-breadcrumb">
            <span>Ocorrências</span>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--fg-2)' }}>{isEditing ? 'Editar' : 'Nova'}</span>
          </div>
          <h1 className="nc-app-title">{isEditing ? 'Editar Ocorrência' : 'Registro de Ocorrência'}</h1>
          <p className="nc-app-sub">
            {isEditing ? 'Altere os dados da ocorrência' : 'Preencha os dados da ocorrência identificada'}
          </p>
        </div>
        <div>
          <div className="nc-progress-chip">
            <span className="nc-progress-chip-dot" />
            <span>{filledCount}/{totalRequired} campos obrigatórios</span>
          </div>
        </div>
      </header>

      <div className="nc-app-grid">
        {/* ═══ MAIN COLUMN ═══ */}
        <div className="nc-form-col">
          <form onSubmit={handleSubmit(onFormValid)}>

            {/* §1 Identificação */}
            <Section num={1} title="Identificação" subtitle="Tipo, local e descrição da ocorrência" icon={<FileText size={18} />}>

              <Field label="Tipo de Ocorrência" required>
                <TypeToggle value={tipo} onChange={setTipo} disabled={isEditing} />
              </Field>

              {user?.isAdmin && !isEditing ? (
                <>
                  <div className="nc-form-row-2">
                    <Field label="Empresa" required>
                      <div className="nc-input-wrap nc-select-wrap">
                        <select
                          value={adminEmpresaId}
                          onChange={e => { setAdminEmpresaId(e.target.value); setAdminEstabelecimentoId(''); setAdminEmpresaFilhaId('') }}
                          className="nc-input nc-select"
                        >
                          <option value="">Selecione a empresa</option>
                          {(empresasAdmin as Array<{ id: string; razaoSocial: string }>).map(e => (
                            <option key={e.id} value={e.id}>{e.razaoSocial}</option>
                          ))}
                        </select>
                        <span className="nc-select-chev"><ChevronDown size={16} /></span>
                      </div>
                    </Field>
                    {adminEmpresaId && (
                      <Field label="Estabelecimento" required error={errors.estabelecimentoId?.message}>
                        <div className="nc-input-wrap nc-select-wrap">
                          <select
                            value={adminEstabelecimentoId}
                            onChange={e => { setAdminEstabelecimentoId(e.target.value); setAdminEmpresaFilhaId('') }}
                            className="nc-input nc-select"
                          >
                            <option value="">Selecione o estabelecimento</option>
                            {(estabelecimentosAdmin as Array<{ id: string; nome: string }>).map(e => (
                              <option key={e.id} value={e.id}>{e.nome}</option>
                            ))}
                          </select>
                          <span className="nc-select-chev"><ChevronDown size={16} /></span>
                        </div>
                      </Field>
                    )}
                  </div>
                  {adminEstabelecimentoId && (
                    <Field
                      label="Empresa Contratada"
                      required
                      error={submitAttempted && !adminEmpresaFilhaId ? 'Selecione a empresa contratada' : undefined}
                    >
                      <div className="nc-input-wrap nc-select-wrap">
                        <select value={adminEmpresaFilhaId} onChange={e => setAdminEmpresaFilhaId(e.target.value)} className="nc-input nc-select">
                          <option value="">Selecione...</option>
                          {(empresasFilhaAdmin as Array<{ id: string; razaoSocial: string }>).map(e => (
                            <option key={e.id} value={e.id}>{e.razaoSocial}</option>
                          ))}
                        </select>
                        <span className="nc-select-chev"><ChevronDown size={16} /></span>
                      </div>
                    </Field>
                  )}
                </>
              ) : (
                <Field label="Estabelecimento" required>
                  <div className="nc-input-wrap has-icon">
                    <span className="nc-input-icon"><Building2 size={15} /></span>
                    <input
                      type="text"
                      value={isEditing ? (desvioData?.estabelecimentoNome ?? ncData?.estabelecimentoNome ?? '') : (estabelecimentoSelecionado?.nome ?? '')}
                      readOnly
                      className="nc-input"
                    />
                  </div>
                </Field>
              )}

              <div className="nc-form-row-2">
                <Field label="Localização" required error={errors.localizacaoId?.message}>
                  <div className="nc-input-wrap nc-select-wrap">
                    <select
                      value={watchAll.localizacaoId ?? ''}
                      onChange={e => setValue('localizacaoId', e.target.value, { shouldValidate: true })}
                      className="nc-input nc-select"
                    >
                      <option value="">Selecione...</option>
                      {localizacoesAtivas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                    </select>
                    <span className="nc-select-chev"><ChevronDown size={16} /></span>
                  </div>
                </Field>
                <div />
              </div>

              <Field label="Título" required helper="Resumo curto que aparecerá nas listagens" error={errors.titulo?.message}>
                <div className="nc-input-wrap">
                  <input {...register('titulo')} className="nc-input" placeholder="Ex.: Operador sem proteção em prensa hidráulica" />
                </div>
              </Field>

              <Field label={tipo === 'NAO_CONFORMIDADE' ? 'Descrição Detalhada' : 'Descrição Curta'} error={errors.descricao?.message}>
                <div className="nc-textarea-wrap">
                  <textarea
                    {...register('descricao')}
                    rows={tipo === 'NAO_CONFORMIDADE' ? 5 : 3}
                    maxLength={descricaoMax}
                    placeholder={tipo === 'NAO_CONFORMIDADE'
                      ? 'Descreva detalhadamente a não conformidade identificada — quando, onde, como ocorreu, e o impacto observado.'
                      : 'Descreva brevemente o desvio identificado'}
                    className="nc-input nc-textarea"
                  />
                  <div className="nc-textarea-counter">
                    <span style={descricaoLen > descricaoMax * 0.9 ? { color: '#d29922' } : {}}>{descricaoLen}</span>
                    <span style={{ opacity: 0.5 }}> / {descricaoMax}</span>
                  </div>
                </div>
              </Field>
            </Section>

            {/* §2 Responsáveis */}
            <Section
              num={2}
              title="Responsáveis"
              subtitle={tipo === 'NAO_CONFORMIDADE' ? 'Quem trata e quem valida esta ocorrência' : 'Quem identifica e quem trata o desvio'}
              icon={<Users size={18} />}
              accent="#79b8ff"
            >
              {tipo === 'NAO_CONFORMIDADE' ? (
                <div className="nc-form-row-2">
                  <Field label="Responsável pela Tratativa" helper="Quem irá enviar o plano de ação (geralmente EXTERNO)">
                    <SearchableSelect
                      options={externos.map(u => ({ id: u.id, label: `${u.nome} (${u.perfil})` }))}
                      value={watchAll.responsavelTrativaId ?? ''}
                      onChange={id => setValue('responsavelTrativaId', id)}
                      placeholder="Selecione..."
                      className="nc-input"
                    />
                  </Field>
                  <Field label="Responsável pela NC" helper="Quem irá validar (aprovar/reprovar) a tratativa">
                    <SearchableSelect
                      options={engenheiros.map(u => ({ id: u.id, label: `${u.nome} (${u.perfil})` }))}
                      value={watchAll.responsavelNcId ?? ''}
                      onChange={id => setValue('responsavelNcId', id)}
                      placeholder="Selecione..."
                      className="nc-input"
                    />
                  </Field>
                </div>
              ) : (
                <div className="nc-form-row-2">
                  <Field label="Responsável pelo Desvio" required helper="Quem irá validar a tratativa">
                    <SearchableSelect
                      options={engenheiros.map(u => ({ id: u.id, label: `${u.nome} (${u.perfil})` }))}
                      value={watchAll.responsavelDesvioId ?? ''}
                      onChange={id => setValue('responsavelDesvioId', id)}
                      placeholder="Selecione..."
                      className="nc-input"
                    />
                  </Field>
                  <Field label="Responsável pela Tratativa" required helper="Quem irá executar a tratativa">
                    <SearchableSelect
                      options={[...engenheiros, ...externos].map(u => ({ id: u.id, label: `${u.nome} (${u.perfil})` }))}
                      value={watchAll.responsavelTratativaId ?? ''}
                      onChange={id => setValue('responsavelTratativaId', id)}
                      placeholder="Selecione..."
                      className="nc-input"
                    />
                  </Field>
                </div>
              )}
            </Section>

            {/* §3 Classificação de Risco (NC only) */}
            {tipo === 'NAO_CONFORMIDADE' && (
              <Section
                num={3}
                title="Classificação de Risco"
                subtitle="Severidade × Probabilidade definem o nível"
                icon={<ShieldAlert size={18} />}
                accent={severidade > 0 && probabilidade > 0 ? scoreColor : '#58a6ff'}
              >
                <Field label="Severidade" required error={submitAttempted && severidade === 0 ? 'Selecione a severidade' : undefined}>
                  <RampPicker value={severidade} onChange={setSeveridade} options={SEV_OPTS} />
                </Field>
                <Field label="Probabilidade" required error={submitAttempted && probabilidade === 0 ? 'Selecione a probabilidade' : undefined}>
                  <RampPicker value={probabilidade} onChange={setProbabilidade} options={PROB_OPTS} />
                </Field>
              </Section>
            )}

            {/* §4 Normas (NC only) */}
            {tipo === 'NAO_CONFORMIDADE' && (
              <Section num={4} title="Normas / Regras Violadas" subtitle="Selecione as NRs aplicáveis e vincule trechos" icon={<BookOpen size={18} />}>
                {normas.length === 0 ? (
                  <p className="nc-helper">
                    Nenhuma norma cadastrada.{' '}
                    <a href="/normas/nova" style={{ color: 'var(--accent)' }} target="_blank" rel="noreferrer">Cadastre uma norma</a>{' '}
                    para vincular aqui.
                  </p>
                ) : (
                  <div className="nc-norms-picker">
                    {normasSelecionadas.length > 0 && (
                      <div className="nc-norms-chips">
                        <span className="nc-norms-chips-label">Selecionadas</span>
                        <div className="nc-norms-chips-list">
                          {normasSelecionadas.map(nid => {
                            const n = (normas as NormaItem[]).find(x => x.id === nid)
                            if (!n) return null
                            return (
                              <button
                                key={nid}
                                type="button"
                                className="nc-norm-chip"
                                onClick={() => setNormasSelecionadas(prev => prev.filter(id => id !== nid))}
                                title={n.descricao || n.titulo}
                              >
                                <span>{n.titulo}</span>
                                <X size={10} strokeWidth={2.5} />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div className="nc-norms-search-wrap">
                      <Search size={13} className="nc-norms-search-icon" />
                      <input
                        type="text"
                        value={normaSearch}
                        onChange={e => setNormaSearch(e.target.value)}
                        placeholder={`Buscar entre ${(normas as NormaItem[]).length} normas…`}
                        className="nc-norms-search-input"
                        autoComplete="off"
                      />
                      {normaSearch && (
                        <button type="button" className="nc-norms-search-clear" onClick={() => setNormaSearch('')}>
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <div className="nc-norms-list">
                      {filteredNormas.length === 0 ? (
                        <div className="nc-norms-empty">
                          <Search size={16} />
                          Nenhuma norma encontrada para <strong>"{normaSearch}"</strong>
                        </div>
                      ) : (
                        filteredNormas.map(norma => (
                          <NormCheck
                            key={norma.id}
                            code={norma.titulo}
                            name={norma.descricao || ''}
                            checked={normasSelecionadas.includes(norma.id)}
                            hasConteudo={!!norma.conteudo}
                            onToggle={() => setNormasSelecionadas(prev =>
                              prev.includes(norma.id) ? prev.filter(n => n !== norma.id) : [...prev, norma.id]
                            )}
                            onSearch={() => setBuscaModal({ normaId: norma.id, normaTitulo: norma.titulo })}
                            onWrite={() => setManualModal({ normaId: norma.id, normaTitulo: norma.titulo })}
                          />
                        ))
                      )}
                    </div>
                    <div className="nc-norms-footer">
                      <span>{(normas as NormaItem[]).length} normas disponíveis</span>
                      {normasSelecionadas.length > 0 && (
                        <span className="nc-norms-footer-sel">· {normasSelecionadas.length} selecionada{normasSelecionadas.length > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                )}

                {trechosPendentes.length > 0 && (
                  <div className="nc-trechos-block">
                    <div className="nc-trechos-label">
                      <span className="nc-trechos-label-bullet" />
                      Trechos a vincular ({trechosPendentes.length})
                    </div>
                    {trechosPendentes.map((t, i) => (
                      <div key={i} className="nc-trecho-card">
                        <div>
                          <div className="nc-trecho-code">
                            {t.normaTitulo}{t.clausulaReferencia ? ` — ${t.clausulaReferencia}` : ''}
                          </div>
                          <div className="nc-trecho-desc">{t.textoEditado}</div>
                        </div>
                        <button
                          type="button"
                          className="nc-trecho-x"
                          onClick={() => setTrechosPendentes(prev => prev.filter((_, idx) => idx !== i))}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* §5 Sinalizações (NC only) */}
            {tipo === 'NAO_CONFORMIDADE' && (
              <Section num={5} title="Sinalizações" subtitle="Reincidência e regra crítica" icon={<Repeat size={18} />} accent="#f85149">
                <ToggleRow
                  checked={isReincidencia}
                  onChange={v => { setIsReincidencia(v); if (!v) setNcAnteriorId('') }}
                  title="Reincidência"
                  sub="Marque se esta NC é recorrência de uma ocorrência anterior"
                  accent="#f85149"
                >
                  <Field label="NC Anterior" required>
                    <AsyncSearchableSelect<NcOption>
                      value={ncAnteriorId}
                      onChange={setNcAnteriorId}
                      fetchOptions={fetchNcsParaAnterior}
                      selectedLabel={ncAnteriorSelecionadaLabel}
                      placeholder="Selecione a NC anterior"
                      emptyLabel="— Nenhuma —"
                      className="nc-input"
                      style={reincidenciaWarning ? { borderColor: '#f97316', boxShadow: '0 0 0 3px rgba(249,115,22,0.18)' } : undefined}
                      renderOption={o => (
                        <>
                          <span className="nc-async-option-code">{o.codigo}</span>
                          <span className="nc-async-option-title">{o.titulo}</span>
                          <StatusBadge type="nc" status={o.status} />
                        </>
                      )}
                    />
                  </Field>

                  {reincidenciaWarning && (
                    <div className="nc-reinc-warn">
                      <div className="nc-reinc-warn-title">⚠ Esta NC já possui uma reincidência registrada</div>
                      <div className="nc-reinc-warn-body">Para manter o rastro linear, selecione a última NC da cadeia:</div>
                      <div className="nc-reinc-warn-last" style={{ marginTop: 8, padding: 8, background: 'rgba(249,115,22,0.1)', borderRadius: 6, border: '1px solid rgba(249,115,22,0.3)' }}>
                        <div style={{ fontSize: 12, color: '#f97316', fontWeight: 500, marginBottom: 6 }}>📍 Última NC da cadeia:</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#d58a15', marginBottom: 6, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                          <span style={{ fontFamily: 'monospace', opacity: 0.85 }}>{reincidenciaWarning.codigo}</span> — {reincidenciaWarning.titulo}
                        </div>
                        <button
                          type="button"
                          onClick={() => setNcAnteriorId(reincidenciaWarning.id)}
                          className="nc-btn-link"
                          style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(249,115,22,0.2)', color: '#f97316', border: '1px solid #f97316', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          Usar esta NC
                        </button>
                      </div>
                    </div>
                  )}

                  {ncAnteriorId && ncAnteriorData && (
                    <div className="nc-reinc-trail">
                      <div className="nc-reinc-trail-label">Rastro de reincidências</div>
                      <div className="nc-reinc-trail-row">
                        {(ncAnteriorData as { cadeiaReincidencias: { id: string; codigo: string; titulo: string }[] }).cadeiaReincidencias.map(item => (
                          <span key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="nc-pill nc-pill-red" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${item.codigo} — ${item.titulo}`}>{item.codigo} — {item.titulo}</span>
                            <span className="nc-reinc-arrow">→</span>
                          </span>
                        ))}
                        <span className="nc-pill nc-pill-red" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${(ncAnteriorData as { codigo: string; titulo: string }).codigo} — ${(ncAnteriorData as { titulo: string }).titulo}`}>{(ncAnteriorData as { codigo: string }).codigo} — {(ncAnteriorData as { titulo: string }).titulo}</span>
                        <span className="nc-reinc-arrow">→</span>
                        <span className="nc-pill nc-pill-slate" style={{ boxShadow: '0 0 0 1px rgba(88,166,255,0.6)' }}>
                          {isEditing && ncData?.codigo ? `${ncData.codigo} — Esta NC` : 'Esta NC'}
                        </span>
                      </div>
                    </div>
                  )}
                </ToggleRow>

                <ToggleRow
                  checked={isRegraDeOuro}
                  onChange={setIsRegraDeOuro}
                  title="Regra de Ouro"
                  sub="Marque se a ocorrência viola uma regra crítica de segurança"
                  accent="#d29922"
                  icon={<Crown size={14} />}
                />
              </Section>
            )}

            {/* §6/3 Prazo e Evidências */}
            <Section
              num={tipo === 'NAO_CONFORMIDADE' ? 6 : 3}
              title="Prazo e Evidências"
              subtitle="Data limite e arquivos da ocorrência"
              icon={<Calendar size={18} />}
            >
              <div className="nc-form-row-2">
                {tipo === 'NAO_CONFORMIDADE' && !isEditing && (
                  <Field label="Data Limite para Tratativa" helper="Prazo padrão: 30 dias a partir do registro">
                    <div className="nc-input-wrap has-icon">
                      <span className="nc-input-icon"><Calendar size={15} /></span>
                      <input type="text" value={dataLimiteStr} readOnly className="nc-input" style={{ color: '#79b8ff' }} />
                    </div>
                  </Field>
                )}
                {!isEditing && (
                  <Field
                    label="Evidências Fotográficas"
                    style={tipo !== 'NAO_CONFORMIDADE' ? { gridColumn: '1 / -1' } : {}}
                  >
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="file"
                        accept="image/png,image/jpg,image/jpeg,application/pdf"
                        multiple
                        style={{ display: 'none' }}
                        onChange={e => {
                          const files = Array.from(e.target.files ?? [])
                          if (files.length > 0) setArquivos(prev => [...prev, ...files])
                          e.target.value = ''
                        }}
                      />
                      <div className="nc-upload-tile">
                        <Camera size={22} />
                        <span className="nc-upload-tile-main">Clique para anexar</span>
                        <span className="nc-upload-tile-sub">PNG, JPG, PDF — múltiplos arquivos</span>
                      </div>
                    </label>
                  </Field>
                )}
              </div>

              {arquivos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {arquivos.map((file, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'var(--bg-input)', border: '1px solid var(--border-soft)',
                      borderRadius: 10, padding: '10px 14px',
                    }}>
                      {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt={file.name} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 6, background: 'rgba(248,81,73,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={16} style={{ color: '#f85149' }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--fg-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setArquivos(prev => prev.filter((_, idx) => idx !== i))}
                        className="nc-trecho-x"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Aviso de campos obrigatórios pendentes */}
            {submitAttempted && missingFields.length > 0 && (
              <div className="nc-form-error-banner">
                <AlertCircle size={16} />
                <span>
                  Preencha os campos obrigatórios antes de continuar: <strong>{missingFields.join(', ')}</strong>.
                </span>
              </div>
            )}

            {/* Action bar */}
            <div className="nc-action-bar">
              <button type="button" className="nc-btn nc-btn-ghost" onClick={() => navigate('/ocorrencias')}>
                Cancelar
              </button>
              <button type="submit" className="nc-btn nc-btn-primary" disabled={mutation.isPending}>
                <Send size={15} />
                {mutation.isPending ? 'Salvando…' : isEditing ? 'Salvar Alterações' : 'Registrar Ocorrência'}
              </button>
            </div>
          </form>
        </div>

        {/* ═══ SIDEBAR ═══ */}
        <aside className="nc-summary-col">
          <div className="nc-summary-card nc-sticky-card">
            <header className="nc-summary-head">
              <div className="nc-summary-title">
                <Activity size={16} /> Resumo ao vivo
              </div>
              <span className="nc-live-pulse" />
            </header>

            {tipo === 'NAO_CONFORMIDADE' ? (
              <NcRiskMatrix severidade={severidade} probabilidade={probabilidade} />
            ) : (
              <div className="nc-desvio-banner">
                <div className="nc-desvio-banner-icon"><AlertCircle size={20} /></div>
                <div>
                  <div className="nc-desvio-banner-title">Desvio</div>
                  <div className="nc-desvio-banner-sub">Situação pontual — não requer matriz de risco nem plano formal</div>
                </div>
              </div>
            )}

            <div className="nc-summary-facts">
              <div className="nc-summary-fact">
                <span className="nc-summary-fact-label">Tipo</span>
                <span className="nc-summary-fact-value">
                  <span className={`nc-pill ${tipo === 'NAO_CONFORMIDADE' ? 'nc-pill-blue' : 'nc-pill-amber'}`}>
                    {tipo === 'NAO_CONFORMIDADE' ? 'Não Conformidade' : 'Desvio'}
                  </span>
                </span>
              </div>
              <div className="nc-summary-fact">
                <span className="nc-summary-fact-label">Local</span>
                <span className="nc-summary-fact-value" title={estabelecimentoNome}>
                  {estabelecimentoNome || <span style={{ color: 'var(--fg-3)', fontStyle: 'italic' }}>—</span>}
                </span>
              </div>
              {tipo === 'NAO_CONFORMIDADE' && (
                <>
                  <div className="nc-summary-fact">
                    <span className="nc-summary-fact-label">Normas</span>
                    <span className="nc-summary-fact-value" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
                      {normasSelecionadas.length === 0
                        ? <span style={{ color: 'var(--fg-3)', fontStyle: 'italic' }}>nenhuma</span>
                        : normasSelecionadas.slice(0, 2).map(nid => {
                            const n = normas.find(x => x.id === nid)
                            return n ? <span key={nid} className="nc-pill nc-pill-slate">{n.titulo.split(' ').slice(0, 2).join(' ')}</span> : null
                          })
                      }
                      {normasSelecionadas.length > 2 && <span className="nc-pill nc-pill-slate">+{normasSelecionadas.length - 2}</span>}
                    </span>
                  </div>
                  <div className="nc-summary-fact">
                    <span className="nc-summary-fact-label">Reincidência</span>
                    <span className="nc-summary-fact-value">
                      {isReincidencia
                        ? <span className="nc-pill nc-pill-red">Sim</span>
                        : <span style={{ color: 'var(--fg-3)' }}>Não</span>
                      }
                    </span>
                  </div>
                  <div className="nc-summary-fact">
                    <span className="nc-summary-fact-label">Regra de Ouro</span>
                    <span className="nc-summary-fact-value">
                      {isRegraDeOuro
                        ? <span className="nc-pill nc-pill-amber">Sim</span>
                        : <span style={{ color: 'var(--fg-3)' }}>Não</span>
                      }
                    </span>
                  </div>
                  {!isEditing && (
                    <div className="nc-summary-fact">
                      <span className="nc-summary-fact-label">Prazo</span>
                      <span className="nc-summary-fact-value">
                        {dataLimiteStr} <span style={{ color: 'var(--fg-3)', fontSize: 11 }}>· 30 dias</span>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="nc-summary-progress">
              <div className="nc-summary-progress-head">
                <span>Preenchimento</span>
                <span style={{ color: '#79b8ff', fontWeight: 600 }}>{progress}%</span>
              </div>
              <div className="nc-summary-progress-track">
                <div className="nc-summary-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ─── Confirm Modal (creation only) ─── */}
      {!isEditing && (
        <ConfirmModalOcorrencia
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          tipo={tipo}
          titulo={watchAll.titulo || ''}
          estabelecimentoNome={estabelecimentoNome}
          localizacaoNome={localizacaoNome}
          severidade={severidade}
          probabilidade={probabilidade}
          prazoStr={dataLimiteStr}
          dynamicRecipients={dynamicRecipients}
          emailsPadrao={emailsPadrao}
          isPending={mutation.isPending}
          isSuccess={mutation.isSuccess}
          isError={mutation.isError}
          createdId={(mutation.data as { id?: string } | undefined)?.id}
          onConfirm={({ emailsManuais, emailsPadraoExcluidos }) => {
            if (formDataPendente) {
              mutation.mutate({ formData: formDataPendente, emailsManuais, emailsPadraoExcluidos })
            }
          }}
          onNavigate={() => navigate('/ocorrencias')}
        />
      )}

      {buscaModal && (
        <BuscaTrechoModal
          normaId={buscaModal.normaId}
          normaTitulo={buscaModal.normaTitulo}
          onTrechoSelecionado={trecho => setTrechosPendentes(prev => [...prev, trecho])}
          onClose={() => setBuscaModal(null)}
        />
      )}
      {manualModal && (
        <TrechoManualModal
          normaId={manualModal.normaId}
          normaTitulo={manualModal.normaTitulo}
          onSalvar={trecho => setTrechosPendentes(prev => [...prev, trecho])}
          onClose={() => setManualModal(null)}
        />
      )}
    </div>
  )
}
