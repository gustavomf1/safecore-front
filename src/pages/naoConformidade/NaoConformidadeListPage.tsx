import { useQuery } from '@tanstack/react-query'
import { getNaoConformidades } from '../../api/naoConformidade'
import { Link } from 'react-router-dom'
import { Plus, AlertTriangle, Eye } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../../components/StatusBadge'
import RiscoBadge from '../../components/RiscoBadge'
import { useState } from 'react'
import { StatusNaoConformidade } from '../../types'
import PrazoBar from '../../components/PrazoBar'

export default function NaoConformidadeListPage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState<StatusNaoConformidade | ''>('')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['nao-conformidades', statusFilter],
    queryFn: () => getNaoConformidades(statusFilter ? { status: statusFilter } : undefined),
  })

  const canCreate = user?.perfil === 'ENGENHEIRO' || user?.perfil === 'TECNICO'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Não Conformidades</h2>
          <p className="text-slate-500 text-sm mt-1">{items.length} registros encontrados</p>
        </div>
        {canCreate && (
          <Link to="/nao-conformidades/novo" className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700 transition-colors">
            <Plus size={16} />
            Nova NC
          </Link>
        )}
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {(['', 'ABERTA', 'AGUARDANDO_TRATATIVA', 'AGUARDANDO_APROVACAO_PLANO', 'EM_EXECUCAO', 'CONCLUIDO'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as StatusNaoConformidade | '')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-gray-200 text-slate-600 hover:bg-gray-50'
            }`}
          >
            {s === '' ? 'Todos' : s === 'ABERTA' ? 'Abertas' : s === 'AGUARDANDO_TRATATIVA' ? 'Aguard. Tratativa' : s === 'AGUARDANDO_APROVACAO_PLANO' ? 'Aguard. Aprovação' : s === 'EM_EXECUCAO' ? 'Em Execução' : 'Concluídas'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-slate-400 py-8 text-center">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <AlertTriangle size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Nenhuma não conformidade encontrada</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Estabelecimento</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Descrição</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Severidade</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Prazo</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((nc) => (
                <tr key={nc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-slate-700">{nc.estabelecimentoNome}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{nc.descricao}</td>
                  <td className="px-4 py-3"><RiscoBadge nivel={nc.nivelRisco} /></td>
                  <td className="px-4 py-3"><StatusBadge status={nc.status} type="nc" /></td>
                  <td className="px-4 py-3">
                    <PrazoBar dataLimite={nc.dataLimiteResolucao} vencida={nc.vencida} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/nao-conformidades/${nc.id}`} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-gray-100 rounded inline-flex">
                      <Eye size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
