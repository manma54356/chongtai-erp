import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Tag, Modal, Form, Input, Select, Typography, Popconfirm, message } from 'antd'
import { PlusOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'

// Aligned to backend AcctCategory enum (no EXPENSE → EXPENSE is included, COGS added)
const typeLabel: Record<string, string> = {
  ASSET: '資產', LIABILITY: '負債', EQUITY: '股東權益',
  REVENUE: '收入', COGS: '銷貨成本', EXPENSE: '費用',
}
const typeColor: Record<string, string> = {
  ASSET: 'blue', LIABILITY: 'orange', EQUITY: 'purple',
  REVENUE: 'green', COGS: 'gold', EXPENSE: 'red',
}

export default function ChartOfAccountsPage() {
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/api/accounts').then(r => r.data),
  })

  const seed = useMutation({
    mutationFn: () => api.post('/api/accounts/seed'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); message.success('已匯入預設科目') },
    onError: () => message.error('匯入失敗，可能已有科目資料'),
  })

  const create = useMutation({
    mutationFn: (v: any) => api.post('/api/accounts', v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setOpen(false); form.resetFields() },
    onError: (e: any) => message.error(e.response?.data?.message ?? '新增失敗'),
  })

  const columns = [
    { title: '科目代碼', dataIndex: 'code', width: 110 },
    { title: '科目名稱', dataIndex: 'name', width: 180 },
    {
      title: '類別', dataIndex: 'category', width: 110,
      render: (v: string) => <Tag color={typeColor[v]}>{typeLabel[v] ?? v}</Tag>,
    },
    {
      title: '上層科目代碼', dataIndex: 'parentCode', width: 120,
      render: (v: string) => v ?? '-',
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>會計科目表</Typography.Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Popconfirm
            title="匯入建設業預設科目（39個）？"
            description="若已有相同代碼科目將略過"
            onConfirm={() => seed.mutate()}
          >
            <Button icon={<ThunderboltOutlined />} loading={seed.isPending}>匯入預設科目</Button>
          </Popconfirm>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新增科目</Button>
        </div>
      </div>
      <Table
        dataSource={data ?? []} columns={columns} rowKey="id" loading={isLoading}
        pagination={{ pageSize: 50 }}
      />

      <Modal title="新增科目" open={open} onCancel={() => setOpen(false)}
        onOk={() => form.submit()} confirmLoading={create.isPending}>
        <Form form={form} layout="vertical" onFinish={create.mutate}>
          <Form.Item name="code" label="科目代碼" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name" label="科目名稱" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="類別" rules={[{ required: true }]}>
            <Select options={Object.entries(typeLabel).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="parentCode" label="上層科目代碼（選填）">
            <Select
              allowClear showSearch
              filterOption={(input, opt) => (opt?.label as string ?? '').includes(input)}
              options={(data ?? []).map((a: any) => ({ value: a.code, label: `${a.code} ${a.name}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
