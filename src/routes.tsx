import { Route, Routes } from 'react-router'
import { AppLayout } from './components/layout'
import {
  CharacterSheetView,
  DashboardView,
  DataView,
  EditStackView,
  NewStackView,
  NotFoundView,
  ResumeView,
  StackDetailView,
  StacksView,
} from './views'

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
