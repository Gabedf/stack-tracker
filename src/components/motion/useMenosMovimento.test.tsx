import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { simularMenosMovimento } from '../../test/browserMocks'
import { useMenosMovimento } from './useMenosMovimento'

function Sonda() {
  return <span data-testid="menos">{String(useMenosMovimento())}</span>
}

describe('useMenosMovimento', () => {
  it('lê a preferência e acompanha mudanças', () => {
    render(<Sonda />)
    expect(screen.getByTestId('menos')).toHaveTextContent('false')

    act(() => simularMenosMovimento(true))
    expect(screen.getByTestId('menos')).toHaveTextContent('true')

    act(() => simularMenosMovimento(false))
    expect(screen.getByTestId('menos')).toHaveTextContent('false')
  })

  it('já começa ligado se a preferência estiver ativa', () => {
    simularMenosMovimento(true)
    render(<Sonda />)
    expect(screen.getByTestId('menos')).toHaveTextContent('true')
  })
})
