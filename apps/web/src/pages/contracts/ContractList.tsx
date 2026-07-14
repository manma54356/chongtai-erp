import { useQuery } from '@tanstack/react-query'
import { Table, Tag, Typography } from 'antd'
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
  const { data, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => api.get('/api/contracts').then(r => r.data),
  })

  const columns = [
    { title: '合約編號', dataIndex: 'contractNo', width: 130 },
    { title: '客戶', dataIndex: ['customer', 'name'], width: 100 },
    { title: '建案', dataIndex: ['unit', 'project', 'name'], width: 130 },
    { title: '戶別', dataIndex: ['unit', 'code'], width: 80 },
    {
      title: '合約總價', dataIndex: 'totalPrice', width: 120,
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
      <Typography.Title level={4} style={{ marginBottom: 16 }}>合約管理</Typography.Title>
      <Table dataSource={data?.data ?? []} columns={columns} rowKey="id"
        loading={isLoading} pagination={{ total: data?.total, pageSize: 20 }}
        scroll={{ x: 800 }} />
    </div>
  )
}
