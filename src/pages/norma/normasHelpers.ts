import { Norma, NaoConformidade } from '../../types'
import { formatDate, formatDateTime } from '../../utils/date'

export function normaStatus(norma: Pick<Norma, 'ativo'>) {
  return norma.ativo ? 'ativo' : 'inativo'
}

export function formatAuditDate(value?: string) {
  return value ? formatDateTime(value) : '—'
}

export function formatAuditShort(value?: string) {
  return value ? formatDate(value) : '—'
}

export function firstName(value?: string) {
  return value?.split(/\s+/)[0] || '—'
}

export function hasConteudo(norma?: Pick<Norma, 'conteudo'>) {
  return !!norma?.conteudo?.trim()
}

export function countChars(value?: string) {
  return value?.length ?? 0
}

export function formatCount(value?: number) {
  return (value ?? 0).toLocaleString('pt-BR')
}

export function normalizeTextFileName(title: string) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'norma'
}

export function statusNcMeta(status: NaoConformidade['status']) {
  const map: Record<string, { label: string; pill: string }> = {
    ABERTA: { label: 'Aberta', pill: 'nm-pill-amber' },
    AGUARDANDO_TRATATIVA: { label: 'Aguard. Tratativa', pill: 'nm-pill-blue' },
    AGUARDANDO_APROVACAO_PLANO: { label: 'Aguard. Aprovação', pill: 'nm-pill-blue' },
    EM_AJUSTE_PELO_EXTERNO: { label: 'Reprovado', pill: 'nm-pill-red' },
    EM_EXECUCAO: { label: 'Em Execução', pill: 'nm-pill-purple' },
    AGUARDANDO_VALIDACAO_FINAL: { label: 'Aguard. Validação', pill: 'nm-pill-blue' },
    CONCLUIDO: { label: 'Concluído', pill: 'nm-pill-green' },
    EM_TRATAMENTO: { label: 'Em Tratamento', pill: 'nm-pill-blue' },
    NAO_RESOLVIDA: { label: 'Não Resolvida', pill: 'nm-pill-red' },
  }
  return map[status] ?? { label: status, pill: 'nm-pill-slate' }
}

export function riscoMeta(risco?: NaoConformidade['nivelRisco']) {
  const map: Record<string, { label: string; tone: 'green' | 'amber' | 'red'; pill: string }> = {
    BAIXO: { label: 'Baixo', tone: 'green', pill: 'nm-pill-green' },
    MODERADO: { label: 'Moderado', tone: 'amber', pill: 'nm-pill-amber' },
    ALTO: { label: 'Alto', tone: 'red', pill: 'nm-pill-red' },
    CRITICO: { label: 'Crítico', tone: 'red', pill: 'nm-pill-red' },
  }
  return risco ? map[risco] ?? { label: risco, tone: 'amber', pill: 'nm-pill-amber' } : null
}
