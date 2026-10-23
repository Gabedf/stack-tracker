import { describe, expect, it } from 'vitest'

/**
 * Guarda do sistema de temas: componentes só usam tokens. Cor literal (hex,
 * rgb/hsl/oklch...), classe de paleta fixa do Tailwind (text-gray-500,
 * bg-blue-600, text-white...) ou cor nomeada em fill/stroke/color quebra a troca
 * de tema. A única pasta autorizada a ter cores é src/themes.
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
