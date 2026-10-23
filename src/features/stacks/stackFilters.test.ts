import { describe, expect, it } from 'vitest'
import type { Stack, TipoExperiencia } from '../../domain/types'
import { HOJE_SEED, stacksDoSeed } from '../../test/seed'
import {
  CRITERIOS_PADRAO,
  categoriasDisponiveis,
  criteriosDaUrl,
  criteriosParaUrl,
  filtrarEOrdenar,
  normalizarTexto,
  temFiltroAtivo,
  type CriteriosStacks,
} from './stackFilters.ts'

const HOJE = new Date(2026, 9, 23)

interface DadosFake {
  nome: string
  categoria?: string
  tags?: string[]
  /** Valor usado em teoria, prática e profundidade (sem evidências: nota = 0,9 × valor). */
  valor?: number
  pratica?: number
  ultimoUso?: string
  tipo?: TipoExperiencia
}

function fake({
  nome,
  categoria = 'Geral',
  tags = [],
  valor = 5,
  pratica = valor,
  ultimoUso = '2026-10-01',
  tipo = 'estudo',
}: DadosFake): Stack {
  return {
    id: normalizarTexto(nome).replace(/\W+/g, '-'),
    nome,
    categoria,
    tags,
    dimensoes: { teoria: valor, pratica, profundidade: valor, ultimoUso },
    experiencia: { tipo, meses: 1 },
    evidencias: [],
    historico: [],
  }
}

function ids(stacks: Stack[]): string[] {
  return stacks.map((s) => s.id)
}

/** Seed com notas no HOJE_SEED: react 8+ (mestre), nodejs 5,5, jquery 4,9 (praticante), kubernetes 3,8, postgresql 2,6 (aprendiz). */
function seed(criterios: Partial<CriteriosStacks> = {}, hoje: Date = HOJE_SEED): string[] {
  return ids(filtrarEOrdenar(stacksDoSeed(), criterios, { hoje }))
}

describe('filtrarEOrdenar', () => {
  it('sem critérios devolve todas, por nota (maior primeiro)', () => {
    expect(seed()).toEqual(['react', 'nodejs', 'jquery', 'kubernetes', 'postgresql'])
  })

  it('não altera o array recebido', () => {
    const stacks = stacksDoSeed()
    const antes = ids(stacks)
    filtrarEOrdenar(stacks, { ordenacao: 'nome' }, { hoje: HOJE_SEED })
    expect(ids(stacks)).toEqual(antes)
  })

  describe('filtros isolados', () => {
    it('categoria', () => {
      expect(seed({ categoria: 'Frontend' })).toEqual(['react', 'jquery'])
      expect(seed({ categoria: 'Dados' })).toEqual(['postgresql'])
      expect(seed({ categoria: 'Inexistente' })).toEqual([])
    })

    it('nível, pela nota calculada', () => {
      expect(seed({ nivel: 'mestre' })).toEqual(['react'])
      expect(seed({ nivel: 'praticante' })).toEqual(['nodejs', 'jquery'])
      expect(seed({ nivel: 'aprendiz' })).toEqual(['kubernetes', 'postgresql'])
      expect(seed({ nivel: 'iniciante' })).toEqual([])
    })

    it('nível considera o decaimento na data de referência', () => {
      const antes = new Date(2022, 2, 1)
      expect(seed({ nivel: 'senior' }, antes)).toContain('jquery')
      expect(seed({ nivel: 'senior' })).not.toContain('jquery')
    })

    it('só prática real (projeto pessoal ou produção)', () => {
      expect(seed({ somentePraticaReal: true })).toEqual(['react', 'nodejs', 'jquery'])
    })

    it('busca no nome sem diferenciar caixa', () => {
      expect(seed({ busca: 'REACT' })).toEqual(['react'])
      expect(seed({ busca: 'sql' })).toEqual(['postgresql'])
    })

    it('busca nas tags', () => {
      expect(seed({ busca: 'legado' })).toEqual(['jquery'])
      expect(seed({ busca: 'javascript' })).toEqual(['nodejs', 'jquery'])
    })

    it('busca ignora acentos no texto e na consulta', () => {
      const stacks = [
        fake({ nome: 'Programação Funcional' }),
        fake({ nome: 'Go', tags: ['concorrência'] }),
        fake({ nome: 'Rust' }),
      ]
      const buscar = (busca: string) => ids(filtrarEOrdenar(stacks, { busca }, { hoje: HOJE }))

      expect(buscar('programacao')).toEqual(['programacao-funcional'])
      expect(buscar('CONCORRENCIA')).toEqual(['go'])
      expect(seed({ busca: 'orquestração' })).toEqual(['kubernetes'])
    })

    it('busca vazia ou só com espaços não filtra', () => {
      expect(seed({ busca: '   ' })).toHaveLength(5)
    })
  })

  describe('filtros combinados (E)', () => {
    it('categoria + nível + prática real', () => {
      expect(
        seed({ categoria: 'Frontend', nivel: 'praticante', somentePraticaReal: true }),
      ).toEqual(['jquery'])
      expect(seed({ categoria: 'Frontend', nivel: 'mestre', somentePraticaReal: true })).toEqual([
        'react',
      ])
    })

    it('categoria + prática real', () => {
      expect(seed({ categoria: 'Frontend', somentePraticaReal: true })).toEqual(['react', 'jquery'])
      expect(seed({ categoria: 'DevOps', somentePraticaReal: true })).toEqual([])
    })

    it('nível + prática real', () => {
      expect(seed({ nivel: 'praticante', somentePraticaReal: true })).toEqual(['nodejs', 'jquery'])
      expect(seed({ nivel: 'aprendiz', somentePraticaReal: true })).toEqual([])
    })

    it('categoria + nível sem interseção dá vazio', () => {
      expect(seed({ categoria: 'Frontend', nivel: 'aprendiz' })).toEqual([])
    })

    it('busca + categoria + ordenação', () => {
      expect(seed({ busca: 'javascript', categoria: 'Backend' })).toEqual(['nodejs'])
      expect(seed({ busca: 'javascript', ordenacao: 'nome' })).toEqual(['jquery', 'nodejs'])
    })

    it('todos os filtros juntos', () => {
      expect(
        seed({
          categoria: 'Frontend',
          nivel: 'praticante',
          somentePraticaReal: true,
          busca: 'dom',
          ordenacao: 'pratica',
        }),
      ).toEqual(['jquery'])
    })
  })

  describe('ordenação', () => {
    it('nome (A–Z, pt-BR)', () => {
      expect(seed({ ordenacao: 'nome' })).toEqual([
        'jquery',
        'kubernetes',
        'nodejs',
        'postgresql',
        'react',
      ])
    })

    it('nome considera acentos e caixa como no pt-BR', () => {
      const stacks = [fake({ nome: 'banco' }), fake({ nome: 'Zig' }), fake({ nome: 'Ábaco' })]
      expect(ids(filtrarEOrdenar(stacks, { ordenacao: 'nome' }, { hoje: HOJE }))).toEqual([
        'abaco',
        'banco',
        'zig',
      ])
    })

    it('prática (maior primeiro)', () => {
      expect(seed({ ordenacao: 'pratica' })).toEqual([
        'react',
        'jquery',
        'nodejs',
        'postgresql',
        'kubernetes',
      ])
    })

    it('último uso (mais recente primeiro)', () => {
      expect(seed({ ordenacao: 'ultimoUso' })).toEqual([
        'react',
        'postgresql',
        'kubernetes',
        'nodejs',
        'jquery',
      ])
    })

    it('nota é o padrão', () => {
      expect(seed({ ordenacao: 'nota' })).toEqual(seed())
    })
  })

  describe('desempate por nome', () => {
    const empatadas = [
      fake({ nome: 'Zeta', valor: 6 }),
      fake({ nome: 'alfa', valor: 6 }),
      fake({ nome: 'Beta', valor: 6 }),
      fake({ nome: 'Ômega', valor: 6 }),
    ]

    it.each(['nota', 'pratica', 'ultimoUso'] as const)(
      'empates em %s saem por nome',
      (ordenacao) => {
        expect(ids(filtrarEOrdenar(empatadas, { ordenacao }, { hoje: HOJE }))).toEqual([
          'alfa',
          'beta',
          'omega',
          'zeta',
        ])
      },
    )

    it('o desempate não afeta quem não empatou', () => {
      const stacks = [
        ...empatadas,
        fake({ nome: 'Aaa', valor: 2 }),
        fake({ nome: 'Zzz', valor: 9 }),
      ]
      expect(ids(filtrarEOrdenar(stacks, {}, { hoje: HOJE }))).toEqual([
        'zzz',
        'alfa',
        'beta',
        'omega',
        'zeta',
        'aaa',
      ])
    })

    it('resultado não depende da ordem de entrada', () => {
      const invertidas = [...empatadas].reverse()
      expect(ids(filtrarEOrdenar(invertidas, {}, { hoje: HOJE }))).toEqual(
        ids(filtrarEOrdenar(empatadas, {}, { hoje: HOJE })),
      )
    })
  })
})

describe('categoriasDisponiveis', () => {
  it('lista categorias distintas em ordem alfabética', () => {
    expect(categoriasDisponiveis(stacksDoSeed())).toEqual([
      'Backend',
      'Dados',
      'DevOps',
      'Frontend',
    ])
  })

  it('ordena com acentos no pt-BR e remove duplicadas', () => {
    const stacks = [
      fake({ nome: 'a', categoria: 'Banco' }),
      fake({ nome: 'b', categoria: 'Área' }),
      fake({ nome: 'c', categoria: 'Banco' }),
    ]
    expect(categoriasDisponiveis(stacks)).toEqual(['Área', 'Banco'])
  })

  it('lista vazia sem stacks', () => {
    expect(categoriasDisponiveis([])).toEqual([])
  })
})

describe('temFiltroAtivo', () => {
  it('padrão não tem filtro; ordenação sozinha também não', () => {
    expect(temFiltroAtivo(CRITERIOS_PADRAO)).toBe(false)
    expect(temFiltroAtivo({ ...CRITERIOS_PADRAO, ordenacao: 'nome' })).toBe(false)
    expect(temFiltroAtivo({ ...CRITERIOS_PADRAO, busca: '  ' })).toBe(false)
  })

  it.each<Partial<CriteriosStacks>>([
    { categoria: 'Frontend' },
    { nivel: 'mestre' },
    { somentePraticaReal: true },
    { busca: 'react' },
  ])('detecta %o', (mudanca) => {
    expect(temFiltroAtivo({ ...CRITERIOS_PADRAO, ...mudanca })).toBe(true)
  })
})

describe('critérios na URL', () => {
  it('URL vazia dá os critérios padrão', () => {
    expect(criteriosDaUrl(new URLSearchParams())).toEqual(CRITERIOS_PADRAO)
  })

  it('lê valores válidos', () => {
    const params = new URLSearchParams(
      'categoria=Frontend&nivel=praticante&pratica=real&q=java&ordem=ultimoUso',
    )
    expect(criteriosDaUrl(params, { categorias: ['Frontend'] })).toEqual({
      categoria: 'Frontend',
      nivel: 'praticante',
      somentePraticaReal: true,
      busca: 'java',
      ordenacao: 'ultimoUso',
    })
  })

  it('valores inválidos caem no padrão', () => {
    const params = new URLSearchParams('categoria=&nivel=guru&pratica=sim&ordem=aleatoria')
    expect(criteriosDaUrl(params)).toEqual(CRITERIOS_PADRAO)
  })

  it('categoria fora das disponíveis cai em todas', () => {
    const params = new URLSearchParams('categoria=Mobile')
    expect(criteriosDaUrl(params, { categorias: ['Frontend'] }).categoria).toBe('todas')
    expect(criteriosDaUrl(params).categoria).toBe('Mobile')
  })

  it('escreve só o que difere do padrão e preserva outros parâmetros', () => {
    const base = new URLSearchParams('visao=lista&nivel=mestre')
    const params = criteriosParaUrl({ categoria: 'Dados', somentePraticaReal: true }, base)
    expect(params.toString()).toBe('visao=lista&categoria=Dados&pratica=real')
    expect(base.toString()).toBe('visao=lista&nivel=mestre')
  })

  it('critérios padrão geram URL vazia', () => {
    expect(criteriosParaUrl(CRITERIOS_PADRAO).toString()).toBe('')
  })

  it('ida e volta preserva os critérios', () => {
    const criterios: CriteriosStacks = {
      categoria: 'Back & Front',
      nivel: 'senior',
      somentePraticaReal: true,
      busca: 'node js',
      ordenacao: 'pratica',
    }
    expect(criteriosDaUrl(criteriosParaUrl(criterios))).toEqual(criterios)
  })
})
