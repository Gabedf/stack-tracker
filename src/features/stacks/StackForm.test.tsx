import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StorageError } from '../../storage'
import { stackDoSeed } from '../../test/seed'
import { StackForm, type StackFormProps } from './StackForm'

const HOJE = new Date(2026, 9, 23)

function renderForm(props: Partial<StackFormProps> = {}) {
  const onSubmit = vi.fn<StackFormProps['onSubmit']>(async () => {})
  const onCancel = vi.fn()
  render(
    <StackForm
      onSubmit={onSubmit}
      onCancel={onCancel}
      categorias={['Frontend', 'Backend']}
      hoje={HOJE}
      {...props}
    />,
  )
  return { onSubmit, onCancel }
}

const campo = (rotulo: string) => screen.getByLabelText(rotulo)
const digitar = (rotulo: string, valor: string) =>
  fireEvent.change(campo(rotulo), { target: { value: valor } })
const salvar = () => fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
const notaPrevia = () =>
  within(screen.getByRole('complementary', { name: 'Prévia da nota' })).getByText(/^\d+,\d$/)

describe('StackForm', () => {
  it('começa em branco com último uso = hoje e preview zerado', () => {
    renderForm()
    expect(campo('Nome')).toHaveValue('')
    expect(campo('Último uso')).toHaveValue('2026-10-23')
    expect(campo('Tipo de experiência')).toHaveValue('so_teoria')
    expect(notaPrevia()).toHaveTextContent('0,0')
    expect(screen.getByText('Iniciante')).toBeInTheDocument()
  })

  it('oferece as categorias existentes no datalist', () => {
    renderForm()
    const lista = campo('Categoria').getAttribute('list')!
    const opcoes = document.getElementById(lista)!.querySelectorAll('option')
    expect([...opcoes].map((o) => o.value)).toEqual(['Frontend', 'Backend'])
  })

  it('envia dados limpos e tipados', async () => {
    const { onSubmit } = renderForm()
    digitar('Nome', ' Vue ')
    digitar('Categoria', 'Frontend')
    digitar('Tags', 'ui, spa,, ui')
    digitar('Teoria', '7.5')
    digitar('Prática', '6')
    digitar('Profundidade', '5')
    digitar('Último uso', '2026-10-01')
    digitar('Tipo de experiência', 'projeto_pessoal')
    digitar('Meses de experiência', '8')
    digitar('Notas', 'Composition API')
    salvar()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({
      nome: 'Vue',
      categoria: 'Frontend',
      tags: ['ui', 'spa'],
      dimensoes: { teoria: 7.5, pratica: 6, profundidade: 5, ultimoUso: '2026-10-01' },
      experiencia: { tipo: 'projeto_pessoal', meses: 8 },
      notas: 'Composition API',
    })
  })

  it('preview acompanha as dimensões', () => {
    renderForm()
    expect(campo('Teoria')).toHaveAttribute('aria-valuetext', '0,0 de 10')
    digitar('Teoria', '10')
    digitar('Prática', '10')
    digitar('Profundidade', '10')
    // 0.2*10 + 0.4*10 + 0.3*10, sem evidências e sem decaimento.
    expect(notaPrevia()).toHaveTextContent('9,0')
    expect(screen.getByText('Mestre')).toBeInTheDocument()
    expect(campo('Teoria')).toHaveAttribute('aria-valuetext', '10,0 de 10')
  })

  it('bloqueia nome vazio com erro acessível e foco no primeiro campo inválido', async () => {
    const { onSubmit } = renderForm()
    digitar('Meses de experiência', '-2')
    salvar()

    const nome = campo('Nome')
    await waitFor(() => expect(nome).toHaveFocus())
    expect(nome).toHaveAttribute('aria-invalid', 'true')
    expect(nome).toHaveAccessibleDescription('O nome não pode ficar vazio.')
    expect(campo('Categoria')).toHaveAccessibleDescription('A categoria não pode ficar vazia.')
    expect(campo('Meses de experiência')).toHaveAccessibleDescription(
      'Meses não pode ser negativo.',
    )
    expect(campo('Tags')).not.toHaveAttribute('aria-invalid')
    expect(onSubmit).not.toHaveBeenCalled()

    // Corrigir o campo limpa o erro dele.
    digitar('Nome', 'Vue')
    expect(nome).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText('O nome não pode ficar vazio.')).not.toBeInTheDocument()
  })

  it('foca o primeiro inválido na ordem da tela', async () => {
    renderForm()
    digitar('Nome', 'Vue')
    salvar()
    await waitFor(() => expect(campo('Categoria')).toHaveFocus())
  })

  it('edição começa com os valores da stack e mantém as evidências no preview', () => {
    const react = stackDoSeed('react')
    renderForm({ inicial: react })
    expect(screen.getByRole('form', { name: 'Editar React' })).toBeInTheDocument()
    expect(campo('Nome')).toHaveValue('React')
    expect(campo('Tags')).toHaveValue('ui, spa, hooks')
    expect(campo('Tipo de experiência')).toHaveValue('producao')
    expect(campo('Meses de experiência')).toHaveValue(36)
    expect(notaPrevia()).not.toHaveTextContent('0,0')
  })

  it('Cancelar chama onCancel sem enviar', () => {
    const { onSubmit, onCancel } = renderForm()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('desabilita o Salvar enquanto salva e mostra falha num alerta sem perder dados', async () => {
    let rejeitar!: (e: unknown) => void
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((_, rej) => {
          rejeitar = rej
        }),
    )
    renderForm({ onSubmit })
    digitar('Nome', 'Vue')
    digitar('Categoria', 'Frontend')
    salvar()

    const botao = await screen.findByRole('button', { name: 'Salvando…' })
    expect(botao).toBeDisabled()

    rejeitar(new StorageError('Não foi possível salvar as stacks.', ['disco cheio']))
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível salvar as stacks.')
    expect(alerta).toHaveTextContent('disco cheio')
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
    expect(campo('Nome')).toHaveValue('Vue')
    expect(campo('Categoria')).toHaveValue('Frontend')
  })

  it('salvando externo também desabilita o botão', () => {
    renderForm({ salvando: true })
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled()
  })
})
