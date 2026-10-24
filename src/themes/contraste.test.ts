import { describe, expect, it } from 'vitest'
import rpgCss from './rpg.css?raw'
import tokensCss from './tokens.css?raw'

/**
 * Contraste WCAG 2.x dos pares crÃ­ticos, lido direto dos arquivos de tema.
 * Mudou uma cor? Este teste diz se ela ainda passa; a tabela no topo de
 * tokens.css / rpg.css documenta os valores.
 */

type Rgb = readonly [number, number, number]

/** Cores hex de --theme-* declaradas no arquivo (comentÃ¡rios fora). */
function coresDoTema(css: string): Map<string, string> {
  const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
  return new Map(
    Array.from(
      semComentarios.matchAll(/--theme-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g),
      (m) => [m[1], m[2]],
    ),
  )
}

function rgb(hex: string): Rgb {
  let h = hex.slice(1)
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as unknown as Rgb
}

function luminancia([r, g, b]: Rgb): number {
  const canal = (c: number) => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

function contraste(a: Rgb, b: Rgb): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (escuro + 0.05)
}

/** Cor `frente` com opacidade `alfa` sobre `fundo` (ex.: bg-accent/15). */
function sobre(frente: Rgb, fundo: Rgb, alfa: number): Rgb {
  return frente.map((c, i) => Math.round(c * alfa + fundo[i] * (1 - alfa))) as unknown as Rgb
}

const FUNDOS = ['bg', 'surface', 'surface-2'] as const
const TEXTOS = [
  'text',
  'text-muted',
  'accent',
  'success',
  'warning',
  'danger',
  'level-1',
  'level-2',
  'level-3',
  'level-4',
  'level-5',
] as const
/** NÃ£o-texto que precisa se destacar do fundo: foco, borda de controle, marcadores. */
const NAO_TEXTO = ['focus', 'border-control', 'accent', 'danger', 'xp-fill'] as const

const TEMAS = [
  ['funcional', coresDoTema(tokensCss)],
  ['rpg', coresDoTema(rpgCss)],
] as const

describe('contraste', () => {
  it('calcula a razÃ£o WCAG', () => {
    expect(contraste(rgb('#000'), rgb('#fff'))).toBeCloseTo(21, 5)
    expect(contraste(rgb('#777777'), rgb('#ffffff'))).toBeCloseTo(4.48, 2)
    expect(contraste(rgb('#fff'), rgb('#fff'))).toBe(1)
  })

  describe.each(TEMAS)('tema %s', (_, cores) => {
    const cor = (token: string): Rgb => {
      const valor = cores.get(token)
      if (!valor) throw new Error(`--theme-${token} sem cor hex`)
      return rgb(valor)
    }
    const trilhoAccent = sobre(cor('accent'), cor('surface'), 0.15)

    it('lÃª as cores do arquivo', () => {
      expect(cores.size).toBeGreaterThan(20)
    })

    it.each(TEXTOS.flatMap((t) => FUNDOS.map((f) => [t, f] as const)))(
      'texto %s sobre %s >= 4.5',
      (texto, fundo) => {
        expect(contraste(cor(texto), cor(fundo))).toBeGreaterThanOrEqual(4.5)
      },
    )

    it.each(['text', 'text-muted', 'accent'])('texto %s sobre accent/15 >= 4.5', (texto) => {
      expect(contraste(cor(texto), trilhoAccent)).toBeGreaterThanOrEqual(4.5)
    })

    it.each(['accent', 'danger'])('accent-contrast sobre %s >= 4.5', (fundo) => {
      expect(contraste(cor('accent-contrast'), cor(fundo))).toBeGreaterThanOrEqual(4.5)
    })

    it.each(NAO_TEXTO.flatMap((t) => FUNDOS.map((f) => [t, f] as const)))(
      'nÃ£o-texto %s sobre %s >= 3',
      (token, fundo) => {
        expect(contraste(cor(token), cor(fundo))).toBeGreaterThanOrEqual(3)
      },
    )

    it('foco e borda de controle sobre accent/15 >= 3', () => {
      expect(contraste(cor('focus'), trilhoAccent)).toBeGreaterThanOrEqual(3)
      expect(contraste(cor('border-control'), trilhoAccent)).toBeGreaterThanOrEqual(3)
    })

    it('barra: xp-fill sobre xp-track >= 3', () => {
      expect(contraste(cor('xp-fill'), cor('xp-track'))).toBeGreaterThanOrEqual(3)
    })

    it('controle selecionado: borda text sobre surface-2 >= 3', () => {
      expect(contraste(cor('text'), cor('surface-2'))).toBeGreaterThanOrEqual(3)
    })
  })
})
