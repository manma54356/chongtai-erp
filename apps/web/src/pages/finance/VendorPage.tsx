import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Tag, Modal, Form, Input, Select, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'

const categoryLabel: Record<string, string> = {
  CONTRACTOR: '承包商', SUPPLIER: '供應商', CONSULTANT: '顧問', OTHER: '其他',
}

export default function VendorPage() {
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.get('/api/vendors').then(r => r.data),
  })

  const create = useMutation({
    mutationFn: (v: any) => api.post('/api/vendors', v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); setOpen(false); form.resetFields() },
  })

  const columns = [
    { title: '廠商名稱', dataIndex: 'name', width: 200 },
    { title: '類別', dataIndex: 'category', width: 100, render: (v: string) => <Tag>{categoryLabel[v] ?? v}</Tag> },
    { title: '統編', dataIndex: 'taxId', width: 110 },
    { title: '聯絡人', dataIndex: 'contactName', width: 100 },
    { title: '電話', dataIndex: 'phone', width: 130 },
    { title: '銀行帳號', dataIndex: 'bankAccount' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>廠商管理</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新增廠商</Button>
      </div>
      <Table dataSource={data ?? []} columns={columns} rowKey="id" loading={isLoading} />

      <Modal title="新增廠商" open={open} onCancel={() => setOpen(false)}
        onOk={() => form.submit()} confirmLoading={create.isPending}>
        <Form form={form} layout="vertical" onFinish={create.mutate}>
          <Form.Item name="name" label="廠商名稱" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="類別" rules={[{ required: true }]}>
            <Select options={Object.entries(categoryLabel).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="taxId" label="統一編號"><Input maxLength={8} /></Form.Item>
          <Form.Item name="contactName" label="聯絡人"><Input /></Form.Item>
          <Form.Item name="phone" label="電話"><Input /></Form.Item>
          <Form.Item name="email" label="Email"><Input /></Form.Item>
          <Form.Item name="bankName" label="銀行名稱"><Input /></Form.Item>
          <Form.Item name="bankAccount" label="銀行帳號"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
