import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import Shield3D from '../components/Shield3D'
import { solicitarReset, verificarOtp, redefinirSenha } from '../api/auth'
import {
  AtSign, ArrowRight, ArrowLeft, Loader2, Lock, Eye, EyeOff,
  Check, X, AlertCircle, ShieldCheck,
} from 'lucide-react'
import styles from './ForgotPasswordPage.module.css'

const THEMES = {
  light: {
    bg: 'radial-gradient(1200px 620px at 50% -12%, rgba(79,70,229,0.10), transparent 60%), radial-gradient(900px 560px at 112% 116%, rgba(124,58,237,0.07), transparent 55%), #eef1f6',
    '--rp-surface': '#ffffff',       '--rp-input': '#f8fafc',     '--rp-track': '#eef1f6',
    '--rp-accent-soft': 'rgba(79,70,229,0.07)',
    '--rp-border': '#e6e9ef',        '--rp-border-strong': '#dfe3ea', '--rp-border-hover': '#cbd2dd',
    '--rp-hairline': 'rgba(79,70,229,0.25)',
    '--rp-fg0': '#0f172a',           '--rp-fg1': '#27324a',       '--rp-fg2': '#586379', '--rp-fg3': '#9aa3b4',
    '--rp-accent': '#4f46e5',        '--rp-ring': 'rgba(79,70,229,0.16)',
    '--rp-shadow': '0 30px 70px -28px rgba(31,41,80,0.30), 0 6px 18px -10px rgba(31,41,80,0.10)',
  },
  dark: {
    bg: 'radial-gradient(1200px 620px at 50% -12%, rgba(88,166,255,0.10), transparent 60%), radial-gradient(900px 560px at 112% 116%, rgba(188,140,255,0.08), transparent 55%), #0a0e14',
    '--rp-surface': '#161b22',       '--rp-input': '#0d1117',     '--rp-track': '#21262d',
    '--rp-accent-soft': 'rgba(88,166,255,0.10)',
    '--rp-border': '#21262d',        '--rp-border-strong': '#2c333d', '--rp-border-hover': '#3b434f',
    '--rp-hairline': 'rgba(88,166,255,0.30)',
    '--rp-fg0': '#e6edf3',           '--rp-fg1': '#c9d1d9',       '--rp-fg2': '#8b949e', '--rp-fg3': '#6e7681',
    '--rp-accent': '#58a6ff',        '--rp-ring': 'rgba(88,166,255,0.20)',
    '--rp-shadow': '0 30px 80px -28px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)',
  },
} as const

function Brand() {
  return (
    <div className={styles.brand}>
      <div className={styles.brandTile}><ShieldCheck size={20} /></div>
      <div>
        <div className={styles.brandName}>SGS</div>
        <div className={styles.brandSub}>Sistema de Gestão de Segurança</div>
      </div>
    </div>
  )
}

function Steps({ step }: { step: number }) {
  return (
    <div className={styles.steps}>
      {[0, 1, 2].map(i => (
        <div key={i} className={[
          styles.stepSeg,
          step > i ? styles.done : '',
          step === i ? styles.active : '',
        ].join(' ')}>
          <i />
        </div>
      ))}
    </div>
  )
}

function maskEmail(e: string) {
  const [local, domain] = e.split('@')
  if (!domain) return e
  return `${local.slice(0, 2)}${'•'.repeat(Math.max(3, local.length - 2))}@${domain}`
}

function StepEmail({ onNext }: { onNext: (email: string) => void }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || loading) return
    setLoading(true); setError(null)
    try {
      await solicitarReset(email.trim())
      onNext(email.trim())
    } catch {
      setError('Erro ao enviar código. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={`${styles.screen} ${styles.stagger}`} onSubmit={submit}>
      <button type="button" className={styles.back} onClick={() => navigate('/login')}>
        <ArrowLeft size={15} /> Voltar ao login
      </button>
      <div>
        <h1 className={styles.title}>Esqueceu a senha?</h1>
        <p className={styles.sub}>Informe o e-mail da sua conta e enviaremos um código de verificação de 6 dígitos.</p>
      </div>
      <div style={{ marginTop: 22 }}>
        <label className={styles.label} htmlFor="rp-em">E-mail da conta</label>
        <div className={styles.fieldWrap}>
          <span className={styles.fieldIcon}><AtSign size={17} /></span>
          <input id="rp-em" className={styles.input} type="email" autoComplete="email"
            placeholder="voce@empresa.com.br" value={email}
            onChange={e => setEmail(e.target.value)} />
        </div>
        {error && <div className={styles.inlineErr}><AlertCircle size={14} /> {error}</div>}
      </div>
      <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit"
        disabled={!valid || loading} style={{ marginTop: 18 }}>
        {loading
          ? <><Loader2 size={17} className={styles.spin} /> Enviando…</>
          : <>Enviar código <ArrowRight size={17} /></>}
      </button>
      <div className={styles.foot}>
        Lembrou a senha?{' '}
        <button type="button" className={styles.link} onClick={() => navigate('/login')}>Entrar</button>
      </div>
    </form>
  )
}

function StepCodigo({
  email, onNext, onBack,
}: { email: string; onNext: (resetToken: string) => void; onBack: () => void }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(false)
  const [secs, setSecs] = useState(30)
  const [toast, setToast] = useState(true)
  const [toastOut, setToastOut] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const complete = digits.every(d => d !== '')

  useEffect(() => {
    if (secs <= 0) return
    const t = setTimeout(() => setSecs(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secs])

  useEffect(() => {
    const t1 = setTimeout(() => setToastOut(true), 5200)
    const t2 = setTimeout(() => setToast(false), 5650)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const setDigit = (i: number, v: string) => {
    const nv = v.replace(/\D/g, '').slice(-1)
    const next = [...digits]; next[i] = nv; setDigits(next); setErr(false)
    if (nv && i < 5) refs.current[i + 1]?.focus()
  }
  const onKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }
  const onPaste = (e: React.ClipboardEvent) => {
    const txt = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6)
    if (!txt) return
    e.preventDefault()
    const next = ['', '', '', '', '', '']
    txt.split('').forEach((c, i) => { next[i] = c })
    setDigits(next); setErr(false)
    refs.current[Math.min(txt.length, 5)]?.focus()
  }

  const verify = async () => {
    if (!complete || loading) return
    setLoading(true); setErr(false)
    try {
      const resetToken = await verificarOtp(email, digits.join(''))
      onNext(resetToken)
    } catch {
      setErr(true)
      setDigits(['', '', '', '', '', ''])
      setTimeout(() => refs.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setSecs(30)
    try { await solicitarReset(email) } catch { /* reenvio silencioso, usuário pode tentar de novo */ }
  }

  return (
    <div className={`${styles.screen} ${styles.stagger}`}>
      {toast && (
        <div className={`${styles.toast} ${toastOut ? styles.toastOut : ''}`}
          onClick={() => setToastOut(true)}>
          <div className={styles.toastIc}>✉️</div>
          <div>
            <div className={styles.toastT}>Novo e-mail · SGS Segurança</div>
            <div className={styles.toastS}>Seu código de redefinição chegou</div>
          </div>
        </div>
      )}
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={15} /> Voltar
      </button>
      <div>
        <h1 className={styles.title}>Verifique seu e-mail</h1>
        <p className={styles.sub}>
          Enviamos um código de 6 dígitos para <b>{maskEmail(email)}</b>. Digite-o abaixo.
        </p>
      </div>
      <div>
        <div className={`${styles.otp} ${err ? styles.otpErr : ''}`} onPaste={onPaste}>
          {digits.map((d, i) => (
            <input key={i} ref={el => { refs.current[i] = el }}
              className={`${styles.digit} ${d ? styles.digitFilled : ''}`}
              inputMode="numeric" maxLength={1} value={d}
              onChange={e => setDigit(i, e.target.value)}
              onKeyDown={e => onKey(i, e)}
              onFocus={e => e.target.select()} />
          ))}
        </div>
        {err && (
          <div className={styles.inlineErr}>
            <AlertCircle size={14} /> Código incorreto. Tente novamente.
          </div>
        )}
      </div>
      <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={verify}
        disabled={!complete || loading} style={{ marginTop: 4 }}>
        {loading
          ? <><Loader2 size={17} className={styles.spin} /> Verificando…</>
          : <>Verificar e continuar <ArrowRight size={17} /></>}
      </button>
      <div className={styles.resend}>
        {secs > 0
          ? <span>Não recebeu? Reenviar em <b style={{ color: 'var(--rp-fg1)' }}>0:{String(secs).padStart(2, '0')}</b></span>
          : <span>Não recebeu? <button className={styles.link} onClick={resend}>Reenviar código</button></span>}
      </div>
    </div>
  )
}

function StepNovaSenha({ resetToken, onNext }: { resetToken: string; onNext: () => void }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checks = {
    len:   pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    num:   /[0-9]/.test(pw),
    sym:   /[^A-Za-z0-9]/.test(pw),
  }
  const score = Object.values(checks).filter(Boolean).length
  const allMet = score === 4
  const match = pw.length > 0 && pw === pw2

  const meta = [
    { c: '#ef4444', t: 'Fraca' }, { c: '#ef4444', t: 'Fraca' },
    { c: '#d29922', t: 'Média' }, { c: '#d29922', t: 'Média' }, { c: '#16a34a', t: 'Forte' },
  ][score]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allMet || !match || loading) return
    setLoading(true); setError(null)
    try {
      await redefinirSenha(resetToken, pw)
      onNext()
    } catch {
      setError('Erro ao redefinir senha. O link pode ter expirado.')
    } finally {
      setLoading(false)
    }
  }

  const reqs = [
    { k: 'len'   as const, label: 'Mín. 8 caracteres' },
    { k: 'upper' as const, label: '1 letra maiúscula' },
    { k: 'num'   as const, label: '1 número' },
    { k: 'sym'   as const, label: '1 símbolo' },
  ]

  return (
    <form className={`${styles.screen} ${styles.stagger}`} onSubmit={submit}>
      <div>
        <div className={styles.eyebrow}>Etapa final</div>
        <h1 className={styles.title}>Crie uma nova senha</h1>
        <p className={styles.sub}>Escolha uma senha forte e diferente das anteriores.</p>
      </div>
      <div style={{ marginTop: 20 }}>
        <label className={styles.label}>Nova senha</label>
        <div className={styles.fieldWrap}>
          <span className={styles.fieldIcon}><Lock size={16} /></span>
          <input className={`${styles.input} ${styles.inputToggle}`}
            type={show ? 'text' : 'password'} value={pw}
            autoComplete="new-password" placeholder="••••••••"
            onChange={e => setPw(e.target.value)} />
          <button type="button" className={styles.eye}
            onClick={() => setShow(s => !s)} tabIndex={-1}>
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {pw.length > 0 && (
          <>
            <div className={styles.strength}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={styles.strengthSeg}>
                  <i style={{ width: i < score ? '100%' : '0', background: meta.c }} />
                </div>
              ))}
            </div>
            <div className={styles.strengthLabel} style={{ color: meta.c }}>Força: {meta.t}</div>
          </>
        )}
        <ul className={styles.reqs}>
          {reqs.map(r => (
            <li key={r.k} className={`${styles.req} ${checks[r.k] ? styles.reqMet : ''}`}>
              <span className={styles.reqDot}>
                {checks[r.k] ? <Check size={11} /> : <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'block' }} />}
              </span>
              {r.label}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <label className={styles.label}>Confirmar nova senha</label>
        <div className={styles.fieldWrap}>
          <span className={styles.fieldIcon}><Lock size={16} /></span>
          <input className={`${styles.input} ${styles.inputToggle}`}
            type={show ? 'text' : 'password'} value={pw2}
            autoComplete="new-password" placeholder="••••••••"
            onChange={e => setPw2(e.target.value)} />
        </div>
        {pw2.length > 0 && (
          <div className={styles.match} style={{ color: match ? '#16a34a' : '#ef4444' }}>
            {match ? <><Check size={14} /> As senhas coincidem</> : <><X size={14} /> As senhas não coincidem</>}
          </div>
        )}
      </div>
      {error && <div className={styles.inlineErr}><AlertCircle size={14} /> {error}</div>}
      <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit"
        disabled={!allMet || !match || loading} style={{ marginTop: 6 }}>
        {loading
          ? <><Loader2 size={17} className={styles.spin} /> Redefinindo…</>
          : <>Redefinir senha <ArrowRight size={17} /></>}
      </button>
    </form>
  )
}

function StepSucesso() {
  const navigate = useNavigate()
  return (
    <div className={styles.screen} style={{ textAlign: 'center' }}>
      <div className={styles.successRing}>
        <div className={styles.successGlow} />
        <svg className={styles.checkSvg} viewBox="0 0 100 100">
          <circle className={styles.checkCircle} cx="50" cy="50" r="44" />
          <path className={styles.checkMark} d="M32 51 L45 64 L69 38" />
        </svg>
      </div>
      <h1 className={styles.title}>Senha alterada!</h1>
      <p className={styles.sub} style={{ maxWidth: 320, margin: '10px auto 0' }}>
        Sua senha foi redefinida com sucesso. Já pode acessar o sistema com a nova senha.
      </p>
      <button className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={() => navigate('/login')} style={{ marginTop: 26 }}>
        Ir para o login <ArrowRight size={17} />
      </button>
    </div>
  )
}

function ResetFlow() {
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState('')

  return (
    <div className={styles.card}>
      <Brand />
      {step < 3 && <Steps step={step} />}
      {step === 0 && (
        <StepEmail onNext={e => { setEmail(e); setStep(1) }} />
      )}
      {step === 1 && (
        <StepCodigo
          email={email}
          onNext={rt => { setResetToken(rt); setStep(2) }}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <StepNovaSenha resetToken={resetToken} onNext={() => setStep(3)} />
      )}
      {step === 3 && <StepSucesso />}
    </div>
  )
}

export default function ForgotPasswordPage() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const t = THEMES[dark ? 'dark' : 'light']
  const { bg, ...cssVars } = t

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden"
        style={{ background: dark ? '#060b14' : '#0f172a' }}>
        <Shield3D size={320} palette="brand" interactive />
      </div>
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto"
        style={{ background: bg, ...(cssVars as React.CSSProperties) }}>
        <ResetFlow />
      </div>
    </div>
  )
}
