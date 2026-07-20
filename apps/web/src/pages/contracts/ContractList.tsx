import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Tag, Typography, Select, Space, Button, Modal, Form, Input, InputNumber, DatePicker, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import dayjs from 'dayjs'

const statusColor: Record<string, string> = {
  NEGOTIATING: 'default', DEPOSITED: 'blue', SIGNED: 'cyan', SEALED: 'geekblue',
  LOAN_APPROVED: 'purple', READY_DELIVER: 'orange', DELIVERED: 'green', WARRANTY: 'lime', CLOSED: 'default',
}
const statusLabel: Record<string, string> = {
  NEGOTIATING: '洽談中', DEPOSITED: '已下訂', SIGNED: '已簽約', SEALED: '用印完成',
  LOAN_APPROVED: '貸款核准', READY_DELIVER: '待交屋', DELIVERED: '已交屋', WARRANTY: '保固中', CLOSED: '結案',
}

export default function ContractList() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filterProjectId, setFilterProjectId] = useState<string | undefined>()
  const [status, setStatus] = useState<string | undefined>()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [form] = Form.useForm()
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>()

  const { data: projects } = useQuery({
    queryKey: ['projects-simple'],
    queryFn: () => api.get('/api/projects').then(r => r.data.data ?? []),
  })

  const { data: customers } = useQuery({
    queryKey: ['customers-simple'],
    queryFn: () => api.get('/api/customers').then(r => r.data.data ?? []),
  })

  const { data: units } = useQuery({
    queryKey: ['units', selectedProjectId],
    queryFn: () => api.get(`/api/projects/${selectedProjectId}/units`).then(r => r.data),
    enabled: !!selectedProjectId,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', filterProjectId, status, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) })
      if (filterProjectId) params.set('projectId', filterProjectId)
      if (status) params.set('status', status)
      return api.get(`/api/contracts?${params}`).then(r => r.data)
    },
  })

  const create = useMutation({
    mutationFn: (v: any) => api.post('/api/contracts', {
      ...v,
      signDate: v.signDate ? v.signDate.format('YYYY-MM-DD') : undefined,
      deliveryDate: v.deliveryDate ? v.deliveryDate.format('YYYY-MM-DD') : undefined,
    }),
    onSuccess: (res) => {
      setPage(1)
      qc.invalidateQueries({ queryKey: ['contracts'] })
      message.success('合約建立成功')
      setOpen(false)
      form.resetFields()
      setSelectedProjectId(undefined)
      navigate(`/contracts/${res.data.id}`)
    },
    onError: (e: any) => {
      message.error(e.response?.data?.message ?? '建立失敗，請確認戶別尚未被使用')
    },
  })

  const availableUnits = (units ?? []).filter((u: any) => u.status === 'AVAILABLE')

  const columns = [
    { title: '合約編號', dataIndex: 'contractNo', width: 130 },
    { title: '客戶', dataIndex: ['customer', 'name'], width: 100 },
    { title: '建案', dataIndex: ['unit', 'project', 'name'], width: 130 },
    { title: '戶別', dataIndex: ['unit', 'code'], width: 80 },
    {
      title: '合約總價', dataIndex: 'totalPrice', width: 130,
      render: (v: number) => `$${Number(v).toLocaleString()}`,
    },
    {
      title: '狀態', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s]}</Tag>,
    },
    {
      title: '簽約日', dataIndex: 'signDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('YYYY/MM/DD') : '-',
    },
    {
      title: '預計交屋', dataIndex: 'deliveryDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('YYYY/MM/DD') : '-',
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>合約管理</Typography.Title>
        <Space>
          <Select allowClear placeholder="篩選案件" style={{ width: 160 }}
            value={filterProjectId} onChange={v => { setFilterProjectId(v); setPage(1) }}
            options={(projects ?? []).map((p: any) => ({ value: p.id, label: p.name }))}
          />
          <Select allowClear placeholder="篩選狀態" style={{ width: 120 }}
            value={status} onChange={v => { setStatus(v); setPage(1) }}
            options={Object.entries(statusLabel).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新增合約</Button>
        </Space>
      </div>

      <Table dataSource={data?.data ?? []} columns={columns} rowKey="id"
        loading={isLoading}
        pagination={{ total: data?.total, pageSize: 20, current: page, onChange: setPage }}
        scroll={{ x: 900 }}
        onRow={(r: any) => ({ onClick: () => navigate(`/contracts/${r.id}`), style: { cursor: 'pointer' } })} />

      <Modal title="新增合約" open={open} width={600}
        onCancel={() => { setOpen(false); form.resetFields(); setSelectedProjectId(undefined) }}
        onOk={() => form.submit()} confirmLoading={create.isPending}
      >
        <Form form={form} layout="vertical" onFinish={create.mutate} style={{ marginTop: 16 }}>
          <Form.Item name="contractNo" label="合約編號" rules={[{ required: true }]}>
            <Input placeholder="例：C2025-001" />
          </Form.Item>

          <Form.Item name="customerId" label="客戶" rules={[{ required: true }]}>
            <Select showSearch placeholder="搜尋客戶姓名"
              filterOption={(input, opt) => (opt?.label as string ?? '').includes(input)}
              options={(customers ?? []).map((c: any) => ({
                value: c.id,
                label: `${c.name}${c.phone ? `（${c.phone}）` : ''}`,
              }))}
            />
          </Form.Item>

          <Form.Item label="建案" required>
            <Select placeholder="先選建案" value={selectedProjectId}
              onChange={(v) => { setSelectedProjectId(v); form.setFieldValue('unitId', undefined) }}
              options={(projects ?? []).map((p: any) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>

          <Form.Item name="unitId" label="戶別" rules={[{ required: true }]}>
            <Select
              placeholder={!selectedProjectId ? '請先選建案' : availableUnits.length ? '選擇可用戶別' : '無可用戶別'}
              disabled={!selectedProjectId}
              options={availableUnits.map((u: any) => ({
                value: u.id,
                label: `${u.code}${u.floor ? `（${u.floor}F）` : ''}${u.area ? ` ${u.area}坪` : ''}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="totalPrice" label="合約總價（元）" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v?.replace(/,/g, '') as any} />
          </Form.Item>

          <Form.Item name="buildingPrice" label="房屋價格（元）">
            <InputNumber min={0} style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v?.replace(/,/g, '') as any} />
          </Form.Item>

          <Form.Item name="landPrice" label="土地價格（元）">
            <InputNumber min={0} style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v?.replace(/,/g, '') as any} />
          </Form.Item>

          <Form.Item name="signDate" label="簽約日">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="deliveryDate" label="預計交屋日">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="notes" label="備註">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
