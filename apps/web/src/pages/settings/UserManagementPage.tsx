import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Button, Tag, Modal, Form, Input, Select, Typography,
  Space, Checkbox, Divider, message, Popconfirm,
} from 'antd'
import { PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const roleLabel: Record<string, string> = {
  OWNER: '老闆', FINANCE_CHIEF: '財務長', ACCOUNTANT: '會計', CASHIER: '出納',
  SALES: '業務', SALES_ADMIN: '業助', PM: '專案經理', ENGINEER: '工務', CUSTOMER_SERVICE: '客服',
}
const roleColor: Record<string, string> = {
  OWNER: 'red', FINANCE_CHIEF: 'orange', ACCOUNTANT: 'blue', CASHIER: 'cyan',
  SALES: 'green', SALES_ADMIN: 'lime', PM: 'purple', ENGINEER: 'geekblue', CUSTOMER_SERVICE: 'default',
}

// 預設各角色可用功能
const roleDefaultFeatures: Record<string, string[]> = {
  OWNER:           ['projects', 'customers', 'contracts', 'finance', 'settings'],
  FINANCE_CHIEF:   ['projects', 'customers', 'contracts', 'finance'],
  ACCOUNTANT:      ['finance'],
  CASHIER:         ['finance'],
  SALES:           ['projects', 'customers', 'contracts'],
  SALES_ADMIN:     ['projects', 'customers', 'contracts'],
  PM:              ['projects'],
  ENGINEER:        ['projects'],
  CUSTOMER_SERVICE: ['customers', 'contracts'],
}

const ALL_FEATURES = [
  { key: 'projects',   label: '建案管理' },
  { key: 'customers',  label: '客戶管理' },
  { key: 'contracts',  label: '合約管理' },
  { key: 'finance',    label: '財務管理' },
  { key: 'settings',   label: '系統設定' },
]

export default function UserManagementPage() {
  const { role: myRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [permOpen, setPermOpen] = useState(false)
  const [permTarget, setPermTarget] = useState<any>(null)
  const [permFeatures, setPermFeatures] = useState<string[]>([])
  const [form] = Form.useForm()
  const qc = useQueryClient()

  const isOwner = myRole === 'OWNER'

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/api/users').then(r => r.data),
  })

  const create = useMutation({
    mutationFn: (v: any) => api.post('/api/users', v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setOpen(false); form.resetFields() },
    onError: (e: any) => message.error(e.response?.data?.message ?? '建立失敗'),
  })

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.put(`/api/users/${userId}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: any) => message.error(e.response?.data?.message ?? '更新失敗'),
  })

  const updateFeatures = useMutation({
    mutationFn: ({ userId, features }: { userId: string; features: string[] }) =>
      api.put(`/api/users/${userId}/features`, { features }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      message.success('功能權限已更新')
      setPermOpen(false)
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? '更新失敗'),
  })

  const toggleActive = useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      api.put(`/api/users/${userId}/${active ? 'activate' : 'deactivate'}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: any) => message.error(e.response?.data?.message ?? '操作失敗'),
  })

  const openPerm = (member: any) => {
    setPermTarget(member)
    // 顯示：role預設 union 自定義覆寫
    const defaults = roleDefaultFeatures[member.role] ?? []
    const custom = member.features ?? []
    setPermFeatures([...new Set([...defaults, ...custom])])
    setPermOpen(true)
  }

  const columns = [
    { title: '姓名', dataIndex: ['user', 'name'], width: 100 },
    { title: 'Email', dataIndex: ['user', 'email'] },
    { title: '電話', dataIndex: ['user', 'phone'], width: 130 },
    {
      title: '角色', dataIndex: 'role', width: 120,
      render: (r: string, rec: any) => isOwner ? (
        <Select size="small" value={r} style={{ width: 110 }}
          onChange={(v) => changeRole.mutate({ userId: rec.userId, role: v })}
          options={Object.entries(roleLabel).map(([k, v]) => ({ value: k, label: v }))}
        />
      ) : <Tag color={roleColor[r]}>{roleLabel[r]}</Tag>,
    },
    {
      title: '額外功能', width: 200,
      render: (_: any, r: any) => {
        const extra = (r.features ?? []) as string[]
        if (extra.length === 0) return <span style={{ color: '#ccc' }}>（依角色預設）</span>
        return extra.map((f: string) => {
          const feat = ALL_FEATURES.find(x => x.key === f)
          return <Tag key={f}>{feat?.label ?? f}</Tag>
        })
      },
    },
    {
      title: '狀態', dataIndex: ['user', 'isActive'], width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '啟用' : '停用'}</Tag>,
    },
    isOwner ? {
      title: '操作', width: 160,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button size="small" icon={<SettingOutlined />} onClick={() => openPerm(r)}>權限</Button>
          <Popconfirm
            title={r.user.isActive ? '確認停用此帳號？' : '確認啟用此帳號？'}
            onConfirm={() => toggleActive.mutate({ userId: r.userId, active: !r.user.isActive })}>
            <Button size="small" danger={r.user.isActive}>{r.user.isActive ? '停用' : '啟用'}</Button>
          </Popconfirm>
        </Space>
      ),
    } : { title: '', width: 0, render: () => null },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>使用者管理</Typography.Title>
        {isOwner && <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新增成員</Button>}
      </div>
      <Table dataSource={data ?? []} columns={columns} rowKey="userId" loading={isLoading} scroll={{ x: 900 }} />

      {/* 新增成員 */}
      <Modal title="新增成員" open={open} onCancel={() => setOpen(false)}
        onOk={() => form.submit()} confirmLoading={create.isPending}>
        <Form form={form} layout="vertical" onFinish={create.mutate}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="password" label="初始密碼" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item>
          <Form.Item name="phone" label="電話"><Input /></Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select options={Object.entries(roleLabel).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 功能權限設定 */}
      <Modal title={`功能權限：${permTarget?.user?.name}`}
        open={permOpen} onCancel={() => setPermOpen(false)}
        onOk={() => updateFeatures.mutate({ userId: permTarget.userId, features: permFeatures })}
        confirmLoading={updateFeatures.isPending} okText="儲存">
        <div style={{ marginBottom: 8, color: '#888', fontSize: 12 }}>
          勾選成員可使用的功能模組（未勾選則依角色預設）
        </div>
        <Divider style={{ margin: '8px 0' }} />
        <Checkbox.Group value={permFeatures} onChange={v => setPermFeatures(v as string[])}>
          <Space direction="vertical">
            {ALL_FEATURES.map(f => (
              <Checkbox key={f.key} value={f.key}>{f.label}</Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
        <Divider style={{ margin: '8px 0' }} />
        <div style={{ fontSize: 12, color: '#aaa' }}>
          角色「{roleLabel[permTarget?.role]}」預設可用：
          {(roleDefaultFeatures[permTarget?.role] ?? []).map(k => {
            const f = ALL_FEATURES.find(x => x.key === k)
            return <Tag key={k} style={{ marginLeft: 4 }}>{f?.label}</Tag>
          })}
        </div>
      </Modal>
    </div>
  )
}
