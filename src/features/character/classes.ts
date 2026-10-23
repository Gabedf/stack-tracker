/**
 * Textos de "classe" do personagem. Ficam todos aqui para trocar o estilo do RPG
 * sem mexer na lógica (character.ts) nem na UI.
 */

/** Classe de quem ainda não tem nenhuma stack. */
export const CLASSE_RECRUTA = 'Recruta'

/**
 * Classe por categoria. A chave é a categoria normalizada (minúsculas, sem
 * acentos e sem espaços, barras ou hífens): "IA/ML" -> "iaml".
 */
export const CLASSES_POR_CATEGORIA: Readonly<Record<string, string>> = {
  frontend: 'Ilusionista da Interface',
  backend: 'Ferreiro(a) de APIs',
  devops: 'Guardião(ã) da Infraestrutura',
  dados: 'Alquimista de Dados',
  mobile: 'Batedor(a) Mobile',
  iaml: 'Oráculo das Máquinas',
  ia: 'Oráculo das Máquinas',
  ml: 'Oráculo das Máquinas',
  cloud: 'Invocador(a) de Nuvens',
  seguranca: 'Paladino(a) da Segurança',
  testes: 'Inquisidor(a) de Bugs',
  qa: 'Inquisidor(a) de Bugs',
  linguagens: 'Erudito(a) das Linguagens',
  ferramentas: 'Artífice de Ferramentas',
}

/** Classe genérica para categorias fora do mapa. */
export function classeGenerica(categoria: string): string {
  return `Aventureiro(a) de ${categoria}`
}

/** Classe híbrida quando duas categorias disputam a liderança. */
export function classeMulticlasse(categoriaA: string, categoriaB: string): string {
  return `Multiclasse: ${categoriaA} / ${categoriaB}`
}

/** Chave do mapa para uma categoria. */
export function normalizarCategoria(categoria: string): string {
  return categoria
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[\s/_-]+/g, '')
}

/** Nome da classe de uma categoria (do mapa ou genérico). */
export function nomeDaClasse(categoria: string): string {
  return CLASSES_POR_CATEGORIA[normalizarCategoria(categoria)] ?? classeGenerica(categoria)
}
