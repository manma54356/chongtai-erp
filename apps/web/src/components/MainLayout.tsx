import { ReactNode, useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Typography, theme } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined, ProjectOutlined, TeamOutlined,
  FileTextOutlined, AccountBookOutlined, LogoutOutlined, UserOutlined,
} from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

const { Sider, Header, Content } = Layout
const { Text } = Typography

const menuItems = [
  { key: '/dashboard',  icon: <DashboardOutlined />, label: '儀表板' },
  { key: '/projects',   icon: <ProjectOutlined />,   label: '建案管理' },
  { key: '/customers',  icon: <TeamOutlined />,       label: '客戶管理' },
  { key: '/contracts',  icon: <FileTextOutlined />,   label: '合約管理' },
  { key: '/finance',    icon: <AccountBookOutlined />,label: '財務' },
]

export default function MainLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, company, logout } = useAuth()
  const { token } = theme.useToken()

  const userMenu = {
    items: [
      { key: 'logout', icon: <LogoutOutlined />, label: '登出', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') logout()
    },
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div style={{
          height: 64, display: 'flex', alignItems: 'center',
          justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          {!collapsed && (
            <Text strong style={{ color: '#fff', fontSize: 15 }}>
              {company?.name ?? '建設業 ERP'}
            </Text>
          )}
        </div>
        <Menu
          theme="dark" mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
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
              <Avatar icon={<UserOutlined />} />
              <Text>{user?.name}</Text>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: 24, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
