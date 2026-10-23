import { describe, expect, it } from 'vitest'
import type { Evidencia, Stack, TipoExperiencia } from '../../domain/types'
import { HOJE_SEED, stacksDoSeed } from '../../test/seed'
import { normalizarTexto } from '../stacks/stackFiltering'
import {
  MENSAGEM_CURRICULO_VAZIO,
  escaparMarkdown,
  formatarTempo,
  gerarMarkdownCurriculo,
  markdownDaSelecao,
  selecionarParaCurriculo,
  temComprovacao,
  type SelecaoCurriculo,
} from './resumeExport'
import { DEFAULT_OPCOES_CURRICULO, resolverOpcoesCurriculo } from './resumeOptions'

/*
 * Notas do seed com hoje = 23/10/2026 (ver dashboardStats.test.ts):
 *   react 8,4 Mestre · nodejs 5,5 Praticante · kubernetes 3,8 Aprendiz (sei por saber)
 *   jquery 4,9 Praticante · postgresql 2,6 Aprendiz (estudo, sem evidências)
 */

const hoje = HOJE_SEED

interface DadosFake {
  nome: string
  categoria?: string
  /** Valor de teoria, prática e profundidade (sem evidências: nota = 0,9 × valor). */
  valor?: number
  teoria?: number
  pratica?: number
  tipo?: TipoExperiencia
  meses?: number
  evidencias?: Evidencia[]
}

function fake({
  nome,
  categoria = 'Geral',
  valor = 5,
  teoria = valor,
  pratica = valor,
  tipo = 'projeto_pessoal',
  meses = 12,
  evidencias = [],
}: DadosFake): Stack {
  return {
    id: normalizarTexto(nome).replace(/\W+/g, '-'),
    nome,
    categoria,
    tags: [],
    dimensoes: { teoria, pratica, profundidade: valor, ultimoUso: '2026-10-01' },
    experiencia: { tipo, meses },
    evidencias,
    historico: [],
  }
}

function idsPorGrupo(selecao: SelecaoCurriculo): Record<string, string[]> {
  return Object.fromEntries(
    selecao.grupos.map((g) => [g.categoria, g.stacks.map((item) => item.stack.id)]),
  )
}

function motivos(selecao: SelecaoCurriculo): Record<string, string> {
  return Object.fromEntries(selecao.excluidas.map((e) => [e.stack.id, e.motivo]))
}

describe('opções do currículo', () => {
  it('tem padrões conservadores: só o comprovado, sem nota', () => {
    expect(DEFAULT_OPCOES_CURRICULO).toEqual({
      categorias: null,
      nivelMinimo: null,
      somenteComprovado: true,
      incluirSeiPorSaber: false,
      mostrarNivel: true,
      mostrarNota: false,
      mostrarTempo: true,
      incluirEvidencias: true,
      titulo: 'Competências técnicas',
    })
  })

  it('completa opções parciais e ignora campos undefined', () => {
    const o = resolverOpcoesCurriculo({ mostrarNota: true, titulo: undefined })
    expect(o.mostrarNota).toBe(true)
    expect(o.titulo).toBe('Competências técnicas')
    expect(o.somenteComprovado).toBe(true)
  })
})

describe('temComprovacao', () => {
  it('aceita evidência ou prática real (projeto pessoal / produção)', () => {
    const ev: Evidencia = { titulo: 'x', descricao: '', tipo: 'repo' }
    expect(temComprovacao(fake({ nome: 'A', tipo: 'estudo', evidencias: [ev] }))).toBe(true)
    expect(temComprovacao(fake({ nome: 'B', tipo: 'projeto_pessoal' }))).toBe(true)
    expect(temComprovacao(fake({ nome: 'C', tipo: 'producao' }))).toBe(true)
    expect(temComprovacao(fake({ nome: 'D', tipo: 'estudo' }))).toBe(false)
    expect(temComprovacao(fake({ nome: 'E', tipo: 'so_teoria' }))).toBe(false)
  })
})

describe('selecionarParaCurriculo com o seed', () => {
  it('por padrão só inclui o que tem evidência ou prática real', () => {
    const selecao = selecionarParaCurriculo(stacksDoSeed(), {}, { hoje })
    expect(idsPorGrupo(selecao)).toEqual({
      Backend: ['nodejs'],
      Frontend: ['react', 'jquery'],
    })
    expect(selecao.conhecimentoTeorico).toEqual([])
    expect(motivos(selecao)).toEqual({
      kubernetes: 'sei_por_saber',
      postgresql: 'sem_comprovacao',
    })
  })

  it('agrupa por categoria em ordem alfabética e ordena por nota desc', () => {
    const selecao = selecionarParaCurriculo(stacksDoSeed(), { somenteComprovado: false }, { hoje })
    expect(selecao.grupos.map((g) => g.categoria)).toEqual(['Backend', 'Dados', 'Frontend'])
    const frontend = selecao.grupos.find((g) => g.categoria === 'Frontend')
    expect(frontend?.stacks.map((s) => [s.stack.id, s.nota, s.nivel.id])).toEqual([
      ['react', 8.4, 'mestre'],
      ['jquery', 4.9, 'praticante'],
    ])
  })

  it('somenteComprovado=false inclui todas, menos a sei por saber', () => {
    const selecao = selecionarParaCurriculo(stacksDoSeed(), { somenteComprovado: false }, { hoje })
    expect(idsPorGrupo(selecao)).toEqual({
      Backend: ['nodejs'],
      Dados: ['postgresql'],
      Frontend: ['react', 'jquery'],
    })
    expect(motivos(selecao)).toEqual({ kubernetes: 'sei_por_saber' })
  })

  it('incluirSeiPorSaber põe a stack na seção de conhecimento teórico', () => {
    const selecao = selecionarParaCurriculo(
      stacksDoSeed(),
      { somenteComprovado: false, incluirSeiPorSaber: true },
      { hoje },
    )
    expect(selecao.conhecimentoTeorico.map((s) => s.stack.id)).toEqual(['kubernetes'])
    expect(selecao.grupos.map((g) => g.categoria)).toEqual(['Backend', 'Dados', 'Frontend'])
    expect(selecao.excluidas).toEqual([])
  })

  it('incluirSeiPorSaber não tem efeito com somenteComprovado ligado', () => {
    const selecao = selecionarParaCurriculo(stacksDoSeed(), { incluirSeiPorSaber: true }, { hoje })
    expect(selecao.conhecimentoTeorico).toEqual([])
    expect(motivos(selecao).kubernetes).toBe('sei_por_saber')
  })

  it('combina filtro de categoria e nível mínimo', () => {
    const selecao = selecionarParaCurriculo(
      stacksDoSeed(),
      { categorias: ['Frontend', 'Backend', 'DevOps'], nivelMinimo: 'senior' },
      { hoje },
    )
    expect(idsPorGrupo(selecao)).toEqual({ Frontend: ['react'] })
    expect(motivos(selecao)).toEqual({
      nodejs: 'nivel',
      kubernetes: 'nivel',
      jquery: 'nivel',
      postgresql: 'categoria',
    })
  })

  it('nível mínimo é inclusivo no limite inferior da faixa', () => {
    const selecao = selecionarParaCurriculo(stacksDoSeed(), { nivelMinimo: 'praticante' }, { hoje })
    expect(idsPorGrupo(selecao)).toEqual({ Backend: ['nodejs'], Frontend: ['react', 'jquery'] })
  })

  it('lista vazia de categorias exclui tudo', () => {
    const selecao = selecionarParaCurriculo(stacksDoSeed(), { categorias: [] }, { hoje })
    expect(selecao.grupos).toEqual([])
    expect(selecao.excluidas.every((e) => e.motivo === 'categoria')).toBe(true)
    expect(selecao.excluidas).toHaveLength(5)
  })

  it('não altera o array recebido', () => {
    const stacks = stacksDoSeed()
    const ordemOriginal = stacks.map((s) => s.id)
    selecionarParaCurriculo(stacks, { somenteComprovado: false }, { hoje })
    expect(stacks.map((s) => s.id)).toEqual(ordemOriginal)
  })
})

describe('selecionarParaCurriculo com dados sintéticos', () => {
  it('estudo com evidência entra; estudo sem evidência fica de fora', () => {
    const ev: Evidencia = { titulo: 'Curso', descricao: '', tipo: 'certificado' }
    const selecao = selecionarParaCurriculo(
      [
        fake({ nome: 'Com evidência', tipo: 'estudo', evidencias: [ev] }),
        fake({ nome: 'Sem evidência', tipo: 'estudo' }),
      ],
      {},
      { hoje },
    )
    expect(idsPorGrupo(selecao)).toEqual({ Geral: ['com-evidencia'] })
    expect(motivos(selecao)).toEqual({ 'sem-evidencia': 'sem_comprovacao' })
  })

  it('desempata nota igual pelo nome (pt-BR) e ordena categorias com acento', () => {
    const selecao = selecionarParaCurriculo(
      [
        fake({ nome: 'Zeta', categoria: 'Ética', valor: 6 }),
        fake({ nome: 'beta', categoria: 'Ética', valor: 6 }),
        fake({ nome: 'Alfa', categoria: 'Ética', valor: 4 }),
        fake({ nome: 'Gama', categoria: 'Dados', valor: 6 }),
        fake({ nome: 'Delta', categoria: 'Front', valor: 6 }),
      ],
      {},
      { hoje },
    )
    expect(selecao.grupos.map((g) => g.categoria)).toEqual(['Dados', 'Ética', 'Front'])
    expect(idsPorGrupo(selecao)['Ética']).toEqual(['beta', 'zeta', 'alfa'])
  })
})

describe('formatarTempo', () => {
  it.each([
    [0, '0 meses'],
    [1, '1 mês'],
    [2, '2 meses'],
    [11, '11 meses'],
    [12, '1 ano'],
    [13, '1 ano e 1 mês'],
    [14, '1 ano e 2 meses'],
    [24, '2 anos'],
    [25, '2 anos e 1 mês'],
    [27, '2 anos e 3 meses'],
  ])('%i meses -> "%s"', (meses, esperado) => {
    expect(formatarTempo(meses)).toBe(esperado)
  })

  it('trata negativos, frações e NaN', () => {
    expect(formatarTempo(-3)).toBe('0 meses')
    expect(formatarTempo(13.9)).toBe('1 ano e 1 mês')
    expect(formatarTempo(Number.NaN)).toBe('0 meses')
  })
})

describe('escaparMarkdown', () => {
  it('escapa ênfase, links, código e HTML', () => {
    expect(escaparMarkdown('*a* _b_ [c](d) `e` <f> a|b ~g~ \\')).toBe(
      '\\*a\\* \\_b\\_ \\[c\\](d) \\`e\\` \\<f\\> a\\|b \\~g\\~ \\\\',
    )
  })

  it('escapa marcadores de início de linha', () => {
    expect(escaparMarkdown('# título')).toBe('\\# título')
    expect(escaparMarkdown('> citação')).toBe('\\> citação')
    expect(escaparMarkdown('- item')).toBe('\\- item')
    expect(escaparMarkdown('+ item')).toBe('\\+ item')
    expect(escaparMarkdown('2026. Ano')).toBe('2026\\. Ano')
  })

  it('preserva texto comum e junta quebras de linha e espaços', () => {
    expect(escaparMarkdown('Node.js, C# e react-ui-kit')).toBe('Node.js, C# e react-ui-kit')
    expect(escaparMarkdown('  linha 1\n\n  linha   2  ')).toBe('linha 1 linha 2')
  })
})

/** Markdown padrão do seed (hoje = 23/10/2026). */
const MARKDOWN_PADRAO_SEED = [
  '## Competências técnicas',
  '',
  '### Backend',
  '',
  '- **Node.js** — Praticante · 1 ano e 2 meses · Projeto pessoal',
  '  - [api-tarefas](https://git.example.com/exemplo/api-tarefas) — API REST de tarefas com autenticação JWT.',
  '',
  '### Frontend',
  '',
  '- **React** — Mestre · 3 anos · Produção',
  '  - [Desenvolvedor frontend na Empresa Exemplo](https://empresa.example.com) — Manutenção e evolução de um painel administrativo em React.',
  '  - [Loja Exemplo](https://loja.example.com) — E-commerce fictício com carrinho, checkout e testes de componentes.',
  '  - [react-ui-kit](https://git.example.com/exemplo/react-ui-kit) — Biblioteca de componentes acessíveis.',
  '  - [Certificado React Avançado](https://cursos.example.com/certificados/react-avancado) — Curso online de padrões avançados.',
  '- **jQuery** — Praticante · 1 ano e 8 meses · Produção',
  '  - Estágio na Agência Exemplo — Sites institucionais com jQuery e plugins.',
  '',
].join('\n')

describe('gerarMarkdownCurriculo com o seed', () => {
  it('gera o Markdown padrão esperado', () => {
    expect(gerarMarkdownCurriculo(stacksDoSeed(), undefined, { hoje })).toBe(MARKDOWN_PADRAO_SEED)
  })

  it('termina com uma única newline e não deixa espaços sobrando', () => {
    const md = gerarMarkdownCurriculo(
      stacksDoSeed(),
      { somenteComprovado: false, incluirSeiPorSaber: true, mostrarNota: true },
      { hoje },
    )
    expect(md.endsWith('\n')).toBe(true)
    expect(md.endsWith('\n\n')).toBe(false)
    expect(md).not.toMatch(/[ \t]$/m)
    expect(md).not.toMatch(/\n{3,}/)
  })

  it('mostrarNota acrescenta a nota em formato pt-BR', () => {
    const md = gerarMarkdownCurriculo(stacksDoSeed(), { mostrarNota: true }, { hoje })
    expect(md).toContain('- **React** — Mestre · Nota 8,4 · 3 anos · Produção\n')
    expect(md).toContain('- **jQuery** — Praticante · Nota 4,9 · 1 ano e 8 meses · Produção\n')
  })

  it('sem nível, tempo e evidências fica só nome e tipo de experiência', () => {
    const md = gerarMarkdownCurriculo(
      stacksDoSeed(),
      {
        mostrarNivel: false,
        mostrarTempo: false,
        incluirEvidencias: false,
        categorias: ['Frontend'],
      },
      { hoje },
    )
    expect(md).toBe(
      [
        '## Competências técnicas',
        '',
        '### Frontend',
        '',
        '- **React** — Produção',
        '- **jQuery** — Produção',
        '',
      ].join('\n'),
    )
  })

  it('põe as stacks sei por saber numa seção separada, por último', () => {
    const md = gerarMarkdownCurriculo(
      stacksDoSeed(),
      { somenteComprovado: false, incluirSeiPorSaber: true, incluirEvidencias: false },
      { hoje },
    )
    expect(md).toBe(
      [
        '## Competências técnicas',
        '',
        '### Backend',
        '',
        '- **Node.js** — Praticante · 1 ano e 2 meses · Projeto pessoal',
        '',
        '### Dados',
        '',
        '- **PostgreSQL** — Aprendiz · 3 meses · Estudo',
        '',
        '### Frontend',
        '',
        '- **React** — Mestre · 3 anos · Produção',
        '- **jQuery** — Praticante · 1 ano e 8 meses · Produção',
        '',
        '### Conhecimento teórico',
        '',
        '- **Kubernetes** — Aprendiz · Só teoria',
        '',
      ].join('\n'),
    )
  })

  it('usa o título informado ou omite o título vazio', () => {
    const opcoes = { categorias: ['Backend'], incluirEvidencias: false }
    expect(
      gerarMarkdownCurriculo(stacksDoSeed(), { ...opcoes, titulo: 'Skills' }, { hoje }),
    ).toMatch(/^## Skills\n\n### Backend\n/)
    expect(gerarMarkdownCurriculo(stacksDoSeed(), { ...opcoes, titulo: '  ' }, { hoje })).toBe(
      '### Backend\n\n- **Node.js** — Praticante · 1 ano e 2 meses · Projeto pessoal\n',
    )
  })

  it('sem nada incluído mostra uma mensagem curta em itálico', () => {
    const vazio = `## Competências técnicas\n\n${MENSAGEM_CURRICULO_VAZIO}\n`
    expect(
      gerarMarkdownCurriculo(
        stacksDoSeed(),
        { nivelMinimo: 'mestre', categorias: ['Dados'] },
        { hoje },
      ),
    ).toBe(vazio)
    expect(gerarMarkdownCurriculo([], {}, { hoje })).toBe(vazio)
    expect(MENSAGEM_CURRICULO_VAZIO).toMatch(/^_[^_]+_$/)
  })

  it('markdownDaSelecao gera o mesmo resultado a partir da seleção', () => {
    const selecao = selecionarParaCurriculo(stacksDoSeed(), {}, { hoje })
    expect(markdownDaSelecao(selecao)).toBe(MARKDOWN_PADRAO_SEED)
  })
})

describe('gerarMarkdownCurriculo com textos do usuário', () => {
  it('escapa nome, categoria, título e descrição das evidências', () => {
    const md = gerarMarkdownCurriculo(
      [
        fake({
          nome: '*Node*_js',
          categoria: '[Back]end',
          meses: 0,
          evidencias: [
            {
              titulo: 'repo [v2]',
              url: 'https://git.example.com/a_b',
              descricao: 'Usa **negrito**\ne <b>html</b>',
              tipo: 'repo',
            },
          ],
        }),
      ],
      { mostrarNivel: false },
      { hoje },
    )
    expect(md).toBe(
      [
        '## Competências técnicas',
        '',
        '### \\[Back\\]end',
        '',
        '- **\\*Node\\*\\_js** — Projeto pessoal',
        '  - [repo \\[v2\\]](https://git.example.com/a_b) — Usa \\*\\*negrito\\*\\* e \\<b\\>html\\</b\\>',
        '',
      ].join('\n'),
    )
  })

  it('url ausente ou vazia vira texto sem link; espaço e parênteses na url são codificados', () => {
    const md = gerarMarkdownCurriculo(
      [
        fake({
          nome: 'Go',
          evidencias: [
            { titulo: 'Sem link', descricao: 'Interno.', tipo: 'emprego' },
            { titulo: 'Vazio', url: '  ', descricao: '', tipo: 'projeto' },
            { titulo: 'Wiki', url: 'https://w.example.com/Go (lang)', descricao: '', tipo: 'repo' },
          ],
        }),
      ],
      {},
      { hoje },
    )
    expect(md).toContain('  - Sem link — Interno.\n')
    expect(md).toContain('  - Vazio\n')
    expect(md).toContain('  - [Wiki](https://w.example.com/Go%20%28lang%29)\n')
    expect(md).not.toContain('[Sem link]')
  })
})
