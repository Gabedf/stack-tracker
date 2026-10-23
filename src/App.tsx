import { MotionConfig } from 'framer-motion'
import { BrowserRouter } from 'react-router'
import { AppRoutes } from './routes'

function App() {
  return (
    // "user": com prefers-reduced-motion, o Framer Motion não anima transformações.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </MotionConfig>
  )
}

export default App
