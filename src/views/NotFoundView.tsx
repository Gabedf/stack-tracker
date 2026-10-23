import { Link } from 'react-router'
import { useDocumentTitle } from '../components/layout'

export function NotFoundView() {
  useDocumentTitle('Página não encontrada')

  return (
    <section className="space-y-2">
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <p className="text-muted">
        O endereço acessado não existe.{' '}
        <Link to="/" className="font-medium text-accent underline underline-offset-2">
          Voltar ao Dashboard
        </Link>
      </p>
    </section>
  )
}
