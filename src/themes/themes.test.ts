import { describe, expect, it } from 'vitest'
import { CONFIG_TEMAS, TEMAS, ehTemaDeJogo, isTema, proximoTema } from './themes'

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

  it('CONFIG_TEMAS tem uma config com rótulo para cada tema', () => {
    expect(Object.keys(CONFIG_TEMAS).sort()).toEqual([...TEMAS].sort())
    for (const tema of TEMAS) expect(CONFIG_TEMAS[tema].rotulo).not.toBe('')
  })

  it('ehTemaDeJogo segue a config de cada tema', () => {
    expect(ehTemaDeJogo('funcional')).toBe(false)
    expect(ehTemaDeJogo('rpg')).toBe(true)
    for (const tema of TEMAS) expect(ehTemaDeJogo(tema)).toBe(CONFIG_TEMAS[tema].jogo)
  })
})
