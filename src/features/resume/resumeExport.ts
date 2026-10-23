/**
 * Exportação para currículo. Funções puras, sem React.
 *
 * `selecionarParaCurriculo` aplica os filtros e agrupa por categoria; as
 * stacks deixadas de fora vêm com o motivo, para a UI explicar o filtro.
 * `gerarMarkdownCurriculo` transforma a seleção em Markdown: "##" de título,
 * uma "###" por categoria e um item por stack, com as evidências como sub-itens.
 */

import { NIVEIS, nivelDaNota, type Nivel } from '../../domain/levels'
import { calcularNota, seiPorSaber } from '../../domain/scoring'
import type { Nota, Stack } from '../../domain/types'
import { ROTULO_EXPERIENCIA, formatarNota } from '../../components/formatacao'
import { temPraticaReal } from '../stacks/stackFiltering'
import { resolverOpcoesCurriculo, type OpcoesCurriculo } from './resumeOptions'

export interface OpcoesCalculoCurriculo {
  /** Data de referência para o decaimento das notas. Padrão: agora. */
  hoje?: Date
}

export interface StackCurriculo {
  stack: Stack
  nota: Nota
  nivel: Nivel
}

export interface GrupoCurriculo {
  categoria: string
  /** Nota desc; empate: nome A–Z. */
  stacks: StackCurriculo[]
}

/** Motivos de exclusão, na ordem em que são verificados. */
export const MOTIVOS_EXCLUSAO = ['categoria', 'nivel', 'sei_por_saber', 'sem_comprovacao'] as const
export type MotivoExclusao = (typeof MOTIVOS_EXCLUSAO)[number]

export const ROTULO_MOTIVO_EXCLUSAO: Record<MotivoExclusao, string> = {
  categoria: 'Categoria fora do filtro',
  nivel: 'Nível abaixo do mínimo',
  sei_por_saber: 'Sei por saber: teoria alta, pouca prática',
  sem_comprovacao: 'Sem evidência nem prática real',
}

export interface StackExcluida extends StackCurriculo {
  motivo: MotivoExclusao
}

export interface SelecaoCurriculo {
  /** Grupos não vazios, por categoria em ordem alfabética (pt-BR). */
  grupos: GrupoCurriculo[]
  /** Stacks "sei por saber" incluídas na seção separada (nota desc). */
  conhecimentoTeorico: StackCurriculo[]
  /** Stacks deixadas de fora, na ordem recebida, com o primeiro motivo que as excluiu. */
  excluidas: StackExcluida[]
}

const COLLATOR = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

/** Tem evidência registrada ou experiência em projeto pessoal/produção. */
export function temComprovacao(stack: Stack): boolean {
  return stack.evidencias.length > 0 || temPraticaReal(stack)
}

function compararItens(a: StackCurriculo, b: StackCurriculo): number {
  return (
    b.nota - a.nota ||
    COLLATOR.compare(a.stack.nome, b.stack.nome) ||
    (a.stack.id < b.stack.id ? -1 : a.stack.id > b.stack.id ? 1 : 0)
  )
}

type Destino = 'principal' | 'teorico' | MotivoExclusao

function classificar(item: StackCurriculo, o: OpcoesCurriculo, notaMinima: Nota): Destino {
  const { stack } = item
  if (o.categorias !== null && !o.categorias.includes(stack.categoria)) return 'categoria'
  if (item.nota < notaMinima) return 'nivel'
  if (seiPorSaber(stack)) {
    return o.incluirSeiPorSaber && !o.somenteComprovado ? 'teorico' : 'sei_por_saber'
  }
  if (o.somenteComprovado && !temComprovacao(stack)) return 'sem_comprovacao'
  return 'principal'
}

/** Filtra, agrupa por categoria e ordena. Não altera o array recebido. */
export function selecionarParaCurriculo(
  stacks: readonly Stack[],
  opcoes: Partial<OpcoesCurriculo> = {},
  { hoje = new Date() }: OpcoesCalculoCurriculo = {},
): SelecaoCurriculo {
  const o = resolverOpcoesCurriculo(opcoes)
  const notaMinima = NIVEIS.find((n) => n.id === o.nivelMinimo)?.min ?? 0

  const porCategoria = new Map<string, StackCurriculo[]>()
  const conhecimentoTeorico: StackCurriculo[] = []
  const excluidas: StackExcluida[] = []

  for (const stack of stacks) {
    const nota = calcularNota(stack, { hoje })
    const item: StackCurriculo = { stack, nota, nivel: nivelDaNota(nota) }
    const destino = classificar(item, o, notaMinima)
    if (destino === 'principal') {
      const grupo = porCategoria.get(stack.categoria) ?? []
      grupo.push(item)
      porCategoria.set(stack.categoria, grupo)
    } else if (destino === 'teorico') {
      conhecimentoTeorico.push(item)
    } else {
      excluidas.push({ ...item, motivo: destino })
    }
  }

  const grupos = [...porCategoria]
    .sort(([a], [b]) => COLLATOR.compare(a, b))
    .map(([categoria, itens]) => ({ categoria, stacks: itens.sort(compararItens) }))

  return { grupos, conhecimentoTeorico: conhecimentoTeorico.sort(compararItens), excluidas }
}

/* ---------- Markdown ---------- */

export const TITULO_CONHECIMENTO_TEORICO = 'Conhecimento teórico'
export const MENSAGEM_CURRICULO_VAZIO = '_Nenhuma stack atende aos filtros escolhidos._'

/** Tempo de experiência em pt-BR: "8 meses", "1 ano", "2 anos e 1 mês". */
export function formatarTempo(meses: number): string {
  const total = Number.isFinite(meses) ? Math.max(0, Math.floor(meses)) : 0
  const anos = Math.floor(total / 12)
  const resto = total % 12
  const textoAnos = anos === 1 ? '1 ano' : `${anos} anos`
  const textoMeses = resto === 1 ? '1 mês' : `${resto} meses`
  if (anos === 0) return textoMeses
  if (resto === 0) return textoAnos
  return `${textoAnos} e ${textoMeses}`
}

/**
 * Escapa texto do usuário para Markdown: junta espaços e quebras de linha,
 * escapa caracteres de ênfase/link/código/HTML e marcadores de início de
 * linha (título, citação, lista).
 */
export function escaparMarkdown(texto: string): string {
  return texto
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\\`*_{}[\]<>|~]/g, '\\$&')
    .replace(/^([#>+=-])/, '\\$1')
    .replace(/^(\d+)([.)])/, '$1\\$2')
}

/** URL pronta para `[texto](url)`: sem espaços, parênteses ou sinais de menor/maior soltos. */
function urlMarkdown(url: string): string {
  return url
    .trim()
    .replace(/[\s()<>]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`)
}

/**
 * Detalhes de uma stack, na ordem do currículo: nível, nota, tempo e tipo de
 * experiência (sempre presente). Texto puro, usado no Markdown e no preview.
 */
export function detalhesDaStack(item: StackCurriculo, o: OpcoesCurriculo): string[] {
  const { stack } = item
  const partes: string[] = []
  if (o.mostrarNivel) partes.push(item.nivel.nome)
  if (o.mostrarNota) partes.push(`Nota ${formatarNota(item.nota)}`)
  if (o.mostrarTempo && stack.experiencia.meses > 0) {
    partes.push(formatarTempo(stack.experiencia.meses))
  }
  partes.push(ROTULO_EXPERIENCIA[stack.experiencia.tipo])
  return partes
}

function linhaStack(item: StackCurriculo, o: OpcoesCurriculo): string {
  return `- **${escaparMarkdown(item.stack.nome)}** — ${detalhesDaStack(item, o).join(' · ')}`
}

function linhaEvidencia(evidencia: Stack['evidencias'][number]): string {
  const titulo = escaparMarkdown(evidencia.titulo)
  const url = evidencia.url ? urlMarkdown(evidencia.url) : ''
  const rotulo = url ? `[${titulo || escaparMarkdown(url)}](${url})` : titulo
  const descricao = escaparMarkdown(evidencia.descricao)
  return `  - ${[rotulo, descricao].filter(Boolean).join(' — ')}`
}

function blocoSecao(titulo: string, itens: StackCurriculo[], o: OpcoesCurriculo): string {
  const linhas = itens.flatMap((item) => [
    linhaStack(item, o),
    ...(o.incluirEvidencias ? item.stack.evidencias.map(linhaEvidencia) : []),
  ])
  return `### ${escaparMarkdown(titulo)}\n\n${linhas.join('\n')}`
}

/** Markdown de uma seleção já feita (evita recalcular quando a UI também mostra as excluídas). */
export function markdownDaSelecao(
  selecao: SelecaoCurriculo,
  opcoes: Partial<OpcoesCurriculo> = {},
): string {
  const o = resolverOpcoesCurriculo(opcoes)
  const blocos: string[] = []
  const titulo = escaparMarkdown(o.titulo)
  if (titulo) blocos.push(`## ${titulo}`)

  const secoes = selecao.grupos.map((g) => blocoSecao(g.categoria, g.stacks, o))
  if (selecao.conhecimentoTeorico.length > 0) {
    secoes.push(blocoSecao(TITULO_CONHECIMENTO_TEORICO, selecao.conhecimentoTeorico, o))
  }
  blocos.push(...(secoes.length > 0 ? secoes : [MENSAGEM_CURRICULO_VAZIO]))

  return `${blocos.join('\n\n')}\n`
}

/** Currículo em Markdown, com newline final única. */
export function gerarMarkdownCurriculo(
  stacks: readonly Stack[],
  opcoes: Partial<OpcoesCurriculo> = {},
  calculo: OpcoesCalculoCurriculo = {},
): string {
  return markdownDaSelecao(selecionarParaCurriculo(stacks, opcoes, calculo), opcoes)
}
