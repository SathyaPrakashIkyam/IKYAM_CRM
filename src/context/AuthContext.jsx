import { createContext, useContext, useEffect, useState } from 'react'
import { authApi, companiesApi } from '../api/endpoints'
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

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
    companiesApi
      .list()
      .then((list) => {
        setCompanies(list)
        if (!companyId && list.length > 0) {
          setCurrentCompanyId(list[0].id)
          setCompanyId(list[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])

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

  return (
    <AuthContext.Provider
      value={{ auth, user: auth?.user, tenant: auth?.tenant, companies, companyId, switchCompany, login, logout, loading }}
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
