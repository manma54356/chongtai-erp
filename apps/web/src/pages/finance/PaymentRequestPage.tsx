import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Tag, Typography, Select, Space, Button, Modal, Form,
  Input, InputNumber, message, Popconfirm,
} from 'antd'
import { PlusOutlined, CheckOutlined, CloseOutlined, DollarOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import dayjs from 'dayjs'

const statusColor: Record<string, string> = {
  PENDING: 'orange', APPROVED: 'blue', REJECTED: 'red', PAID: 'green',
}
const statusLabel: Record<string, string> = {
  PENDING: '待審核', APPROVED: '已核准', REJECTED: '已退回', PAID: '已付款',
}

export default function PaymentRequestPage() {
  const { role } = useAuth()
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<string | undefined>()
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()

  const canApprove = role === 'OWNER' || role === 'FINANCE_CHIEF'
  const canPay = role === 'OWNER' || role === 'CASHIER'

  const { data, isLoading } = useQuery({
    queryKey: ['payment-requests', filterStatus],
    queryFn: () => {
      const params = filterStatus ? `?status=${filterStatus}` : ''
      return api.get(`/api/payment-requests${params}`).then(r => r.data)
    },
  })

  const create = useMutation({
    mutationFn: (v: any) => api.post('/api/payment-requests', v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-requests'] })
      message.success('請款單已送出')
      setOpen(false)
      form.resetFields()
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? '送出失敗'),
  })

  const approve = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      api.put(`/api/payment-requests/${id}/approve`, { approved }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-requests'] }); message.success('已更新') },
    onError: (e: any) => message.error(e.response?.data?.message ?? '操作失敗'),
  })

  const pay = useMutation({
    mutationFn: (id: string) => api.put(`/api/payment-requests/${id}/pay`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-requests'] }); message.success('已標記付款') },
    onError: (e: any) => message.error(e.response?.data?.message ?? '操作失敗'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/payment-requests/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-requests'] }); message.success('已刪除') },
    onError: (e: any) => message.error(e.response?.data?.message ?? '刪除失敗'),
  })

  const columns = [
    { title: '單號', dataIndex: 'prNo', width: 130 },
    { title: '申請人', dataIndex: ['requester', 'name'], width: 90 },
    { title: '類別', dataIndex: 'category', width: 100 },
    { title: '說明', dataIndex: 'description', ellipsis: true },
    {
      title: '金額', dataIndex: 'amount', width: 120,
      render: (v: number) => `$${Number(v).toLocaleString()}`,
    },
    {
      title: '狀態', dataIndex: 'status', width: 90,
      render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s]}</Tag>,
    },
    {
      title: '申請時間', dataIndex: 'createdAt', width: 130,
      render: (d: string) => dayjs(d).format('YYYY/MM/DD HH:mm'),
    },
    {
      title: '操作', width: 160,
      render: (_: any, r: any) => (
        <Space size="small">
          {canApprove && r.status === 'PENDING' && (
            <>
              <Button size="small" type="primary" icon={<CheckOutlined />}
                onClick={() => approve.mutate({ id: r.id, approved: true })}>核准</Button>
              <Popconfirm title="確認退回？" onConfirm={() => approve.mutate({ id: r.id, approved: false })}>
                <Button size="small" danger icon={<CloseOutlined />}>退回</Button>
              </Popconfirm>
            </>
          )}
          {canPay && r.status === 'APPROVED' && (
            <Popconfirm title="確認已付款？" onConfirm={() => pay.mutate(r.id)}>
              <Button size="small" type="primary" ghost icon={<DollarOutlined />}>付款</Button>
            </Popconfirm>
          )}
          {r.status === 'PENDING' && (
            <Popconfirm title="確認刪除？" onConfirm={() => remove.mutate(r.id)}>
              <Button size="small" danger>刪除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>請款管理</Typography.Title>
        <Space>
          <Select allowClear placeholder="篩選狀態" style={{ width: 120 }}
            value={filterStatus} onChange={setFilterStatus}
            options={Object.entries(statusLabel).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新增請款單</Button>
        </Space>
      </div>

      <Table dataSource={data?.data ?? []} columns={columns} rowKey="id"
        loading={isLoading} scroll={{ x: 1000 }}
        pagination={{ total: data?.total, pageSize: 20 }} />

      <Modal title="新增請款單" open={open} onCancel={() => { setOpen(false); form.resetFields() }}
        onOk={() => form.submit()} confirmLoading={create.isPending}>
        <Form form={form} layout="vertical" onFinish={create.mutate} style={{ marginTop: 12 }}>
          <Form.Item name="prNo" label="單號" rules={[{ required: true }]}>
            <Input placeholder="例：PR2025-001" />
          </Form.Item>
          <Form.Item name="category" label="費用類別" rules={[{ required: true }]}>
            <Select
              options={['差旅費','材料費','設備費','勞務費','行政費用','其他'].map(v => ({ value: v, label: v }))}
              showSearch allowClear
            />
          </Form.Item>
          <Form.Item name="description" label="說明" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="amount" label="金額（元）" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v?.replace(/,/g, '') as any} />
          </Form.Item>
          <Form.Item name="notes" label="備註">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
