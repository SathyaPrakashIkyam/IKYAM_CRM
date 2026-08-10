import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Onboarding from './pages/Onboarding'
import Login from './pages/Login'
import Users from './pages/Users'
import Today from './pages/Today'
import Leads from './pages/Leads'
import Pipeline from './pages/Pipeline'
import Record from './pages/Record'
import Accounts from './pages/Accounts'
import Contacts from './pages/Contacts'
import Activities from './pages/Activities'
import Quotes from './pages/Quotes'
import SyncMonitor from './pages/SyncMonitor'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />

          <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="/today" element={<ProtectedRoute><Today /></ProtectedRoute>} />
          <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
          <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
          <Route path="/record/:id" element={<ProtectedRoute><Record /></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
          <Route path="/accounts/:id" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
          <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
          <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
          <Route path="/quotes" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
          <Route path="/sync" element={<ProtectedRoute><SyncMonitor /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
