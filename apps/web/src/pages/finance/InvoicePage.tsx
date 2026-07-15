import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Tag, Typography, Select, Space, Button, Modal, Form,
  Input, InputNumber, DatePicker, message, Popconfirm,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import dayjs from 'dayjs'

const typeLabel: Record<string, string> = {
  ADVANCE: '預收款發票', SALES: '銷售發票', INPUT: '進項發票',
}
const typeColor: Record<string, string> = {
  ADVANCE: 'blue', SALES: 'green', INPUT: 'orange',
}

export default function InvoicePage() {
  const { role } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const [filterType, setFilterType] = useState<string | undefined>()
  const [filterStatus, setFilterStatus] = useState<string | undefined>()

  const canCreate = ['OWNER', 'FINANCE_CHIEF', 'ACCOUNTANT', 'CASHIER'].includes(role ?? '')
  const canVoid = ['OWNER', 'FINANCE_CHIEF', 'ACCOUNTANT'].includes(role ?? '')

  const { data: contracts } = useQuery({
    queryKey: ['contracts-simple'],
    queryFn: () => api.get('/api/contracts').then(r => r.data.data ?? []),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', filterType, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterType) params.set('type', filterType)
      if (filterStatus) params.set('status', filterStatus)
      return api.get(`/api/invoices?${params}`).then(r => r.data)
    },
  })

  const create = useMutation({
    mutationFn: (v: any) => api.post('/api/invoices', {
      ...v,
      issueDate: v.issueDate.format('YYYY-MM-DD'),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      message.success('發票已開立')
      setOpen(false)
      form.resetFields()
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? '開票失敗'),
  })

  const voidInv = useMutation({
    mutationFn: (id: string) => api.put(`/api/invoices/${id}/void`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); message.success('發票已作廢') },
    onError: (e: any) => message.error(e.response?.data?.message ?? '操作失敗'),
  })

  const columns = [
    { title: '發票號碼', dataIndex: 'invoiceNo', width: 130 },
    {
      title: '類型', dataIndex: 'type', width: 130,
      render: (t: string) => <Tag color={typeColor[t]}>{typeLabel[t]}</Tag>,
    },
    {
      title: '開票日', dataIndex: 'issueDate', width: 110,
      render: (d: string) => dayjs(d).format('YYYY/MM/DD'),
    },
    { title: '關聯合約', render: (_: any, r: any) => r.contract?.contractNo ?? '-', width: 130 },
    { title: '客戶', render: (_: any, r: any) => r.contract?.customer?.name ?? '-', width: 90 },
    {
      title: '含稅總額', dataIndex: 'totalAmount', width: 120,
      render: (v: number) => `$${Number(v).toLocaleString()}`,
    },
    {
      title: '狀態', dataIndex: 'status', width: 80,
      render: (s: string) => <Tag color={s === 'VALID' ? 'green' : 'default'}>{s === 'VALID' ? '有效' : '已作廢'}</Tag>,
    },
    {
      title: '操作', width: 80,
      render: (_: any, r: any) => canVoid && r.status === 'VALID' ? (
        <Popconfirm title="確認作廢此發票？" onConfirm={() => voidInv.mutate(r.id)}>
          <Button size="small" danger>作廢</Button>
        </Popconfirm>
      ) : null,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>出帳管理</Typography.Title>
        <Space>
          <Select allowClear placeholder="發票類型" style={{ width: 140 }}
            value={filterType} onChange={setFilterType}
            options={Object.entries(typeLabel).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Select allowClear placeholder="狀態" style={{ width: 100 }}
            value={filterStatus} onChange={setFilterStatus}
            options={[{ value: 'VALID', label: '有效' }, { value: 'VOIDED', label: '已作廢' }]}
          />
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>開立發票</Button>
          )}
        </Space>
      </div>

      <Table dataSource={data?.data ?? []} columns={columns} rowKey="id"
        loading={isLoading} scroll={{ x: 900 }}
        pagination={{ total: data?.total, pageSize: 20 }} />

      <Modal title="開立發票" open={open} onCancel={() => { setOpen(false); form.resetFields() }}
        onOk={() => form.submit()} confirmLoading={create.isPending} width={520}>
        <Form form={form} layout="vertical" onFinish={create.mutate} style={{ marginTop: 12 }}>
          <Form.Item name="invoiceNo" label="發票號碼" rules={[{ required: true }]}>
            <Input placeholder="例：AB12345678" />
          </Form.Item>
          <Form.Item name="type" label="發票類型" rules={[{ required: true }]}>
            <Select options={Object.entries(typeLabel).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="contractId" label="關聯合約（選填）">
            <Select allowClear showSearch placeholder="搜尋合約"
              filterOption={(input, opt) => (opt?.label as string ?? '').includes(input)}
              options={(contracts ?? []).map((c: any) => ({
                value: c.id,
                label: `${c.contractNo}（${c.customer?.name}）`,
              }))}
            />
          </Form.Item>
          <Form.Item name="issueDate" label="開票日" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="amount" label="未稅金額" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v?.replace(/,/g, '') as any} />
          </Form.Item>
          <Form.Item name="taxAmount" label="稅額" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v?.replace(/,/g, '') as any} />
          </Form.Item>
          <Form.Item name="totalAmount" label="含稅總額" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v?.replace(/,/g, '') as any} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
