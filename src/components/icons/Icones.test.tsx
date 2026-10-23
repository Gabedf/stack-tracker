import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  IconeCertificado,
  IconeEmprego,
  IconeFloco,
  IconeLivro,
  IconeNivel,
  IconeProjeto,
  IconeRepositorio,
} from '.'

const ICONES = {
  IconeCertificado,
  IconeEmprego,
  IconeFloco,
  IconeLivro,
  IconeNivel,
  IconeProjeto,
  IconeRepositorio,
}

describe('ícones', () => {
  it.each(Object.entries(ICONES))('%s é decorativo e segue o tema via CSS', (_, Icone) => {
    const { container } = render(<Icone />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    expect(svg).toHaveAttribute('stroke', 'currentColor')
    expect(svg).toHaveAttribute('fill', 'currentColor')
    expect(svg).toHaveClass('icone', 'size-3.5')
  })

  it('aceita outro tamanho por className', () => {
    const { container } = render(<IconeNivel className="size-5" />)
    expect(container.querySelector('svg')).toHaveClass('icone', 'size-5')
    expect(container.querySelector('svg')).not.toHaveClass('size-3.5')
  })

  it('aceita posição e tamanho dentro de outro SVG', () => {
    const { container } = render(
      <svg>
        <IconeFloco x={4} y={6} tamanho={12} />
      </svg>,
    )
    const icone = container.querySelector('svg svg')!
    expect(icone).toHaveAttribute('x', '4')
    expect(icone).toHaveAttribute('y', '6')
    expect(icone).toHaveAttribute('width', '12')
    expect(icone).toHaveAttribute('height', '12')
  })
})
