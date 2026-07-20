import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Alert } from 'antd'
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
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F2647 0%, #1a3d6e 60%, #2a5a9e 100%)',
    }}>
      <Card style={{ width: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.25)', borderRadius: 12, border: 'none' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #0F2647, #1a3d6e)',
            marginBottom: 16,
          }}>
            <span style={{ color: '#C9993E', fontSize: 26, fontWeight: 900 }}>重</span>
          </div>
          <Title level={3} style={{ margin: 0, color: '#0F2647' }}>ERP 系統</Title>
          <Typography.Text type="secondary">重泰開發有限公司</Typography.Text>
        </div>

        {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} />}

        <Form onFinish={onFinish} layout="vertical" size="large">
          <Form.Item name="email" rules={[{ required: true, message: '請輸入 Email' }]}>
            <Input prefix={<UserOutlined style={{ color: '#C9993E' }} />} placeholder="Email" type="email" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '請輸入密碼' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#C9993E' }} />} placeholder="密碼" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 44 }}>
              登入
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
