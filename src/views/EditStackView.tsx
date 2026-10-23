import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useDocumentTitle } from '../components/layout'
import { DeleteStackButton, StackForm, useStacks, type DadosStackForm } from '../features/stacks'
import { categoriasDisponiveis } from '../features/stacks/stackFiltering'

export interface EditStackViewProps {
  /** Data de referência para o preview da nota. Padrão: agora. */
  hoje?: Date
}

const CLASSE_LINK = 'font-medium text-accent underline underline-offset-2'

/** Edição de stack: salva via `atualizar` (mesmo id) e volta ao detalhe. */
export function EditStackView({ hoje }: EditStackViewProps) {
  const { id = '' } = useParams<{ id: string }>()
  const { stacks, status, erro, salvando, atualizar, remover, limparErro } = useStacks()
  const navigate = useNavigate()
  const stack = stacks.find((s) => s.id === id)
  useDocumentTitle(stack ? `Editar ${stack.nome}` : 'Editar stack')

  const detalhe = `/stacks/${encodeURIComponent(id)}`

  // Ao sair do formulário (cancelar ou navegar), não deixa erro antigo no contexto.
  useEffect(() => limparErro, [limparErro])

  async function salvar(dados: DadosStackForm) {
    // notas explícito: apagar o texto remove as notas salvas.
    await atualizar(id, { ...dados, notas: dados.notas })
    limparErro()
    navigate(detalhe)
  }

  async function excluir() {
    await remover(id)
    limparErro()
    navigate('/stacks')
  }

  if (status === 'carregando') {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Editar stack</h1>
        <p role="status" className="text-muted">
          Carregando stacks…
        </p>
      </section>
    )
  }

  if (status === 'erro') {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Editar stack</h1>
        <div role="alert" className="rounded-theme border border-danger bg-surface p-4 text-fg">
          <p className="font-semibold">Não foi possível carregar as stacks.</p>
          {erro && <p className="text-sm text-muted">{erro.message}</p>}
          <Link to="/stacks" className={CLASSE_LINK}>
            Voltar para Stacks
          </Link>
        </div>
      </section>
    )
  }

  if (!stack) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Stack não encontrada</h1>
        <p className="text-muted">
          Não existe stack com o identificador{' '}
          <code className="rounded-theme bg-surface-2 px-1.5 py-0.5 text-fg">{id}</code>.{' '}
          <Link to="/stacks" className={CLASSE_LINK}>
            Voltar para Stacks
          </Link>
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Editar {stack.nome}</h1>
      <StackForm
        inicial={stack}
        categorias={categoriasDisponiveis(stacks)}
        salvando={salvando}
        hoje={hoje}
        onSubmit={salvar}
        onCancel={() => navigate(detalhe)}
      />
      <section
        aria-labelledby="zona-perigo"
        className="space-y-3 rounded-theme border border-border bg-surface-2 p-4"
      >
        <h2 id="zona-perigo" className="font-heading text-lg font-semibold">
          Zona de perigo
        </h2>
        <DeleteStackButton nome={stack.nome} onConfirm={excluir} />
      </section>
    </section>
  )
}
