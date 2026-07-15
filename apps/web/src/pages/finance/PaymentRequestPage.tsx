import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table, Tag, Typography, Select, Space, Button, Modal, Form,
  Input, InputNumber, message, Popconfirm, Divider, Tooltip,
} from 'antd'
import {
  PlusOutlined, CheckOutlined, CloseOutlined, DollarOutlined,
  DownloadOutlined, UploadOutlined, SettingOutlined, DeleteOutlined,
} from '@ant-design/icons'
import * as XLSX from 'xlsx'
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
  const [catOpen, setCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [form] = Form.useForm()
  const importRef = useRef<HTMLInputElement>(null)

  const canApprove = role === 'OWNER' || role === 'FINANCE_CHIEF'
  const canPay = role === 'OWNER' || role === 'CASHIER'
  const canManageCat = role === 'OWNER' || role === 'FINANCE_CHIEF'

  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['payment-requests', filterStatus, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (filterStatus) params.set('status', filterStatus)
      return api.get(`/api/payment-requests?${params}`).then(r => r.data)
    },
  })

  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => api.get('/api/expense-categories').then(r => r.data),
  })

  const allCategories: string[] = [
    ...(catData?.defaults ?? []),
    ...(catData?.custom?.map((c: any) => c.name) ?? []),
  ]

  const addCat = useMutation({
    mutationFn: (name: string) => api.post('/api/expense-categories', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] })
      setNewCatName('')
      message.success('已新增類別')
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? '新增失敗'),
  })

  const delCat = useMutation({
    mutationFn: (id: string) => api.delete(`/api/expense-categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] })
      message.success('已刪除類別')
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? '刪除失敗'),
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

  const importBatch = useMutation({
    mutationFn: (rows: any[]) => api.post('/api/payment-requests/import', rows),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['payment-requests'] })
      message.success(`成功匯入 ${res.data.count} 筆`)
    },
    onError: (e: any) => message.error(e.response?.data?.message ?? '匯入失敗'),
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

  const handleExport = () => {
    const rows = (data?.data ?? []).map((r: any) => ({
      單號: r.prNo,
      申請人: r.requester?.name ?? '',
      費用類別: r.category,
      說明: r.description,
      金額: Number(r.amount),
      狀態: statusLabel[r.status] ?? r.status,
      備註: r.notes ?? '',
      申請時間: dayjs(r.createdAt).format('YYYY/MM/DD HH:mm'),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '請款單')
    XLSX.writeFile(wb, `請款單_${dayjs().format('YYYYMMDD')}.xlsx`)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws)
      if (!rows.length) { message.warning('Excel 中沒有資料'); return }
      const mapped = rows.map((r, i) => {
        const prNo = String(r['單號'] ?? '').trim()
        const category = String(r['費用類別'] ?? '').trim()
        const description = String(r['說明'] ?? '').trim()
        const amount = Number(r['金額'])
        const notes = String(r['備註'] ?? '').trim() || undefined
        if (!prNo || !category || !description || !amount) {
          throw new Error(`第 ${i + 2} 列資料不完整（需填：單號、費用類別、說明、金額）`)
        }
        return { prNo, category, description, amount, notes }
      })
      importBatch.mutate(mapped)
    } catch (err: any) {
      message.error(err.message ?? 'Excel 解析失敗')
    }
  }

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 單號: 'PR2025-001', 費用類別: '差旅費', 說明: '出差台中交通費', 金額: 1200, 備註: '' },
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '請款單匯入範本')
    XLSX.writeFile(wb, '請款單匯入範本.xlsx')
  }

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
        <Space wrap>
          <Select allowClear placeholder="篩選狀態" style={{ width: 120 }}
            value={filterStatus} onChange={v => { setFilterStatus(v); setPage(1) }}
            options={Object.entries(statusLabel).map(([k, v]) => ({ value: k, label: v }))}
          />
          {canManageCat && (
            <Button icon={<SettingOutlined />} onClick={() => setCatOpen(true)}>費用類別</Button>
          )}
          <Tooltip title="下載匯入範本">
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>範本</Button>
          </Tooltip>
          <Button icon={<UploadOutlined />} onClick={() => importRef.current?.click()}
            loading={importBatch.isPending}>匯入 Excel</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>匯出 Excel</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新增請款單</Button>
        </Space>
      </div>

      <input ref={importRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
        onChange={handleImportFile} />

      <Table dataSource={data?.data ?? []} columns={columns} rowKey="id"
        loading={isLoading} scroll={{ x: 1000 }}
        pagination={{ total: data?.total, pageSize: 20, current: page, onChange: setPage }} />

      {/* 新增請款單 Modal */}
      <Modal title="新增請款單" open={open} onCancel={() => { setOpen(false); form.resetFields() }}
        onOk={() => form.submit()} confirmLoading={create.isPending}>
        <Form form={form} layout="vertical" onFinish={create.mutate} style={{ marginTop: 12 }}>
          <Form.Item name="prNo" label="單號" rules={[{ required: true }]}>
            <Input placeholder="例：PR2025-001" />
          </Form.Item>
          <Form.Item name="category" label="費用類別" rules={[{ required: true }]}>
            <Select
              options={allCategories.map(v => ({ value: v, label: v }))}
              showSearch allowClear loading={catLoading}
              placeholder="選擇費用類別"
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

      {/* 費用類別管理 Modal */}
      <Modal title="費用類別管理" open={catOpen} onCancel={() => setCatOpen(false)} footer={null} width={480}>
        <Divider orientation="left" plain style={{ fontSize: 13, color: '#666' }}>預設類別（不可刪除）</Divider>
        <Space wrap style={{ marginBottom: 16 }}>
          {(catData?.defaults ?? []).map((name: string) => (
            <Tag key={name} color="default">{name}</Tag>
          ))}
        </Space>

        <Divider orientation="left" plain style={{ fontSize: 13, color: '#666' }}>自訂類別</Divider>
        <Space wrap style={{ marginBottom: 16 }}>
          {(catData?.custom ?? []).length === 0 && (
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>尚無自訂類別</Typography.Text>
          )}
          {(catData?.custom ?? []).map((c: any) => (
            <Tag key={c.id} color="blue" closable
              onClose={(e) => { e.preventDefault(); delCat.mutate(c.id) }}>
              {c.name}
            </Tag>
          ))}
        </Space>

        <Divider />
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="輸入新類別名稱"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onPressEnter={() => newCatName.trim() && addCat.mutate(newCatName.trim())}
            maxLength={50}
          />
          <Button type="primary" icon={<PlusOutlined />}
            loading={addCat.isPending}
            disabled={!newCatName.trim()}
            onClick={() => addCat.mutate(newCatName.trim())}>
            新增
          </Button>
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          按 Enter 或點新增按鈕可加入自訂類別，刪除（×）後該類別不影響現有請款單記錄。
        </Typography.Text>
      </Modal>
    </div>
  )
}
