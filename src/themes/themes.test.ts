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
    expect(proximoTema('rpg')).toBe('cyber')
    expect(proximoTema('cyber')).toBe('funcional')
  })

  it('CONFIG_TEMAS tem uma config com rótulo para cada tema', () => {
    expect(Object.keys(CONFIG_TEMAS).sort()).toEqual([...TEMAS].sort())
    for (const tema of TEMAS) expect(CONFIG_TEMAS[tema].rotulo).not.toBe('')
  })

  it('cyber é o tema escuro, com rótulo Cyber', () => {
    expect(TEMAS).toEqual(['funcional', 'rpg', 'cyber'])
    expect(CONFIG_TEMAS.cyber.rotulo).toBe('Cyber')
    expect(CONFIG_TEMAS.cyber.esquema).toBe('dark')
    expect(CONFIG_TEMAS.funcional.esquema).toBe('light')
    expect(CONFIG_TEMAS.rpg.esquema).toBe('light')
  })

  it('estilo de level-up: cyber é "sistema"; rpg e funcional seguem "pergaminho"', () => {
    expect(CONFIG_TEMAS.cyber.levelUp).toBe('sistema')
    expect(CONFIG_TEMAS.rpg.levelUp).toBe('pergaminho')
    expect(CONFIG_TEMAS.funcional.levelUp).toBe('pergaminho')
  })

  it('ehTemaDeJogo segue a config de cada tema', () => {
    expect(ehTemaDeJogo('funcional')).toBe(false)
    expect(ehTemaDeJogo('rpg')).toBe(true)
    expect(ehTemaDeJogo('cyber')).toBe(true)
    for (const tema of TEMAS) expect(ehTemaDeJogo(tema)).toBe(CONFIG_TEMAS[tema].jogo)
  })
})
