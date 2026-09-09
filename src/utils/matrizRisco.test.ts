import { describe, it, expect } from 'vitest'
import { calcularNivelRisco } from './matrizRisco'

describe('calcularNivelRisco', () => {
  it.each([
    [1, 1, 'BAIXO'],
    [1, 4, 'MODERADO'],
    [3, 3, 'ALTO'],
    [3, 4, 'CRITICO'],
    [5, 1, 'MODERADO'],
    [5, 4, 'CRITICO'],
  ])('severidade=%i probabilidade=%i -> %s', (severidade, probabilidade, esperado) => {
    expect(calcularNivelRisco(severidade, probabilidade)).toBe(esperado)
  })

  it('severidade máxima e probabilidade máxima sempre dá CRITICO', () => {
    expect(calcularNivelRisco(5, 4)).toBe('CRITICO')
  })
})
