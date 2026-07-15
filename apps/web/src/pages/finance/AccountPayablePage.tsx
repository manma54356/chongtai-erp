import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Tag, Modal, Form, Input, InputNumber, Select, Typography, Space } from 'antd'
import { PlusOutlined, CheckOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'
import dayjs from 'dayjs'

const statusColor: Record<string, string> = { PENDING: 'orange', APPROVED: 'blue', PAID: 'green', CANCELLED: 'default' }
const statusLabel: Record<string, string> = { PENDING: '待審核', APPROVED: '已核准', PAID: '已付款', CANCELLED: '取消' }

export default function AccountPayablePage() {
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['payables'],
    queryFn: () => api.get('/api/payables').then(r => r.data),
  })
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get('/api/vendors').then(r => r.data),
  })

  const create = useMutation({
    mutationFn: (v: any) => api.post('/api/payables', v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payables'] }); setOpen(false); form.resetFields() },
  })
  const approve = useMutation({
    mutationFn: (id: string) => api.put(`/api/payables/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payables'] }),
  })
  const pay = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/api/payables/${id}/pay`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payables'] }),
  })

  const columns = [
    { title: '編號', dataIndex: 'apNo', width: 120 },
    { title: '廠商', dataIndex: ['vendor', 'name'], width: 120 },
    { title: '說明', dataIndex: 'description', ellipsis: true },
    { title: '金額', dataIndex: 'amount', render: (v: number) => `$${Number(v).toLocaleString()}` },
    { title: '到期日', dataIndex: 'dueDate', width: 110, render: (d: string) => dayjs(d).format('YYYY/MM/DD') },
    { title: '狀態', dataIndex: 'status', width: 90, render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s]}</Tag> },
    {
      title: '操作', width: 160,
      render: (_: any, row: any) => (
        <Space>
          {row.status === 'PENDING' && <Button size="small" onClick={() => approve.mutate(row.id)}>核准</Button>}
          {row.status === 'APPROVED' && (
            <Button size="small" type="primary" icon={<CheckOutlined />}
              onClick={() => pay.mutate({ id: row.id, paidAmount: Number(row.amount), paidDate: dayjs().format('YYYY-MM-DD') })}>
              付款
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>應付帳款</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新增應付</Button>
      </div>
      <Table dataSource={data?.data ?? []} columns={columns} rowKey="id" loading={isLoading}
        pagination={{ total: data?.total, pageSize: 20 }} />

      <Modal title="新增應付帳款" open={open} onCancel={() => setOpen(false)}
        onOk={() => form.submit()} confirmLoading={create.isPending}>
        <Form form={form} layout="vertical" onFinish={create.mutate}>
          <Form.Item name="apNo" label="編號" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="vendorId" label="廠商" rules={[{ required: true }]}>
            <Select options={(vendors ?? []).map((v: any) => ({ value: v.id, label: v.name }))} />
          </Form.Item>
          <Form.Item name="description" label="說明" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="amount" label="金額" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} step={1000} /></Form.Item>
          <Form.Item name="dueDate" label="到期日" rules={[{ required: true }]}><Input type="date" /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
