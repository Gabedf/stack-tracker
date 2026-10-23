import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { instalarMocksDoNavegador, simularMenosMovimento } from './browserMocks'

instalarMocksDoNavegador()

afterEach(() => {
  cleanup()
  simularMenosMovimento(false)
})
