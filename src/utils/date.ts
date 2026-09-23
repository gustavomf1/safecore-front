const TZ = 'America/Sao_Paulo'

// O backend retorna LocalDateTime sem timezone (ex: "2026-03-26T19:51:14").
// Adicionamos "Z" para forçar interpretação como UTC antes de converter para Brasília.
function parseUTC(dateStr: string): Date {
  return new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  return parseUTC(dateStr).toLocaleDateString('pt-BR', { timeZone: TZ })
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—'
  return parseUTC(dateStr).toLocaleString('pt-BR', { timeZone: TZ })
}

export function formatCnpj(cnpj?: string): string {
  if (!cnpj) return '—'
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14) return cnpj
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

export function formatTelefone(tel?: string): string {
  if (!tel) return '—'
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return tel
}
