import { useDocumentTitle } from '../components/layout'

export function DashboardView() {
  useDocumentTitle('Dashboard')

  return (
    <section className="space-y-2">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted">Visão geral das suas stacks: notas, níveis e evolução. Em breve.</p>
    </section>
  )
}
