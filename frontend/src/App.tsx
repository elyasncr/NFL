import { Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Dashboard from './pages/Dashboard'
import Matchup from './pages/Matchup'
import Encyclopedia from './pages/Encyclopedia'
import Chat from './pages/Chat'
import Agent from './pages/Agent'
import Vision from './pages/Vision'

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      <Navbar />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 24px 48px' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/matchup" element={<Matchup />} />
          <Route path="/encyclopedia" element={<Encyclopedia />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/vision" element={<Vision />} />
        </Routes>
      </main>
    </div>
  )
}
