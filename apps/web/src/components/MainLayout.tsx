import { ReactNode, useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Typography, theme } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined, ProjectOutlined, TeamOutlined, FileTextOutlined,
  AccountBookOutlined, LogoutOutlined, UserOutlined, SettingOutlined,
  ShopOutlined, AuditOutlined, BankOutlined, SolutionOutlined, PieChartOutlined,
  HistoryOutlined, KeyOutlined, SendOutlined, CalendarOutlined, ProfileOutlined,
} from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import ChangePasswordModal from './ChangePasswordModal'

const { Sider, Header, Content } = Layout

const FINANCE_ROLES = ['OWNER', 'FINANCE_CHIEF', 'ACCOUNTANT', 'CASHIER']

const roleLabel: Record<string, string> = {
  OWNER: '老闆', FINANCE_CHIEF: '財務長', ACCOUNTANT: '會計', CASHIER: '出納',
  SALES: '業務', SALES_ADMIN: '業助', PM: '專案經理', ENGINEER: '工務', CUSTOMER_SERVICE: '客服',
}

export default function MainLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, company, role, features, logout } = useAuth()
  const { token } = theme.useToken()

  // 判斷是否能看某功能：角色預設 OR features 清單
  const canSee = (feature: string) => {
    if (role === 'OWNER') return true
    if (features?.includes(feature)) return true
    const defaults: Record<string, string[]> = {
      finance:   FINANCE_ROLES,
      projects:  ['OWNER','PM','ENGINEER','SALES','SALES_ADMIN'],
      customers: ['OWNER','SALES','SALES_ADMIN','CUSTOMER_SERVICE'],
      contracts: ['OWNER','SALES','SALES_ADMIN','FINANCE_CHIEF'],
      settings:  ['OWNER'],
    }
    return role ? (defaults[feature] ?? []).includes(role) : false
  }

  const baseMenuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '儀表板' },
    ...(canSee('projects') ? [{ key: '/projects', icon: <ProjectOutlined />, label: '建案管理' }] : []),
    ...(canSee('customers') ? [{ key: '/customers', icon: <TeamOutlined />, label: '客戶管理' }] : []),
    ...(canSee('contracts') ? [{ key: '/contracts', icon: <FileTextOutlined />, label: '合約管理' }] : []),
  ]

  const financeMenu = canSee('finance') ? [{
    key: 'finance', icon: <AccountBookOutlined />, label: '財務管理',
    children: [
      { key: '/finance/budget',              icon: <PieChartOutlined />,    label: '預算收支' },
      { key: '/finance/payment-requests',    icon: <SendOutlined />,        label: '請款管理' },
      { key: '/finance/payables',            icon: <BankOutlined />,        label: '應付帳款' },
      { key: '/finance/accounting-periods',  icon: <CalendarOutlined />,    label: '關帳管理' },
      { key: '/finance/invoices',            icon: <ProfileOutlined />, label: '出帳管理' },
      { key: '/finance/journal',             icon: <AuditOutlined />,       label: '傳票管理' },
      { key: '/finance/vendors',             icon: <ShopOutlined />,        label: '廠商管理' },
      { key: '/finance/chart-of-accounts',   icon: <SolutionOutlined />,    label: '會計科目' },
    ],
  }] : []

  const settingsMenu = canSee('settings') ? [{
    key: 'settings', icon: <SettingOutlined />, label: '系統設定',
    children: [
      { key: '/settings/users',      icon: <UserOutlined />,    label: '使用者管理' },
      { key: '/settings/audit-logs', icon: <HistoryOutlined />, label: '修改紀錄' },
    ],
  }] : []

  // AI 財務助理選單暫時隱藏：待設定 ANTHROPIC_API_KEY 後改回
  // [...baseMenuItems, ...financeMenu, [{ key: '/ai/assistant', icon: <RobotOutlined />, label: 'AI 財務助理' }], ...settingsMenu]
  const menuItems = [...baseMenuItems, ...financeMenu, ...settingsMenu]

  const openKeys = location.pathname.startsWith('/finance')
    ? ['finance']
    : location.pathname.startsWith('/settings')
      ? ['settings']
      : []

  const userMenu = {
    items: [
      { key: 'password', icon: <KeyOutlined />, label: '修改密碼' },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '登出', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') logout()
      if (key === 'password') setPwdOpen(true)
    },
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark" width={220}>
        <div style={{
          height: 64, display: 'flex', alignItems: 'center',
          justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '0 12px',
        }}>
          {!collapsed && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#C9993E', fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>ERP 系統</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {company?.name ?? '重泰開發有限公司'}
              </div>
            </div>
          )}
        </div>
        <Menu
          theme="dark" mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={openKeys}
          items={menuItems}
          onClick={({ key }) => { if (!['finance', 'settings'].includes(key)) navigate(key) }}
        />
      </Sider>

      <Layout>
        <Header style={{
          background: token.colorBgContainer, padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}>
          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ background: '#0F2647' }} />
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{user?.name}</div>
                {role && <div style={{ fontSize: 11, color: '#C9993E' }}>{roleLabel[role] ?? role}</div>}
              </div>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: 24, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>

      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </Layout>
  )
}
