import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Descriptions, Tag, Button, Table, Modal, Form, Input, InputNumber, Select, Typography, Space, Tabs, Steps, Alert } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'
import dayjs from 'dayjs'
import { useState } from 'react'

// P1: CLOSED added to statusSteps so contracts can be closed via UI
const statusSteps = ['NEGOTIATING','DEPOSITED','SIGNED','SEALED','LOAN_APPROVED','READY_DELIVER','DELIVERED','WARRANTY','CLOSED']
const statusLabel: Record<string, string> = {
  NEGOTIATING: '洽談中', DEPOSITED: '已下訂', SIGNED: '已簽約', SEALED: '用印完成',
  LOAN_APPROVED: '貸款核准', READY_DELIVER: '待交屋', DELIVERED: '已交屋', WARRANTY: '保固中', CLOSED: '結案',
}
const periodTypeLabel: Record<string, string> = {
  DEPOSIT: '訂金', CONTRACT_FEE: '簽約金', PROGRESS: '工程期款', DELIVERY: '交屋尾款', BANK_LOAN: '銀行貸款',
}

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [receiveModal, setReceiveModal] = useState<any>(null)
  const [statusModal, setStatusModal] = useState(false)
  const [receiveForm] = Form.useForm()

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => api.get(`/api/contracts/${id}`).then(r => r.data),
  })

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.put(`/api/contracts/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract', id] }); setStatusModal(false) },
  })

  const receivePayment = useMutation({
    mutationFn: (v: any) => api.put(`/api/contracts/${id}/schedules/${receiveModal.id}/receive`, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract', id] }); setReceiveModal(null); receiveForm.resetFields() },
  })

  if (isLoading || !contract) return null

  const currentStep = statusSteps.indexOf(contract.status)
  const totalReceived = contract.paymentSchedules?.reduce((s: number, p: any) => s + Number(p.receivedAmount), 0) ?? 0
  const totalScheduled = contract.paymentSchedules?.reduce((s: number, p: any) => s + Number(p.finalAmount), 0) ?? 0

  const scheduleColumns = [
    { title: '期別', dataIndex: 'periodCode', width: 70 },
    { title: '類型', dataIndex: 'periodType', width: 90, render: (t: string) => periodTypeLabel[t] },
    { title: '應收金額', dataIndex: 'finalAmount', render: (v: number) => `$${Number(v).toLocaleString()}` },
    { title: '實收金額', dataIndex: 'receivedAmount', render: (v: number) => Number(v) > 0 ? <span style={{ color: '#52c41a' }}>${Number(v).toLocaleString()}</span> : '-' },
    { title: '預計請款日', dataIndex: 'dueDate', width: 110, render: (d: string) => d ? dayjs(d).format('YYYY/MM/DD') : '-' },
    { title: '實收日', dataIndex: 'receivedDate', width: 110, render: (d: string) => d ? dayjs(d).format('YYYY/MM/DD') : '-' },
    { title: '信託', dataIndex: 'trustConfirmed', width: 70, render: (v: boolean) => v ? <Tag color="green">已確認</Tag> : <Tag>未確認</Tag> },
    {
      title: '操作', width: 100,
      render: (_: any, row: any) => Number(row.receivedAmount) === 0 && (
        <Button size="small" icon={<CheckCircleOutlined />} onClick={() => setReceiveModal(row)}>收款</Button>
      ),
    },
  ]

  // Show up to next 2 statuses from current position
  const nextStatuses = statusSteps.slice(currentStep + 1, currentStep + 3)

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/contracts')}>返回</Button>
        <Typography.Title level={4} style={{ margin: 0 }}>合約 {contract.contractNo}</Typography.Title>
        <Tag>{statusLabel[contract.status]}</Tag>
      </Space>

      <Steps current={currentStep} size="small" style={{ marginBottom: 16 }}
        items={statusSteps.map(s => ({ title: statusLabel[s] }))} />

      <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="客戶">{contract.customer?.name}</Descriptions.Item>
        <Descriptions.Item label="建案">{contract.unit?.project?.name}</Descriptions.Item>
        <Descriptions.Item label="戶別">{contract.unit?.code}</Descriptions.Item>
        <Descriptions.Item label="合約總價">${Number(contract.totalPrice).toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="已收款">${totalReceived.toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="簽約日">{contract.signDate ? dayjs(contract.signDate).format('YYYY/MM/DD') : '-'}</Descriptions.Item>
        <Descriptions.Item label="貸款銀行">{contract.loanBank ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="預計交屋">{contract.deliveryDate ? dayjs(contract.deliveryDate).format('YYYY/MM/DD') : '-'}</Descriptions.Item>
      </Descriptions>

      {nextStatuses.length > 0 && (
        <Space style={{ marginBottom: 16 }}>
          <Typography.Text>更新狀態：</Typography.Text>
          {nextStatuses.map(s => (
            <Button key={s} size="small" onClick={() => updateStatus.mutate(s)} loading={updateStatus.isPending}>
              → {statusLabel[s]}
            </Button>
          ))}
        </Space>
      )}

      <Tabs items={[
        {
          key: 'schedules', label: `付款排程（${contract.paymentSchedules?.length ?? 0} 期，已收 $${totalReceived.toLocaleString()}）`,
          children: (
            <Table dataSource={contract.paymentSchedules ?? []} columns={scheduleColumns}
              rowKey="id" size="small" pagination={false} scroll={{ x: 700 }} />
          ),
        },
        {
          key: 'changeOrders', label: `客變（${contract.changeOrders?.length ?? 0}）`,
          children: (
            <Table
              dataSource={contract.changeOrders ?? []} rowKey="id" size="small" pagination={false}
              columns={[
                { title: '申請日', dataIndex: 'requestDate', render: (d: string) => dayjs(d).format('YYYY/MM/DD') },
                { title: '說明', dataIndex: 'description' },
                { title: '追加', dataIndex: 'addAmount', render: (v: number) => Number(v) ? `+$${Number(v).toLocaleString()}` : '-' },
                { title: '減帳', dataIndex: 'deductAmount', render: (v: number) => Number(v) ? `-$${Number(v).toLocaleString()}` : '-' },
                { title: '淨額', dataIndex: 'netAmount', render: (v: number) => `$${Number(v).toLocaleString()}` },
                { title: '狀態', dataIndex: 'status', render: (s: string) => <Tag>{s}</Tag> },
              ]}
            />
          ),
        },
      ]} />

      <Modal title="記錄收款" open={!!receiveModal} onCancel={() => setReceiveModal(null)}
        onOk={() => receiveForm.submit()} confirmLoading={receivePayment.isPending}>
        {receiveModal && (
          <Alert message={`${periodTypeLabel[receiveModal.periodType]} - 應收 $${Number(receiveModal.finalAmount).toLocaleString()}`}
            type="info" style={{ marginBottom: 12 }} />
        )}
        <Form form={receiveForm} layout="vertical"
          onFinish={v => receivePayment.mutate({ receivedAmount: v.receivedAmount, receivedDate: v.receivedDate, trustConfirmed: v.trustConfirmed === 'true' })}>
          <Form.Item name="receivedAmount" label="實收金額" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} step={1000} />
          </Form.Item>
          <Form.Item name="receivedDate" label="收款日期" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="trustConfirmed" label="信託入帳確認" initialValue="false">
            <Select options={[{ value: 'true', label: '已確認入信託' }, { value: 'false', label: '未確認' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
