import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { login as loginApi } from '../api/auth'
import Shield3D from '../components/Shield3D'

const accent = '#0ea5e9'

function CornerTicks({ color }: { color: string }) {
  const len = 24
  const pos = 24
  const base: React.CSSProperties = { position: 'absolute', background: color }
  return (
    <>
      <div style={{ ...base, top: pos, left: pos, width: len, height: 1 }} />
      <div style={{ ...base, top: pos, left: pos, width: 1, height: len }} />
      <div style={{ ...base, top: pos, right: pos, width: len, height: 1 }} />
      <div style={{ ...base, top: pos, right: pos, width: 1, height: len }} />
      <div style={{ ...base, bottom: pos, left: pos, width: len, height: 1 }} />
      <div style={{ ...base, bottom: pos, left: pos, width: 1, height: len }} />
      <div style={{ ...base, bottom: pos, right: pos, width: len, height: 1 }} />
      <div style={{ ...base, bottom: pos, right: pos, width: 1, height: len }} />
    </>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [focused, setFocused] = useState<'email' | 'senha' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dark = theme === 'dark'
  const bg = dark ? '#0a0e1a' : '#f1f5f9'
  const cardBg = dark ? '#11182c' : '#ffffff'
  const gridColor = dark ? 'rgba(14,165,233,0.06)' : 'rgba(14,165,233,0.1)'
  const tickColor = dark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.2)'
  const textMain = dark ? 'text-white' : 'text-slate-900'
  const textDim = dark ? 'text-white/50' : 'text-slate-500'
  const labelColor = dark ? 'text-white/60' : 'text-slate-500'
  const inputBg = dark ? 'rgba(255,255,255,0.05)' : '#f8fafc'
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'
  const inputText = dark ? 'text-white placeholder:text-white/30' : 'text-slate-900 placeholder:text-slate-400'
  const footerColor = dark ? 'text-white/40' : 'text-slate-400'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await loginApi({ email, senha })
      login(res.id, res.token, res.refreshToken, res.nome, res.email, res.perfil, res.isAdmin)
      navigate(res.perfil === 'EXTERNO' ? '/tratativas' : res.isAdmin ? '/empresas' : '/selecionar')
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Email ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="w-full min-h-screen flex items-center justify-center p-4 lg:p-10 relative overflow-hidden"
      style={{ background: bg }}
    >
      {/* blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* corner ticks */}
      <CornerTicks color={tickColor} />

      {/* theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 z-20 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition"
        style={{
          background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
          borderColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)',
          color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.5)',
        }}
      >
        <span>{dark ? '☀' : '☾'}</span>
        <span>{dark ? 'Light' : 'Dark'}</span>
      </button>

      {/* card */}
      <div
        className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1.1fr_1fr] items-stretch rounded-2xl overflow-hidden"
        style={{
          background: cardBg,
          boxShadow: dark
            ? '0 20px 60px -20px rgba(0,0,0,0.8)'
            : '0 30px 80px -30px rgba(15,23,42,0.2)',
        }}
      >
        {/* LEFT */}
        <div
          className="relative flex flex-col justify-between p-8 lg:p-12 overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0b132b 0%, #060914 100%)',
          }}
        >
          <div className="flex items-center gap-3 text-white/60 text-[11px] font-mono uppercase tracking-[0.2em]">
            <div className="w-8 h-px bg-white/30" />
            <span>SGS-001</span>
          </div>

          <div className="flex items-center justify-center my-6">
            <div className="relative">
              {/* crosshair ticks */}
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
                <div className="absolute left-1/2 -top-4 -translate-x-1/2 w-px h-3 bg-white/30" />
                <div className="absolute left-1/2 -bottom-4 -translate-x-1/2 w-px h-3 bg-white/30" />
                <div className="absolute top-1/2 -left-4 -translate-y-1/2 h-px w-3 bg-white/30" />
                <div className="absolute top-1/2 -right-4 -translate-y-1/2 h-px w-3 bg-white/30" />
              </div>
              <Shield3D size={260} palette="slate" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-white text-xl font-bold tracking-tight">Sentinela SGS</div>
            <div className="text-white/50 text-sm max-w-[280px] leading-relaxed">
              Plataforma de engenharia de segurança para times que não aceitam atalho.
            </div>
            <div className="flex gap-6 pt-3 text-white/40 text-[11px] font-mono">
              <div>
                <div className="text-white/70 text-lg font-semibold font-sans">47</div>
                <div>OCORRÊNCIAS</div>
              </div>
              <div>
                <div className="text-white/70 text-lg font-semibold font-sans">22</div>
                <div>CONCLUÍDAS</div>
              </div>
              <div>
                <div className="text-white/70 text-lg font-semibold font-sans">65%</div>
                <div>RESOLUÇÃO</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div className="p-8 lg:p-12 flex items-center" style={{ background: cardBg }}>
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
            <div>
              <h1 className={`text-3xl font-bold tracking-tight ${textMain}`}>
                Bem-vindo de volta
              </h1>
              <p className={`mt-1.5 text-sm ${textDim}`}>
                Bom ter você por aqui. Entre pra continuar.
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-950/40 border border-red-900 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className={`text-xs font-medium uppercase tracking-wider ${labelColor}`}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  required
                  autoFocus
                  className={`mt-1 w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition ${inputText}`}
                  style={{
                    background: inputBg,
                    borderColor: focused === 'email' ? accent : inputBorder,
                    boxShadow: focused === 'email' ? `0 0 0 3px ${accent}33` : undefined,
                  }}
                />
              </div>
              <div>
                <label className={`text-xs font-medium uppercase tracking-wider ${labelColor}`}>
                  Senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onFocus={() => setFocused('senha')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  required
                  className={`mt-1 w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition ${inputText}`}
                  style={{
                    background: inputBg,
                    borderColor: focused === 'senha' ? accent : inputBorder,
                    boxShadow: focused === 'senha' ? `0 0 0 3px ${accent}33` : undefined,
                  }}
                />
              </div>
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => navigate('/esqueci-senha')}
                  style={{
                    background: 'none', border: 0, padding: 0, cursor: 'pointer',
                    fontSize: 13, color: dark ? 'rgba(255,255,255,0.45)' : '#64748b',
                    fontFamily: 'inherit', transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.75)' : '#334155')}
                  onMouseLeave={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.45)' : '#64748b')}
                >
                  Esqueceu a senha?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
              style={{
                background: accent,
                boxShadow: `0 6px 20px -6px ${accent}80`,
              }}
            >
              {loading ? 'Entrando...' : 'Entrar →'}
            </button>

            <div className={`text-center text-xs ${footerColor}`}>
              Sistema de Gestão de Segurança · v1.0.0
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
