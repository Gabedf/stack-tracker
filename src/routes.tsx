import { Route, Routes } from 'react-router'
import { AppLayout } from './components/layout'
import { DashboardView, NotFoundView, ResumeView, StackDetailView, StacksView } from './views'

/** Árvore de rotas do app. Fica fora do router para os testes usarem MemoryRouter. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardView />} />
        <Route path="stacks" element={<StacksView />} />
        <Route path="stacks/:id" element={<StackDetailView />} />
        <Route path="curriculo" element={<ResumeView />} />
        <Route path="*" element={<NotFoundView />} />
      </Route>
    </Routes>
  )
}
