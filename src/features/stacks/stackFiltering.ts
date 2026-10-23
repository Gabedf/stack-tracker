/**
 * Filtros e ordenação da lista de stacks. Funções puras, sem React.
 *
 * Os critérios também podem ser lidos/escritos em URLSearchParams, para que
 * a lista filtrada tenha um link compartilhável. Valores inválidos na URL
 * caem no padrão.
 */

import { NIVEIS, nivelDaNota, type NivelId } from '../../domain/levels'
import { calcularNota } from '../../domain/scoring'
import type { Stack, TipoExperiencia } from '../../domain/types'

export const TODAS_CATEGORIAS = 'todas'
export const TODOS_NIVEIS = 'todos'

export const ORDENACOES = ['nota', 'nome', 'pratica', 'ultimoUso'] as const
export type Ordenacao = (typeof ORDENACOES)[number]

export const ROTULO_ORDENACAO: Record<Ordenacao, string> = {
  nota: 'Nota (maior primeiro)',
  nome: 'Nome (A–Z)',
  pratica: 'Prática (maior primeiro)',
  ultimoUso: 'Último uso (mais recente)',
}

/** Tipos de experiência que contam como prática real. */
const TIPOS_PRATICA_REAL: readonly TipoExperiencia[] = ['projeto_pessoal', 'producao']

export interface CriteriosStacks {
  /** Categoria exata ou TODAS_CATEGORIAS. */
  categoria: string
  /** Nível da nota calculada ou TODOS_NIVEIS. */
  nivel: NivelId | typeof TODOS_NIVEIS
  /** Só stacks com experiência em projeto pessoal ou produção. */
  somentePraticaReal: boolean
  /** Texto buscado em nome e tags (sem diferenciar acento/caixa). */
  busca: string
  ordenacao: Ordenacao
}

export const CRITERIOS_PADRAO: CriteriosStacks = {
  categoria: TODAS_CATEGORIAS,
  nivel: TODOS_NIVEIS,
  somentePraticaReal: false,
  busca: '',
  ordenacao: 'nota',
}

export interface OpcoesFiltro {
  /** Data de referência para a nota (decaimento). Padrão: agora. */
  hoje?: Date
}

const COLLATOR = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

/** Minúsculas e sem acentos, para comparar textos. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

export function temPraticaReal(stack: Stack): boolean {
  return TIPOS_PRATICA_REAL.includes(stack.experiencia.tipo)
}

function correspondeBusca(stack: Stack, buscaNormalizada: string): boolean {
  if (!buscaNormalizada) return true
  return [stack.nome, ...stack.tags].some((t) => normalizarTexto(t).includes(buscaNormalizada))
}

/** Comparador do critério principal (negativo = `a` antes de `b`). */
function compararPorCriterio(
  ordenacao: Ordenacao,
  a: Stack,
  b: Stack,
  notas: Map<string, number>,
): number {
  switch (ordenacao) {
    case 'nota':
      return (notas.get(b.id) ?? 0) - (notas.get(a.id) ?? 0)
    case 'pratica':
      return b.dimensoes.pratica - a.dimensoes.pratica
    case 'ultimoUso':
      // Datas ISO (YYYY-MM-DD) ordenam como texto.
      return b.dimensoes.ultimoUso < a.dimensoes.ultimoUso
        ? -1
        : b.dimensoes.ultimoUso > a.dimensoes.ultimoUso
          ? 1
          : 0
    case 'nome':
      return 0
  }
}

/**
 * Aplica os filtros (combinados com E) e ordena. Empates são desfeitos pelo
 * nome (A–Z, pt-BR) e, por fim, pelo id, então o resultado é determinístico.
 * Não altera o array recebido.
 */
export function filtrarEOrdenar(
  stacks: readonly Stack[],
  criterios: Partial<CriteriosStacks> = {},
  { hoje = new Date() }: OpcoesFiltro = {},
): Stack[] {
  const c = { ...CRITERIOS_PADRAO, ...criterios }
  const busca = normalizarTexto(c.busca)
  const notas = new Map(stacks.map((s) => [s.id, calcularNota(s, { hoje })]))

  const filtradas = stacks.filter(
    (s) =>
      (c.categoria === TODAS_CATEGORIAS || s.categoria === c.categoria) &&
      (c.nivel === TODOS_NIVEIS || nivelDaNota(notas.get(s.id) ?? 0).id === c.nivel) &&
      (!c.somentePraticaReal || temPraticaReal(s)) &&
      correspondeBusca(s, busca),
  )

  return filtradas.sort(
    (a, b) =>
      compararPorCriterio(c.ordenacao, a, b, notas) ||
      COLLATOR.compare(a.nome, b.nome) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
}

/** Categorias distintas das stacks, em ordem alfabética (pt-BR). */
export function categoriasDisponiveis(stacks: readonly Stack[]): string[] {
  return [...new Set(stacks.map((s) => s.categoria))].sort(COLLATOR.compare)
}

/** true se algum filtro (não a ordenação) difere do padrão. */
export function temFiltroAtivo(criterios: CriteriosStacks): boolean {
  return (
    criterios.categoria !== TODAS_CATEGORIAS ||
    criterios.nivel !== TODOS_NIVEIS ||
    criterios.somentePraticaReal ||
    normalizarTexto(criterios.busca) !== ''
  )
}

/* ---------- URL ---------- */

/** Nomes dos parâmetros de URL de cada critério. */
export const PARAMS_URL = {
  categoria: 'categoria',
  nivel: 'nivel',
  somentePraticaReal: 'pratica',
  busca: 'q',
  ordenacao: 'ordem',
} as const satisfies Record<keyof CriteriosStacks, string>

const VALOR_PRATICA_REAL = 'real'

function ehNivel(valor: string | null): valor is NivelId {
  return NIVEIS.some((n) => n.id === valor)
}

function ehOrdenacao(valor: string | null): valor is Ordenacao {
  return (ORDENACOES as readonly (string | null)[]).includes(valor)
}

export interface OpcoesLeituraUrl {
  /**
   * Categorias válidas. Se informado, uma categoria fora da lista cai no
   * padrão (todas).
   */
  categorias?: readonly string[]
}

/** Lê os critérios da URL; o que estiver ausente ou inválido usa o padrão. */
export function criteriosDaUrl(
  params: URLSearchParams,
  { categorias }: OpcoesLeituraUrl = {},
): CriteriosStacks {
  const categoria = params.get(PARAMS_URL.categoria)
  const nivel = params.get(PARAMS_URL.nivel)
  const ordenacao = params.get(PARAMS_URL.ordenacao)

  const categoriaValida =
    categoria !== null && categoria !== '' && (!categorias || categorias.includes(categoria))

  return {
    categoria: categoriaValida ? categoria : CRITERIOS_PADRAO.categoria,
    nivel: ehNivel(nivel) ? nivel : CRITERIOS_PADRAO.nivel,
    somentePraticaReal: params.get(PARAMS_URL.somentePraticaReal) === VALOR_PRATICA_REAL,
    busca: params.get(PARAMS_URL.busca) ?? CRITERIOS_PADRAO.busca,
    ordenacao: ehOrdenacao(ordenacao) ? ordenacao : CRITERIOS_PADRAO.ordenacao,
  }
}

/**
 * Escreve os critérios em uma cópia dos parâmetros. Valores padrão são
 * omitidos (URL limpa); outros parâmetros são preservados.
 */
export function criteriosParaUrl(
  criterios: Partial<CriteriosStacks>,
  base: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const c = { ...CRITERIOS_PADRAO, ...criterios }
  const params = new URLSearchParams(base)
  const definir = (chave: string, valor: string, padrao: string) => {
    if (valor === padrao) params.delete(chave)
    else params.set(chave, valor)
  }

  definir(PARAMS_URL.categoria, c.categoria, CRITERIOS_PADRAO.categoria)
  definir(PARAMS_URL.nivel, c.nivel, CRITERIOS_PADRAO.nivel)
  definir(PARAMS_URL.somentePraticaReal, c.somentePraticaReal ? VALOR_PRATICA_REAL : '', '')
  definir(PARAMS_URL.busca, c.busca, CRITERIOS_PADRAO.busca)
  definir(PARAMS_URL.ordenacao, c.ordenacao, CRITERIOS_PADRAO.ordenacao)
  return params
}
