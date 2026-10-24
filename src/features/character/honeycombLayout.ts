/**
 * Layout da colmeia de skills: lógica pura, sem React.
 *
 * Hexágonos pointy-top (vértice para cima) em grade "odd-r": dentro de cada
 * categoria, as linhas ímpares deslocam meio passo para a direita e encaixam
 * entre as de cima. Cada categoria começa numa linha nova, abaixo de uma faixa
 * de rótulo. O número de colunas depende só da largura disponível, então a
 * mesma função serve para 1 ou para 100 stacks sem sobreposição.
 *
 * Em telas estreitas o hexágono encolhe (até RAIO_MINIMO) quando isso mantém
 * mais colunas; depois disso, as colunas caem até 1. A grade não passa da
 * largura disponível (exceto abaixo de ~100 px, em que nem uma coluna cabe).
 *
 * Geometria (R = raio circunscrito):
 *   largura do hex  = √3 · R    altura do hex = 2 · R
 *   passo horizontal = √3 · R + espaço
 *   passo vertical   = 1,5 · R + espaço · √3 / 2
 */

import { formatarNota } from '../../components/formatacao'
import type { SkillDaColmeia } from './character'

const RAIZ3 = Math.sqrt(3)
const COLLATOR = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

export interface ItemColmeia {
  id: string
  nome: string
  categoria: string
  nota: number
}

export interface OpcoesColmeia {
  /** Largura disponível em px. */
  largura: number
  /** Raio circunscrito do hexágono (centro ao vértice): o maior, usado se couber. */
  raio?: number
  /** Menor raio aceito ao encolher em telas estreitas. Igual a `raio` desliga o ajuste. */
  raioMinimo?: number
  /** Colunas que a colmeia tenta manter encolhendo o hexágono. */
  colunasDesejadas?: number
  /** Espaço entre hexágonos vizinhos. */
  espaco?: number
  /** Margem em volta da grade (brilho e anel de foco não são cortados). */
  margem?: number
  /** Altura da faixa do rótulo de cada categoria. */
  alturaRotulo?: number
  /** Ordem das categorias; as ausentes vão ao fim, em ordem alfabética. */
  ordemCategorias?: readonly string[]
}

export interface HexPosicionado<T extends ItemColmeia = ItemColmeia> {
  item: T
  /** Índice na ordem final (a do foco por teclado). */
  indice: number
  /** Linha global (todas as categorias) e coluna dentro da linha. */
  linha: number
  coluna: number
  /** Centro do hexágono. */
  x: number
  y: number
}

export interface GrupoColmeia {
  categoria: string
  /** Linha de base do rótulo da categoria. */
  yRotulo: number
  /** Topo e base da faixa ocupada pela categoria (rótulo + hexágonos). */
  topo: number
  base: number
  quantidade: number
}

export interface LayoutColmeia<T extends ItemColmeia = ItemColmeia> {
  hexagonos: HexPosicionado<T>[]
  grupos: GrupoColmeia[]
  colunas: number
  linhas: number
  raio: number
  largura: number
  altura: number
}

export const RAIO_PADRAO = 34
/** Menor raio legível: o rótulo curto (até 7 letras, 10 px) ainda cabe. */
export const RAIO_MINIMO = 28
export const COLUNAS_DESEJADAS = 6
export const ESPACO_PADRAO = 4
export const MARGEM_PADRAO = 8
export const ALTURA_ROTULO_PADRAO = 22
/** Largura usada quando o elemento ainda não foi medido (ou em jsdom). */
export const LARGURA_PADRAO = 480

/** Largura (lado a lado) de um hexágono pointy-top. */
export function larguraHex(raio: number): number {
  return RAIZ3 * raio
}

/** Passos horizontal e vertical entre centros vizinhos. */
export function passosHex(raio: number, espaco: number): { passoX: number; passoY: number } {
  return { passoX: larguraHex(raio) + espaco, passoY: 1.5 * raio + (espaco * RAIZ3) / 2 }
}

/** Colunas que cabem de fato na largura (0 se nem uma cabe). */
function colunasQueCabem(
  quantidade: number,
  largura: number,
  raio: number,
  espaco: number,
  margem: number,
): number {
  const { passoX } = passosHex(raio, espaco)
  const util = Math.max(0, largura - 2 * margem) + espaco
  const numaLinha = Math.floor(util / passoX)
  if (quantidade <= numaLinha) return quantidade
  return Math.max(0, Math.floor((util - passoX / 2) / passoX))
}

/**
 * Colunas que cabem na largura. Com mais de uma linha, a linha deslocada ocupa
 * meio passo a mais; se todos os itens cabem numa linha só, esse meio passo não
 * é necessário. Nunca menos que 1 (abaixo de ~100 px, a grade rola).
 */
export function colunasDaColmeia(
  quantidade: number,
  { largura, raio = RAIO_PADRAO, espaco = ESPACO_PADRAO, margem = MARGEM_PADRAO }: OpcoesColmeia,
): number {
  return Math.max(1, colunasQueCabem(quantidade, largura, raio, espaco, margem))
}

/**
 * Raio do hexágono para a largura: o maior entre `raioMinimo` e `raio` que
 * ainda mantém o máximo de colunas possível (até `colunasDesejadas`). Se o
 * hexágono menor não ganha colunas, fica o tamanho cheio; se nem uma coluna
 * cabe no tamanho cheio, encolhe até caber (ou até o mínimo).
 */
export function raioDaColmeia(
  quantidade: number,
  {
    largura,
    raio = RAIO_PADRAO,
    raioMinimo = RAIO_MINIMO,
    colunasDesejadas = COLUNAS_DESEJADAS,
    espaco = ESPACO_PADRAO,
    margem = MARGEM_PADRAO,
  }: OpcoesColmeia,
): number {
  const minimo = Math.min(raioMinimo, raio)
  const cabem = (r: number) => colunasQueCabem(quantidade, largura, r, espaco, margem)
  const alvo = Math.max(1, Math.min(colunasDesejadas, quantidade, cabem(minimo)))
  for (let r = raio; r > minimo; r--) {
    if (cabem(r) >= alvo) return r
  }
  return minimo
}

/** Itens agrupados por categoria (na ordem pedida) e, dentro dela, por nota decrescente. */
export function ordenarParaColmeia<T extends ItemColmeia>(
  itens: readonly T[],
  ordemCategorias: readonly string[] = [],
): T[] {
  const posicao = new Map(ordemCategorias.map((c, i) => [c, i]))
  const ordemDaCategoria = (c: string) => posicao.get(c) ?? Number.POSITIVE_INFINITY

  return [...itens].sort(
    (a, b) =>
      ordemDaCategoria(a.categoria) - ordemDaCategoria(b.categoria) ||
      COLLATOR.compare(a.categoria, b.categoria) ||
      b.nota - a.nota ||
      COLLATOR.compare(a.nome, b.nome) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
}

/** Posições de todos os hexágonos e das faixas de categoria. */
export function layoutColmeia<T extends ItemColmeia>(
  itens: readonly T[],
  opcoes: OpcoesColmeia,
): LayoutColmeia<T> {
  const {
    espaco = ESPACO_PADRAO,
    margem = MARGEM_PADRAO,
    alturaRotulo = ALTURA_ROTULO_PADRAO,
    ordemCategorias,
  } = opcoes
  const ordenados = ordenarParaColmeia(itens, ordemCategorias)
  const raio = raioDaColmeia(ordenados.length, { ...opcoes, espaco, margem })
  const colunas = colunasDaColmeia(ordenados.length, { ...opcoes, raio, espaco, margem })
  const { passoX, passoY } = passosHex(raio, espaco)
  const meiaLargura = larguraHex(raio) / 2

  const hexagonos: HexPosicionado<T>[] = []
  const grupos: GrupoColmeia[] = []
  let y = margem
  let linha = 0
  let maiorX = 0

  for (let inicio = 0; inicio < ordenados.length;) {
    const categoria = ordenados[inicio].categoria
    let fim = inicio
    while (fim < ordenados.length && ordenados[fim].categoria === categoria) fim++

    const topo = y
    const yRotulo = topo + alturaRotulo - 6
    const primeiroCentro = topo + alturaRotulo + raio
    const linhasDoGrupo = Math.ceil((fim - inicio) / colunas)

    for (let i = inicio; i < fim; i++) {
      const local = i - inicio
      const linhaLocal = Math.floor(local / colunas)
      const coluna = local % colunas
      const deslocamento = linhaLocal % 2 === 1 ? passoX / 2 : 0
      const x = margem + meiaLargura + deslocamento + coluna * passoX
      maiorX = Math.max(maiorX, x + meiaLargura)
      hexagonos.push({
        item: ordenados[i],
        indice: i,
        linha: linha + linhaLocal,
        coluna,
        x,
        y: primeiroCentro + linhaLocal * passoY,
      })
    }

    const base = primeiroCentro + (linhasDoGrupo - 1) * passoY + raio
    grupos.push({ categoria, yRotulo, topo, base, quantidade: fim - inicio })
    linha += linhasDoGrupo
    y = base + espaco * 2
    inicio = fim
  }

  const altura = hexagonos.length === 0 ? 0 : y - espaco * 2 + margem
  const largura = Math.max(opcoes.largura, maiorX + margem)

  return { hexagonos, grupos, colunas, linhas: linha, raio, largura, altura }
}

export const LARGURA_CARTAO = 224
/** Altura aproximada do cartão de detalhes: decide se ele cabe acima do hexágono. */
export const ALTURA_CARTAO = 170
export const FOLGA_CARTAO = 6
/** Abaixo desta largura o cartão não flutua sobre a colmeia: aparece logo abaixo dela. */
export const LARGURA_MINIMA_CARTAO_FLUTUANTE = 2 * LARGURA_CARTAO

export type PosicaoCartao =
  { modo: 'abaixo' } | { modo: 'flutuante'; left: number; top: number; acima: boolean }

/**
 * Onde mostrar o cartão de detalhes de `hex`, relativo à colmeia. Em larguras
 * estreitas, abaixo da colmeia (no fluxo, largura total). Nas demais, flutuando
 * acima do hexágono se couber, senão abaixo; na horizontal, centrado no
 * hexágono e preso às bordas da área visível, então nunca sai da tela.
 */
export function posicaoDoCartao(
  hex: Pick<HexPosicionado, 'x' | 'y'>,
  layout: Pick<LayoutColmeia, 'largura' | 'raio'>,
  larguraVisivel: number,
): PosicaoCartao {
  const limite = Math.min(layout.largura, larguraVisivel)
  if (limite < LARGURA_MINIMA_CARTAO_FLUTUANTE) return { modo: 'abaixo' }
  const left = Math.max(0, Math.min(hex.x - LARGURA_CARTAO / 2, limite - LARGURA_CARTAO))
  const acima = hex.y - layout.raio - FOLGA_CARTAO - ALTURA_CARTAO >= 0
  const top = acima ? hex.y - layout.raio - FOLGA_CARTAO : hex.y + layout.raio + FOLGA_CARTAO
  return { modo: 'flutuante', left, top, acima }
}

/** Pontos do polígono (atributo points do SVG) de um hexágono pointy-top. */
export function pontosHexagono(x: number, y: number, raio: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angulo = (Math.PI / 180) * (60 * i - 90)
    return `${(x + raio * Math.cos(angulo)).toFixed(2)},${(y + raio * Math.sin(angulo)).toFixed(2)}`
  }).join(' ')
}

/**
 * Hexágonos pointy-top de mesmo raio se sobrepõem se, nas três normais das
 * arestas (0°, 60° e 120°), a distância projetada entre os centros for menor que
 * duas vezes o apótema (√3 · R). Encostar (distância igual) não conta.
 */
export function hexagonosSobrepoem(
  a: { x: number; y: number },
  b: { x: number; y: number },
  raio: number,
): boolean {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const limite = RAIZ3 * raio - 1e-6
  return [0, 60, 120].every((graus) => {
    const t = (Math.PI / 180) * graus
    return Math.abs(dx * Math.cos(t) + dy * Math.sin(t)) < limite
  })
}

export type DirecaoColmeia = 'esquerda' | 'direita' | 'cima' | 'baixo' | 'inicio' | 'fim'

/**
 * Índice do hexágono para onde o foco vai a partir de `indice`. Esquerda e
 * direita seguem a ordem (atravessando linhas e categorias); cima e baixo vão
 * para o hexágono mais próximo na horizontal da linha vizinha. Nas bordas, fica.
 */
export function vizinhoNaColmeia(
  layout: Pick<LayoutColmeia, 'hexagonos'>,
  indice: number,
  direcao: DirecaoColmeia,
): number {
  const { hexagonos } = layout
  if (hexagonos.length === 0) return -1
  const ultimo = hexagonos.length - 1
  const atual = hexagonos[Math.min(Math.max(indice, 0), ultimo)]

  switch (direcao) {
    case 'inicio':
      return 0
    case 'fim':
      return ultimo
    case 'esquerda':
      return Math.max(0, atual.indice - 1)
    case 'direita':
      return Math.min(ultimo, atual.indice + 1)
    case 'cima':
    case 'baixo': {
      const alvo = atual.linha + (direcao === 'cima' ? -1 : 1)
      const naLinha = hexagonos.filter((h) => h.linha === alvo)
      if (naLinha.length === 0) return atual.indice
      return naLinha.reduce((melhor, h) =>
        Math.abs(h.x - atual.x) < Math.abs(melhor.x - atual.x) ? h : melhor,
      ).indice
    }
  }
}

/**
 * Texto curto para caber no hexágono: nomes curtos ficam inteiros; com várias
 * palavras, as iniciais ("Ruby on Rails" -> "RoR"); uma palavra com várias
 * maiúsculas vira sigla ("TypeScript" -> "TS"); senão, o começo com reticências.
 */
export function rotuloCurto(nome: string, maximo = 7): string {
  const limpo = nome.trim()
  if (limpo.length <= maximo) return limpo

  const palavras = limpo.split(/[\s_-]+/).filter(Boolean)
  if (palavras.length > 1)
    return palavras
      .map((p) => p[0])
      .join('')
      .slice(0, 4)

  const maiusculas = limpo.match(/[A-Z]/g) ?? []
  if (maiusculas.length >= 2) return maiusculas.join('').slice(0, 4)

  return `${limpo.slice(0, maximo - 2)}…`
}

/** Nome acessível do hexágono: "React, Mestre, nota 8,4" (+ selos). */
export function rotuloDaSkill(
  skill: Pick<SkillDaColmeia, 'nome' | 'nivel' | 'nota' | 'seiPorSaber' | 'esfriando'>,
): string {
  const partes = [skill.nome, skill.nivel.nome, `nota ${formatarNota(skill.nota)}`]
  if (skill.seiPorSaber) partes.push('sei por saber')
  if (skill.esfriando) partes.push('esfriando')
  return partes.join(', ')
}
