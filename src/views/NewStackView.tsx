import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { useDocumentTitle } from '../components/layout'
import { StackForm, useStacks, type DadosStackForm } from '../features/stacks'
import { categoriasDisponiveis } from '../features/stacks/stackFiltering'

export interface NewStackViewProps {
  /** Data de referência para o preview e o último uso padrão. Padrão: agora. */
  hoje?: Date
}

const CLASSE_LINK = 'font-medium text-accent underline underline-offset-2'

/** Criação de stack: salva via `adicionar` e abre o detalhe da stack nova. */
export function NewStackView({ hoje }: NewStackViewProps) {
  useDocumentTitle('Nova stack')
  const { stacks, status, erro, salvando, adicionar, limparErro } = useStacks()
  const navigate = useNavigate()

  // Ao sair do formulário (cancelar ou navegar), não deixa erro antigo no contexto.
  useEffect(() => limparErro, [limparErro])

  async function criar(dados: DadosStackForm) {
    const nova = await adicionar(dados)
    limparErro()
    navigate(`/stacks/${encodeURIComponent(nova.id)}`)
  }

  let conteudo
  if (status === 'carregando') {
    conteudo = (
      <p role="status" className="text-muted">
        Carregando stacks…
      </p>
    )
  } else if (status === 'erro') {
    conteudo = (
      <div role="alert" className="rounded-theme border border-danger bg-surface p-4 text-fg">
        <p className="font-semibold">Não foi possível carregar as stacks.</p>
        {erro && <p className="text-sm text-muted">{erro.message}</p>}
        <Link to="/stacks" className={CLASSE_LINK}>
          Voltar para Stacks
        </Link>
      </div>
    )
  } else {
    conteudo = (
      <StackForm
        categorias={categoriasDisponiveis(stacks)}
        salvando={salvando}
        hoje={hoje}
        onSubmit={criar}
        onCancel={() => navigate('/stacks')}
      />
    )
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Nova stack</h1>
      {conteudo}
    </section>
  )
}
