import { ThemeToggle } from './themes'

function App() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Painel de Stacks</h1>
        <ThemeToggle />
      </header>
    </main>
  )
}

export default App
