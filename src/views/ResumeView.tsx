import { useDocumentTitle } from '../components/layout'

export function ResumeView() {
  useDocumentTitle('Currículo')

  return (
    <section className="space-y-2">
      <h1 className="text-3xl font-bold">Currículo</h1>
      <p className="text-muted">Exportação das stacks para o currículo. Em breve.</p>
    </section>
  )
}
