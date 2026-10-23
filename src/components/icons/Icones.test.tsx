import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  IconeCertificado,
  IconeEmprego,
  IconeLivro,
  IconeNivel,
  IconeProjeto,
  IconeRepositorio,
} from '.'

const ICONES = {
  IconeCertificado,
  IconeEmprego,
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
})
