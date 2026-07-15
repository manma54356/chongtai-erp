import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Descriptions, Tag, Button, Table, Modal, Form, Input, InputNumber, Steps, Row, Col, Typography, Space, Tabs } from 'antd'
import { PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'
import dayjs from 'dayjs'

const statusLabel: Record<string, string> = {
  PLANNING: '規劃設計', LAND_ACQUIRED: '土地取得', CONSTRUCTION: '施工中',
  SALES: '銷售期', DELIVERING: '交屋準備', COMPLETED: '已結案',
}
const milestoneStatusLabel: Record<string, string> = {
  PENDING: '待開始', IN_PROGRESS: '進行中', COMPLETED: '已完成', DELAYED: '延誤',
}
const milestoneStatusColor: Record<string, string> = {
  PENDING: 'default', IN_PROGRESS: 'processing', COMPLETED: 'success', DELAYED: 'error',
}
const unitStatusColor: Record<string, string> = {
  AVAILABLE: 'green', RESERVED: 'blue', CONTRACTED: 'purple', DELIVERED: 'default',
}
const unitStatusLabel: Record<string, string> = {
  AVAILABLE: '可售', RESERVED: '已下訂', CONTRACTED: '已簽約', DELIVERED: '已交屋',
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [unitModal, setUnitModal] = useState(false)
  const [milestoneModal, setMilestoneModal] = useState(false)
  const [unitForm] = Form.useForm()
  const [milestoneForm] = Form.useForm()

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/api/projects/${id}`).then(r => r.data),
  })
  const { data: units } = useQuery({
    queryKey: ['units', id],
    queryFn: () => api.get(`/api/projects/${id}/units`).then(r => r.data),
  })
  const { data: milestones } = useQuery({
    queryKey: ['milestones', id],
    queryFn: () => api.get(`/api/projects/${id}/milestones`).then(r => r.data),
  })

  const addUnit = useMutation({
    mutationFn: (v: any) => api.post(`/api/projects/${id}/units`, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['units', id] }); setUnitModal(false); unitForm.resetFields() },
  })

  const updateMilestone = useMutation({
    mutationFn: ({ milestoneId, data }: any) => api.put(`/api/milestones/${milestoneId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['milestones', id] }),
  })

  if (isLoading || !project) return null

  const unitColumns = [
    { title: '戶別', dataIndex: 'code', width: 90 },
    { title: '樓層', dataIndex: 'floor', width: 70 },
    { title: '坪數', dataIndex: 'area', width: 80, render: (v: number) => v ? `${v} 坪` : '-' },
    { title: '定價', dataIndex: 'listPrice', render: (v: number) => v ? `$${Number(v).toLocaleString()}` : '-' },
    { title: '狀態', dataIndex: 'status', render: (s: string) => <Tag color={unitStatusColor[s]}>{unitStatusLabel[s]}</Tag> },
  ]

  const milestoneColumns = [
    { title: '順序', dataIndex: 'order', width: 60 },
    { title: '里程碑', dataIndex: 'name' },
    { title: '計畫日', dataIndex: 'plannedDate', width: 110, render: (d: string) => d ? dayjs(d).format('YYYY/MM/DD') : '-' },
    { title: '實際日', dataIndex: 'actualDate', width: 110, render: (d: string) => d ? dayjs(d).format('YYYY/MM/DD') : '-' },
    { title: '完成%', dataIndex: 'completionPct', width: 70, render: (v: number) => `${v}%` },
    { title: '狀態', dataIndex: 'status', width: 90, render: (s: string) => <Tag color={milestoneStatusColor[s]}>{milestoneStatusLabel[s]}</Tag> },
    {
      title: '操作', width: 120,
      render: (_: any, row: any) => (
        <Space>
          {row.status !== 'COMPLETED' && (
            <Button size="small" type="link" onClick={() =>
              updateMilestone.mutate({ milestoneId: row.id, data: { status: 'COMPLETED', actualDate: dayjs().format('YYYY-MM-DD'), completionPct: 100 } })
            }>標記完成</Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>返回</Button>
        <Typography.Title level={4} style={{ margin: 0 }}>{project.name}</Typography.Title>
        <Tag>{statusLabel[project.status]}</Tag>
      </Space>

      <Row gutter={16}>
        <Col span={24}>
          <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="建案代號">{project.code}</Descriptions.Item>
            <Descriptions.Item label="地址">{project.address ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="總戶數">{project.totalUnits}</Descriptions.Item>
            <Descriptions.Item label="預計開工">{project.startDate ? dayjs(project.startDate).format('YYYY/MM/DD') : '-'}</Descriptions.Item>
            <Descriptions.Item label="預計完工">{project.completionDate ? dayjs(project.completionDate).format('YYYY/MM/DD') : '-'}</Descriptions.Item>
          </Descriptions>
        </Col>
      </Row>

      <Tabs items={[
        {
          key: 'units', label: `戶別（${units?.length ?? 0}）`,
          children: (
            <>
              <Button icon={<PlusOutlined />} onClick={() => setUnitModal(true)} style={{ marginBottom: 12 }}>新增戶別</Button>
              <Table dataSource={units ?? []} columns={unitColumns} rowKey="id" size="small" pagination={false} />
            </>
          ),
        },
        {
          key: 'milestones', label: `工程里程碑（${milestones?.length ?? 0}）`,
          children: (
            <Table dataSource={milestones ?? []} columns={milestoneColumns} rowKey="id" size="small" pagination={false} />
          ),
        },
      ]} />

      <Modal title="新增戶別" open={unitModal} onCancel={() => setUnitModal(false)}
        onOk={() => unitForm.submit()} confirmLoading={addUnit.isPending}>
        <Form form={unitForm} layout="vertical" onFinish={addUnit.mutate}>
          <Form.Item name="code" label="戶別代號" rules={[{ required: true }]}><Input placeholder="例：3F-A" /></Form.Item>
          <Form.Item name="floor" label="樓層"><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="area" label="坪數"><InputNumber style={{ width: '100%' }} step={0.01} /></Form.Item>
          <Form.Item name="listPrice" label="定價"><InputNumber style={{ width: '100%' }} step={10000} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

import { useState } from 'react'
