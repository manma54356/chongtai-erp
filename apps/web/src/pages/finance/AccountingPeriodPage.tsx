import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Table, Tag, Typography, Button, Space, Popconfirm, message } from 'antd'
import { LockOutlined, UnlockOutlined, PlusOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import dayjs from 'dayjs'

export default function AccountingPeriodPage() {
  const { role } = useAuth()
  const qc = useQueryClient()
  const isOwner = role === 'OWNER'
  const canClose = role === 'OWNER' || role === 'FINANCE_CHIEF'

  const { data, isLoading } = useQuery({
    queryKey: ['accounting-periods'],
    queryFn: () => api.get('/api/accounting-periods').then(r => r.data),
  })

  const openPeriod = useMutation({
    mutationFn: () => {
      const now = dayjs()
      return api.post('/api/accounting-periods', { year: now.year(), month: now.month() + 1 })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounting-periods'] }); message.success('已開帳') },
    onError: (e: any) => message.error(e.response?.data?.message ?? '操作失敗'),
  })

  const close = useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      api.put(`/api/accounting-periods/${year}/${month}/close`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounting-periods'] }); message.success('關帳完成') },
    onError: (e: any) => message.error(e.response?.data?.message ?? '操作失敗'),
  })

  const reopen = useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      api.put(`/api/accounting-periods/${year}/${month}/reopen`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounting-periods'] }); message.success('已重開帳') },
    onError: (e: any) => message.error(e.response?.data?.message ?? '操作失敗'),
  })

  const columns = [
    {
      title: '期間', width: 120,
      render: (_: any, r: any) => `${r.year} 年 ${String(r.month).padStart(2, '0')} 月`,
    },
    {
      title: '狀態', dataIndex: 'status', width: 90,
      render: (s: string) => <Tag color={s === 'OPEN' ? 'green' : 'red'}>{s === 'OPEN' ? '開帳中' : '已關帳'}</Tag>,
    },
    {
      title: '關帳人', width: 100,
      render: (_: any, r: any) => r.closedBy?.name ?? '-',
    },
    {
      title: '關帳時間', dataIndex: 'closedAt', width: 160,
      render: (d: string) => d ? dayjs(d).format('YYYY/MM/DD HH:mm') : '-',
    },
    {
      title: '操作', width: 160,
      render: (_: any, r: any) => (
        <Space>
          {canClose && r.status === 'OPEN' && (
            <Popconfirm title={`確認關閉 ${r.year}/${String(r.month).padStart(2,'0')} 帳期？`}
              onConfirm={() => close.mutate({ year: r.year, month: r.month })}>
              <Button size="small" danger icon={<LockOutlined />}>關帳</Button>
            </Popconfirm>
          )}
          {isOwner && r.status === 'CLOSED' && (
            <Popconfirm title="確認重開帳？此操作允許繼續記帳。"
              onConfirm={() => reopen.mutate({ year: r.year, month: r.month })}>
              <Button size="small" icon={<UnlockOutlined />}>重開帳</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>關帳管理</Typography.Title>
        <Popconfirm title={`開啟本月（${dayjs().format('YYYY/MM')}）帳期？`}
          onConfirm={() => openPeriod.mutate()}>
          <Button type="primary" icon={<PlusOutlined />}>開啟本月帳期</Button>
        </Popconfirm>
      </div>
      <Table dataSource={data?.data ?? []} columns={columns} rowKey="id"
        loading={isLoading} pagination={false} />
    </div>
  )
}
