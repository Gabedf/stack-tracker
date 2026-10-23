import { lazy } from 'react'
import { Route, Routes } from 'react-router'
import { AppLayout } from './components/layout'

// Cada view vira um chunk próprio: recharts e afins só baixam na rota que usa.
// O layout (cabeçalho e nav) fica no chunk inicial; o <Suspense> está nele.
const DashboardView = lazy(() =>
  import('./views/DashboardView').then((m) => ({ default: m.DashboardView })),
)
const StacksView = lazy(() => import('./views/StacksView').then((m) => ({ default: m.StacksView })))
const NewStackView = lazy(() =>
  import('./views/NewStackView').then((m) => ({ default: m.NewStackView })),
)
const StackDetailView = lazy(() =>
  import('./views/StackDetailView').then((m) => ({ default: m.StackDetailView })),
)
const EditStackView = lazy(() =>
  import('./views/EditStackView').then((m) => ({ default: m.EditStackView })),
)
const CharacterSheetView = lazy(() =>
  import('./views/CharacterSheetView').then((m) => ({ default: m.CharacterSheetView })),
)
const ResumeView = lazy(() => import('./views/ResumeView').then((m) => ({ default: m.ResumeView })))
const DataView = lazy(() => import('./views/DataView').then((m) => ({ default: m.DataView })))
const NotFoundView = lazy(() =>
  import('./views/NotFoundView').then((m) => ({ default: m.NotFoundView })),
)

/** Árvore de rotas do app. Fica fora do router para os testes usarem MemoryRouter. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardView />} />
        <Route path="stacks" element={<StacksView />} />
        <Route path="stacks/nova" element={<NewStackView />} />
        <Route path="stacks/:id" element={<StackDetailView />} />
        <Route path="stacks/:id/editar" element={<EditStackView />} />
        <Route path="ficha" element={<CharacterSheetView />} />
        <Route path="curriculo" element={<ResumeView />} />
        <Route path="dados" element={<DataView />} />
        <Route path="*" element={<NotFoundView />} />
      </Route>
    </Routes>
  )
}
