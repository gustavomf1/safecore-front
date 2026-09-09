import { BookOpen, Check, Circle } from 'lucide-react'

export function StatusPill({ ativo }: { ativo: boolean }) {
  return (
    <span className={`nm-pill ${ativo ? 'nm-pill-green' : 'nm-pill-slate'}`}>
      <span className="nm-pill-dot" />
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  )
}

function hashAvatar(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return `nm-avatar-c${(Math.abs(h) % 5) + 1}`
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'
}

export function Avatar({ name, size = 22 }: { name?: string; size?: number }) {
  const safeName = name || 'Sistema'
  return (
    <span
      className={`nm-avatar-sm ${hashAvatar(safeName)}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
    >
      {initialsOf(safeName)}
    </span>
  )
}

export function ChecklistItem({ done, label, optional }: { done: boolean; label: string; optional?: boolean }) {
  return (
    <div className="nm-checklist-item">
      <span className={`nm-checklist-icon ${done ? 'done' : ''}`}>
        {done ? <Check size={11} strokeWidth={3} /> : <Circle size={9} />}
      </span>
      <span className={done ? 'done' : ''}>{label}</span>
      {optional && <span className="nm-checklist-optional">opcional</span>}
    </div>
  )
}

export function NormaIcon() {
  return (
    <span className="nm-norm-id-icon">
      <BookOpen size={14} />
    </span>
  )
}
