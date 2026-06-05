import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Menu, X } from 'lucide-react'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-layout">
      {/* Mobile Top Navbar */}
      <div className="mobile-header">
        {/* Stark Logo in Mobile Header */}
        <div className="flex items-center gap-3">
          <div style={{
            width: 26,
            height: 26,
            border: '2px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: '#ffffff',
            fontWeight: 'bold',
            flexShrink: 0
          }}>
            M
          </div>
          <span style={{ 
            fontSize: 'var(--text-md)', 
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 'bold',
            color: '#ffffff'
          }}>
            MusePath
          </span>
        </div>

        {/* Hamburger Toggle */}
        <button 
          onClick={() => setSidebarOpen(o => !o)} 
          style={{ color: '#ffffff', display: 'flex', alignItems: 'center', padding: '4px' }}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Backdrop Overlay on Mobile */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="mobile-overlay"
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
