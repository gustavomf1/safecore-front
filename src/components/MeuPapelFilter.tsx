import { UserCheck } from 'lucide-react'
import { PAPEL_OPTIONS, TipoFiltro } from './papelOptions'

interface Props {
  filtroTipo: TipoFiltro
  meuPapel: string | null
  onChange: (value: string | null) => void
}

export default function MeuPapelFilter({ filtroTipo, meuPapel, onChange }: Props) {
  const options = PAPEL_OPTIONS.filter(o => o.tipos.includes(filtroTipo))

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide pr-1">
        <UserCheck size={14} className="text-gray-400" />
        Meu papel
      </span>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
          meuPapel === null ? 'bg-slate-800 text-white' : 'text-slate-600 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        Todos
      </button>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            meuPapel === o.value ? 'bg-slate-800 text-white' : 'text-slate-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
