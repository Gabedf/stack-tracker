import { describe, expect, it } from 'vitest'
import { TEMAS, isTema, proximoTema } from './themes'

describe('themes', () => {
  it('isTema aceita só temas conhecidos', () => {
    for (const tema of TEMAS) expect(isTema(tema)).toBe(true)
    expect(isTema('neon')).toBe(false)
    expect(isTema(null)).toBe(false)
  })

  it('proximoTema percorre a lista em ciclo', () => {
    expect(proximoTema('funcional')).toBe('rpg')
    expect(proximoTema('rpg')).toBe('funcional')
  })
})
