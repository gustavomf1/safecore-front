import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  it('mostra o label em português da NC, não a constante do enum', () => {
    render(<StatusBadge type="nc" status="AGUARDANDO_APROVACAO_PLANO" />)
    expect(screen.getByText('Aguard. Aprovação')).toBeInTheDocument()
  })

  it('mostra o label do Desvio usando o mapa de status certo (não o de NC)', () => {
    render(<StatusBadge type="desvio" status="AGUARDANDO_APROVACAO" />)
    expect(screen.getByText('Aguard. Aprovação')).toBeInTheDocument()
  })

  it('usa cor diferente para status concluído x não resolvido', () => {
    const { container: ok } = render(<StatusBadge type="nc" status="CONCLUIDO" />)
    const { container: falha } = render(<StatusBadge type="nc" status="NAO_RESOLVIDA" />)
    expect(ok.querySelector('span')?.className).toContain('bg-green-100')
    expect(falha.querySelector('span')?.className).toContain('bg-red-100')
  })
})
