import { createContext, useContext, useEffect, useState } from 'react'
import { authApi, companiesApi, rolesApi } from '../api/endpoints'
import { clearAuth, currentCompanyId, setCurrentCompanyId, storeAuth } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const raw = localStorage.getItem('ikyam_auth')
    return raw ? JSON.parse(raw) : null
  })
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyId] = useState(currentCompanyId())
  const [loading, setLoading] = useState(true)

  // Real Role Management permissions for the signed-in user — drives both
  // which nav tabs render (UI) and backs every gated route (server already
  // enforces this independently; this just keeps the UI from dangling a
  // link to something that would 403 anyway).
  const [permissions, setPermissions] = useState({})
  const [permBypass, setPermBypass] = useState(false)
  const [permLoaded, setPermLoaded] = useState(false)

  useEffect(() => {
    if (!auth) {
      setPermissions({})
      setPermBypass(false)
      setPermLoaded(false)
      return
    }
    rolesApi.myPermissions()
      .then((res) => {
        setPermBypass(!!res.bypass)
        setPermissions(res.permissions || {})
      })
      .catch(() => {
        setPermissions({})
        setPermBypass(false)
      })
      .finally(() => setPermLoaded(true))
  }, [auth])

  function can(moduleCode, action = 'view') {
    if (permBypass) return true
    return !!(permissions[moduleCode] && permissions[moduleCode][action])
  }

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
     // In this architecture, a standard user belongs to a specific schema (company_id)
    const activeId = auth.schema_id || auth.tenant_uuid;
    if (activeId) {
      setCompanies([{ id: activeId, name: auth.schema_id || activeId }])
      // Always re-sync to the session's real company_id — never trust a
      // stale value already sitting in localStorage from a previous
      // session/account (that's how one browser could keep querying the
      // wrong tenant even after a fresh login).
      if (companyId !== activeId) {
        setCurrentCompanyId(activeId)
        setCompanyId(activeId)
      }
    }
   
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, companyId])

  function login(tokens) {
    storeAuth(tokens)
    setAuth(tokens)
  }

  function logout() {
    authApi.logout().catch(() => {})
    clearAuth()
    setAuth(null)
    setCompanies([])
  }

  function switchCompany(id) {
    setCurrentCompanyId(id)
    setCompanyId(id)
  }

  const user = auth
    ? (auth.user || {
        full_name: auth.user_name || auth.email || 'User',
        email: auth.email,
        role: auth.role,
        user_id: auth.user_id,
        global_user_id: auth.global_user_id,
      })
    : null

  const role = auth?.role || user?.role || ''
  const isSuperAdmin = role.toUpperCase() === 'SUPER_ADMIN' || role.toUpperCase() === 'SUPER ADMIN'
  const isCompanyAdmin = role.toUpperCase() === 'COMPANY_ADMIN' || role.toUpperCase() === 'COMPANY ADMIN'

  return (
    <AuthContext.Provider
      value={{
        auth,
        user,
        role,
        isSuperAdmin,
        isCompanyAdmin,
        tenant: auth?.tenant,
        companies,
        companyId,
        switchCompany,
        login,
        logout,
        loading,
        can,
        permBypass,
        permLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
