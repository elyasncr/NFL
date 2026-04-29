import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Tribune from './pages/Tribune'
import Dashboard from './pages/Dashboard'
import Matchup from './pages/Matchup'
import Encyclopedia from './pages/Encyclopedia'
import TribuneChatWidget from './components/chat/TribuneChatWidget'
import Skeleton from './components/ui/Skeleton'

const Agent = lazy(() => import('./pages/Agent'))
const Vision = lazy(() => import('./pages/Vision'))

function PageFallback() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Skeleton variant="line" width="40%" />
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>
  )
}

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      <Navbar />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 24px 48px' }}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Tribune />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/matchup" element={<Matchup />} />
            <Route path="/encyclopedia" element={<Encyclopedia />} />
            <Route path="/agent" element={<Agent />} />
            <Route path="/vision" element={<Vision />} />
          </Routes>
        </Suspense>
      </main>
      <TribuneChatWidget />
    </div>
  )
}
