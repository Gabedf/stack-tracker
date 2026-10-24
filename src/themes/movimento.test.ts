import { describe, expect, it } from 'vitest'
import indexCss from '../index.css?raw'
import printCss from '../print.css?raw'
import rpgCss from './rpg.css?raw'
import tokensCss from './tokens.css?raw'

/**
 * prefers-reduced-motion no CSS: toda transição/animação declarada precisa
 * estar dentro de um @media (prefers-reduced-motion: no-preference), e o
 * index.css zera as durações com reduce.
 */

const SEM_COMENTARIOS = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Declarações de transition/animation fora de um bloco no-preference. */
function movimentoSemGuarda(css: string): string[] {
  const texto = SEM_COMENTARIOS(css)
  const pilha: boolean[] = []
  const achados: string[] = []
  let inicioBloco = 0
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (c === '{') {
      const cabecalho = texto.slice(inicioBloco, i)
      pilha.push(/prefers-reduced-motion:\s*no-preference/.test(cabecalho))
      inicioBloco = i + 1
    } else if (c === '}' || c === ';') {
      const trecho = texto.slice(inicioBloco, i)
      if (/(^|\s)(transition|animation)\s*:/.test(trecho) && !pilha.some(Boolean)) {
        achados.push(trecho.trim())
      }
      if (c === '}') pilha.pop()
      inicioBloco = i + 1
    }
  }
  return achados
}

describe('movimento no CSS', () => {
  it('detecta transição fora da guarda e aceita dentro dela', () => {
    expect(movimentoSemGuarda('a { transition: color 1s; }')).toEqual(['transition: color 1s'])
    expect(
      movimentoSemGuarda(
        '@media (prefers-reduced-motion: no-preference) { a { transition: color 1s; } }',
      ),
    ).toEqual([])
  })

  it.each([
    ['tokens.css', tokensCss],
    ['rpg.css', rpgCss],
    ['print.css', printCss],
  ])('%s só anima com prefers-reduced-motion: no-preference', (_, css) => {
    expect(movimentoSemGuarda(css)).toEqual([])
  })

  it('rpg.css tem transições e animação (o teste acima não é vazio)', () => {
    expect(rpgCss).toMatch(/transition:/)
    expect(rpgCss).toMatch(/animation:/)
  })

  it('index.css zera durações com prefers-reduced-motion: reduce', () => {
    const css = SEM_COMENTARIOS(indexCss)
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    expect(css).toMatch(/transition-duration:\s*0\.01ms\s*!important/)
    expect(css).toMatch(/animation-duration:\s*0\.01ms\s*!important/)
  })
})
