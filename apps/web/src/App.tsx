import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from './context/AuthContext'
import MainLayout from './components/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProjectList from './pages/projects/ProjectList'
import ProjectDetail from './pages/projects/ProjectDetail'
import CustomerList from './pages/customers/CustomerList'
import CustomerDetail from './pages/customers/CustomerDetail'
import ContractList from './pages/contracts/ContractList'
import ContractDetail from './pages/contracts/ContractDetail'
import AccountPayablePage from './pages/finance/AccountPayablePage'
import JournalPage from './pages/finance/JournalPage'
import VendorPage from './pages/finance/VendorPage'
import ChartOfAccountsPage from './pages/finance/ChartOfAccountsPage'
import BudgetPage from './pages/finance/BudgetPage'
import PaymentRequestPage from './pages/finance/PaymentRequestPage'
import AccountingPeriodPage from './pages/finance/AccountingPeriodPage'
import InvoicePage from './pages/finance/InvoicePage'
import UserManagementPage from './pages/settings/UserManagementPage'
import AuditLogPage from './pages/settings/AuditLogPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()
  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:100 }}><Spin size="large" /></div>
  if (!token) return <Navigate to="/login" replace />
  return <MainLayout>{children}</MainLayout>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard"                       element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/projects"                        element={<ProtectedRoute><ProjectList /></ProtectedRoute>} />
      <Route path="/projects/:id"                    element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
      <Route path="/customers"                       element={<ProtectedRoute><CustomerList /></ProtectedRoute>} />
      <Route path="/customers/:id"                   element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
      <Route path="/contracts"                       element={<ProtectedRoute><ContractList /></ProtectedRoute>} />
      <Route path="/contracts/:id"                   element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
      <Route path="/finance/budget"                  element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
      <Route path="/finance/payment-requests"        element={<ProtectedRoute><PaymentRequestPage /></ProtectedRoute>} />
      <Route path="/finance/payables"                element={<ProtectedRoute><AccountPayablePage /></ProtectedRoute>} />
      <Route path="/finance/accounting-periods"      element={<ProtectedRoute><AccountingPeriodPage /></ProtectedRoute>} />
      <Route path="/finance/invoices"                element={<ProtectedRoute><InvoicePage /></ProtectedRoute>} />
      <Route path="/finance/journal"                 element={<ProtectedRoute><JournalPage /></ProtectedRoute>} />
      <Route path="/finance/vendors"                 element={<ProtectedRoute><VendorPage /></ProtectedRoute>} />
      <Route path="/finance/chart-of-accounts"       element={<ProtectedRoute><ChartOfAccountsPage /></ProtectedRoute>} />
      <Route path="/settings/users"                  element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
      <Route path="/settings/audit-logs"             element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
