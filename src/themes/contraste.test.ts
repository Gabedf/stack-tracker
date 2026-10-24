import { describe, expect, it } from 'vitest'
import { CONFIG_TEMAS, TEMAS, ehTemaDeJogo, isTema, type Tema } from './themes'

/**
 * Contraste WCAG 2.x dos pares críticos, lido direto dos arquivos de tema.
 * Mudou uma cor? Este teste diz se ela ainda passa; a tabela no topo de
 * tokens.css / rpg.css / cyber.css documenta os valores.
 *
 * Os arquivos de tema são descobertos como no tokens.test.ts: todo CSS de
 * src/themes com um bloco cujo seletor é só `[data-theme='<id>']` no início da
 * linha. Um tema novo entra sozinho em todos os casos abaixo.
 */

type Rgb = readonly [number, number, number]

/** Todo CSS de src/themes como texto, chaveado pelo caminho ('./rpg.css'). */
const cssDaPasta = import.meta.glob('./*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Bloco que define os tokens do tema (efeitos-jogo.css só tem seletores descendentes). */
const BLOCO_DO_TEMA = /^\[data-theme='([a-z0-9-]+)'\]\s*\{/m

/** Cores hex de --theme-* declaradas no arquivo (comentários fora). */
function coresDoTema(css: string): Map<string, string> {
  const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
  return new Map(
    Array.from(
      semComentarios.matchAll(/--theme-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g),
      (m) => [m[1], m[2]],
    ),
  )
}

/** Temas descobertos na pasta, como [id, caminho, cores]. */
const TEMAS_DESCOBERTOS = Object.entries(cssDaPasta).flatMap(([caminho, css]) => {
  const id = BLOCO_DO_TEMA.exec(css)?.[1]
  if (id === undefined) return []
  if (!isTema(id)) throw new Error(`${caminho} define [data-theme='${id}'], que não está em TEMAS`)
  return [[id, caminho, coresDoTema(css)] as const]
})

/**
 * `color-scheme` declarado no bloco do tema (do `{` do seletor até o primeiro `}`,
 * comentários fora). No tokens.css o bloco do funcional é `:root, [data-theme='funcional']`.
 */
function esquemaDoBloco(css: string): string | undefined {
  const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const inicio = semComentarios.search(BLOCO_DO_TEMA)
  const bloco = semComentarios.slice(inicio, semComentarios.indexOf('}', inicio))
  return /color-scheme\s*:\s*([a-z ]+?)\s*;/.exec(bloco)?.[1]
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
/** Texto normal: >= 4.5 sobre os três fundos. */
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
/** Não-texto que precisa se destacar do fundo: foco, borda de controle, marcadores (>= 3). */
const NAO_TEXTO = ['focus', 'border-control', 'accent', 'danger', 'xp-fill'] as const
/**
 * Moldura dos cards (--theme-border) >= 3, só nos temas de jogo (ehTemaDeJogo), onde
 * ela faz parte da sensação de painel. No funcional a borda é decorativa e clara
 * (#cbd5e1, ~1.5:1 sobre os fundos): pendência conhecida da etapa 22, que não se
 * corrige aqui. O que precisa de 3:1 no funcional (inputs, selects) usa
 * --theme-border-control, testada em NAO_TEXTO.
 */
const BORDA_DE_JOGO = ['border'] as const

/**
 * Exceções explícitas, no formato `<tema>: <token> sobre <fundo>`. Só para um par que
 * reprova num tema existente (funcional ou rpg) cuja correção está registrada em
 * Pendências de docs/TEMA-CYBER.md; escreva o motivo num comentário ao lado.
 * Hoje está vazia: todos os pares passam.
 */
const EXCECOES: ReadonlySet<string> = new Set<string>([])

/** Casos [frente, fundo, mínimo] de cada token sobre os três fundos, sem as exceções. */
function pares(tema: Tema, frentes: readonly string[], minimo: number) {
  return frentes
    .flatMap((frente) => FUNDOS.map((fundo) => [frente, fundo, minimo] as const))
    .filter(([frente, fundo]) => !EXCECOES.has(`${tema}: ${frente} sobre ${fundo}`))
}

describe('contraste', () => {
  it('calcula a razão WCAG', () => {
    expect(contraste(rgb('#000'), rgb('#fff'))).toBeCloseTo(21, 5)
    expect(contraste(rgb('#777777'), rgb('#ffffff'))).toBeCloseTo(4.48, 2)
    expect(contraste(rgb('#fff'), rgb('#fff'))).toBe(1)
  })

  it('encontra um arquivo de tema para cada id de TEMAS (e de CONFIG_TEMAS)', () => {
    const ids = TEMAS_DESCOBERTOS.map(([id]) => id).sort()
    expect(ids).toEqual([...TEMAS].sort())
    expect(Object.keys(CONFIG_TEMAS).sort()).toEqual(ids)
  })

  it.each(TEMAS_DESCOBERTOS.map(([id, caminho]) => [id, caminho] as const))(
    'tema %s: color-scheme de %s bate com CONFIG_TEMAS.esquema',
    (id, caminho) => {
      expect(
        esquemaDoBloco(cssDaPasta[caminho]),
        `${id}: o color-scheme em ${caminho} deve ser '${CONFIG_TEMAS[id].esquema}' (esquema em themes.ts)`,
      ).toBe(CONFIG_TEMAS[id].esquema)
    },
  )

  it('as exceções apontam para temas existentes', () => {
    for (const excecao of EXCECOES) {
      expect(isTema(excecao.split(':')[0]), excecao).toBe(true)
    }
  })

  describe.each(TEMAS_DESCOBERTOS)('tema %s (%s)', (tema, _caminho, cores) => {
    const cor = (token: string): Rgb => {
      const valor = cores.get(token)
      if (!valor) throw new Error(`--theme-${token} sem cor hex em ${tema}`)
      return rgb(valor)
    }
    /** Compara e, se reprovar, diz tema, par, razão obtida e mínimo. */
    const exigir = (frente: string, fundo: string, a: Rgb, b: Rgb, minimo: number) => {
      const razao = contraste(a, b)
      expect(
        razao,
        `${tema}: ${frente} sobre ${fundo} dá ${razao.toFixed(2)}:1, mínimo ${minimo}:1`,
      ).toBeGreaterThanOrEqual(minimo)
    }
    const trilhoAccent = sobre(cor('accent'), cor('surface'), 0.15)

    it('lê as cores do arquivo', () => {
      expect(cores.size).toBeGreaterThan(20)
    })

    it.each(pares(tema, TEXTOS, 4.5))('texto %s sobre %s >= %s', (texto, fundo, minimo) => {
      exigir(texto, fundo, cor(texto), cor(fundo), minimo)
    })

    it.each(['text', 'text-muted', 'accent'])('texto %s sobre accent/15 >= 4.5', (texto) => {
      exigir(texto, 'accent/15', cor(texto), trilhoAccent, 4.5)
    })

    it.each(['accent', 'danger'])('accent-contrast sobre %s >= 4.5', (fundo) => {
      exigir('accent-contrast', fundo, cor('accent-contrast'), cor(fundo), 4.5)
    })

    it.each(pares(tema, NAO_TEXTO, 3))('não-texto %s sobre %s >= %s', (token, fundo, minimo) => {
      exigir(token, fundo, cor(token), cor(fundo), minimo)
    })

    // Borda dos cards: só nos temas de jogo (ver BORDA_DE_JOGO para o funcional).
    if (ehTemaDeJogo(tema)) {
      it.each(pares(tema, BORDA_DE_JOGO, 3))(
        'borda %s sobre %s >= %s (tema de jogo)',
        (token, fundo, minimo) => {
          exigir(token, fundo, cor(token), cor(fundo), minimo)
        },
      )
    }

    it('foco e borda de controle sobre accent/15 >= 3', () => {
      exigir('focus', 'accent/15', cor('focus'), trilhoAccent, 3)
      exigir('border-control', 'accent/15', cor('border-control'), trilhoAccent, 3)
    })

    it('barra: xp-fill sobre xp-track >= 3', () => {
      exigir('xp-fill', 'xp-track', cor('xp-fill'), cor('xp-track'), 3)
    })

    it('controle selecionado: borda text sobre surface-2 >= 3', () => {
      exigir('text', 'surface-2', cor('text'), cor('surface-2'), 3)
    })
  })
})
