import { describe, expect, it } from 'vitest'

/**
 * Guarda do sistema de temas: componentes só usam tokens. Cor literal (hex,
 * rgb/hsl/oklch...), classe de paleta fixa do Tailwind (text-gray-500,
 * bg-blue-600, text-white...) ou cor nomeada em fill/stroke/color quebra a troca
 * de tema. A única pasta autorizada a ter cores é src/themes. Exceção explícita:
 * src/print.css, e só dentro do bloco @media print (no papel é preto no branco).
 */

const PALETAS =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const UTILITARIOS =
  'bg|text|border|border-[xytrbl]|ring|ring-offset|outline|fill|stroke|from|via|to|divide|placeholder|decoration|accent|caret|shadow|inset-shadow'

const REGRAS: ReadonlyArray<readonly [string, RegExp]> = [
  ['cor hex', /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g],
  ['função de cor', /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g],
  [
    'classe de paleta fixa',
    new RegExp(`\\b(?:${UTILITARIOS})-(?:(?:${PALETAS})-\\d{2,3}|white|black)\\b`, 'g'),
  ],
  [
    'cor nomeada em atributo',
    /\b(?:fill|stroke|color|stopColor|floodColor)=["'{]\s*['"]?(?!none|currentColor|transparent|var\(|url\()[a-zA-Z]+['"]/g,
  ],
]

/** Ocorrências proibidas no código-fonte. */
function coresFixas(fonte: string): string[] {
  return REGRAS.flatMap(([regra, re]) => Array.from(fonte.matchAll(re), (m) => `${regra}: ${m[0]}`))
}

const ARQUIVOS = import.meta.glob(['/src/**/*.{ts,tsx}', '!/src/themes/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const CSS = import.meta.glob(['/src/**/*.css', '!/src/themes/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Único CSS fora de src/themes que pode ter cores, só dentro de @media print. */
const CSS_IMPRESSAO = '/src/print.css'

/** O CSS sem comentários e sem os blocos `@media print { ... }` (chaves balanceadas). */
function foraDoPrint(css: string): string {
  let resto = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const inicio = /@media\s+print\b/
  for (let i = resto.search(inicio); i >= 0; i = resto.search(inicio)) {
    const abre = resto.indexOf('{', i)
    if (abre < 0) break
    let nivel = 0
    let fim = abre
    for (; fim < resto.length; fim++) {
      if (resto[fim] === '{') nivel++
      else if (resto[fim] === '}' && --nivel === 0) break
    }
    resto = resto.slice(0, i) + resto.slice(fim + 1)
  }
  return resto
}

describe('detector de cores fixas', () => {
  it.each([
    ['<div className="text-gray-500">', 'classe de paleta fixa: text-gray-500'],
    ['<div className="hover:bg-blue-600">', 'classe de paleta fixa: bg-blue-600'],
    ['<p className="text-white">', 'classe de paleta fixa: text-white'],
    ['<p className="border-t-slate-200">', 'classe de paleta fixa: border-t-slate-200'],
    ["stroke: '#fff'", 'cor hex: #fff'],
    ['<rect fill="#1d4ed8" />', 'cor hex: #1d4ed8'],
    ['style={{ color: "rgb(0 0 0)" }}', 'função de cor: rgb('],
    ['<path fill="red" />', 'cor nomeada em atributo: fill="red"'],
    ["<Line stroke={'black'} />", "cor nomeada em atributo: stroke={'black'"],
  ])('acusa %s', (fonte, esperado) => {
    expect(coresFixas(fonte)).toContain(esperado)
  })

  it.each([
    '<div className="bg-surface text-fg border-border text-muted bg-accent/15">',
    '<svg fill="none" stroke="currentColor"><rect fill="transparent" /></svg>',
    'stroke={\'var(--theme-border)\'} fill="url(#grad)"',
    '<a href="#conteudo">',
    '<p className="text-sm text-xs text-3xl text-right border-b-0">',
  ])('aceita %s', (fonte) => {
    expect(coresFixas(fonte)).toEqual([])
  })
})

describe('código sem cores fixas (fora de src/themes)', () => {
  it('encontra os .ts/.tsx de src', () => {
    expect(Object.keys(ARQUIVOS).length).toBeGreaterThan(30)
    expect(Object.keys(ARQUIVOS).some((p) => p.startsWith('/src/themes/'))).toBe(false)
  })

  it.each(Object.entries(ARQUIVOS))('%s', (_, fonte) => {
    expect(coresFixas(fonte)).toEqual([])
  })
})

describe('CSS sem cores fixas (fora de src/themes)', () => {
  it('encontra o index.css e o print.css', () => {
    expect(Object.keys(CSS)).toEqual(expect.arrayContaining(['/src/index.css', CSS_IMPRESSAO]))
  })

  it.each(Object.entries(CSS).filter(([caminho]) => caminho !== CSS_IMPRESSAO))(
    '%s',
    (_, fonte) => {
      expect(coresFixas(fonte)).toEqual([])
    },
  )

  it('print.css só tem cores dentro do @media print', () => {
    const fonte = CSS[CSS_IMPRESSAO]
    expect(coresFixas(fonte).length).toBeGreaterThan(0)
    expect(foraDoPrint(fonte).trim()).toBe('')
  })

  it('foraDoPrint remove só os blocos de impressão', () => {
    const css = [
      'a { color: #111; }',
      '@media print { b { color: #000; } c { color: #fff; } }',
      'd {}',
    ].join('\n')
    expect(coresFixas(foraDoPrint(css))).toEqual(['cor hex: #111'])
  })
})
