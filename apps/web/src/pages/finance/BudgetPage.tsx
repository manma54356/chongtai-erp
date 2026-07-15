import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Select, Table, Typography, Card, Row, Col, Statistic, Progress,
  Button, Modal, Form, Input, InputNumber, DatePicker, Tag, Popconfirm, message,
} from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'
import dayjs from 'dayjs'

const categoryLabel: Record<string, string> = {
  LAND: '土地成本', CONSTRUCTION: '建造成本', DESIGN: '設計費',
  ADVERTISING: '廣告費', ADMIN: '管理費', FINANCE: '財務費用', OTHER: '其他',
}
const categoryColor: Record<string, string> = {
  LAND: 'brown', CONSTRUCTION: 'orange', DESIGN: 'blue',
  ADVERTISING: 'purple', ADMIN: 'cyan', FINANCE: 'green', OTHER: 'default',
}

function fmt(n: number) { return `$${Math.round(n).toLocaleString()}` }

export default function BudgetPage() {
  const [projectId, setProjectId] = useState<string | undefined>()
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [costOpen, setCostOpen] = useState(false)
  const [budgetForm] = Form.useForm()
  const [costForm] = Form.useForm()
  const qc = useQueryClient()

  const { data: projects } = useQuery({
    queryKey: ['projects-simple'],
    queryFn: () => api.get('/api/projects').then(r => r.data.data ?? []),
  })

  const { data: summary, isLoading } = useQuery({
    queryKey: ['budget-summary', projectId],
    queryFn: () => api.get(`/api/projects/${projectId}/budget/summary`).then(r => r.data),
    enabled: !!projectId,
  })

  const { data: costs, isLoading: costsLoading } = useQuery({
    queryKey: ['costs', projectId],
    queryFn: () => api.get(`/api/projects/${projectId}/costs`).then(r => r.data),
    enabled: !!projectId,
  })

  const saveBudget = useMutation({
    mutationFn: (v: any) => api.put(`/api/projects/${projectId}/budget`, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget-summary', projectId] })
      setBudgetOpen(false)
      budgetForm.resetFields()
      message.success('預算已更新')
    },
  })

  const addCost = useMutation({
    mutationFn: (v: any) => api.post(`/api/projects/${projectId}/costs`, {
      ...v, costDate: v.costDate.format('YYYY-MM-DD'),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['costs', projectId] })
      qc.invalidateQueries({ queryKey: ['budget-summary', projectId] })
      setCostOpen(false)
      costForm.resetFields()
      message.success('費用已登錄')
    },
  })

  const deleteCost = useMutation({
    mutationFn: (costId: string) => api.delete(`/api/projects/${projectId}/costs/${costId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['costs', projectId] })
      qc.invalidateQueries({ queryKey: ['budget-summary', projectId] })
      message.success('已刪除')
    },
  })

  const summaryColumns = [
    { title: '科目', dataIndex: 'label', width: 110 },
    {
      title: '預算金額', dataIndex: 'budgetAmount', width: 130,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{fmt(v)}</span>,
    },
    {
      title: '實際支出', dataIndex: 'actualAmount', width: 130,
      render: (v: number) => fmt(v),
    },
    {
      title: '剩餘', dataIndex: 'variance', width: 130,
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>{fmt(v)}</span>
      ),
    },
    {
      title: '使用率', dataIndex: 'usageRate', width: 160,
      render: (v: number | null, row: any) => v === null
        ? <span style={{ color: '#bbb' }}>未設預算</span>
        : <Progress percent={Math.min(v, 100)} size="small"
            status={v > 100 ? 'exception' : v > 85 ? 'active' : 'normal'}
            format={() => `${v}%`} />,
    },
    {
      title: '', width: 60,
      render: (_: any, row: any) => (
        <Button size="small" icon={<EditOutlined />}
          onClick={() => { budgetForm.setFieldsValue({ category: row.category, budgetAmount: row.budgetAmount }); setBudgetOpen(true) }}
        />
      ),
    },
  ]

  const costColumns = [
    { title: '日期', dataIndex: 'costDate', width: 110, render: (d: string) => dayjs(d).format('YYYY/MM/DD') },
    {
      title: '科目', dataIndex: 'category', width: 100,
      render: (v: string) => <Tag color={categoryColor[v]}>{categoryLabel[v]}</Tag>,
    },
    { title: '說明', dataIndex: 'description' },
    { title: '廠商', dataIndex: ['vendor', 'name'], width: 110, render: (v: string) => v ?? '-' },
    {
      title: '金額', dataIndex: 'amount', width: 120,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{fmt(Number(v))}</span>,
    },
    {
      title: '', width: 50,
      render: (_: any, row: any) => (
        <Popconfirm title="確定刪除這筆費用？" onConfirm={() => deleteCost.mutate(row.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>預算收支管理</Typography.Title>
        <Select
          placeholder="選擇建案" style={{ width: 220 }}
          value={projectId} onChange={setProjectId}
          options={(projects ?? []).map((p: any) => ({ value: p.id, label: p.name }))}
        />
      </div>

      {!projectId && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>請先選擇建案</div>
      )}

      {projectId && summary && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic title="總預算" value={summary.totalBudget} prefix="$" formatter={(v) => Number(v).toLocaleString()} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic title="實際支出" value={summary.totalActual} prefix="$" formatter={(v) => Number(v).toLocaleString()} valueStyle={{ color: '#C9993E' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="剩餘預算" value={summary.totalVariance} prefix="$"
                  formatter={(v) => Number(v).toLocaleString()}
                  valueStyle={{ color: Number(summary.totalVariance) >= 0 ? '#52c41a' : '#ff4d4f' }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            title="各科目預算 vs 實際"
            extra={<Button type="primary" size="small" icon={<EditOutlined />} onClick={() => setBudgetOpen(true)}>設定預算</Button>}
            style={{ marginBottom: 16 }}
          >
            <Table
              dataSource={summary.summary} columns={summaryColumns}
              rowKey="category" pagination={false} loading={isLoading} size="small"
            />
          </Card>

          <Card
            title="費用明細"
            extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCostOpen(true)}>登錄費用</Button>}
          >
            <Table
              dataSource={costs ?? []} columns={costColumns}
              rowKey="id" loading={costsLoading} size="small"
              pagination={{ pageSize: 15 }}
            />
          </Card>
        </>
      )}

      {/* 設定預算 modal */}
      <Modal title="設定科目預算" open={budgetOpen} onCancel={() => { setBudgetOpen(false); budgetForm.resetFields() }}
        onOk={() => budgetForm.submit()} confirmLoading={saveBudget.isPending}>
        <Form form={budgetForm} layout="vertical" onFinish={saveBudget.mutate}>
          <Form.Item name="category" label="科目" rules={[{ required: true }]}>
            <Select options={Object.entries(categoryLabel).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="budgetAmount" label="預算金額（元）" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="notes" label="備註"><Input /></Form.Item>
        </Form>
      </Modal>

      {/* 登錄費用 modal */}
      <Modal title="登錄費用" open={costOpen} onCancel={() => { setCostOpen(false); costForm.resetFields() }}
        onOk={() => costForm.submit()} confirmLoading={addCost.isPending}>
        <Form form={costForm} layout="vertical" onFinish={addCost.mutate}>
          <Form.Item name="costDate" label="日期" rules={[{ required: true }]} initialValue={dayjs()}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="category" label="科目" rules={[{ required: true }]}>
            <Select options={Object.entries(categoryLabel).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="description" label="說明" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="amount" label="金額（元）" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
