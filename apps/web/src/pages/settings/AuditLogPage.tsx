import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Typography, Select, Space, Tag, Tooltip, DatePicker } from 'antd'
import { api } from '../../lib/api'
import dayjs from 'dayjs'

const typeLabel: Record<string, string> = {
  CONTRACT: '合約', CUSTOMER: '客戶', PROJECT: '建案', UNIT: '戶別',
  PAYMENT: '收款', USER: '使用者', VENDOR: '廠商', JOURNAL: '傳票',
  PAYABLE: '應付帳款', BUDGET: '預算', EXPENSE: '費用',
}

const actionColor: Record<string, string> = {
  CREATE: 'green', UPDATE: 'blue', DELETE: 'red', STATUS_CHANGE: 'orange',
}

export default function AuditLogPage() {
  const [targetType, setTargetType] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [page, setPage] = useState(1)

  const startDate = dateRange?.[0]?.startOf('day').toISOString()
  const endDate = dateRange?.[1]?.endOf('day').toISOString()

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, targetType, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '50' })
      if (targetType) params.set('targetType', targetType)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      return api.get(`/api/audit-logs?${params}`).then(r => r.data)
    },
  })

  const columns = [
    {
      title: '時間', dataIndex: 'createdAt', width: 160,
      render: (d: string) => dayjs(d).format('YYYY/MM/DD HH:mm:ss'),
    },
    {
      title: '操作人', width: 100,
      render: (_: any, r: any) => r.user?.name ?? r.userId,
    },
    {
      title: '動作', dataIndex: 'action', width: 110,
      render: (a: string) => <Tag color={actionColor[a] ?? 'default'}>{a}</Tag>,
    },
    {
      title: '對象類型', dataIndex: 'targetType', width: 100,
      render: (t: string) => typeLabel[t] ?? t,
    },
    { title: '對象ID', dataIndex: 'targetId', width: 200, ellipsis: true },
    {
      title: '變更內容', width: 300,
      render: (_: any, r: any) => {
        if (!r.before && !r.after) return '-'
        const beforeStr = r.before ? JSON.stringify(r.before) : ''
        const afterStr = r.after ? JSON.stringify(r.after) : ''
        const summary = afterStr || beforeStr
        return (
          <Tooltip title={
            <div style={{ maxWidth: 500, wordBreak: 'break-all' }}>
              {beforeStr && <div><b>變更前：</b>{beforeStr}</div>}
              {afterStr && <div><b>變更後：</b>{afterStr}</div>}
            </div>
          }>
            <span style={{ cursor: 'pointer', color: '#1890ff' }}>
              {summary.slice(0, 60)}{summary.length > 60 ? '…' : ''}
            </span>
          </Tooltip>
        )
      },
    },
    { title: 'IP', dataIndex: 'ip', width: 130, render: (v: string) => v ?? '-' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>修改紀錄</Typography.Title>
        <Space>
          <Select allowClear placeholder="篩選對象類型" style={{ width: 140 }}
            value={targetType} onChange={v => { setTargetType(v); setPage(1) }}
            options={Object.entries(typeLabel).map(([k, v]) => ({ value: k, label: v }))}
          />
          <DatePicker.RangePicker
            value={dateRange}
            onChange={v => { setDateRange(v as any); setPage(1) }}
          />
        </Space>
      </div>
      <Table
        dataSource={data?.data ?? []} columns={columns} rowKey="id"
        loading={isLoading} scroll={{ x: 1100 }}
        pagination={{
          current: page, total: data?.total, pageSize: 50,
          onChange: setPage, showTotal: t => `共 ${t} 筆`,
        }}
      />
    </div>
  )
}
