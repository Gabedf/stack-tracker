import { describe, expect, it } from 'vitest'
import {
  ESPACO_PADRAO,
  MARGEM_PADRAO,
  RAIO_PADRAO,
  colunasDaColmeia,
  hexagonosSobrepoem,
  larguraHex,
  layoutColmeia,
  ordenarParaColmeia,
  passosHex,
  pontosHexagono,
  rotuloCurto,
  vizinhoNaColmeia,
  type ItemColmeia,
  type LayoutColmeia,
} from './honeycombLayout'

const CATEGORIAS = ['Frontend', 'Backend', 'DevOps', 'Dados']

/** n itens espalhados por até 4 categorias, com notas variadas. */
function itens(n: number, categorias = CATEGORIAS): ItemColmeia[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    nome: `Stack ${String(i).padStart(2, '0')}`,
    categoria: categorias[i % categorias.length],
    nota: ((i * 37) % 101) / 10,
  }))
}

function semColisao(layout: LayoutColmeia) {
  const { hexagonos, raio } = layout
  for (let i = 0; i < hexagonos.length; i++) {
    for (let j = i + 1; j < hexagonos.length; j++) {
      expect(
        hexagonosSobrepoem(hexagonos[i], hexagonos[j], raio),
        `${hexagonos[i].item.id} x ${hexagonos[j].item.id}`,
      ).toBe(false)
    }
  }
}

function dentroDaArea(layout: LayoutColmeia) {
  const meia = larguraHex(layout.raio) / 2
  for (const h of layout.hexagonos) {
    expect(h.x - meia).toBeGreaterThanOrEqual(0)
    expect(h.x + meia).toBeLessThanOrEqual(layout.largura)
    expect(h.y - layout.raio).toBeGreaterThanOrEqual(0)
    expect(h.y + layout.raio).toBeLessThanOrEqual(layout.altura)
  }
}

describe('hexagonosSobrepoem', () => {
  const R = 10
  const { passoX } = passosHex(R, 0)

  it('vizinhos encostados não se sobrepõem; mais perto, sim', () => {
    expect(hexagonosSobrepoem({ x: 0, y: 0 }, { x: passoX, y: 0 }, R)).toBe(false)
    expect(hexagonosSobrepoem({ x: 0, y: 0 }, { x: passoX - 0.5, y: 0 }, R)).toBe(true)
    // Diagonal da grade: meio passo ao lado, 1,5 R abaixo.
    expect(hexagonosSobrepoem({ x: 0, y: 0 }, { x: passoX / 2, y: 1.5 * R }, R)).toBe(false)
    expect(hexagonosSobrepoem({ x: 0, y: 0 }, { x: passoX / 2, y: 1.4 * R }, R)).toBe(true)
    // Na vertical, vértice com vértice: precisa de 2 R.
    expect(hexagonosSobrepoem({ x: 0, y: 0 }, { x: 0, y: 2 * R }, R)).toBe(false)
    expect(hexagonosSobrepoem({ x: 0, y: 0 }, { x: 0, y: 1.9 * R }, R)).toBe(true)
  })
})

describe('colunasDaColmeia', () => {
  const { passoX } = passosHex(RAIO_PADRAO, ESPACO_PADRAO)

  it('usa só as colunas necessárias quando tudo cabe numa linha', () => {
    expect(colunasDaColmeia(1, { largura: 480 })).toBe(1)
    expect(colunasDaColmeia(5, { largura: 480 })).toBe(5)
  })

  it('reserva meio passo para a linha deslocada quando há mais de uma linha', () => {
    // 480 px (468 úteis): 7 passos de 62,9 cabem numa linha; com o meio passo da linha deslocada, só 6.
    const numaLinha = Math.floor((480 - 2 * MARGEM_PADRAO + ESPACO_PADRAO) / passoX)
    expect(numaLinha).toBe(7)
    expect(colunasDaColmeia(7, { largura: 480 })).toBe(7)
    expect(colunasDaColmeia(8, { largura: 480 })).toBe(6)
  })

  it('cresce com a largura e nunca fica abaixo de 1', () => {
    expect(colunasDaColmeia(100, { largura: 1000 })).toBe(15)
    expect(colunasDaColmeia(100, { largura: 320 })).toBe(4)
    expect(colunasDaColmeia(100, { largura: 40 })).toBe(1)
    expect(colunasDaColmeia(0, { largura: 480 })).toBe(1)
  })
})

describe('ordenarParaColmeia', () => {
  it('agrupa por categoria na ordem pedida e ordena por nota decrescente', () => {
    const ordem = ordenarParaColmeia(
      [
        { id: 'pg', nome: 'PostgreSQL', categoria: 'Dados', nota: 2.6 },
        { id: 'jq', nome: 'jQuery', categoria: 'Frontend', nota: 4.9 },
        { id: 'node', nome: 'Node.js', categoria: 'Backend', nota: 5.5 },
        { id: 'react', nome: 'React', categoria: 'Frontend', nota: 8.4 },
        { id: 'vue', nome: 'Vue', categoria: 'Frontend', nota: 4.9 },
        { id: 'x', nome: 'Xis', categoria: 'Outros', nota: 9 },
      ],
      ['Frontend', 'Backend', 'Dados'],
    )
    expect(ordem.map((i) => i.id)).toEqual(['react', 'jq', 'vue', 'node', 'pg', 'x'])
  })

  it('sem ordem informada, categorias em ordem alfabética', () => {
    const ordem = ordenarParaColmeia(itens(4))
    expect(ordem.map((i) => i.categoria)).toEqual(['Backend', 'Dados', 'DevOps', 'Frontend'])
  })
})

describe('layoutColmeia', () => {
  it.each([1, 7, 25])('%i itens: sem colisão e dentro da área', (n) => {
    const layout = layoutColmeia(itens(n), { largura: 480, ordemCategorias: CATEGORIAS })
    expect(layout.hexagonos).toHaveLength(n)
    semColisao(layout)
    dentroDaArea(layout)
  })

  it('1 item: uma coluna, uma linha', () => {
    const layout = layoutColmeia(itens(1), { largura: 480 })
    expect(layout.colunas).toBe(1)
    expect(layout.linhas).toBe(1)
    expect(layout.grupos).toEqual([
      expect.objectContaining({ categoria: 'Frontend', quantidade: 1 }),
    ])
    const [hex] = layout.hexagonos
    expect(hex).toMatchObject({ indice: 0, linha: 0, coluna: 0 })
  })

  it('7 itens em 4 categorias: cada categoria começa numa linha nova', () => {
    const layout = layoutColmeia(itens(7), { largura: 480, ordemCategorias: CATEGORIAS })
    expect(layout.colunas).toBe(7)
    expect(layout.grupos.map((g) => [g.categoria, g.quantidade])).toEqual([
      ['Frontend', 2],
      ['Backend', 2],
      ['DevOps', 2],
      ['Dados', 1],
    ])
    expect(layout.linhas).toBe(4)
    expect(layout.hexagonos.map((h) => h.linha)).toEqual([0, 0, 1, 1, 2, 2, 3])
    expect(layout.hexagonos.map((h) => h.coluna)).toEqual([0, 1, 0, 1, 0, 1, 0])
  })

  it('25 itens numa categoria: 6 colunas em 480 px, linhas ímpares deslocadas', () => {
    const lista = itens(25, ['Frontend'])
    const layout = layoutColmeia(lista, { largura: 480 })
    const { passoX, passoY } = passosHex(RAIO_PADRAO, ESPACO_PADRAO)

    expect(layout.colunas).toBe(6)
    expect(layout.linhas).toBe(5)
    const porLinha = [0, 1, 2, 3, 4].map((l) => layout.hexagonos.filter((h) => h.linha === l))
    expect(porLinha.map((l) => l.length)).toEqual([6, 6, 6, 6, 1])
    expect(porLinha[1][0].x - porLinha[0][0].x).toBeCloseTo(passoX / 2)
    expect(porLinha[2][0].x).toBeCloseTo(porLinha[0][0].x)
    expect(porLinha[1][0].y - porLinha[0][0].y).toBeCloseTo(passoY)
    expect(porLinha[0][1].x - porLinha[0][0].x).toBeCloseTo(passoX)
    expect(layout.largura).toBe(480)
  })

  it('a ordem final é por categoria e, dentro dela, por nota', () => {
    const layout = layoutColmeia(itens(25), { largura: 480, ordemCategorias: CATEGORIAS })
    const ordem = layout.hexagonos.map((h) => h.item)
    expect(layout.hexagonos.map((h) => h.indice)).toEqual(ordem.map((_, i) => i))

    const categorias = ordem.map((i) => i.categoria)
    expect([...new Set(categorias)]).toEqual(CATEGORIAS)
    for (let i = 1; i < ordem.length; i++) {
      if (ordem[i].categoria === ordem[i - 1].categoria) {
        expect(ordem[i].nota).toBeLessThanOrEqual(ordem[i - 1].nota)
      }
    }
  })

  it('os rótulos das categorias não ficam sobre os hexágonos', () => {
    const layout = layoutColmeia(itens(25), { largura: 480, ordemCategorias: CATEGORIAS })
    for (const grupo of layout.grupos) {
      const doGrupo = layout.hexagonos.filter((h) => h.item.categoria === grupo.categoria)
      const topoDosHex = Math.min(...doGrupo.map((h) => h.y - layout.raio))
      expect(grupo.yRotulo).toBeLessThan(topoDosHex)
      expect(grupo.yRotulo).toBeGreaterThan(grupo.topo)
    }
    for (let i = 1; i < layout.grupos.length; i++) {
      expect(layout.grupos[i].topo).toBeGreaterThan(layout.grupos[i - 1].base)
    }
  })

  it('em largura muito estreita, uma coluna e a área cresce para caber', () => {
    const layout = layoutColmeia(itens(3), { largura: 30 })
    expect(layout.colunas).toBe(1)
    semColisao(layout)
    dentroDaArea(layout)
    expect(layout.largura).toBeGreaterThan(30)
  })

  it('sem itens, layout vazio', () => {
    const layout = layoutColmeia([], { largura: 480 })
    expect(layout.hexagonos).toEqual([])
    expect(layout.grupos).toEqual([])
    expect(layout.altura).toBe(0)
  })
})

describe('vizinhoNaColmeia', () => {
  const layout = layoutColmeia(itens(25, ['Frontend']), { largura: 480 })

  it('esquerda/direita seguem a ordem e param nas pontas', () => {
    expect(vizinhoNaColmeia(layout, 0, 'direita')).toBe(1)
    expect(vizinhoNaColmeia(layout, 5, 'direita')).toBe(6)
    expect(vizinhoNaColmeia(layout, 0, 'esquerda')).toBe(0)
    expect(vizinhoNaColmeia(layout, 24, 'direita')).toBe(24)
  })

  it('cima/baixo vão ao mais próximo da linha vizinha', () => {
    // Linha 1 é deslocada meio passo à direita: abaixo do 0 fica o 6.
    expect(vizinhoNaColmeia(layout, 0, 'baixo')).toBe(6)
    expect(vizinhoNaColmeia(layout, 6, 'cima')).toBe(0)
    expect(vizinhoNaColmeia(layout, 0, 'cima')).toBe(0)
    // A última linha só tem o 24 (coluna 0).
    expect(vizinhoNaColmeia(layout, 23, 'baixo')).toBe(24)
    expect(vizinhoNaColmeia(layout, 24, 'baixo')).toBe(24)
  })

  it('início e fim', () => {
    expect(vizinhoNaColmeia(layout, 10, 'inicio')).toBe(0)
    expect(vizinhoNaColmeia(layout, 10, 'fim')).toBe(24)
  })

  it('sem hexágonos, -1', () => {
    expect(vizinhoNaColmeia({ hexagonos: [] }, 0, 'direita')).toBe(-1)
  })
})

describe('pontosHexagono', () => {
  it('seis vértices, o primeiro no topo', () => {
    const pontos = pontosHexagono(10, 20, 5).split(' ')
    expect(pontos).toHaveLength(6)
    expect(pontos[0]).toBe('10.00,15.00')
    expect(pontos[3]).toBe('10.00,25.00')
  })
})

describe('rotuloCurto', () => {
  it.each([
    ['React', 'React'],
    ['Node.js', 'Node.js'],
    ['PostgreSQL', 'PSQL'],
    ['TypeScript', 'TS'],
    ['Ruby on Rails', 'RoR'],
    ['Kubernetes', 'Kuber…'],
    ['  Go  ', 'Go'],
  ])('%s -> %s', (nome, esperado) => {
    expect(rotuloCurto(nome)).toBe(esperado)
  })
})
