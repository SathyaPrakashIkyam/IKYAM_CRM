import { useState, useEffect, useMemo, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ikyamLogo from '../assets/ikyam-relatepro-logo.png'
import ikyamLogoDark from '../assets/Ikyam_RelatePro_WH_BG.png'
import { notificationsApi, leadsApi, accountsApi, contactsApi, quotesApi, reportsApi } from '../api/endpoints'
import { WS_BASE_URL, getAuthToken } from '../api/client'
import AiChatWidget from './AiChatWidget'
import '../styles/ikyam-mock.css'

function matchesQuery(haystacks, q) {
  return haystacks.some((h) => h && String(h).toLowerCase().includes(q))
}

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
  { to: '/quotesList', label: 'Quotes', icon: '▥', module: 'QUOTES' },
  { to: '/reports', label: 'Reports', icon: '◧', module: 'REPORTS' },
  { to: '/dashboard', label: 'Analytics', icon: '📊', module: 'ANALYTICS' },
  { to: '/executive', label: 'Executive overview', icon: '◈', module: 'EXECUTIVE' },
  { to: '/sync', label: 'Sync Monitor', icon: '⟲', module: 'SYNC_MONITOR' },
  // Admin cluster — kept together and in this exact order (User Management,
  // Products, Masters [Product Groups, UOMs, Currencies], Role Management, Settings)
  { to: '/users', label: 'User Management', icon: '👤', module: 'USER_MGMT' },
  { to: '/products', label: 'Products', icon: '▧', module: 'PRODUCTS' },
  {
    to: '/masters',
    label: 'Masters',
    icon: '🗂',
    adminOnly: true,
    children: [
      { to: '/product-groups', label: 'Product Groups', icon: '📁' },
      { to: '/uoms', label: 'Units of Measure', icon: '📏' },
      { to: '/currencies', label: 'Currencies', icon: '💱' },
    ],
  },
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
  const location = useLocation()
  const isMasterRoute =
    location.pathname.startsWith('/product-groups') ||
    location.pathname.startsWith('/uoms') ||
    location.pathname.startsWith('/currencies') ||
    location.pathname.startsWith('/masters')
  const [mastersOpen, setMastersOpen] = useState(isMasterRoute)

  useEffect(() => {
    if (isMasterRoute) setMastersOpen(true)
  }, [isMasterRoute])

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ikyam_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })
  const [notifs, setNotifs] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)

  // Global search: fetch each searchable module's list once (only for modules
  // this user can view), then filter client-side as they type. Avoids an API
  // round-trip per keystroke while still searching real, current records.
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchData, setSearchData] = useState({ leads: [], accounts: [], contacts: [], quotes: [], reports: [] })
  const searchBoxRef = useRef(null)

  useEffect(() => {
    if (!companyId || isSuperAdmin) return
    if (can('LEADS', 'view')) leadsApi.list(companyId).then((d) => setSearchData((s) => ({ ...s, leads: d }))).catch(() => {})
    if (can('ACCOUNTS', 'view')) accountsApi.list(companyId).then((d) => setSearchData((s) => ({ ...s, accounts: d }))).catch(() => {})
    if (can('CONTACTS', 'view')) contactsApi.list(companyId).then((d) => setSearchData((s) => ({ ...s, contacts: d }))).catch(() => {})
    // if (can('QUOTES', 'view')) quotesApi.list(companyId).then((d) => setSearchData((s) => ({ ...s, quotes: d }))).catch(() => {})
    // if (can('REPORTS', 'view')) reportsApi.saved().then((d) => setSearchData((s) => ({ ...s, reports: d }))).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, isSuperAdmin])

  useEffect(() => {
    if (!searchOpen) return
    const close = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [searchOpen])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    const groups = []

    const leadMatches = searchData.leads
      .filter((l) => matchesQuery([l.name, l.lead_no, l.company_name, l.email, l.phone], q))
      .slice(0, 5)
      .map((l) => ({ id: l.id, title: l.name, subtitle: `${l.lead_no} · ${l.company_name || 'no company'}`, to: '/leads' }))
    if (leadMatches.length) groups.push({ label: 'Leads', items: leadMatches })

    const accountMatches = searchData.accounts
      .filter((a) => matchesQuery([a.name, a.account_no, a.industry, a.phone], q))
      .slice(0, 5)
      .map((a) => ({ id: a.id, title: a.name, subtitle: a.industry || a.account_no, to: '/accounts' }))
    if (accountMatches.length) groups.push({ label: 'Accounts', items: accountMatches })

    const contactMatches = searchData.contacts
      .filter((c) => matchesQuery([c.first_name, c.last_name, c.title, c.primary_email, c.primary_phone], q))
      .slice(0, 5)
      .map((c) => ({ id: c.id, title: c.first_name ? `${c.first_name} ${c.last_name}` : c.last_name, subtitle: c.title || c.primary_email || '—', to: '/contacts' }))
    if (contactMatches.length) groups.push({ label: 'Contacts', items: contactMatches })

    const quoteMatches = searchData.quotes
      .filter((qt) => matchesQuery([qt.quote_no, qt.name, qt.status], q))
      .slice(0, 5)
      .map((qt) => ({ id: qt.id, title: qt.quote_no || qt.name, subtitle: qt.status || '—', to: `/quotesDetails/${qt.id}` }))
    if (quoteMatches.length) groups.push({ label: 'Quotes', items: quoteMatches })

    const reportMatches = (searchData.reports || [])
      .filter((r) => matchesQuery([r.name, r.report_type], q))
      .slice(0, 5)
      .map((r) => ({ id: r.id, title: r.name, subtitle: r.report_type || 'Saved report', to: '/reports' }))
    if (reportMatches.length) groups.push({ label: 'Reports', items: reportMatches })

    return groups
  }, [searchQuery, searchData])

  const hasSearchResults = searchResults.some((g) => g.items.length)

  function goToSearchResult(item) {
    setSearchOpen(false)
    setSearchQuery('')
    navigate(item.to, { state: { openId: item.id } })
  }

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

    // Live push: the backend sends a "notification" event over this socket
    // the instant a reminder (e.g. "meeting in 15 minutes") is created, so
    // it shows up on the bell without waiting for a refresh or a poll tick.
    const token = getAuthToken()
    let ws = null
    if (token) {
      ws = new WebSocket(`${WS_BASE_URL}/notifications/ws?token=${encodeURIComponent(token)}`)
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data)
          if (data.type === 'notification' && data.notification) {
            setNotifs((prev) => [data.notification, ...prev])
          }
        } catch {
          // ignore malformed frames
        }
      }
      ws.onerror = () => {}
    }

    // Fallback poll — covers the gap if the socket drops/reconnects, or the
    // reminder was created while this tab was closed.
    const poll = setInterval(() => {
      notificationsApi.list().then(setNotifs).catch(() => {})
    }, 60000)

    return () => {
      clearInterval(poll)
      ws?.close()
    }
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
          if (item.adminOnly && !isCompanyAdmin && !isSuperAdmin) return false
          if (item.requiresAnyOf) return item.requiresAnyOf.some((m) => can(m, 'view'))
          return !item.module || can(item.module, 'view')
        }),
        // Company Admin (has User Management): Products sits right after it,
        // matching the admin cluster order — User Mgmt, Products, Role Mgmt, Settings.
        // Sales Employee / Sales Manager (no User Management, but has Activities):
        // Products sits right after Activities instead, in the sales flow.
        '/users', '/activities'
      )

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('ikyam_rail_collapsed') === 'true'
  })

  const toggleRail = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('ikyam_rail_collapsed', String(next))
      return next
    })
  }

  const railWidth = collapsed ? '76px' : '240px'

  return (
    <div
      className={`shell ${useThemedShell ? 'ikyam-mock' : ''} ${collapsed ? 'shell-collapsed' : ''}`}
      style={{ gridTemplateColumns: aiPanel ? `${railWidth} 1fr 280px` : `${railWidth} 1fr` }}
    >
      <aside className={`rail ${collapsed ? 'collapsed' : ''}`}>
        <div className="rail-header">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={theme === 'dark' ? ikyamLogoDark : ikyamLogo}
              alt="Ikyam CRM"
              style={{
                height: collapsed ? 36 : 54,
                width: collapsed ? 36 : '90%',
                objectFit: 'contain',
                transition: 'all 0.3s ease',
              }}
            />
          </div>
          <button
            type="button"
            className="rail-toggle-btn"
            onClick={toggleRail}
            title={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
          >
            {collapsed ? '≫' : '≪'}
          </button>
        </div>

        <div className="nav">
          {navItems.map((item) => {
            if (item.children) {
              const isChildActive = item.children.some(
                (c) => location.pathname === c.to || location.pathname.startsWith(c.to)
              )
              return (
                <div key={item.label} className="nav-parent-item">
                  <button
                    type="button"
                    className={`nav-parent-btn ${isChildActive ? 'active-parent' : ''}`}
                    title={collapsed ? `${item.label} (${item.children.length})` : undefined}
                    onClick={() => {
                      if (collapsed) {
                        setCollapsed(false)
                        setMastersOpen(true)
                      } else {
                        setMastersOpen((prev) => !prev)
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                      {!collapsed && <span>{item.label}</span>}
                    </div>
                    {!collapsed && (
                      <span
                        style={{
                          fontSize: 9,
                          color: 'var(--mut)',
                          transition: 'transform 0.2s ease',
                          transform: mastersOpen ? 'rotate(90deg)' : 'none',
                          flexShrink: 0,
                        }}
                      >
                        ▶
                      </span>
                    )}
                  </button>

                  {mastersOpen && !collapsed && (
                    <div className="nav-submenu">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) => (isActive ? 'sel' : '')}
                        >
                          <span style={{ fontSize: 13, flexShrink: 0 }}>{child.icon}</span>
                          <span>{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => {
                  if (item.to === '/quotesList' || item.to === '/quotes') {
                    const isQuotes = ['/quotesList', '/newQuotes', '/quotesDetails', '/quotes'].some(
                      (p) => location.pathname === p || location.pathname.startsWith(p + '/')
                    )
                    return isQuotes ? 'sel' : ''
                  }
                  return isActive ? 'sel' : ''
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          })}
        </div>

        {companies.length > 1 && !collapsed && (
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
        <div className={`topbar ${searchOpen || notifOpen ? 'topbar-dropdown-open' : ''}`}>
          <div className="search" ref={searchBoxRef} style={{ position: 'relative', zIndex: searchOpen ? 100 : 'auto' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--mut)' }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
              onFocus={() => searchQuery && setSearchOpen(true)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); e.target.blur() } }}
              placeholder="Search leads, accounts and quotes"
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontSize: 13, color: 'var(--ink)', font: '500 13px var(--b, inherit)',
              }}
            />
            {searchQuery && (
              <span
                style={{ cursor: 'pointer', color: 'var(--mut)', fontSize: 12, padding: '0 4px' }}
                onClick={() => { setSearchQuery(''); setSearchOpen(false) }}
              >
                ✕
              </span>
            )}
            {isStandardUser && !searchQuery && (
              <span style={{ font: '500 10px var(--m)', border: '1px solid var(--line)', borderRadius: 5, padding: '1px 5px', color: 'var(--mut)', background: 'var(--surface2)' }}>⌘K</span>
            )}

            {searchOpen && searchQuery && (
              <div className="topbar-search-dropdown">
                {!hasSearchResults && (
                  <div className="tiny mut" style={{ padding: '10px 8px' }}>No matches for "{searchQuery}".</div>
                )}
                {searchResults.map((group) => (
                  <div key={group.label} style={{ marginBottom: 4 }}>
                    <div className="lab" style={{ padding: '6px 8px 2px' }}>{group.label}</div>
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="tiny"
                        style={{ padding: '7px 8px', borderRadius: 8, cursor: 'pointer' }}
                        onMouseDown={() => goToSearchResult(item)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <b style={{ font: '600 12.5px var(--d)' }}>{item.title}</b>
                        <div className="tiny mut" style={{ fontSize: 11 }}>{item.subtitle}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
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
                <div className="topbar-notif-dropdown">
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
