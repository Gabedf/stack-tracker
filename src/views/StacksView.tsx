import { useDocumentTitle } from '../components/layout'

export function StacksView() {
  useDocumentTitle('Stacks')

  return (
    <section className="space-y-2">
      <h1 className="text-3xl font-bold">Stacks</h1>
      <p className="text-muted">Lista das stacks cadastradas, com filtros e ordenação. Em breve.</p>
    </section>
  )
}
