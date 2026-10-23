import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { StacksProvider } from './features/stacks'
import { JsonFileAdapter } from './storage'

const adapter = new JsonFileAdapter()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StacksProvider adapter={adapter}>
      <App />
    </StacksProvider>
  </StrictMode>,
)
