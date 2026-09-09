import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Info,
  Save,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react'
import { createNorma, getNorma, updateNorma } from '../../api/norma'
import { ChecklistItem } from './NormasCommon'
import { countChars, formatAuditShort, formatCount } from './normasHelpers'
import '../../styles/normas.css'

const schema = z.object({
  titulo: z.string().trim().min(1, 'Título obrigatório').max(120, 'Máximo de 120 caracteres'),
  descricao: z.string().max(300, 'Máximo de 300 caracteres').optional(),
})

type FormData = z.infer<typeof schema>

const TITULO_MAX = 120
const DESC_MAX = 300

export default function NormaFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!id
  const [conteudo, setConteudo] = useState('')

  const { data: item, isLoading } = useQuery({
    queryKey: ['norma', id],
    queryFn: () => getNorma(id!),
    enabled: isEditing,
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { titulo: '', descricao: '' },
  })

  useEffect(() => {
    if (item) {
      reset({ titulo: item.titulo, descricao: item.descricao || '' })
      setConteudo(item.conteudo || '')
    }
  }, [item, reset])

  const titulo = watch('titulo') || ''
  const descricao = watch('descricao') || ''
  const textoChars = countChars(conteudo)
  const valid = titulo.trim().length > 0

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEditing
        ? updateNorma(id!, { titulo: data.titulo.trim(), descricao: data.descricao?.trim(), conteudo })
        : createNorma({ titulo: data.titulo.trim(), descricao: data.descricao?.trim(), conteudo }),
    onSuccess: saved => {
      queryClient.invalidateQueries({ queryKey: ['normas'] })
      queryClient.invalidateQueries({ queryKey: ['norma', saved.id] })
      navigate(`/normas/${saved.id}`)
    },
  })

  function handleCancel() {
    navigate(isEditing && id ? `/normas/${id}` : '/normas')
  }

  function handleAutoFormat() {
    setConteudo(current =>
      current
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    )
  }

  return (
    <div className="nm-screen">
      <div className="nm-page" style={{ maxWidth: 1180 }}>
        <div className="nm-pageheader">
          <button className="nm-pageheader-back" onClick={handleCancel} title="Voltar">
            <ArrowLeft size={16} />
          </button>
          <div className="nm-pageheader-icon">
            <BookOpen size={22} />
          </div>
          <div className="nm-pageheader-text">
            <h1 className="nm-pageheader-title">
              {isEditing ? 'Editar norma' : 'Nova Norma'}
            </h1>
            <p className="nm-pageheader-sub">
              {isEditing
                ? 'Atualize as informações da norma. Mudanças não removem vínculos já registrados.'
                : 'Cadastre uma norma para vincular a ocorrências e não conformidades.'}
            </p>
          </div>
        </div>

        {isEditing && isLoading ? (
          <div className="nm-card">
            <div className="nm-empty">
              <div className="nm-empty-icon"><BookOpen size={22} /></div>
              <div className="nm-empty-title">Carregando norma</div>
            </div>
          </div>
        ) : (
          <form className="nm-form-grid" onSubmit={handleSubmit(data => mutation.mutate(data))}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <section className="nm-card">
                <div className="nm-card-head">
                  <div>
                    <div className="nm-card-title">
                      <span className="nm-section-num">1</span>
                      Identificação
                    </div>
                    <div className="nm-card-sub">Como esta norma aparece nas listagens e seleções de ocorrência.</div>
                  </div>
                </div>
                <div className="nm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="nm-field">
                    <label className="nm-label" style={{ justifyContent: 'space-between', width: '100%' }}>
                      <span>Título <span className="nm-required">*</span></span>
                      <span className="nm-counter">{titulo.length}/{TITULO_MAX}</span>
                    </label>
                    <input
                      className="nm-input"
                      placeholder="Ex: Segurança no Trabalho em Máquinas e Equipamentos"
                      maxLength={TITULO_MAX}
                      {...register('titulo')}
                    />
                    {errors.titulo && <span className="nm-error">{errors.titulo.message}</span>}
                  </div>

                  <div className="nm-field">
                    <label className="nm-label" style={{ justifyContent: 'space-between', width: '100%' }}>
                      <span>Descrição / Resumo</span>
                      <span className="nm-counter">{descricao.length}/{DESC_MAX}</span>
                    </label>
                    <textarea
                      className="nm-input nm-textarea"
                      placeholder="Resumo executivo da norma. 1-2 frases sobre o objetivo e escopo."
                      maxLength={DESC_MAX}
                      {...register('descricao')}
                    />
                    {errors.descricao && <span className="nm-error">{errors.descricao.message}</span>}
                  </div>
                </div>
              </section>

              <section className="nm-card">
                <div className="nm-card-head">
                  <div>
                    <div className="nm-card-title">
                      <span className="nm-section-num">2</span>
                      Texto completo
                    </div>
                    <div className="nm-card-sub">
                      Conteúdo integral usado na busca de trechos aplicáveis em NCs.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="nm-btn nm-btn-soft nm-btn-sm" type="button" onClick={handleAutoFormat}>
                      <Wand2 size={12} />
                      Auto-formatar
                    </button>
                  </div>
                </div>
                <div className="nm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <textarea
                    className="nm-input nm-textarea mono"
                    placeholder={`Cole aqui o texto completo da norma...\n\nDica: preserve a numeração das seções para facilitar citações em ocorrências.`}
                    value={conteudo}
                    onChange={event => setConteudo(event.target.value)}
                  />
                  <div className="nm-textarea-foot">
                    <span>
                      {textoChars > 0 ? (
                        <>
                          <CheckCircle2 size={12} style={{ color: 'var(--green)' }} />
                          <span>{formatCount(textoChars)} caracteres · aprox. {Math.max(1, Math.ceil(textoChars / 1500))} página(s)</span>
                        </>
                      ) : (
                        <>
                          <Info size={12} />
                          <span>Opcional. O conteúdo pode ser adicionado ou editado depois.</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </section>

              {mutation.isError && (
                <div className="nm-error-panel">
                  <AlertCircle size={15} />
                  Erro ao salvar a norma. Verifique os dados e tente novamente.
                </div>
              )}

              <div className="nm-form-foot">
                <div className="nm-form-foot-status">
                  {valid ? (
                    <>
                      <CheckCircle2 size={14} style={{ color: 'var(--green)' }} />
                      <span>Pronto para salvar.</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} style={{ color: 'var(--amber)' }} />
                      <span>Preencha o título para continuar.</span>
                    </>
                  )}
                </div>
                <div className="nm-form-foot-actions">
                  <button className="nm-btn nm-btn-ghost" type="button" onClick={handleCancel}>
                    <X size={14} />
                    Cancelar
                  </button>
                  <button className="nm-btn nm-btn-primary" type="submit" disabled={!valid || mutation.isPending}>
                    <Save size={14} />
                    {mutation.isPending ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar norma'}
                  </button>
                </div>
              </div>
            </div>

            <aside className="nm-sticky-side">
              <div className="nm-tip">
                <div className="nm-tip-icon"><Sparkles size={14} /></div>
                <div>
                  <div className="nm-tip-title">Busca semântica por IA</div>
                  <div>
                    Quando o <strong>texto completo</strong> é informado, o sistema pode encontrar trechos aplicáveis a partir da descrição de uma NC.
                  </div>
                </div>
              </div>

              <div className="nm-side-card">
                <div className="nm-side-card-head">Checklist</div>
                <div className="nm-side-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ChecklistItem done={titulo.trim().length > 0} label="Título preenchido" />
                  <ChecklistItem done={descricao.trim().length > 0} label="Resumo executivo" optional />
                  <ChecklistItem done={textoChars > 0} label="Texto completo colado" optional />
                </div>
              </div>

              {isEditing && item && (
                <div className="nm-side-card">
                  <div className="nm-side-card-head">Auditoria</div>
                  <div className="nm-side-card-body nm-audit-compact">
                    <div><span>Criada em:</span> {formatAuditShort(item.criadoEm)}</div>
                    <div><span>Criada por:</span> {item.criadoPorNome || '—'}</div>
                    <div><span>Última edição:</span> {formatAuditShort(item.atualizadoEm)}</div>
                    <div><span>Editada por:</span> {item.atualizadoPorNome || '—'}</div>
                  </div>
                </div>
              )}
            </aside>
          </form>
        )}
      </div>
    </div>
  )
}
