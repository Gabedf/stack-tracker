import type { ProgressoXp } from './character'

const NUMERO = new Intl.NumberFormat('pt-BR')

/** Número inteiro no formato pt-BR (2520 -> "2.520"). */
export function formatarXp(valor: number): string {
  return NUMERO.format(valor)
}

/** Texto de quanto falta para o próximo nível. */
export function textoFaltam({ faltam, nivel }: ProgressoXp): string {
  return `faltam ${formatarXp(faltam)} XP para o nível ${nivel + 1}`
}
