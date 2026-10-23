// Stacks fictícias de data/seed.json para testes de componentes.
import seedTexto from '../../data/seed.json?raw'
import type { Stack } from '../domain/types'
import { carregarStacksFile } from '../storage/stacksFileLoader'

/** Data de referência fixa para o decaimento nos testes com o seed. */
export const HOJE_SEED = new Date(2026, 9, 23)

export function stacksDoSeed(): Stack[] {
  const resultado = carregarStacksFile(seedTexto)
  if (!resultado.ok) throw new Error(resultado.erros.join('\n'))
  return resultado.dados.stacks
}

export function stackDoSeed(id: string): Stack {
  const stack = stacksDoSeed().find((s) => s.id === id)
  if (!stack) throw new Error(`Stack "${id}" não existe no seed`)
  return stack
}
