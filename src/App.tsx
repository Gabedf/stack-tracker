import { MotionConfig } from 'framer-motion'
import { BrowserRouter } from 'react-router'
import { LevelUpProvider } from './features/character'
import { AppRoutes } from './routes'

function App() {
  return (
    // "user": com prefers-reduced-motion, o Framer Motion não anima transformações.
    <MotionConfig reducedMotion="user">
      <LevelUpProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </LevelUpProvider>
    </MotionConfig>
  )
}

export default App
