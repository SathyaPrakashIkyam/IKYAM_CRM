import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Onboarding from './pages/Onboarding'
import OnboardingList from './pages/OnboardingList'
import Login from './pages/Login'
import Users from './pages/Users'
import UserForm from './pages/UserForm'
import Today from './pages/Today'
import Leads from './pages/Leads'
import Pipeline from './pages/Pipeline'
import Record from './pages/Record'
import Accounts from './pages/Accounts'
import Contacts from './pages/Contacts'
import Activities from './pages/Activities'
import LeadHistory from './pages/LeadHistory'
import QuotesList from './pages/Quotes/QuotesList'
import NewQuotes from './pages/Quotes/NewQuotes'
import QuotesDetails from './pages/Quotes/QuotesDetails'
import Products from './pages/Products'
import ProductGroups from './pages/ProductGroups'
import Uoms from './pages/Uoms'
import Currencies from './pages/Currencies'
import RoleManagement from './pages/RoleManagement'
import SyncMonitor from './pages/SyncMonitor'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import ExecutiveOverview from './pages/ExecutiveOverview'
import Settings from './pages/Settings'

function AppRoutes() {
  const { isSuperAdmin, isCompanyAdmin } = useAuth()
  const defaultPath = isSuperAdmin
    ? '/onboarding-list'
    : isCompanyAdmin
    ? '/users'
    : '/today'

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/onboarding-list" element={<ProtectedRoute><OnboardingList /></ProtectedRoute>} />
      <Route path="/login" element={<Login />} />

      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/users/new" element={<ProtectedRoute><UserForm /></ProtectedRoute>} />
      <Route path="/today" element={<ProtectedRoute><Today /></ProtectedRoute>} />
      <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
      <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
      <Route path="/record/:id" element={<ProtectedRoute><Record /></ProtectedRoute>} />
      <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
      <Route path="/accounts/:id" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
      <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
      <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
      <Route path="/leadHistory/:leadId" element={<ProtectedRoute><LeadHistory /></ProtectedRoute>} />
      <Route path="/quotes" element={<Navigate to="/quotesList" replace />} />
      <Route path="/quotesList" element={<ProtectedRoute><QuotesList /></ProtectedRoute>} />
      <Route path="/newQuotes" element={<ProtectedRoute><NewQuotes /></ProtectedRoute>} />
      <Route path="/quotesDetails" element={<ProtectedRoute><QuotesDetails /></ProtectedRoute>} />
      <Route path="/quotesDetails/:id" element={<ProtectedRoute><QuotesDetails /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/masters" element={<Navigate to="/product-groups" replace />} />
      <Route path="/product-groups" element={<ProtectedRoute companyAdminOnly><ProductGroups /></ProtectedRoute>} />
      <Route path="/masters/product-groups" element={<ProtectedRoute companyAdminOnly><ProductGroups /></ProtectedRoute>} />
      <Route path="/uoms" element={<ProtectedRoute companyAdminOnly><Uoms /></ProtectedRoute>} />
      <Route path="/masters/uoms" element={<ProtectedRoute companyAdminOnly><Uoms /></ProtectedRoute>} />
      <Route path="/currencies" element={<ProtectedRoute companyAdminOnly><Currencies /></ProtectedRoute>} />
      <Route path="/masters/currencies" element={<ProtectedRoute companyAdminOnly><Currencies /></ProtectedRoute>} />
      <Route path="/roles" element={<ProtectedRoute><RoleManagement /></ProtectedRoute>} />
      <Route path="/sync" element={<ProtectedRoute><SyncMonitor /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/executive" element={<ProtectedRoute><ExecutiveOverview /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to={defaultPath} replace />} />
      <Route path="*" element={<Navigate to={defaultPath} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
