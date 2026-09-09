import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats } from '../api/dashboard'
import { getOcorrencias, OcorrenciaItem } from '../api/ocorrencia'
import { getEmpresas } from '../api/empresa'
import { getEstabelecimentos, getEmpresasDoEstabelecimento } from '../api/estabelecimento'
import { useAuth } from '../contexts/AuthContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { TrendingUp, AlertTriangle, ClipboardList, Shield, FilePlus, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { formatDate } from '../utils/date'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'

// ─── helpers ────────────────────────────────────────────────────────────────

function groupByMonth(ocorrencias: OcorrenciaItem[]) {
  const counts: Record<string, { desvios: number; ncs: number }> = {}
  ocorrencias.forEach(o => {
    const d = new Date(o.dataRegistro)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!counts[key]) counts[key] = { desvios: 0, ncs: 0 }
    if (o.tipo === 'DESVIO') counts[key].desvios++
    else counts[key].ncs++
  })
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([key, v]) => {
      const [year, month] = key.split('-')
      const label = new Date(Number(year), Number(month) - 1).toLocaleString('pt-BR', { month: 'short' })
      return { mes: label.replace('.', ''), ...v, total: v.desvios + v.ncs }
    })
}

function groupByEstabelecimento(ocorrencias: OcorrenciaItem[]) {
  const counts: Record<string, { ncs: number; desvios: number }> = {}
  ocorrencias.forEach(o => {
    const nome = o.estabelecimentoNome ?? 'Desconhecido'
    if (!counts[nome]) counts[nome] = { ncs: 0, desvios: 0 }
    if (o.tipo === 'NAO_CONFORMIDADE') counts[nome].ncs++
    else counts[nome].desvios++
  })
  return Object.entries(counts)
    .map(([nome, v]) => ({ nome, ...v, total: v.ncs + v.desvios }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
}

function groupByEmpresaContratada(ocorrencias: OcorrenciaItem[]) {
  const counts: Record<string, { ncs: number; desvios: number }> = {}
  ocorrencias
    .filter(o => !!o.empresaContratadaNome)
    .forEach(o => {
      const nome = o.empresaContratadaNome!
      if (!counts[nome]) counts[nome] = { ncs: 0, desvios: 0 }
      if (o.tipo === 'NAO_CONFORMIDADE') counts[nome].ncs++
      else counts[nome].desvios++
    })
  return Object.entries(counts)
    .map(([nome, v]) => ({ nome, ...v, total: v.ncs + v.desvios }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
}

function groupBySeveridade(ocorrencias: OcorrenciaItem[]) {
  const counts: Record<string, number> = {}
  ocorrencias
    .filter(o => o.tipo === 'NAO_CONFORMIDADE' && o.nivelRisco)
    .forEach(o => {
      const s = o.nivelRisco!
      counts[s] = (counts[s] ?? 0) + 1
    })
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

const STATUS_ORDER = [
  'ABERTA', 'AGUARDANDO_TRATATIVA', 'AGUARDANDO_APROVACAO_PLANO',
  'EM_AJUSTE_PELO_EXTERNO', 'EM_EXECUCAO', 'AGUARDANDO_VALIDACAO_FINAL',
  'CONCLUIDO', 'EM_TRATAMENTO', 'NAO_RESOLVIDA',
]
const STATUS_LABEL: Record<string, string> = {
  ABERTA:                      'Aberta',
  AGUARDANDO_TRATATIVA:        'Aguard. Tratativa',
  AGUARDANDO_APROVACAO_PLANO:  'Aguard. Aprovação',
  EM_AJUSTE_PELO_EXTERNO:      'Em Ajuste (Externo)',
  EM_EXECUCAO:                 'Em Execução',
  AGUARDANDO_VALIDACAO_FINAL:  'Aguard. Validação',
  CONCLUIDO:                   'Concluído',
  EM_TRATAMENTO:               'Em Tratamento',
  NAO_RESOLVIDA:               'Não Resolvida',
}
const FUNIL_COLORS: Record<string, string> = {
  'Aberta':               '#d29922',
  'Aguard. Tratativa':    '#f0883e',
  'Aguard. Aprovação':    '#58a6ff',
  'Em Ajuste (Externo)':  '#8b949e',
  'Em Execução':          '#388bfd',
  'Aguard. Validação':    '#a371f7',
  'Concluído':            '#3fb950',
  'Em Tratamento':        '#58a6ff',
  'Não Resolvida':        '#f85149',
}

function groupByStatusFunil(ocorrencias: OcorrenciaItem[]) {
  const counts: Record<string, number> = {}
  ocorrencias
    .filter(o => o.tipo === 'NAO_CONFORMIDADE')
    .forEach(o => { counts[o.status] = (counts[o.status] ?? 0) + 1 })
  return STATUS_ORDER
    .filter(s => (counts[s] ?? 0) > 0)
    .map(s => ({ status: STATUS_LABEL[s] ?? s, value: counts[s] ?? 0 }))
}

function groupByResponsavel(ocorrencias: OcorrenciaItem[]) {
  const pending = new Set([
    'ABERTA', 'AGUARDANDO_TRATATIVA', 'AGUARDANDO_APROVACAO_PLANO',
    'EM_AJUSTE_PELO_EXTERNO', 'EM_EXECUCAO', 'AGUARDANDO_VALIDACAO_FINAL', 'EM_TRATAMENTO',
  ])
  const counts: Record<string, { abertas: number; emAndamento: number }> = {}
  ocorrencias
    .filter(o => o.tipo === 'NAO_CONFORMIDADE' && !!o.responsavelNcNome && pending.has(o.status))
    .forEach(o => {
      const nome = o.responsavelNcNome!
      if (!counts[nome]) counts[nome] = { abertas: 0, emAndamento: 0 }
      if (o.status === 'ABERTA') counts[nome].abertas++
      else counts[nome].emAndamento++
    })
  return Object.entries(counts)
    .map(([nome, v]) => ({ nome, ...v, total: v.abertas + v.emAndamento }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
}

function groupReincidenciaByMonth(ocorrencias: OcorrenciaItem[]) {
  const counts: Record<string, { novas: number; reincidentes: number }> = {}
  ocorrencias
    .filter(o => o.tipo === 'NAO_CONFORMIDADE')
    .forEach(o => {
      const d = new Date(o.dataRegistro)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!counts[key]) counts[key] = { novas: 0, reincidentes: 0 }
      if (o.reincidencia) counts[key].reincidentes++
      else counts[key].novas++
    })
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([key, v]) => {
      const [year, month] = key.split('-')
      const label = new Date(Number(year), Number(month) - 1).toLocaleString('pt-BR', { month: 'short' })
      return { mes: label.replace('.', ''), ...v }
    })
}

const SEVERITY_COLOR: Record<string, string> = {
  BAIXO:    '#3fb950',
  MODERADO: '#d29922',
  ALTO:     '#f85149',
  CRITICO:  '#ff7b72',
}

// ─── custom tooltip ──────────────────────────────────────────────────────────
interface ChartTooltipProps {
  active?: boolean
  payload?: { name: string; value: number; fill?: string; color?: string }[]
  label?: string | number
}

const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-[var(--bg-elevated)] border border-gray-200 dark:border-[var(--border-main)] rounded-lg px-3 py-2 shadow-md text-xs">
      {label && <div className="font-semibold text-slate-700 mb-1">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill ?? p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-800">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── component ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { empresaFilha } = useWorkspace()
  const isAdmin = user?.isAdmin === true
  const [adminEmpresaId, setAdminEmpresaId] = useState('')
  const [adminEstabelecimentoId, setAdminEstabelecimentoId] = useState('')
  const [adminEmpresaContratadaId, setAdminEmpresaContratadaId] = useState('')

  const { data: empresasAdmin = [] } = useQuery({
    queryKey: ['empresas-admin-filter'],
    queryFn: () => getEmpresas(),
    enabled: isAdmin,
  })

  const { data: estabelecimentosAdmin = [] } = useQuery({
    queryKey: ['estabelecimentos-admin-filter', adminEmpresaId],
    queryFn: () => getEstabelecimentos(undefined, adminEmpresaId),
    enabled: isAdmin && !!adminEmpresaId,
  })

  const { data: empresasContratadas = [] } = useQuery({
    queryKey: ['empresas-contratadas-filter', adminEstabelecimentoId],
    queryFn: () => getEmpresasDoEstabelecimento(adminEstabelecimentoId),
    enabled: isAdmin && !!adminEstabelecimentoId,
  })

  const { data: stats } = useQuery({
    queryKey: ['dashboard', adminEmpresaId, adminEstabelecimentoId, adminEmpresaContratadaId],
    queryFn: () => getDashboardStats(isAdmin
      ? { empresaId: adminEmpresaId || undefined, estabelecimentoId: adminEstabelecimentoId || undefined, empresaContratadaId: adminEmpresaContratadaId || undefined }
      : { empresaContratadaId: empresaFilha?.id || undefined }),
  })
  const { data: ocorrencias = [] } = useQuery({
    queryKey: ['ocorrencias', adminEmpresaId, adminEstabelecimentoId, adminEmpresaContratadaId],
    queryFn: () => getOcorrencias(isAdmin
      ? { empresaId: adminEmpresaId || undefined, estabelecimentoId: adminEstabelecimentoId || undefined, empresaContratadaId: adminEmpresaContratadaId || undefined }
      : { empresaContratadaId: empresaFilha?.id || undefined }),
  })

  const recentes = ocorrencias.filter(item => {
    if (user?.perfil === 'ENGENHEIRO') {
      if (item.tipo === 'NAO_CONFORMIDADE') return item.responsavelNcId === user.id
      return item.usuarioCriacaoEmail === user.email
    }
    if (user?.perfil === 'TECNICO') {
      return item.usuarioCriacaoEmail === user.email || item.responsavelNcId === user.id
    }
    return true
  }).slice(0, 5)

  const totalNCs      = stats?.totalNaoConformidades ?? 0
  const ncAbertas     = stats?.ncAbertas ?? 0
  const ncConcluidas  = stats?.ncConcluidas ?? 0
  const ncVencidas    = ocorrencias.filter(o => o.tipo === 'NAO_CONFORMIDADE' && o.vencida).length
  const ncPendentes   = ocorrencias.filter(o =>
    o.tipo === 'NAO_CONFORMIDADE' &&
    (o.status === 'AGUARDANDO_APROVACAO_PLANO' || o.status === 'AGUARDANDO_VALIDACAO_FINAL')
  ).length

  const taxaResolucao = totalNCs > 0 ? Math.round((ncConcluidas / totalNCs) * 100) : 0

  const statusPieData = [
    { name: 'Abertas',    value: ncAbertas,    color: '#d29922' },
    { name: 'Concluídas', value: ncConcluidas, color: '#3fb950' },
    { name: 'Vencidas',   value: ncVencidas,   color: '#f85149' },
    { name: 'Pendentes',  value: ncPendentes,  color: '#58a6ff' },
  ].filter(d => d.value > 0)

  const monthData           = groupByMonth(ocorrencias)
  const severidadeData      = groupBySeveridade(ocorrencias)
  const estabelecimentoData = groupByEstabelecimento(ocorrencias)
  const contratadaData      = groupByEmpresaContratada(ocorrencias)
  const funnelData          = groupByStatusFunil(ocorrencias)
  const rankingData         = groupByResponsavel(ocorrencias)
  const reincidenciaData    = groupReincidenciaByMonth(ocorrencias)

  return (
    <div className="space-y-6 max-w-full">

      {/* ── Admin filters ── */}
      {isAdmin && (
        <div className="filter-bar">
          <select
            className="select-std"
            value={adminEmpresaId}
            onChange={e => { setAdminEmpresaId(e.target.value); setAdminEstabelecimentoId('') }}
          >
            <option value="">Todas as empresas</option>
            {empresasAdmin.map(e => (
              <option key={e.id} value={e.id}>{e.nomeFantasia || e.razaoSocial}</option>
            ))}
          </select>
          <select
            className="select-std disabled:opacity-40 disabled:cursor-not-allowed"
            value={adminEstabelecimentoId}
            disabled={!adminEmpresaId}
            onChange={e => { setAdminEstabelecimentoId(e.target.value); setAdminEmpresaContratadaId('') }}
          >
            <option value="">Todos os estabelecimentos</option>
            {estabelecimentosAdmin.map(e => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
          <select
            className="select-std disabled:opacity-40 disabled:cursor-not-allowed"
            value={adminEmpresaContratadaId}
            disabled={!adminEstabelecimentoId}
            onChange={e => setAdminEmpresaContratadaId(e.target.value)}
          >
            <option value="">Todas as contratadas</option>
            {(empresasContratadas as Array<{ id: string; razaoSocial: string }>).map(e => (
              <option key={e.id} value={e.id}>{e.razaoSocial}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total de Ocorrências',
            value: stats?.totalOcorrencias ?? 0,
            sub: `${stats?.totalDesvios ?? 0} desvios · ${totalNCs} NCs`,
            icon: TrendingUp,
            bg: 'bg-blue-50', iconColor: 'text-blue-500',
          },
          {
            label: 'NCs Abertas',
            value: ncAbertas,
            sub: `${ncPendentes} aguardando ação`,
            icon: AlertTriangle,
            bg: 'bg-yellow-50', iconColor: 'text-yellow-500',
          },
          {
            label: 'NCs Concluídas',
            value: ncConcluidas,
            sub: `Taxa de resolução: ${taxaResolucao}%`,
            icon: CheckCircle2,
            bg: 'bg-green-50', iconColor: 'text-green-500',
          },
          {
            label: 'NCs Vencidas',
            value: ncVencidas,
            sub: `${stats?.totalRegraDeOuro ?? 0} regras de ouro`,
            icon: XCircle,
            bg: 'bg-red-50', iconColor: 'text-red-400',
          },
        ].map(({ label, value, sub, icon: Icon, bg, iconColor }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs text-slate-500 mb-1 leading-tight">{label}</div>
              <div className="text-3xl font-bold text-slate-800 leading-none mb-1">{value}</div>
              <div className="text-xs text-slate-400 leading-tight">{sub}</div>
            </div>
            <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon size={20} className={iconColor} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Donut — status NCs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Status das NCs</h3>
          <p className="text-xs text-slate-400 mb-4">Distribuição por situação atual</p>
          {statusPieData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%" cy="50%"
                    innerRadius={48} outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                {statusPieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="truncate">{d.name}</span>
                    <span className="ml-auto font-semibold text-slate-700">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bar — ocorrências por mês */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Ocorrências por Mês</h3>
          <p className="text-xs text-slate-400 mb-4">Últimos 7 meses · desvios e NCs</p>
          {monthData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthData} barSize={12} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="desvios" name="Desvios"  fill="#d29922" radius={[4,4,0,0]} />
                <Bar dataKey="ncs"     name="NCs"      fill="#f85149" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Funil de Status + Reincidências ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Funil de status das NCs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Funil de Status das NCs</h3>
          <p className="text-xs text-slate-400 mb-4">Quantas NCs em cada etapa do fluxo</p>
          {funnelData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
          ) : (
            <div className="space-y-3 mt-2">
              {funnelData.map(({ status, value }) => {
                const max = Math.max(...funnelData.map(d => d.value), 1)
                const pct = Math.round((value / max) * 100)
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">{status}</span>
                      <span className="font-semibold text-slate-700">{value}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: FUNIL_COLORS[status] ?? '#58a6ff' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Reincidências por mês */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Reincidências por Mês</h3>
          <p className="text-xs text-slate-400 mb-4">NCs novas vs. reincidentes · últimos 7 meses</p>
          {reincidenciaData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={reincidenciaData} barSize={12} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="novas"       name="Novas"       fill="#58a6ff" radius={[4,4,0,0]} />
                <Bar dataKey="reincidentes" name="Reincidentes" fill="#f85149" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Ranking por Responsável ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Responsáveis com Mais NCs Pendentes</h3>
        <p className="text-xs text-slate-400 mb-4">Top 8 por volume de NCs abertas ou em andamento</p>
        {rankingData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, rankingData.length * 40)}>
            <BarChart
              data={rankingData}
              layout="vertical"
              barSize={10}
              barGap={3}
              margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="nome"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={160}
                tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 20) + '…' : v}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="abertas"    name="Abertas"     fill="#d29922" radius={[0,4,4,0]} />
              <Bar dataKey="emAndamento" name="Em Andamento" fill="#58a6ff" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Ocorrências por Estabelecimento ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Ocorrências por Estabelecimento</h3>
        <p className="text-xs text-slate-400 mb-4">NCs e desvios agrupados por local · top 8</p>
        {estabelecimentoData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, estabelecimentoData.length * 36)}>
            <BarChart
              data={estabelecimentoData}
              layout="vertical"
              barSize={10}
              barGap={3}
              margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="nome"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={140}
                tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 18) + '…' : v}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="ncs"     name="NCs"     fill="#f85149" radius={[0,4,4,0]} />
              <Bar dataKey="desvios" name="Desvios" fill="#d29922" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Ocorrências por Empresa Contratada ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Ocorrências por Empresa Contratada</h3>
        <p className="text-xs text-slate-400 mb-4">NCs e desvios agrupados por contratada · top 8</p>
        {contratadaData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, contratadaData.length * 36)}>
            <BarChart
              data={contratadaData}
              layout="vertical"
              barSize={10}
              barGap={3}
              margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="nome"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={140}
                tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 18) + '…' : v}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="ncs"     name="NCs"     fill="#f85149" radius={[0,4,4,0]} />
              <Bar dataKey="desvios" name="Desvios" fill="#d29922" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Second row: severidade + taxa + ações rápidas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Severidade */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">NCs por Severidade</h3>
          <p className="text-xs text-slate-400 mb-4">Apenas não conformidades</p>
          {severidadeData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
          ) : (
            <div className="space-y-3 mt-2">
              {severidadeData
                .sort((a, b) => b.value - a.value)
                .map(({ name, value }) => {
                  const pct = totalNCs > 0 ? Math.round((value / totalNCs) * 100) : 0
                  const color = SEVERITY_COLOR[name] ?? '#94a3b8'
                  const label: Record<string, string> = { BAIXO: 'Baixo', MEDIO: 'Médio', ALTO: 'Alto', CRITICO: 'Crítico' }
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 font-medium">{label[name] ?? name}</span>
                        <span className="text-slate-400">{value} · {pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Taxa de resolução + Regra de Ouro */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Taxa de Resolução</h3>
              <span className="text-2xl font-bold text-slate-800">{taxaResolucao}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${taxaResolucao}%`, background: taxaResolucao >= 70 ? '#3fb950' : taxaResolucao >= 40 ? '#d29922' : '#f85149' }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{ncConcluidas} de {totalNCs} NCs concluídas</p>
          </div>

          <div className="bg-red-50 rounded-xl border border-red-100 p-5 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <Shield size={20} className="text-red-500" />
            </div>
            <div>
              <div className="text-xs text-red-400 font-medium">Regra de Ouro</div>
              <div className="text-2xl font-bold text-red-600">{stats?.totalRegraDeOuro ?? 0}</div>
              <div className="text-xs text-red-400">ocorrências críticas</div>
            </div>
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate('/ocorrencias/nova')}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-slate-300 transition text-left flex-1"
          >
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <FilePlus size={20} className="text-blue-500" />
            </div>
            <div>
              <div className="font-semibold text-slate-800 text-sm">Nova Ocorrência</div>
              <div className="text-xs text-slate-500">Registre desvios ou NCs</div>
            </div>
          </button>
          <button
            onClick={() => navigate('/tratativas')}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-slate-300 transition text-left flex-1"
          >
            <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ClipboardList size={20} className="text-slate-500" />
            </div>
            <div>
              <div className="font-semibold text-slate-800 text-sm">Ver Tratativas</div>
              <div className="text-xs text-slate-500">Planos de ação e evidências</div>
            </div>
          </button>
        </div>
      </div>

      {/* ── Ocorrências Recentes ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-700">Ocorrências Recentes</h2>
          <button
            onClick={() => navigate('/tratativas')}
            className="text-sm text-slate-500 border border-gray-200 px-3 py-1 rounded-lg hover:bg-gray-50"
          >
            Ver Todas
          </button>
        </div>
        <div className="space-y-2">
          {recentes.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-slate-400 text-sm">
              Nenhuma ocorrência registrada
            </div>
          )}
          {recentes.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm cursor-pointer hover:border-slate-300 transition"
              onClick={() => navigate(`/tratativas/${item.tipo}/${item.id}`)}
            >
              <AlertTriangle size={18} className={`flex-shrink-0 ${item.tipo === 'DESVIO' ? 'text-yellow-400' : 'text-red-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.tipo === 'DESVIO' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {item.tipo === 'DESVIO' ? 'Desvio' : 'NC'}
                  </span>
                  {item.regraDeOuro && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                      <Shield size={10} /> Regra de Ouro
                    </span>
                  )}
                  {item.vencida && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Vencida</span>
                  )}
                </div>
                <div className="font-medium text-slate-800 text-sm truncate">{item.titulo}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock size={10} />
                  {item.localizacao ? `${item.localizacao} · ` : ''}{formatDate(item.dataRegistro)}
                </div>
              </div>
              <span className="text-xs text-slate-400 hidden sm:block">Ver →</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
