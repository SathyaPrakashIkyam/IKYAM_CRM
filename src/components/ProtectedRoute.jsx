import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { auth, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--mut)' }}>Loading…</div>
  }
  if (!auth) {
    return <Navigate to="/login" replace />
  }
  return children
}
