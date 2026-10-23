import { useParams } from 'react-router'
import { useDocumentTitle } from '../components/layout'

export function StackDetailView() {
  const { id = '' } = useParams<{ id: string }>()
  useDocumentTitle(`Stack ${id}`)

  return (
    <section className="space-y-2">
      <h1 className="text-3xl font-bold">Detalhe da stack</h1>
      <p className="text-muted">
        Identificador:{' '}
        <code className="rounded-theme bg-surface-2 px-1.5 py-0.5 text-fg">{id}</code>
      </p>
    </section>
  )
}
