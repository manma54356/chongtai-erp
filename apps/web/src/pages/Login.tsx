import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Form, Input, Button, Typography, Alert, ConfigProvider } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

const { Title } = Typography

export default function Login() {
  const { login, token } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to="/dashboard" replace />

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    setError('')
    try {
      await login(values.email, values.password)
    } catch {
      setError('帳號或密碼錯誤')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(160deg, #0a1628 0%, #0d2b50 40%, #0f3460 70%, #1a2744 100%)',
    }}>
      {/* 格線背景 */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(201,153,62,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(201,153,62,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
      }} />

      {/* 光暈裝飾 */}
      <div style={{
        position: 'absolute', top: '-120px', right: '-120px',
        width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,153,62,0.15) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-100px', left: '-80px',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(42,90,158,0.3) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '40%', left: '20%',
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,153,62,0.08) 0%, transparent 70%)',
        filter: 'blur(50px)', pointerEvents: 'none',
      }} />

      {/* 毛玻璃卡片 */}
      <ConfigProvider theme={{
        token: {
          colorBgContainer: 'rgba(255,255,255,0.07)',
          colorBorder: 'rgba(255,255,255,0.18)',
          colorText: '#ffffff',
          colorTextPlaceholder: 'rgba(255,255,255,0.35)',
          colorIcon: 'rgba(255,255,255,0.4)',
          colorPrimary: '#C9993E',
          borderRadius: 10,
          fontSize: 15,
        },
        components: {
          Input: {
            activeBg: 'rgba(255,255,255,0.1)',
            hoverBg: 'rgba(255,255,255,0.1)',
            activeBorderColor: 'rgba(201,153,62,0.7)',
            hoverBorderColor: 'rgba(255,255,255,0.35)',
          },
          Button: {
            primaryColor: '#0F2647',
          },
          Form: {
            labelColor: 'rgba(255,255,255,0.7)',
          },
        },
      }}>
        <div style={{
          width: 420,
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.13)',
          borderRadius: 20,
          padding: '48px 40px 40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Logo 區塊 */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 68, height: 68, borderRadius: 20,
              background: 'linear-gradient(135deg, #C9993E 0%, #e8c56a 100%)',
              marginBottom: 18,
              boxShadow: '0 6px 24px rgba(201,153,62,0.45)',
            }}>
              <span style={{ color: '#0a1628', fontSize: 30, fontWeight: 900, letterSpacing: -1 }}>重</span>
            </div>
            <Title level={3} style={{ margin: '0 0 4px', color: '#ffffff', fontWeight: 700, letterSpacing: 3 }}>
              ERP 管理系統
            </Title>
            <Typography.Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, letterSpacing: 1 }}>
              重泰開發有限公司
            </Typography.Text>
          </div>

          {/* 分隔線 */}
          <div style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            marginBottom: 28,
          }} />

          {error && (
            <Alert
              message={error}
              type="error"
              style={{ marginBottom: 20, borderRadius: 10, background: 'rgba(255,77,79,0.15)', border: '1px solid rgba(255,77,79,0.3)' }}
            />
          )}

          <Form onFinish={onFinish} layout="vertical" size="large">
            <Form.Item
              name="email"
              label={<span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>電子郵件</span>}
              rules={[{ required: true, message: '請輸入 Email' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: 'rgba(201,153,62,0.8)', fontSize: 15 }} />}
                placeholder="輸入 Email"
                type="email"
                style={{ height: 48, background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
              />
            </Form.Item>
            <Form.Item
              name="password"
              label={<span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>密碼</span>}
              rules={[{ required: true, message: '請輸入密碼' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'rgba(201,153,62,0.8)', fontSize: 15 }} />}
                placeholder="輸入密碼"
                style={{ height: 48, background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{
                  height: 50,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #C9993E 0%, #e0b84a 100%)',
                  border: 'none',
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 6,
                  color: '#0a1628',
                  boxShadow: '0 6px 24px rgba(201,153,62,0.4)',
                }}
              >
                登 入
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Typography.Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, letterSpacing: 1 }}>
              建設業資源規劃系統
            </Typography.Text>
          </div>
        </div>
      </ConfigProvider>
    </div>
  )
}
