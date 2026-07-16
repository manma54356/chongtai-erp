import { useQuery } from '@tanstack/react-query'
import { Row, Col, Card, Statistic, Table, Tag, Typography } from 'antd'
import { ProjectOutlined, TeamOutlined, FileTextOutlined, AlertOutlined } from '@ant-design/icons'
import { api } from '../lib/api'
import dayjs from 'dayjs'

const statusColor: Record<string, string> = {
  NEGOTIATING: 'default', DEPOSITED: 'blue', SIGNED: 'cyan',
  SEALED: 'geekblue', LOAN_APPROVED: 'purple', READY_DELIVER: 'orange',
  DELIVERED: 'green', WARRANTY: 'lime', CLOSED: 'default',
}
const statusLabel: Record<string, string> = {
  NEGOTIATING: '洽談中', DEPOSITED: '已下訂', SIGNED: '已簽約',
  SEALED: '用印完成', LOAN_APPROVED: '貸款核准', READY_DELIVER: '待交屋',
  DELIVERED: '已交屋', WARRANTY: '保固中', CLOSED: '結案',
}

export default function Dashboard() {
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/api/projects').then(r => r.data),
  })
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/api/customers').then(r => r.data),
  })
  const { data: contracts } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => api.get('/api/contracts?pageSize=10').then(r => r.data),
  })

  const columns = [
    { title: '合約編號', dataIndex: 'contractNo', width: 120 },
    { title: '客戶', dataIndex: ['customer', 'name'], width: 100 },
    { title: '建案', dataIndex: ['unit', 'project', 'name'], width: 120 },
    { title: '戶別', dataIndex: ['unit', 'code'], width: 80 },
    {
      title: '狀態', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s]}</Tag>,
    },
    {
      title: '簽約日', dataIndex: 'signDate', width: 100,
      render: (d: string) => d ? dayjs(d).format('YYYY/MM/DD') : '-',
    },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>儀表板</Typography.Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="進行中建案" value={projects?.total ?? 0}
              prefix={<ProjectOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="客戶總數" value={customers?.total ?? 0}
              prefix={<TeamOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="合約總數" value={contracts?.total ?? 0}
              prefix={<FileTextOutlined />} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="待處理通知" value={0}
              prefix={<AlertOutlined />} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
      </Row>

      <Card title="最新合約">
        <Table
          dataSource={contracts?.data ?? []}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 600 }}
        />
      </Card>
    </div>
  )
}
