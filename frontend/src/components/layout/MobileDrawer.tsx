import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  color: string
}

interface Props {
  open: boolean
  onClose: () => void
  items: NavItem[]
}

export default function MobileDrawer({ open, onClose, items }: Props) {
  if (!open) return null
  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,20,25,0.4)',
          zIndex: 1100,
        }}
      />
      {/* Drawer */}
      <aside
        role="dialog"
        aria-label="Menu de navegação"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '76vw', maxWidth: '320px',
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-lg)',
          padding: '24px',
          zIndex: 1101,
          display: 'flex', flexDirection: 'column', gap: '4px',
          animation: 'slideIn 0.2s ease-out',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Fechar menu"
          style={{
            alignSelf: 'flex-end',
            background: 'transparent', border: 'none',
            cursor: 'pointer', color: 'var(--text-muted)',
            marginBottom: '12px',
          }}
        >
          <X size={20} />
        </button>
        {items.map(({ to, icon: Icon, label, color }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onClose}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
              fontWeight: 700, letterSpacing: '0.04em',
              textDecoration: 'none', textTransform: 'uppercase',
              color: isActive ? 'var(--text-on-color)' : 'var(--text-secondary)',
              background: isActive ? color : 'transparent',
              border: isActive ? 'none' : '1px solid var(--border)',
            })}>
            <Icon size={16} />{label}
          </NavLink>
        ))}
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>
      </aside>
    </>
  )
}
