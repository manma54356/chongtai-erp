import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Tag, Modal, Form, Input, Select, Typography, Space, InputNumber, Alert } from 'antd'
import { PlusOutlined, CheckOutlined, PrinterOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'
import dayjs from 'dayjs'

function rocDate(d: string) {
  const dt = dayjs(d)
  return `${dt.year() - 1911}/${String(dt.month() + 1).padStart(2, '0')}/${String(dt.date()).padStart(2, '0')}`
}

function printVoucher(entry: any) {
  const d = dayjs(entry.entryDate)
  const rocYear = d.year() - 1911
  const totalDebit = entry.lines.reduce((s: number, l: any) => s + Number(l.debit), 0)
  const totalCredit = entry.lines.reduce((s: number, l: any) => s + Number(l.credit), 0)

  const rows = entry.lines
    .sort((a: any, b: any) => a.order - b.order)
    .map((l: any) => `
    <tr>
      <td>${l.account?.code ?? ''}</td>
      <td>${l.account?.name ?? ''}</td>
      <td>${l.description ?? entry.description ?? ''}</td>
      <td class="num">${Number(l.debit) > 0 ? Number(l.debit).toLocaleString() : ''}</td>
      <td class="num">${Number(l.credit) > 0 ? Number(l.credit).toLocaleString() : ''}</td>
    </tr>`).join('')

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>傳票 ${entry.entryNo}</title>
<style>
  body { font-family: '標楷體', '仿宋', 'KaiTi', serif; margin: 20mm; font-size: 12pt; color: #000; }
  .co-name { text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 2px; }
  .title { text-align: center; font-size: 24pt; font-weight: bold; letter-spacing: 20px; margin: 4px 0 14px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 11pt; }
  table { width: 100%; border-collapse: collapse; font-size: 11pt; margin-bottom: 32px; }
  th { background: #f5f5f5; text-align: center; font-weight: bold; padding: 6px 8px; border: 1px solid #000; }
  td { border: 1px solid #000; padding: 5px 8px; }
  td.num { text-align: right; min-width: 100px; }
  .total-row td { font-weight: bold; background: #fafafa; }
  .total-row td:first-child { text-align: center; }
  .signatures { display: flex; justify-content: space-around; margin-top: 40px; font-size: 11pt; }
  .sig-item { min-width: 140px; }
  .sig-line { display: inline-block; width: 90px; border-bottom: 1px solid #000; margin-left: 6px; vertical-align: bottom; }
  @media print { @page { margin: 15mm; size: A4; } button { display: none; } }
</style></head><body>
<div class="co-name">重泰開發有限公司</div>
<div class="title">傳　票</div>
<div class="meta">
  <span>中華民國 ${rocYear} 年 ${d.month() + 1} 月 ${d.date()} 日</span>
  <span>傳票號碼：${entry.entryNo}</span>
</div>
<table>
  <thead>
    <tr>
      <th style="width:90px">科目代號</th>
      <th>科目名稱</th>
      <th>摘要</th>
      <th style="width:110px">借方金額</th>
      <th style="width:110px">貸方金額</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="3">合　計</td>
      <td class="num">${totalDebit.toLocaleString()}</td>
      <td class="num">${totalCredit.toLocaleString()}</td>
    </tr>
  </tbody>
</table>
<div class="signatures">
  <div class="sig-item">經辦：<span class="sig-line"></span></div>
  <div class="sig-item">覆核：<span class="sig-line"></span></div>
  <div class="sig-item">會計：<span class="sig-line"></span></div>
  <div class="sig-item">主管：<span class="sig-line"></span></div>
</div>
</body></html>`

  const w = window.open('', '_blank', 'width=850,height=650')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print() }, 600)
}

export default function JournalPage() {
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState([{ order: 1, accountId: '', debit: 0, credit: 0, description: '' }])
  const [form] = Form.useForm()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['journal'],
    queryFn: () => api.get('/api/journal').then(r => r.data),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal'] })
      setOpen(false)
      form.resetFields()
      setLines([{ order: 1, accountId: '', debit: 0, credit: 0, description: '' }])
    },
  })
  const post = useMutation({
    mutationFn: (id: string) => api.put(`/api/journal/${id}/post`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  })

  const accountOptions = (accounts ?? []).map((a: any) => ({
    value: a.id,
    label: `${a.code} ${a.name}`,
  }))

  const columns = [
    { title: '傳票號', dataIndex: 'entryNo', width: 120 },
    {
      title: '日期', dataIndex: 'entryDate', width: 105,
      render: (d: string) => rocDate(d),
    },
    { title: '摘要說明', dataIndex: 'description', ellipsis: true },
    { title: '來源', dataIndex: 'source', width: 80 },
    {
      title: '狀態', dataIndex: 'status', width: 85,
      render: (s: string) => <Tag color={s === 'POSTED' ? 'green' : 'default'}>{s === 'POSTED' ? '已過帳' : '草稿'}</Tag>,
    },
    {
      title: '操作', width: 155,
      render: (_: any, row: any) => (
        <Space size="small">
          <Button size="small" icon={<PrinterOutlined />} onClick={() => printVoucher(row)}>列印傳票</Button>
          {row.status === 'DRAFT' && (
            <Button size="small" icon={<CheckOutlined />} onClick={() => post.mutate(row.id)}>過帳</Button>
          )}
        </Space>
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
            <Table size="small" dataSource={row.lines?.sort((a: any, b: any) => a.order - b.order)} rowKey="id" pagination={false}
              columns={[
                { title: '科目代號', render: (_: any, l: any) => l.account?.code, width: 90 },
                { title: '科目名稱', render: (_: any, l: any) => l.account?.name },
                { title: '摘要', dataIndex: 'description' },
                { title: '借方', dataIndex: 'debit', width: 110, render: (v: number) => Number(v) > 0 ? `$${Number(v).toLocaleString()}` : '' },
                { title: '貸方', dataIndex: 'credit', width: 110, render: (v: number) => Number(v) > 0 ? `$${Number(v).toLocaleString()}` : '' },
              ]}
            />
          ),
        }}
        pagination={{ total: data?.total, pageSize: 20 }} />

      <Modal title="新增傳票" open={open} onCancel={() => setOpen(false)} width={780}
        onOk={() => { if (balanced) form.submit() }} okButtonProps={{ disabled: !balanced }}
        confirmLoading={create.isPending}>
        <Form form={form} layout="inline" onFinish={create.mutate} style={{ marginBottom: 16 }}>
          <Form.Item name="entryDate" label="傳票日期" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="description" label="摘要說明" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input style={{ width: 260 }} />
          </Form.Item>
        </Form>

        <Typography.Text strong>分錄明細</Typography.Text>
        {lines.map((line, idx) => (
          <Space key={idx} style={{ display: 'flex', marginBottom: 8, marginTop: 8, flexWrap: 'wrap' }} align="baseline">
            <Select style={{ width: 220 }} placeholder="選擇科目" showSearch
              filterOption={(input, opt) => (opt?.label as string ?? '').includes(input)}
              options={accountOptions}
              value={line.accountId || undefined}
              onChange={v => setLines(ls => ls.map((l, i) => i === idx ? { ...l, accountId: v } : l))} />
            <Input placeholder="摘要" style={{ width: 140 }} value={line.description}
              onChange={e => setLines(ls => ls.map((l, i) => i === idx ? { ...l, description: e.target.value } : l))} />
            <InputNumber placeholder="借方" min={0} value={line.debit || undefined} style={{ width: 100 }}
              formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              parser={v => v?.replace(/,/g, '') as any}
              onChange={v => setLines(ls => ls.map((l, i) => i === idx ? { ...l, debit: v ?? 0 } : l))} />
            <InputNumber placeholder="貸方" min={0} value={line.credit || undefined} style={{ width: 100 }}
              formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              parser={v => v?.replace(/,/g, '') as any}
              onChange={v => setLines(ls => ls.map((l, i) => i === idx ? { ...l, credit: v ?? 0 } : l))} />
            <Button size="small" danger onClick={() => setLines(ls => ls.filter((_, i) => i !== idx))}>刪</Button>
          </Space>
        ))}
        <Button size="small" style={{ marginTop: 4 }}
          onClick={() => setLines(ls => [...ls, { order: ls.length + 1, accountId: '', debit: 0, credit: 0, description: '' }])}>
          + 新增分錄
        </Button>

        <div style={{ marginTop: 12 }}>
          {balanced
            ? <Alert message={`借貸平衡：$${totalDebit.toLocaleString()}`} type="success" showIcon />
            : <Alert message={`借貸不平衡：借方 $${totalDebit.toLocaleString()}，貸方 $${totalCredit.toLocaleString()}`} type="error" showIcon />}
        </div>
      </Modal>
    </div>
  )
}
