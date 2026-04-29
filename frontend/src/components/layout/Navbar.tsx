import { NavLink } from 'react-router-dom'
import { Activity, Swords, BookOpen, Bot, Eye, MessageSquare } from 'lucide-react'

const navItems = [
  { to: '/', icon: Activity, label: 'Dashboard', color: 'var(--green-field)' },
  { to: '/matchup', icon: Swords, label: 'Matchup', color: 'var(--green-field)' },
  { to: '/chat', icon: MessageSquare, label: 'RAG Chat', color: 'var(--blue-data)' },
  { to: '/agent', icon: Bot, label: 'AI Agent', color: 'var(--purple-ai)' },
  { to: '/encyclopedia', icon: BookOpen, label: 'Enciclopédia', color: 'var(--green-field)' },
  { to: '/vision', icon: Eye, label: 'Visão CV', color: 'var(--amber-warn)' },
]

const moduleColors: Record<string, string> = {
  '/': 'var(--green-field)',
  '/matchup': 'var(--green-field)',
  '/chat': 'var(--blue-data)',
  '/agent': 'var(--purple-ai)',
  '/encyclopedia': 'var(--green-field)',
  '/vision': 'var(--amber-warn)',
}

export default function Navbar() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
      background: 'rgba(6, 8, 16, 0.95)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: '4px', zIndex: 1000,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem',
        letterSpacing: '0.08em', color: 'var(--green-field)', marginRight: '24px',
        textTransform: 'uppercase', flexShrink: 0,
      }}>
        NFL<span style={{ color: 'var(--text-muted)' }}>/</span>LAB
      </div>

      <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
        {navItems.map(({ to, icon: Icon, label, color }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700,
              letterSpacing: '0.05em', textDecoration: 'none', textTransform: 'uppercase',
              transition: 'all 0.15s',
              color: isActive ? 'var(--bg-void)' : 'var(--text-secondary)',
              background: isActive ? color : 'transparent',
              border: isActive ? 'none' : '1px solid transparent',
            })}>
            <Icon size={12} />{label}
          </NavLink>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
        <span className="loading-dot" />API ONLINE
      </div>
    </nav>
  )
}
