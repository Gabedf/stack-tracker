/**
 * Tipos de domínio do Painel de Stacks.
 *
 * Fonte da verdade da forma dos dados. Os schemas Zod em `schema.ts` validam
 * dados externos (ex.: data/stacks.json) e são checados em tempo de compilação
 * contra estes tipos.
 */

/** Data no formato ISO "YYYY-MM-DD". */
export type DataISO = string

/** Nota de 0 a 10 (inclusive). */
export type Nota = number

export const TIPOS_EXPERIENCIA = ['so_teoria', 'estudo', 'projeto_pessoal', 'producao'] as const
export type TipoExperiencia = (typeof TIPOS_EXPERIENCIA)[number]

export const TIPOS_EVIDENCIA = ['repo', 'projeto', 'emprego', 'certificado'] as const
export type TipoEvidencia = (typeof TIPOS_EVIDENCIA)[number]

export interface Dimensoes {
  teoria: Nota
  pratica: Nota
  profundidade: Nota
  ultimoUso: DataISO
}

export interface Experiencia {
  tipo: TipoExperiencia
  /** Meses de experiência (inteiro >= 0). */
  meses: number
}

export interface Evidencia {
  titulo: string
  url?: string
  descricao: string
  tipo: TipoEvidencia
}

/** Snapshot da stack num momento do tempo. */
export interface RegistroHistorico {
  data: DataISO
  dimensoes: Dimensoes
  nota: Nota
}

export interface Stack {
  id: string
  nome: string
  categoria: string
  tags: string[]
  dimensoes: Dimensoes
  experiencia: Experiencia
  evidencias: Evidencia[]
  historico: RegistroHistorico[]
  notas?: string
}

export const VERSAO_STACKS_FILE = 1

/** Arquivo raiz persistido (formato de data/stacks.json). */
export interface StacksFile {
  versao: typeof VERSAO_STACKS_FILE
  stacks: Stack[]
}
