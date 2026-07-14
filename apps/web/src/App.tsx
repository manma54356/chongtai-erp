import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from 'antd'

// Pages（之後逐步建立）
// import Dashboard from './pages/Dashboard'
// import Projects from './pages/Projects'
// import Customers from './pages/Customers'
// import Contracts from './pages/Contracts'

export default function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<div style={{ padding: 24 }}>儀表板（建置中）</div>} />
        <Route path="/projects" element={<div style={{ padding: 24 }}>建案管理（建置中）</div>} />
        <Route path="/customers" element={<div style={{ padding: 24 }}>客戶管理（建置中）</div>} />
        <Route path="/contracts" element={<div style={{ padding: 24 }}>合約管理（建置中）</div>} />
      </Routes>
    </Layout>
  )
}
