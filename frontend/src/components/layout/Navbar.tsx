import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { Home, Activity, Swords, BookOpen, Bot, Eye } from 'lucide-react'

const navItems = [
  { to: '/',             icon: Home,     label: 'Início',       color: 'var(--green-field)' },
  { to: '/dashboard',    icon: Activity, label: 'Dashboard',    color: 'var(--green-field)' },
  { to: '/matchup',      icon: Swords,   label: 'Confronto',    color: 'var(--green-field)' },
  { to: '/agent',        icon: Bot,      label: 'Agente IA',    color: 'var(--purple-ai)' },
  { to: '/encyclopedia', icon: BookOpen, label: 'Enciclopédia', color: 'var(--green-field)' },
  { to: '/vision',       icon: Eye,      label: 'Visão CV',     color: 'var(--amber-warn)' },
]

export default function Navbar() {
  const [showTagline, setShowTagline] = useState(false)

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
      background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: '4px', zIndex: 1000,
    }}>
      <div
        onMouseEnter={() => setShowTagline(true)}
        onMouseLeave={() => setShowTagline(false)}
        style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem',
          letterSpacing: '0.08em', color: 'var(--green-field)', marginRight: '24px',
          textTransform: 'uppercase', flexShrink: 0, position: 'relative', cursor: 'default',
        }}
      >
        NFL<span style={{ color: 'var(--text-muted)' }}>/</span>LAB
        {showTagline && (
          <div style={{
            position: 'absolute', top: '100%', left: 0,
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
            color: 'var(--text-muted)', fontWeight: 400,
            textTransform: 'none', letterSpacing: '0.04em',
            whiteSpace: 'nowrap', marginTop: '2px',
          }}>
            feito por quem ama o jogo
          </div>
        )}
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
              color: isActive ? 'var(--text-on-color)' : 'var(--text-secondary)',
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
