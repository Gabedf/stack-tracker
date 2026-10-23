/**
 * Opções da exportação para currículo. Sem React.
 *
 * Por padrão o currículo só traz o que tem comprovação: evidência registrada
 * ou experiência em projeto pessoal/produção. A nota é interna e fica oculta.
 */

import type { NivelId } from '../../domain/levels'

export interface OpcoesCurriculo {
  /** Categorias incluídas (comparação exata). `null` = todas. */
  categorias: readonly string[] | null
  /** Nível mínimo da nota calculada. `null` = qualquer nível. */
  nivelMinimo: NivelId | null
  /** Só stacks com evidência OU experiência em projeto pessoal/produção. */
  somenteComprovado: boolean
  /**
   * Inclui as stacks "sei por saber" numa seção separada ("Conhecimento
   * teórico"). Só tem efeito com `somenteComprovado` desligado.
   */
  incluirSeiPorSaber: boolean
  mostrarNivel: boolean
  /** A nota é interna; desligada por padrão. */
  mostrarNota: boolean
  /** Tempo de experiência ("2 anos e 3 meses"). */
  mostrarTempo: boolean
  /** Evidências como sub-itens (com link quando houver URL). */
  incluirEvidencias: boolean
  /** Título da seção ("##"). Vazio = sem título. */
  titulo: string
}

export const TITULO_CURRICULO_PADRAO = 'Competências técnicas'

export const DEFAULT_OPCOES_CURRICULO: Readonly<OpcoesCurriculo> = Object.freeze({
  categorias: null,
  nivelMinimo: null,
  somenteComprovado: true,
  incluirSeiPorSaber: false,
  mostrarNivel: true,
  mostrarNota: false,
  mostrarTempo: true,
  incluirEvidencias: true,
  titulo: TITULO_CURRICULO_PADRAO,
})

/** Completa as opções parciais com os padrões (campos `undefined` também usam o padrão). */
export function resolverOpcoesCurriculo(opcoes: Partial<OpcoesCurriculo> = {}): OpcoesCurriculo {
  const definidas = Object.fromEntries(
    Object.entries(opcoes).filter(([, valor]) => valor !== undefined),
  ) as Partial<OpcoesCurriculo>
  return { ...DEFAULT_OPCOES_CURRICULO, ...definidas }
}
