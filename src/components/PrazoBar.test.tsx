import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import PrazoBar from './PrazoBar'

describe('PrazoBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fica verde e mostra os dias restantes quando falta bastante prazo', () => {
    const { container } = render(<PrazoBar dataLimite="2026-02-13" />) // 29 dias
    expect(screen.getByText('29 dias')).toBeInTheDocument()
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument()
  })

  it('fica laranja quando o prazo já consumiu mais de 75%', () => {
    const { container } = render(<PrazoBar dataLimite="2026-01-20" />) // 5 dias restantes de 30
    expect(container.querySelector('.bg-orange-500')).toBeInTheDocument()
  })

  it('mostra "Vencida" em vermelho quando a NC/Desvio já está marcada como vencida', () => {
    render(<PrazoBar dataLimite="2026-01-01" vencida />)
    const label = screen.getByText('Vencida')
    expect(label.className).toContain('text-red-600')
  })

  it('mostra "Hoje" quando o prazo termina no próprio dia', () => {
    render(<PrazoBar dataLimite="2026-01-15" />)
    expect(screen.getByText('Hoje')).toBeInTheDocument()
  })
})
