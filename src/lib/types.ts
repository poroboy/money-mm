import type { Timestamp } from 'firebase/firestore'

export type BaseDocument = {
  id: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export type IncomeType = 'once' | 'monthly' | 'fixed_months'
export type Income = BaseDocument & {
  name: string
  amount: number
  type: IncomeType
  startMonth: string
  endMonth?: string | null
  repeatMonths?: number | null
  receiveDay?: number | null
  isActive: boolean
  note?: string
}

export type ExpenseType = 'once' | 'fixed_months' | 'forever'
export type Expense = BaseDocument & {
  name: string
  amount: number
  category: string
  type: ExpenseType
  startMonth: string
  repeatMonths?: number | null
  payDay?: number | null
  isActive: boolean
  note?: string
}

export type AccountType = 'credit_card' | 'paylater' | 'loan' | 'other'
export type Account = BaseDocument & {
  name: string
  type: AccountType
  statementDay?: number | null
  paymentDueDay?: number | null
  isActive: boolean
  note?: string
}

export type InstallmentStatus = 'active' | 'completed' | 'cancelled'
export type Installment = BaseDocument & {
  accountId: string
  name: string
  monthlyAmount: number
  totalMonths: number
  firstPaymentMonth: string
  paymentDay?: number | null
  status: InstallmentStatus
  note?: string
}

export type PaymentItemType = 'expense' | 'installment'
export type PaymentRecord = BaseDocument & {
  itemType: PaymentItemType
  itemId: string
  month: string
  isPaid: boolean
  paidAt?: Timestamp | null
}

export type SavingsGoalPriority = 'high' | 'medium' | 'low'
export type SavingsGoalStatus = 'active' | 'paused' | 'completed'
export type SavingsGoal = BaseDocument & {
  name: string
  targetAmount: number
  savedAmount: number
  targetMonth: string
  priority: SavingsGoalPriority
  status: SavingsGoalStatus
  note?: string
}

export type UserSettings = {
  currency: 'THB'
  forecastMonths: 6 | 12 | 18 | 24
  monthStartDay: number
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export type MonthlyAccountSummary = {
  accountId: string
  accountName: string
  total: number
}

export type MonthlySummary = {
  month: string
  incomeTotal: number
  expenseTotal: number
  installmentTotal: number
  netBalance: number
  accountSummaries: MonthlyAccountSummary[]
}
