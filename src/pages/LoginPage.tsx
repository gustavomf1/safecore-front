import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { login as loginApi } from '../api/auth'
import loginHero from '../assets/branding/login-hero.jpg'
import safecoreIcon from '../assets/branding/safecore-icon.png'

const accent = '#0ea5e9'

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
  const cardBg = dark ? '#0a0e1a' : '#ffffff'
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
    <div className="w-full min-h-screen grid lg:grid-cols-2">
      {/* LEFT — full-bleed hero image */}
      <div
        className="relative hidden lg:block"
        style={{
          backgroundImage: `url(${loginHero})`,
          backgroundSize: 'cover',
          backgroundPosition: 'left center',
        }}
      />

      {/* RIGHT — form */}
      <div
        className="relative flex flex-col min-h-screen"
        style={{ background: cardBg }}
      >
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

        {/* Compact SafeCore header — always shown on the form side, doubles as mobile branding */}
        <div className="flex items-center gap-2.5 px-8 pt-8 lg:px-12">
          <img src={safecoreIcon} alt="SafeCore" className="w-9 h-9 rounded-lg object-cover" />
          <span className={`text-lg font-bold ${textMain}`}>
            Safe<span style={{ color: accent }}>Core</span>
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
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
              SafeCore · Sistema de Gestão de Segurança · v1.0.0
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
