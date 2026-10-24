import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import { CHAVE_TEMA_STORAGE, TEMAS } from './themes'

/** Ids aceitos pelo script anti-flash: o array literal `var temas = [...]`. */
function temasDoAntiFlash(html: string): string[] {
  const lista = html.match(/var temas = \[([^\]]*)\]/)
  if (!lista) throw new Error('index.html: lista `var temas = [...]` não encontrada')
  return Array.from(lista[1].matchAll(/'([^']+)'/g), (m) => m[1])
}

describe('script anti-flash do index.html', () => {
  it('aceita exatamente os ids de TEMAS', () => {
    expect(new Set(temasDoAntiFlash(indexHtml))).toEqual(new Set(TEMAS))
  })

  it('lê a mesma chave do localStorage', () => {
    expect(indexHtml).toContain(`localStorage.getItem('${CHAVE_TEMA_STORAGE}')`)
  })
})
