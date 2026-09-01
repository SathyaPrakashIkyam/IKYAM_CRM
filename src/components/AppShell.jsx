import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ikyamLogo from '../assets/ikyam-relatepro-logo.png'
import { notificationsApi } from '../api/endpoints'
import AiChatWidget from './AiChatWidget'
import '../styles/ikyam-mock.css'

// One real nav list for every non-Super-Admin role — `module` is the exact
// Role Management module_code that gates it. `module: null` means "always
// visible to any signed-in company user" (no permission concept for it).
// Super Admin gets its own separate list further down: they operate above
// any one company's Role Management, not inside it.
const ALL_NAV_ITEMS = [
  // "Today" is a personal sales landing page (tasks, open deals, new leads,
  // quick links into Leads/Pipeline/Accounts/Activities) — showing it to a
  // role with none of those underlying modules just renders an empty page
  // full of dead links, so it needs at least one of them rather than being
  // unconditionally visible.
  { to: '/today', label: 'Dashboard', icon: '⊞', requiresAnyOf: ['LEADS', 'PIPELINE', 'ACCOUNTS', 'ACTIVITIES'] },
  { to: '/leads', label: 'Leads', icon: '▤', module: 'LEADS' },
  { to: '/pipeline', label: 'Pipeline', icon: '▦', module: 'PIPELINE' },
  { to: '/accounts', label: 'Accounts', icon: '▣', module: 'ACCOUNTS' },
  { to: '/contacts', label: 'Contacts', icon: '◫', module: 'CONTACTS' },
  { to: '/activities', label: 'Activities', icon: '✓', module: 'ACTIVITIES' },
  { to: '/quotes', label: 'Quotes', icon: '▥', module: 'QUOTES' },
  { to: '/reports', label: 'Reports', icon: '◧', module: 'REPORTS' },
  { to: '/dashboard', label: 'Analytics', icon: '📊', module: 'ANALYTICS' },
  { to: '/executive', label: 'Executive overview', icon: '◈', module: 'EXECUTIVE' },
  { to: '/sync', label: 'Sync Monitor', icon: '⟲', module: 'SYNC_MONITOR' },
  // Admin cluster — kept together and in this exact order (User Management,
  // Products, Role Management, Settings) since that's how they're meant to
  // read for a Company Admin, who typically only has this cluster.
  { to: '/users', label: 'User Management', icon: '👤', module: 'USER_MGMT' },
  { to: '/products', label: 'Products', icon: '▧', module: 'PRODUCTS' },
  { to: '/roles', label: 'Role Management', icon: '🛡', module: 'ROLE_MGMT' },
  { to: '/settings', label: 'Settings', icon: '⚙', module: 'SETTINGS' },
]

// Products doesn't have one fixed spot — which nav item it should trail
// depends on what kind of role is looking at it. Tries each candidate
// anchor in order and slots Products right after the first one actually
// present in this role's filtered nav; if none are, Products is left
// wherever ALL_NAV_ITEMS already put it.
function withProductsNextTo(items, ...anchorPaths) {
  const productsIdx = items.findIndex((i) => i.to === '/products')
  if (productsIdx === -1) return items

  const anchorPath = anchorPaths.find((p) => items.some((i) => i.to === p))
  if (!anchorPath) return items

  const products = items[productsIdx]
  const without = items.filter((i) => i.to !== '/products')
  const anchorIdx = without.findIndex((i) => i.to === anchorPath)
  return [...without.slice(0, anchorIdx + 1), products, ...without.slice(anchorIdx + 1)]
}

export default function AppShell({ children, aiPanel }) {
  const { user, tenant, companies, companyId, switchCompany, logout, isSuperAdmin, isCompanyAdmin, can } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ikyam_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })
  const [notifs, setNotifs] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)

  // Every role now shares the same Ikyam mockup palette on the shell — super
  // admin's Onboarding screens were the last holdout on the old plain look.
  const isStandardUser = !isSuperAdmin && !isCompanyAdmin
  const useThemedShell = true

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ikyam_theme', theme)
  }, [theme])

  useEffect(() => {
    if (!isStandardUser) return
    notificationsApi.list().then(setNotifs).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!notifOpen) return
    const close = () => setNotifOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [notifOpen])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  async function markAllRead() {
    try {
      await notificationsApi.markAllRead()
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      // best-effort
    }
  }

  const unreadCount = notifs.filter((n) => !n.is_read).length

  // Super Admin: fixed onboarding-only nav, no Role Management concept.
  // Everyone else (Company Admin included): the real nav, filtered by this
  // user's actual Role Management permissions — a tab a role was never
  // granted `view` on simply isn't in this list, matching the backend,
  // which independently 403s the same modules if reached directly.
  const navItems = isSuperAdmin
    ? [
        { to: '/onboarding-list', label: 'Onboarding List', icon: '📋' },
        { to: '/onboarding', label: 'Onboarding', icon: '➕' },
      ]
    : withProductsNextTo(
        ALL_NAV_ITEMS.filter((item) => {
          if (item.requiresAnyOf) return item.requiresAnyOf.some((m) => can(m, 'view'))
          return !item.module || can(item.module, 'view')
        }),
        // Company Admin (has User Management): Products sits right after it,
        // matching the admin cluster order — User Mgmt, Products, Role Mgmt, Settings.
        // Sales Employee / Sales Manager (no User Management, but has Activities):
        // Products sits right after Activities instead, in the sales flow.
        '/users', '/activities'
      )

  return (
    <div
      className={`shell ${useThemedShell ? 'ikyam-mock' : ''}`}
      style={{ gridTemplateColumns: aiPanel ? '240px 1fr 280px' : '240px 1fr' }}
    >
      <aside className="rail">
        <div className="logo" style={{ marginBottom: 20, padding: '4px 2px' }}>
          <img src={ikyamLogo} alt="Ikyam CRM" style={{ height: 60, width: '90%', objectFit: 'contain' }} />
        </div>

        <div className="nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'sel' : '')}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {companies.length > 1 && (
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <hr style={{ border: 0, borderTop: '1px solid var(--line)', marginBottom: 12 }} />
            <span className="lab" style={{ padding: '0 10px', display: 'block', marginBottom: 6 }}>Company</span>
            {companies.map((c) => (
              <a
                key={c.id}
                href="#"
                className={`tiny ${c.id === companyId ? 'sel' : ''}`}
                style={{ display: 'block', padding: '6px 12px', borderRadius: 12, textDecoration: 'none', color: 'var(--ink)' }}
                onClick={(e) => {
                  e.preventDefault()
                  switchCompany(c.id)
                  window.location.reload()
                }}
              >
                {c.name}
              </a>
            ))}
          </div>
        )}
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--mut)' }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span style={{ fontSize: 13, color: 'var(--mut)', flex: 1 }}>Search leads, accounts, quotes, reports…</span>
            {isStandardUser && (
              <span style={{ font: '500 10px var(--m)', border: '1px solid var(--line)', borderRadius: 5, padding: '1px 5px', color: 'var(--mut)', background: 'var(--surface2)' }}>⌘K</span>
            )}
          </div>

          <div className="topbar-right">
            {isStandardUser && (
              <button
                type="button"
                className="icobtn"
                onClick={() => navigate('/leads')}
                title="New lead"
                style={{ cursor: 'pointer', borderRadius: '50%', width: 38, height: 38, fontSize: 18 }}
              >
                ＋
              </button>
            )}
            <button
              type="button"
              className="icobtn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              style={{ cursor: 'pointer', borderRadius: '50%', width: 38, height: 38 }}
            >
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                type="button"
                className="icobtn"
                onClick={() => setNotifOpen((v) => !v)}
                style={{ cursor: 'pointer', borderRadius: '50%', width: 38, height: 38 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  minWidth: 15,
                  height: 15,
                  borderRadius: 8,
                  background: '#DC2626',
                  color: '#fff',
                  border: '2px solid var(--surface)',
                  font: '600 9px var(--m)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 2px',
                }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
              {notifOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 280,
                  background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
                  boxShadow: 'var(--shadow-lift)', padding: 7, zIndex: 30,
                }}>
                  <div className="rowx sp" style={{ padding: '4px 6px 8px' }}>
                    <b className="tiny">Notifications</b>
                    {unreadCount > 0 && (
                      <span className="tiny" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={markAllRead}>Mark all read</span>
                    )}
                  </div>
                  {notifs.length === 0 && <div className="tiny" style={{ padding: '6px 6px 4px' }}>No notifications yet.</div>}
                  {notifs.slice(0, 8).map((n) => (
                    <div key={n.id} style={{ padding: '7px 8px', borderRadius: 8, opacity: n.is_read ? 0.6 : 1 }}>
                      <b style={{ fontSize: 12 }}>{n.title}</b>
                      {n.body && <div className="tiny">{n.body}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="topbar-user">
              <div className="topbar-avatar">
                {(user?.full_name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ font: '600 13px var(--d)', color: 'var(--ink)', lineHeight: 1.2 }}>
                  {user?.full_name || 'User'}
                </span>
                <span className="tiny mut" style={{ fontSize: 11 }}>
                  {user?.role || 'Manager'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="logout-pill"
              onClick={() => { logout(); navigate('/login') }}
              title="Sign out"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        <div className="content">{children}</div>
      </div>

      {aiPanel && <div className="aipanel">{aiPanel}</div>}
      {!isSuperAdmin && <AiChatWidget />}
    </div>
  )
}
