/**
 * Quadrante teoria × prática. Funções puras, sem React.
 */

import { detalharNota, seiPorSaber } from '../../domain/scoring'
import type { Nota, Stack } from '../../domain/types'

export type QuadranteId = 'dominio' | 'sei-por-saber' | 'pratica-intuitiva' | 'a-explorar'

export interface Quadrante {
  id: QuadranteId
  rotulo: string
  descricao: string
}

/** Ordem de exibição (resumo, legenda e tabela). */
export const QUADRANTES: readonly Quadrante[] = [
  { id: 'dominio', rotulo: 'Domínio real', descricao: 'teoria alta, prática alta' },
  { id: 'sei-por-saber', rotulo: 'Sei por saber', descricao: 'teoria alta, prática baixa' },
  { id: 'pratica-intuitiva', rotulo: 'Prática intuitiva', descricao: 'teoria baixa, prática alta' },
  { id: 'a-explorar', rotulo: 'A explorar', descricao: 'teoria baixa, prática baixa' },
]

export const ROTULO_QUADRANTE = Object.fromEntries(
  QUADRANTES.map((q) => [q.id, q.rotulo]),
) as Record<QuadranteId, string>

/** Limiar padrão que divide cada eixo em "baixa" e "alta". */
export const LIMIAR_QUADRANTE = 5

/**
 * Quadrante de um par teoria/prática. O limiar conta como "alta" (inclusivo):
 * com limiar 5, teoria 5 já é alta e 4,9 ainda é baixa.
 */
export function classificarQuadrante(
  teoria: number,
  pratica: number,
  limiar: number = LIMIAR_QUADRANTE,
): QuadranteId {
  const teoriaAlta = teoria >= limiar
  const praticaAlta = pratica >= limiar
  if (teoriaAlta) return praticaAlta ? 'dominio' : 'sei-por-saber'
  return praticaAlta ? 'pratica-intuitiva' : 'a-explorar'
}

export interface PontoQuadrante {
  id: string
  nome: string
  teoria: Nota
  pratica: Nota
  nota: Nota
  quadrante: QuadranteId
  /** Marcação "sei por saber" do domínio (teoria >= 7 e prática <= 3). */
  seiPorSaber: boolean
}

export interface OpcoesQuadrante {
  hoje?: Date
  limiar?: number
}

const COLLATOR = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })
const ORDEM_QUADRANTE = new Map(QUADRANTES.map((q, i) => [q.id, i]))

/** Um ponto por stack, ordenados por quadrante e depois por nome. */
export function pontosQuadrante(
  stacks: readonly Stack[],
  { hoje = new Date(), limiar = LIMIAR_QUADRANTE }: OpcoesQuadrante = {},
): PontoQuadrante[] {
  return stacks
    .map((stack) => {
      const { teoria, pratica } = stack.dimensoes
      return {
        id: stack.id,
        nome: stack.nome,
        teoria,
        pratica,
        nota: detalharNota(stack, { hoje }).nota,
        quadrante: classificarQuadrante(teoria, pratica, limiar),
        seiPorSaber: seiPorSaber(stack),
      }
    })
    .sort(
      (a, b) =>
        (ORDEM_QUADRANTE.get(a.quadrante) ?? 0) - (ORDEM_QUADRANTE.get(b.quadrante) ?? 0) ||
        COLLATOR.compare(a.nome, b.nome),
    )
}

/** Quantidade de pontos em cada quadrante, na ordem de QUADRANTES. */
export function contarPorQuadrante(
  pontos: readonly PontoQuadrante[],
): { quadrante: Quadrante; quantidade: number }[] {
  return QUADRANTES.map((quadrante) => ({
    quadrante,
    quantidade: pontos.filter((p) => p.quadrante === quadrante.id).length,
  }))
}

/** Acima disso, nomes ao lado dos pontos viram ruído: só tooltip e tabela. */
export const MAX_ROTULOS = 12

/**
 * Ids dos pontos cujo nome cabe ao lado do marcador. Um rótulo fica à direita
 * do ponto e ocupa ~2 unidades de teoria por ~0,8 de prática; se outro ponto
 * cair nessa vizinhança, os dois ficam sem nome (sobra o tooltip e a tabela).
 */
export function rotulosQueCabem(pontos: readonly PontoQuadrante[]): Set<string> {
  if (pontos.length > MAX_ROTULOS) return new Set()
  const perto = (a: PontoQuadrante, b: PontoQuadrante) =>
    Math.abs(a.teoria - b.teoria) < 2 && Math.abs(a.pratica - b.pratica) < 0.8
  return new Set(
    pontos.filter((p) => pontos.every((outro) => outro === p || !perto(p, outro))).map((p) => p.id),
  )
}
