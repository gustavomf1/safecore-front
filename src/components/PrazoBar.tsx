interface PrazoBarProps {
  dataLimite?: string | null
  vencida?: boolean
}

export default function PrazoBar({ dataLimite, vencida }: PrazoBarProps) {
  if (!dataLimite) {
    return (
      <div className="flex flex-col gap-1 min-w-[100px]">
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden" />
        <span className="text-xs font-medium text-slate-400">Aguardando tratativa</span>
      </div>
    )
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const limite = new Date(dataLimite + 'T00:00:00')
  const TOTAL_DIAS = 30
  const msRestantes = limite.getTime() - hoje.getTime()
  const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24))
  const progresso = Math.min(100, Math.max(0, ((TOTAL_DIAS - diasRestantes) / TOTAL_DIAS) * 100))

  let corBarra: string
  let corTexto: string
  if (progresso < 50) {
    corBarra = 'bg-green-500'
    corTexto = 'text-green-700'
  } else if (progresso < 75) {
    corBarra = 'bg-yellow-400'
    corTexto = 'text-yellow-700'
  } else if (progresso < 90) {
    corBarra = 'bg-orange-500'
    corTexto = 'text-orange-700'
  } else {
    corBarra = 'bg-red-500'
    corTexto = 'text-red-700'
  }

  const label = vencida
    ? 'Vencida'
    : diasRestantes <= 0
    ? 'Hoje'
    : diasRestantes === 1
    ? '1 dia'
    : `${diasRestantes} dias`

  return (
    <div className="flex flex-col gap-1 min-w-[100px]">
      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${corBarra}`}
          style={{ width: `${progresso}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${vencida || diasRestantes <= 0 ? 'text-red-600' : corTexto}`}>
        {label}
      </span>
    </div>
  )
}
