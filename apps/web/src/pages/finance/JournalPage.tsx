import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Tag, Modal, Form, Input, Select, Typography, Space, InputNumber, Alert } from 'antd'
import { PlusOutlined, CheckOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'
import dayjs from 'dayjs'

export default function JournalPage() {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [lines, setLines] = useState([{ order: 1, accountId: '', debit: 0, credit: 0, description: '' }])
  const [form] = Form.useForm()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['journal', page],
    queryFn: () => api.get(`/api/journal?page=${page}`).then(r => r.data),
  })
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/api/accounts').then(r => r.data),
  })

  const totalDebit  = lines.reduce((s, l) => s + (l.debit ?? 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  const create = useMutation({
    mutationFn: (v: any) => api.post('/api/journal', { ...v, lines }),
    onSuccess: () => { setPage(1); qc.invalidateQueries({ queryKey: ['journal'] }); setOpen(false); form.resetFields(); setLines([{ order: 1, accountId: '', debit: 0, credit: 0, description: '' }]) },
  })
  const post = useMutation({
    mutationFn: (id: string) => api.put(`/api/journal/${id}/post`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  })

  const accountOptions = (accounts ?? []).map((a: any) => ({ value: a.id, label: `${a.code} ${a.name}` }))

  const columns = [
    { title: '傳票號', dataIndex: 'entryNo', width: 110 },
    { title: '日期', dataIndex: 'entryDate', width: 100, render: (d: string) => dayjs(d).format('YYYY/MM/DD') },
    { title: '說明', dataIndex: 'description', ellipsis: true },
    { title: '來源', dataIndex: 'source', width: 80 },
    {
      title: '狀態', dataIndex: 'status', width: 90,
      render: (s: string) => <Tag color={s === 'POSTED' ? 'green' : 'default'}>{s === 'POSTED' ? '已過帳' : '草稿'}</Tag>,
    },
    {
      title: '操作', width: 100,
      render: (_: any, row: any) => row.status === 'DRAFT' && (
        <Button size="small" icon={<CheckOutlined />} onClick={() => post.mutate(row.id)}>過帳</Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>傳票管理</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新增傳票</Button>
      </div>
      <Table dataSource={data?.data ?? []} columns={columns} rowKey="id" loading={isLoading}
        expandable={{
          expandedRowRender: (row: any) => (
            <Table size="small" dataSource={row.lines} rowKey="id" pagination={false}
              columns={[
                { title: '科目', render: (_: any, l: any) => `${l.account?.code} ${l.account?.name}` },
                { title: '說明', dataIndex: 'description' },
                { title: '借方', dataIndex: 'debit', render: (v: number) => Number(v) > 0 ? `$${Number(v).toLocaleString()}` : '' },
                { title: '貸方', dataIndex: 'credit', render: (v: number) => Number(v) > 0 ? `$${Number(v).toLocaleString()}` : '' },
              ]}
            />
          ),
        }}
        pagination={{ total: data?.total, pageSize: 20, current: page, onChange: setPage }} />

      <Modal title="新增傳票" open={open} onCancel={() => setOpen(false)} width={700}
        onOk={() => { if (balanced) form.submit() }} okButtonProps={{ disabled: !balanced }}
        confirmLoading={create.isPending}>
        <Form form={form} layout="vertical" onFinish={create.mutate}>
          <Form.Item name="entryDate" label="傳票日期" rules={[{ required: true }]}><Input type="date" /></Form.Item>
          <Form.Item name="description" label="說明" rules={[{ required: true }]}><Input /></Form.Item>
        </Form>

        <Typography.Text strong>分錄明細</Typography.Text>
        {lines.map((line, idx) => (
          <Space key={idx} style={{ display: 'flex', marginBottom: 8, marginTop: 8 }} align="baseline">
            <Select style={{ width: 200 }} placeholder="選擇科目" options={accountOptions}
              value={line.accountId || undefined}
              onChange={v => setLines(ls => ls.map((l, i) => i === idx ? { ...l, accountId: v } : l))} />
            <InputNumber placeholder="借方" min={0} value={line.debit || undefined}
              onChange={v => setLines(ls => ls.map((l, i) => i === idx ? { ...l, debit: v ?? 0 } : l))} />
            <InputNumber placeholder="貸方" min={0} value={line.credit || undefined}
              onChange={v => setLines(ls => ls.map((l, i) => i === idx ? { ...l, credit: v ?? 0 } : l))} />
            <Button size="small" danger onClick={() => setLines(ls => ls.filter((_, i) => i !== idx))}>刪</Button>
          </Space>
        ))}
        <Button size="small" onClick={() => setLines(ls => [...ls, { order: ls.length + 1, accountId: '', debit: 0, credit: 0, description: '' }])}>+ 新增分錄</Button>

        <div style={{ marginTop: 12 }}>
          {balanced
            ? <Alert message={`借貸平衡：$${totalDebit.toLocaleString()}`} type="success" showIcon />
            : <Alert message={`借貸不平衡：借方 $${totalDebit.toLocaleString()}，貸方 $${totalCredit.toLocaleString()}`} type="error" showIcon />}
        </div>
      </Modal>
    </div>
  )
}
