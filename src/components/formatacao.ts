import type { Nota, TipoExperiencia } from '../domain/types'

const FORMATO_NOTA = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** Nota com 1 casa decimal no formato pt-BR (ex.: 7.4 -> "7,4"). */
export function formatarNota(nota: Nota): string {
  return FORMATO_NOTA.format(Number.isNaN(nota) ? 0 : nota)
}

/** Rótulo legível de cada tipo de experiência. */
export const ROTULO_EXPERIENCIA: Record<TipoExperiencia, string> = {
  so_teoria: 'Só teoria',
  estudo: 'Estudo',
  projeto_pessoal: 'Projeto pessoal',
  producao: 'Produção',
}

/** Data ISO "AAAA-MM-DD" no formato pt-BR "DD/MM/AAAA" (sem passar por fuso horário). */
export function formatarData(data: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : data
}
