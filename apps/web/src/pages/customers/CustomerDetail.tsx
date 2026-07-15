import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Descriptions, Tag, Button, List, Form, Input, DatePicker, Typography, Space, Tabs, Table } from 'antd'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import { api } from '../../lib/api'
import dayjs from 'dayjs'

const gradeColor: Record<string, string> = { PROSPECT: 'default', NEGOTIATING: 'blue', CONTRACTED: 'green', DELIVERED: 'purple' }
const gradeLabel: Record<string, string> = { PROSPECT: '潛在', NEGOTIATING: '議價中', CONTRACTED: '已簽約', DELIVERED: '已交屋' }

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form] = Form.useForm()

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/api/customers/${id}`).then(r => r.data),
  })

  const addFollowUp = useMutation({
    mutationFn: (v: any) => api.post(`/api/customers/${id}/follow-ups`, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer', id] }); form.resetFields() },
  })

  if (isLoading || !customer) return null

  const contractColumns = [
    { title: '合約編號', dataIndex: 'contractNo' },
    { title: '建案', dataIndex: ['unit', 'project', 'name'] },
    { title: '戶別', dataIndex: ['unit', 'code'] },
    { title: '總價', dataIndex: 'totalPrice', render: (v: number) => `$${Number(v).toLocaleString()}` },
    { title: '狀態', dataIndex: 'status', render: (s: string) => <Tag color={gradeColor[s] ?? 'default'}>{s}</Tag> },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers')}>返回</Button>
        <Typography.Title level={4} style={{ margin: 0 }}>{customer.name}</Typography.Title>
        <Tag color={gradeColor[customer.grade]}>{gradeLabel[customer.grade]}</Tag>
      </Space>

      <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="電話">{customer.phone ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Email">{customer.email ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="地址">{customer.address ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="建立時間">{dayjs(customer.createdAt).format('YYYY/MM/DD')}</Descriptions.Item>
      </Descriptions>

      <Tabs items={[
        {
          key: 'contracts', label: `合約（${customer.contracts?.length ?? 0}）`,
          children: <Table dataSource={customer.contracts ?? []} columns={contractColumns} rowKey="id" size="small" pagination={false} />,
        },
        {
          key: 'followups', label: `跟進紀錄（${customer.followUps?.length ?? 0}）`,
          children: (
            <>
              <Card size="small" style={{ marginBottom: 12 }}>
                <Form form={form} layout="inline" onFinish={v => addFollowUp.mutate({ content: v.content, nextFollowUp: v.nextFollowUp?.format('YYYY-MM-DD') })}>
                  <Form.Item name="content" rules={[{ required: true }]} style={{ flex: 1 }}>
                    <Input.TextArea rows={2} placeholder="記錄跟進內容..." style={{ width: 400 }} />
                  </Form.Item>
                  <Form.Item name="nextFollowUp" label="下次跟進">
                    <DatePicker format="YYYY/MM/DD" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={addFollowUp.isPending}>新增</Button>
                  </Form.Item>
                </Form>
              </Card>
              <List
                dataSource={customer.followUps ?? []}
                renderItem={(item: any) => (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(item.createdAt).format('YYYY/MM/DD HH:mm')}
                        </Typography.Text>
                        {item.nextFollowUp && (
                          <Tag color="blue">下次：{dayjs(item.nextFollowUp).format('YYYY/MM/DD')}</Tag>
                        )}
                      </div>
                      <Typography.Text>{item.content}</Typography.Text>
                    </div>
                  </List.Item>
                )}
              />
            </>
          ),
        },
      ]} />
    </div>
  )
}
