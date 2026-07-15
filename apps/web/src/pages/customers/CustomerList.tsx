import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Tag, Input, Select, Form, Modal, Typography, Space } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

const gradeColor: Record<string, string> = {
  PROSPECT: 'default', NEGOTIATING: 'blue', CONTRACTED: 'green', DELIVERED: 'purple',
}
const gradeLabel: Record<string, string> = {
  PROSPECT: '潛在', NEGOTIATING: '議價中', CONTRACTED: '已簽約', DELIVERED: '已交屋',
}
const sourceLabel: Record<string, string> = {
  CALL: '來電', VISIT: '來訪', AD: '廣告', BROKER: '仲介', REFERRAL: '轉介', UNKNOWN: '未知',
}

export default function CustomerList() {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [projectId, setProjectId] = useState<string | undefined>()
  const [form] = Form.useForm()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: projects } = useQuery({
    queryKey: ['projects-simple'],
    queryFn: () => api.get('/api/projects').then(r => r.data.data ?? []),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['customers', keyword, projectId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (keyword) params.set('keyword', keyword)
      if (projectId) params.set('projectId', projectId)
      const qs = params.toString()
      return api.get(`/api/customers${qs ? `?${qs}` : ''}`).then(r => r.data)
    },
  })

  const create = useMutation({
    mutationFn: (values: any) => api.post('/api/customers', values),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setOpen(false); form.resetFields() },
  })

  const columns = [
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '電話', dataIndex: 'phone', width: 120 },
    { title: 'Email', dataIndex: 'email', ellipsis: true },
    { title: '來源', dataIndex: 'source', width: 80, render: (s: string) => sourceLabel[s] },
    {
      title: '狀態', dataIndex: 'grade', width: 90,
      render: (g: string) => <Tag color={gradeColor[g]}>{gradeLabel[g]}</Tag>,
    },
    {
      title: '購買案件', dataIndex: 'contracts', width: 160,
      render: (contracts: any[]) => contracts?.length
        ? contracts.map((c: any) => (
            <Tag key={c.id} color="blue" style={{ marginBottom: 2 }}>
              {c.unit?.project?.name ?? '-'}
            </Tag>
          ))
        : <span style={{ color: '#bbb' }}>—</span>,
    },
    { title: '合約數', dataIndex: ['_count', 'contracts'], width: 70 },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>客戶管理</Typography.Title>
        <Space>
          <Select
            allowClear placeholder="篩選案件"
            style={{ width: 180 }}
            value={projectId}
            onChange={v => setProjectId(v)}
            options={(projects ?? []).map((p: any) => ({ value: p.id, label: p.name }))}
          />
          <Input placeholder="搜尋姓名/電話" prefix={<SearchOutlined />}
            onChange={e => setKeyword(e.target.value)} style={{ width: 180 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新增客戶</Button>
        </Space>
      </div>

      <Table dataSource={data?.data ?? []} columns={columns} rowKey="id"
        loading={isLoading} pagination={{ total: data?.total, pageSize: 20 }}
        onRow={(r: any) => ({ onClick: () => navigate(`/customers/${r.id}`), style: { cursor: 'pointer' } })} />

      <Modal title="新增客戶" open={open} onCancel={() => setOpen(false)}
        onOk={() => form.submit()} confirmLoading={create.isPending}>
        <Form form={form} layout="vertical" onFinish={create.mutate}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label="電話"><Input /></Form.Item>
          <Form.Item name="email" label="Email"><Input type="email" /></Form.Item>
          <Form.Item name="source" label="來源" initialValue="UNKNOWN">
            <Select options={Object.entries(sourceLabel).map(([k,v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="address" label="地址"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
