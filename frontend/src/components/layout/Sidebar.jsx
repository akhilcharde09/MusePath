import { NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { supabase } from '../../services/supabase'
import {
  LayoutDashboard, Map, Compass, PlayCircle, TrendingUp, User, LogOut, Music2
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/plan',      icon: Map,             label: 'My Plan' },
  { to: '/discover',  icon: Compass,         label: 'Discover' },
  { to: '/videos',    icon: PlayCircle,      label: 'Videos' },
  { to: '/progress',  icon: TrendingUp,      label: 'Progress' },
  { to: '/profile',   icon: User,            label: 'Profile' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { user, addToast } = useStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    addToast('Logged out. See you soon! 👋', 'info')
    if (onClose) onClose()
    navigate('/')
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'MP'
  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Musician'

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-6)', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          width: 30,
          height: 30,
          border: '2px solid #ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: '#ffffff',
          fontWeight: 'bold',
          flexShrink: 0
        }}>
          M
        </div>
        <span style={{ 
          fontSize: 'var(--text-lg)', 
          fontFamily: 'var(--font-display)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 'bold',
          color: '#ffffff'
        }}>
          MusePath
        </span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Menu</span>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="sidebar-bottom">
        <div className="sidebar-user" onClick={() => { navigate('/profile'); if (onClose) onClose(); }}>
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-ghost w-full mt-2"
          style={{ justifyContent: 'flex-start', gap: 'var(--space-3)', color: 'var(--text-muted)' }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
