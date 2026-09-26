import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader, Center } from '@mantine/core'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Auth from './pages/Auth'
import MCQQuiz from './pages/MCQQuiz'
import CodingRound from './pages/CodingRound'
import Interview from './pages/Interview'
import Multiplayer from './pages/Multiplayer'
import Analytics from './pages/Analytics'

function RequireAccount({ children }) {
  const { user } = useAuth()
  if (user?.is_guest) return <Navigate to="/signup" replace state={{ reason: 'locked-feature' }} />
  return children
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export default function App() {
  const { loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader color="skyblue" size="lg" />
      </Center>
    )
  }

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<Auth mode="signup" />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/quiz" element={<MCQQuiz />} />
            <Route path="/coding" element={<CodingRound />} />
            <Route path="/interview" element={<Interview />} />
            <Route
              path="/battle"
              element={
                <RequireAccount>
                  <Multiplayer />
                </RequireAccount>
              }
            />
            <Route
              path="/analytics"
              element={
                <RequireAccount>
                  <Analytics />
                </RequireAccount>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Layout>
  )
}
