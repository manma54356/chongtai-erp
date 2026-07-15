import { useState } from 'react'
import { Modal, Form, Input, message } from 'antd'
import { api } from '../lib/api'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ChangePasswordModal({ open, onClose }: Props) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const onFinish = async (v: any) => {
    if (v.newPassword !== v.confirm) {
      return message.error('兩次輸入的新密碼不一致')
    }
    setLoading(true)
    try {
      await api.put('/api/auth/password', {
        currentPassword: v.currentPassword,
        newPassword: v.newPassword,
      })
      message.success('密碼已更新，下次登入請使用新密碼')
      form.resetFields()
      onClose()
    } catch (e: any) {
      message.error(e.response?.data?.message ?? '修改失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="修改密碼" open={open} onCancel={() => { form.resetFields(); onClose() }}
      onOk={() => form.submit()} confirmLoading={loading} okText="確認修改">
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 12 }}>
        <Form.Item name="currentPassword" label="目前密碼" rules={[{ required: true }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item name="newPassword" label="新密碼" rules={[{ required: true, min: 8, message: '至少 8 個字元' }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item name="confirm" label="確認新密碼" rules={[{ required: true }]}>
          <Input.Password />
        </Form.Item>
      </Form>
    </Modal>
  )
}
