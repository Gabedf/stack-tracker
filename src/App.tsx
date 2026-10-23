import { BrowserRouter } from 'react-router'
import { MotionProvider } from './components/motion'
import { LevelUpProvider } from './features/character'
import { AppRoutes } from './routes'

function App() {
  return (
    <MotionProvider>
      <LevelUpProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </LevelUpProvider>
    </MotionProvider>
  )
}

export default App
