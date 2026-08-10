import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IKYAM_LOGO } from '../assets/logo'

const NAV_ITEMS = [
  { to: '/today', label: 'Today', icon: '◉' },
  { to: '/leads', label: 'Leads', icon: '▤' },
  { to: '/pipeline', label: 'Pipeline', icon: '▦' },
  { to: '/accounts', label: 'Accounts', icon: '▣' },
  { to: '/contacts', label: 'Contacts', icon: '◫' },
  { to: '/activities', label: 'Activities', icon: '✓' },
  { to: '/quotes', label: 'Quotes', icon: '▥' },
  { to: '/reports', label: 'Reports', icon: '◧' },
  { to: '/dashboard', label: 'Dashboard', icon: '◆' },
  { to: '/sync', label: 'Sync monitor', icon: '⟲' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function AppShell({ children, aiPanel }) {
  const { user, tenant, companies, companyId, switchCompany, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="shell" style={{ minHeight: '100vh', gridTemplateColumns: aiPanel ? '206px 1fr 280px' : '206px 1fr' }}>
      <aside className="rail">
        <div className="logo rowx" style={{ gap: 8 }}>
          <img src={IKYAM_LOGO} alt="Ikyam" style={{ height: 22 }} />
          <b style={{ font: '600 13px var(--d)' }}>Ikyam CRM</b>
        </div>
        <div className="nav" style={{ marginTop: 10 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'sel' : '')}>
              <span>{item.icon} {item.label}</span>
            </NavLink>
          ))}
        </div>
        {companies.length > 1 && (
          <>
            <hr />
            <span className="lab" style={{ padding: '0 10px' }}>Company</span>
            {companies.map((c) => (
              <a
                key={c.id}
                href="#"
                className={`tiny ${c.id === companyId ? 'sel' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  switchCompany(c.id)
                  window.location.reload()
                }}
              >
                {c.name}
              </a>
            ))}
          </>
        )}
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="search">
            <span>Search…</span>
            <span className="kbd">⌘K</span>
          </div>
          <span className="ddwrap">
            <span className="av a" style={{ cursor: 'pointer' }} onClick={() => setMenuOpen((v) => !v)}>
              {(user?.full_name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            {menuOpen && (
              <div className="ddpanel">
                <div className="tiny" style={{ padding: '6px 9px' }}>
                  <b>{user?.full_name}</b>
                  <div>{tenant?.name}</div>
                </div>
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/settings'); setMenuOpen(false) }}>⚙ Settings</a>
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/users'); setMenuOpen(false) }}>◉ User management</a>
                <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '6px 4px' }} />
                <a href="#" onClick={(e) => { e.preventDefault(); logout(); navigate('/login') }}>⏻ Sign out</a>
              </div>
            )}
          </span>
        </div>
        <div className="content">{children}</div>
      </div>

      {aiPanel && <div className="aipanel">{aiPanel}</div>}
    </div>
  )
}
