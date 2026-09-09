import { createPortal } from 'react-dom'
import { AlertTriangle, BookOpen, Check, EyeOff, Info, PowerOff, RotateCcw, X } from 'lucide-react'
import { Norma } from '../types'
import { StatusPill } from '../pages/norma/NormasCommon'
import { formatCount } from '../pages/norma/normasHelpers'
import '../styles/normas.css'

interface Props {
  item: Norma | null
  isLoading?: boolean
  isError?: boolean
  onCancel: () => void
  onConfirm: (item: Norma) => void
}

export default function NormaDeactivateModal({ item, isLoading = false, isError = false, onCancel, onConfirm }: Props) {
  if (!item) return null

  return createPortal(
    <div className="nm-theme nm-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="nm-modal-title">
      <div className="nm-modal">
        <div className="nm-modal-head">
          <div className="nm-modal-icon amber">
            <PowerOff size={18} strokeWidth={2.2} />
          </div>
          <div className="nm-modal-head-text">
            <h2 id="nm-modal-title" className="nm-modal-title">Desativar norma</h2>
            <p className="nm-modal-sub">
              Esta ação remove a norma da lista de seleção em novas ocorrências. Você pode reativá-la a qualquer momento.
            </p>
          </div>
          <button className="nm-modal-close" onClick={onCancel} aria-label="Fechar" disabled={isLoading}>
            <X size={15} />
          </button>
        </div>

        <div className="nm-modal-body">
          <div className="nm-modal-norm">
            <div className="nm-modal-norm-icon">
              <BookOpen size={15} />
            </div>
            <div className="nm-modal-norm-text">
              <div className="nm-modal-norm-code">Norma</div>
              <div className="nm-modal-norm-title">{item.titulo}</div>
            </div>
            <StatusPill ativo={item.ativo} />
          </div>

          <div className="nm-modal-impact">
            <div className="nm-modal-impact-row">
              <span className="nm-modal-impact-icon"><EyeOff size={11} /></span>
              <span>
                Deixa de aparecer na busca de normas ao registrar novas <strong>NCs</strong> e <strong>desvios</strong>.
              </span>
            </div>
            <div className="nm-modal-impact-row ok">
              <span className="nm-modal-impact-icon"><Check size={11} strokeWidth={3} /></span>
              <span>
                As <strong>{formatCount(item.totalOcorrencias)} ocorrências</strong> e{' '}
                <strong>{formatCount(item.totalNcsAtivas)} NCs ativas</strong> já vinculadas continuam intactas.
              </span>
            </div>
            <div className="nm-modal-impact-row ok">
              <span className="nm-modal-impact-icon"><RotateCcw size={11} strokeWidth={2.5} /></span>
              <span>
                Reversível: filtre por <strong>Inativas</strong> na listagem para reativar quando quiser.
              </span>
            </div>
          </div>

          {isError && (
            <div className="nm-modal-error">
              <AlertTriangle size={14} />
              Não foi possível desativar a norma. Verifique sua sessão e tente novamente.
            </div>
          )}
          <div className="nm-modal-reassure">
            <Info size={12} />
            O texto e os vínculos históricos da norma serão preservados.
          </div>
        </div>

        <div className="nm-modal-foot">
          <button className="nm-btn nm-btn-ghost" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </button>
          <button className="nm-btn nm-btn-warn" onClick={() => onConfirm(item)} disabled={isLoading}>
            <PowerOff size={14} strokeWidth={2.2} />
            {isLoading ? 'Desativando...' : 'Desativar norma'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
