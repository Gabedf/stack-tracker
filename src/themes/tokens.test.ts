import { describe, expect, it } from 'vitest'
import indexCss from '../index.css?raw'
import rpgCss from './rpg.css?raw'
import tokensCss from './tokens.css?raw'

/** Nomes de --theme-* definidos (lado esquerdo de uma declaração). */
function tokensDefinidos(css: string): Set<string> {
  return new Set(Array.from(css.matchAll(/(--theme-[a-z0-9-]+)\s*:/g), (m) => m[1]))
}

/** Nomes de --theme-* lidos via var(...). */
function tokensUsados(css: string): Set<string> {
  return new Set(Array.from(css.matchAll(/var\(\s*(--theme-[a-z0-9-]+)/g), (m) => m[1]))
}

const ordenar = (s: Set<string>) => [...s].sort()

const funcional = tokensDefinidos(tokensCss)
const rpg = tokensDefinidos(rpgCss)

/** Fontes .tsx/.ts de src (fora os testes) como texto. */
const fontes = import.meta.glob(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('tokens dos temas', () => {
  it('lê os arquivos de tema', () => {
    expect(funcional.size).toBeGreaterThan(20)
    expect(rpg.size).toBeGreaterThan(20)
  })

  it('funcional e rpg definem exatamente os mesmos --theme-*', () => {
    expect(ordenar(rpg)).toEqual(ordenar(funcional))
  })

  it('todo --theme-* usado no index.css (@theme e base) existe nos dois temas', () => {
    const usados = ordenar(tokensUsados(indexCss))
    expect(usados.length).toBeGreaterThan(20)
    expect(usados.filter((t) => !funcional.has(t))).toEqual([])
    expect(usados.filter((t) => !rpg.has(t))).toEqual([])
  })

  it('todo --theme-* usado nos componentes existe nos dois temas', () => {
    expect(Object.keys(fontes).length).toBeGreaterThan(10)
    const usados = ordenar(new Set(Object.values(fontes).flatMap((src) => [...tokensUsados(src)])))
    expect(usados.filter((t) => !funcional.has(t))).toEqual([])
    expect(usados.filter((t) => !rpg.has(t))).toEqual([])
  })

  it('tokens novos da ficha RPG existem nos dois temas', () => {
    const novos = [
      '--theme-xp-fill',
      '--theme-xp-track',
      '--theme-glow',
      ...[1, 2, 3, 4, 5].map((n) => `--theme-level-${n}`),
    ]
    for (const token of novos) {
      expect(funcional.has(token), token).toBe(true)
      expect(rpg.has(token), token).toBe(true)
    }
  })
})
