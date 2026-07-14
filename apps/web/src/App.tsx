import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from './context/AuthContext'
import MainLayout from './components/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProjectList from './pages/projects/ProjectList'
import CustomerList from './pages/customers/CustomerList'
import ContractList from './pages/contracts/ContractList'

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
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/projects"  element={<ProtectedRoute><ProjectList /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><CustomerList /></ProtectedRoute>} />
      <Route path="/contracts" element={<ProtectedRoute><ContractList /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
