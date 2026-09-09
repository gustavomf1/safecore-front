import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { buscarConvite, registrarViaConvite } from '../api/convite'
import { Shield, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'

const perfilLabels: Record<string, string> = {
  ENGENHEIRO: 'Engenheiro',
  TECNICO: 'Técnico',
  EXTERNO: 'Externo',
}

function TimeLeft({ expiresAt }: { expiresAt: string }) {
  const expires = new Date(expiresAt)
  const now = new Date()
  const diffMs = expires.getTime() - now.getTime()
  const diffMin = Math.max(0, Math.ceil(diffMs / 60000))
  if (diffMin === 0) return <span className="text-red-500">Expirando agora</span>
  if (diffMin < 5) return <span className="text-orange-500">{diffMin} min restantes</span>
  return <span className="text-green-600">{diffMin} min restantes</span>
}

export default function ConvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nome: '', email: '', senha: '', telefone: '' })
  const [sucesso, setSucesso] = useState(false)

  const { data: convite, isLoading, isError, error } = useQuery({
    queryKey: ['convite', token],
    queryFn: () => buscarConvite(token!),
    retry: false,
  })

  const mutation = useMutation({
    mutationFn: () => registrarViaConvite(token!, {
      nome: form.nome,
      email: form.email,
      senha: form.senha,
      telefone: form.telefone || undefined,
    }),
    onSuccess: () => setSucesso(true),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Validando convite...</div>
      </div>
    )
  }

  if (isError) {
    const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Convite inválido ou expirado'
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={26} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Convite inválido</h2>
          <p className="text-sm text-slate-500 mb-6">{msg}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-slate-700 transition"
          >
            Ir para o login
          </button>
        </div>
      </div>
    )
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={26} className="text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Cadastro realizado!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Seu acesso foi criado com sucesso. Faça login para entrar no sistema.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-slate-700 transition"
          >
            Ir para o login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)' }}>
            <Shield size={22} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">EngSeg — Cadastro</h1>
          <p className="text-sm text-slate-500 mt-0.5">Você foi convidado para acessar o sistema</p>
        </div>

        {/* Invite info */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-between bg-blue-50 mx-4 mt-4 rounded-xl">
          <div className="text-xs text-slate-600">
            <div className="font-semibold text-slate-800">{convite!.empresaNome}</div>
            <div className="text-slate-500">Perfil: {perfilLabels[convite!.perfil] ?? convite!.perfil}</div>
          </div>
          <div className="text-xs flex items-center gap-1">
            <Clock size={12} className="text-slate-400" />
            <TimeLeft expiresAt={convite!.expiresAt} />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nome completo *</label>
            <input
              required
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Seu nome"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Senha *</label>
            <input
              required
              type="password"
              value={form.senha}
              onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Crie uma senha"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Telefone</label>
            <input
              value={form.telefone}
              onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(00) 00000-0000"
            />
          </div>

          {mutation.isError && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-red-600 text-xs">
              {(mutation.error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message ?? 'Erro ao realizar cadastro'}
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-700 disabled:opacity-60 transition mt-2"
          >
            {mutation.isPending ? 'Cadastrando...' : 'Criar minha conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
