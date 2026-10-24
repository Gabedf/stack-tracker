import { describe, expect, it } from 'vitest'
import indexCss from '../index.css?raw'
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

/** Todo CSS de src/themes como texto, chaveado pelo caminho ('./rpg.css'). */
const cssDaPasta = import.meta.glob('./*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/**
 * Critério de arquivo de tema: tem um bloco cujo seletor é só `[data-theme='<id>']`
 * no início da linha (o bloco que define os tokens do tema). Arquivos de efeitos
 * (ex.: efeitos-jogo.css) só usam seletores descendentes como
 * `[data-theme='rpg'] .classe` e por isso ficam de fora. O tokens.css também tem
 * esse bloco, mas é a referência (funcional + :root) e é tratado à parte.
 */
const BLOCO_DO_TEMA = /^\[data-theme='[a-z0-9-]+'\]\s*\{/m
const REFERENCIA = './tokens.css'

const arquivos = Object.entries(cssDaPasta).filter(([caminho]) => caminho !== REFERENCIA)
const temas = arquivos
  .filter(([, css]) => BLOCO_DO_TEMA.test(css))
  .map(([caminho, css]) => ({ caminho, definidos: tokensDefinidos(css) }))
const naoTemas = arquivos.filter(([, css]) => !BLOCO_DO_TEMA.test(css))

/** Fontes .tsx/.ts de src (fora os testes) como texto. */
const fontes = import.meta.glob(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('tokens dos temas', () => {
  it('lê os arquivos de tema', () => {
    expect(funcional.size).toBeGreaterThan(20)
    expect(temas.length).toBeGreaterThan(0)
    for (const { caminho, definidos } of temas) {
      expect(definidos.size, caminho).toBeGreaterThan(20)
    }
  })

  it('arquivos de src/themes que não são tema não definem --theme-*', () => {
    for (const [caminho, css] of naoTemas) {
      expect(ordenar(tokensDefinidos(css)), caminho).toEqual([])
    }
  })

  it.each(temas)(
    '$caminho define exatamente os mesmos --theme-* que tokens.css',
    ({ definidos }) => {
      const faltando = ordenar(funcional).filter((t) => !definidos.has(t))
      const sobrando = ordenar(definidos).filter((t) => !funcional.has(t))
      expect({ faltando, sobrando }).toEqual({ faltando: [], sobrando: [] })
    },
  )

  it('todo --theme-* usado no index.css (@theme e base) existe em todos os temas', () => {
    const usados = ordenar(tokensUsados(indexCss))
    expect(usados.length).toBeGreaterThan(20)
    expect(usados.filter((t) => !funcional.has(t))).toEqual([])
    for (const { caminho, definidos } of temas) {
      expect(
        usados.filter((t) => !definidos.has(t)),
        caminho,
      ).toEqual([])
    }
  })

  it('todo --theme-* usado nos componentes existe em todos os temas', () => {
    expect(Object.keys(fontes).length).toBeGreaterThan(10)
    const usados = ordenar(new Set(Object.values(fontes).flatMap((src) => [...tokensUsados(src)])))
    expect(usados.filter((t) => !funcional.has(t))).toEqual([])
    for (const { caminho, definidos } of temas) {
      expect(
        usados.filter((t) => !definidos.has(t)),
        caminho,
      ).toEqual([])
    }
  })

  it('tokens novos da ficha RPG existem em todos os temas', () => {
    const novos = [
      '--theme-xp-fill',
      '--theme-xp-track',
      '--theme-glow',
      ...[1, 2, 3, 4, 5].map((n) => `--theme-level-${n}`),
    ]
    for (const token of novos) {
      expect(funcional.has(token), token).toBe(true)
      for (const { caminho, definidos } of temas) {
        expect(definidos.has(token), `${caminho} ${token}`).toBe(true)
      }
    }
  })
})
