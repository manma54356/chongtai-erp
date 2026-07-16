import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Tag, Space, Modal, Form, Input, InputNumber, Select, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import dayjs from 'dayjs'

const statusColor: Record<string, string> = {
  PLANNING: 'default', LAND_ACQUIRED: 'blue', CONSTRUCTION: 'orange',
  SALES: 'green', DELIVERING: 'purple', COMPLETED: 'default',
}
const statusLabel: Record<string, string> = {
  PLANNING: '規劃設計', LAND_ACQUIRED: '土地取得', CONSTRUCTION: '施工中',
  SALES: '銷售期', DELIVERING: '交屋準備', COMPLETED: '已結案',
}

export default function ProjectList() {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [form] = Form.useForm()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['projects', page],
    queryFn: () => api.get(`/api/projects?page=${page}`).then(r => r.data),
  })

  const create = useMutation({
    mutationFn: (values: any) => api.post('/api/projects', values),
    onSuccess: () => {
      setPage(1)
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects-simple'] })
      setOpen(false)
      form.resetFields()
    },
  })

  const columns = [
    { title: '代號', dataIndex: 'code', width: 100 },
    { title: '建案名稱', dataIndex: 'name' },
    { title: '地址', dataIndex: 'address', ellipsis: true },
    { title: '總戶數', dataIndex: 'totalUnits', width: 80 },
    {
      title: '狀態', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s]}</Tag>,
    },
    {
      title: '預計完工', dataIndex: 'completionDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('YYYY/MM') : '-',
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>建案管理</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新增建案</Button>
      </div>

      <Table dataSource={data?.data ?? []} columns={columns} rowKey="id"
        loading={isLoading}
        pagination={{ total: data?.total, pageSize: 20, current: page, onChange: setPage }}
        onRow={(r: any) => ({ onClick: () => navigate(`/projects/${r.id}`), style: { cursor: 'pointer' } })} />

      <Modal title="新增建案" open={open} onCancel={() => setOpen(false)}
        onOk={() => form.submit()} confirmLoading={create.isPending}>
        <Form form={form} layout="vertical" onFinish={create.mutate}>
          <Form.Item name="code" label="建案代號" rules={[{ required: true }]}>
            <Input placeholder="例：A2025" />
          </Form.Item>
          <Form.Item name="name" label="建案名稱" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="地址"><Input /></Form.Item>
          <Form.Item name="totalUnits" label="總戶數" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="startDate" label="預計開工日"><Input type="date" /></Form.Item>
          <Form.Item name="completionDate" label="預計完工日"><Input type="date" /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
