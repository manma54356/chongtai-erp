// 前後端共用型別定義

export type UserRole =
  | 'OWNER'
  | 'FINANCE_CHIEF'
  | 'ACCOUNTANT'
  | 'CASHIER'
  | 'SALES'
  | 'SALES_ADMIN'
  | 'PM'
  | 'ENGINEER'
  | 'CUSTOMER_SERVICE'

export type ContractStatus =
  | 'NEGOTIATING'
  | 'DEPOSITED'
  | 'SIGNED'
  | 'SEALED'
  | 'LOAN_APPROVED'
  | 'READY_DELIVER'
  | 'DELIVERED'
  | 'WARRANTY'
  | 'CLOSED'

export type PeriodType =
  | 'DEPOSIT'
  | 'CONTRACT_FEE'
  | 'PROGRESS'
  | 'DELIVERY'
  | 'BANK_LOAN'

export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED'

export type ProjectStatus =
  | 'PLANNING'
  | 'LAND_ACQUIRED'
  | 'CONSTRUCTION'
  | 'SALES'
  | 'DELIVERING'
  | 'COMPLETED'

// API 回應格式
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// 通用查詢參數
export interface PaginationQuery {
  page?: number
  pageSize?: number
}
