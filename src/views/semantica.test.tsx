import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeAll, describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import { MotionProvider } from '../components/motion'
import type { StacksFile } from '../domain/types'
import { LevelUpProvider } from '../features/character'
import { StacksProvider } from '../features/stacks'
import { AppRoutes } from '../routes'
import type { StorageAdapter } from '../storage'
import { HOJE_SEED, stacksDoSeed } from '../test/seed'
import { ThemeProvider } from '../themes'

/** Adapter em memória com o seed: as views renderizam com dados reais. */
function adapterComSeed(): StorageAdapter {
  let dados: StacksFile = { versao: 1, stacks: stacksDoSeed() }
  return {
    carregar: async () => structuredClone(dados),
    salvar: async (novo) => {
      dados = structuredClone(novo)
      return structuredClone(dados)
    },
  }
}

function renderEm(rota: string) {
  return render(
    <ThemeProvider>
      <StacksProvider adapter={adapterComSeed()} hoje={HOJE_SEED}>
        <MotionProvider reducedMotion="always">
          <LevelUpProvider hoje={HOJE_SEED}>
            <MemoryRouter initialEntries={[rota]}>
              <AppRoutes />
            </MemoryRouter>
          </LevelUpProvider>
        </MotionProvider>
      </StacksProvider>
    </ThemeProvider>,
  )
}

beforeAll(() => import('./index'))

/** Níveis dos headings visíveis, na ordem do documento. */
function niveisDosTitulos(): number[] {
  return screen.getAllByRole('heading').map((h) => Number(h.tagName.slice(1)))
}

const ROTAS: ReadonlyArray<readonly [string, string | RegExp]> = [
  ['/', 'Dashboard'],
  ['/stacks', 'Stacks'],
  ['/stacks/react', 'React'],
  ['/stacks/nova', 'Nova stack'],
  ['/stacks/react/editar', /^Editar/],
  ['/ficha', 'Ficha do personagem'],
  ['/curriculo', 'Currículo'],
  ['/dados', 'Dados'],
  ['/nao-existe', 'Página não encontrada'],
]

describe('semântica das páginas', () => {
  it('o documento declara lang="pt-BR"', () => {
    expect(indexHtml).toMatch(/<html[^>]*\blang="pt-BR"/)
  })

  it.each(ROTAS)(
    '%s: um h1, headings sem saltos, landmarks e campos rotulados',
    async (rota, h1) => {
      const { container } = renderEm(rota)
      // Espera os dados: o h1 final da página (o de "Carregando…" pode ser outro).
      await screen.findByRole('heading', { level: 1, name: h1 }, { timeout: 3000 })

      const niveis = niveisDosTitulos()
      expect(niveis.filter((n) => n === 1)).toHaveLength(1)
      expect(niveis[0]).toBe(1)
      const saltos = niveis.flatMap((n, i) =>
        i > 0 && n > niveis[i - 1] + 1 ? [`${niveis[i - 1]}->${n}`] : [],
      )
      expect(saltos).toEqual([])

      // header/footer fora de <main> e de seções são os landmarks banner e contentinfo
      // (os de cards e seções não são; o jsdom não faz essa distinção sozinho).
      const deTopo = (tag: string) =>
        Array.from(container.querySelectorAll(tag)).filter(
          (el) => !el.closest('main, article, section, aside, nav'),
        )
      expect(deTopo('header')).toHaveLength(1)
      expect(deTopo('footer')).toHaveLength(1)
      expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()

      const campos = container.querySelectorAll('input:not([type="hidden"]), select, textarea')
      for (const campo of campos) expect(campo).toHaveAccessibleName()

      // SVG sem nome acessível tem de estar escondido do leitor de tela.
      const svgsSoltos = Array.from(container.querySelectorAll('svg')).filter(
        (svg) =>
          !svg.closest('[aria-hidden="true"]') &&
          !svg.closest('[role="img"]') &&
          !svg.getAttribute('aria-label') &&
          !svg.getAttribute('role'),
      )
      expect(svgsSoltos).toEqual([])

      expect(within(screen.getByRole('main')).getAllByRole('heading', { level: 1 })).toHaveLength(1)
    },
  )
})
