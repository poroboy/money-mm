import type { Account, Expense, Income, Installment, PaymentRecord, SavingsGoal } from '../types'
import { getCurrentMonth, getFinancialHealth, getForecast, getMonthlySummary, isExpenseActiveInMonth, isInstallmentActiveInMonth } from '../forecast'

export type SnapshotInput = {
  incomes: Income[]
  expenses: Expense[]
  accounts: Account[]
  installments: Installment[]
  paymentRecords: PaymentRecord[]
  savingsGoals: SavingsGoal[]
  forecastMonths?: number
}

export type SimulatedChange = {
  action: 'add' | 'update' | 'remove'
  collection: 'incomes' | 'expenses' | 'accounts' | 'installments' | 'savingsGoals'
  id?: string
  payload?: Record<string, unknown>
}

export function buildFinancialSnapshot(input: SnapshotInput) {
  const month = getCurrentMonth()
  const months = Math.min(Math.max(input.forecastMonths ?? 6, 1), 24)
  const forecast = getForecast({
    startMonth: month,
    months,
    incomes: input.incomes,
    expenses: input.expenses,
    accounts: input.accounts,
    installments: input.installments,
  })

  const paidKeys = new Set(
    input.paymentRecords.filter((record) => record.isPaid && record.month === month).map((record) => `${record.itemType}_${record.itemId}`),
  )
  const unpaidExpenses = input.expenses
    .filter((item) => isExpenseActiveInMonth(item, month) && !paidKeys.has(`expense_${item.id}`))
    .map((item) => ({ id: item.id, name: item.name, amount: item.amount, payDay: item.payDay ?? null }))
  const unpaidInstallments = input.installments
    .filter((item) => isInstallmentActiveInMonth(item, month) && !paidKeys.has(`installment_${item.id}`))
    .map((item) => ({ id: item.id, name: item.name, amount: item.monthlyAmount, paymentDay: item.paymentDay ?? null }))

  return {
    currentMonth: month,
    thisMonth: { ...forecast[0], health: getFinancialHealth(forecast[0]) },
    forecast: forecast.map((summary) => ({ ...summary, health: getFinancialHealth(summary) })),
    unpaidThisMonth: { expenses: unpaidExpenses, installments: unpaidInstallments },
    savingsGoals: input.savingsGoals.map((goal) => ({
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      remaining: Math.max(0, goal.targetAmount - goal.savedAmount),
      targetMonth: goal.targetMonth,
      priority: goal.priority,
      status: goal.status,
    })),
  }
}

function deepClone<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => deepClone(item)) as T
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>)) {
      result[key] = deepClone((value as Record<string, unknown>)[key])
    }
    return result as T
  }
  return value
}

export function simulateChanges(input: SnapshotInput, changes: SimulatedChange[]): {
  original: ReturnType<typeof buildFinancialSnapshot>
  simulated: ReturnType<typeof buildFinancialSnapshot>
} {
  const original = buildFinancialSnapshot(input)

  const incomes: Income[] = deepClone(input.incomes)
  const expenses: Expense[] = deepClone(input.expenses)
  const accounts: Account[] = deepClone(input.accounts)
  const installments: Installment[] = deepClone(input.installments)
  const savingsGoals: SavingsGoal[] = deepClone(input.savingsGoals)

  const collections: Record<string, { items: unknown[]; idField: string }> = {
    incomes: { items: incomes, idField: 'id' },
    expenses: { items: expenses, idField: 'id' },
    accounts: { items: accounts, idField: 'id' },
    installments: { items: installments, idField: 'id' },
    savingsGoals: { items: savingsGoals, idField: 'id' },
  }

  for (const change of changes) {
    const col = collections[change.collection]
    if (!col) continue

    if (change.action === 'add') {
      col.items.push({ ...change.payload, id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` } as Record<string, unknown>)
    } else if (change.action === 'update' && change.id) {
      const index = (col.items as Record<string, unknown>[]).findIndex((item) => (item as Record<string, unknown>)[col.idField] === change.id)
      if (index !== -1) {
        Object.assign(col.items[index] as Record<string, unknown>, change.payload ?? {})
      }
    } else if (change.action === 'remove' && change.id) {
      const index = (col.items as Record<string, unknown>[]).findIndex((item) => (item as Record<string, unknown>)[col.idField] === change.id)
      if (index !== -1) {
        col.items.splice(index, 1)
      }
    }
  }

  const simulatedInput: SnapshotInput = {
    incomes: incomes as Income[],
    expenses: expenses as Expense[],
    accounts: accounts as Account[],
    installments: installments as Installment[],
    paymentRecords: input.paymentRecords,
    savingsGoals: savingsGoals as SavingsGoal[],
    forecastMonths: input.forecastMonths,
  }

  const simulated = buildFinancialSnapshot(simulatedInput)

  return { original, simulated }
}

export type TrendAnalysis = {
  currentMonth: string
  expenseByCategory: { category: string; total: number; percentage: number }[]
  topExpenses: { name: string; amount: number; category: string }[]
  monthOverMonth: { month: string; expenseChange: number; incomeChange: number; balanceChange: number }[]
  riskMonths: { month: string; balance: number; incomeTotal: number; expenseTotal: number }[]
  savingsOpportunities: { category: string; currentAmount: number; potentialSavings: number; suggestion: string }[]
}

export function analyzeTrends(input: SnapshotInput): TrendAnalysis {
  const month = getCurrentMonth()
  const months = Math.min(Math.max(input.forecastMonths ?? 6, 1), 24)
  const forecast = getForecast({
    startMonth: month,
    months,
    incomes: input.incomes,
    expenses: input.expenses,
    accounts: input.accounts,
    installments: input.installments,
  })

  const activeExpenses = input.expenses.filter((e) => isExpenseActiveInMonth(e, month))
  const expenseByCategoryMap = new Map<string, number>()
  for (const expense of activeExpenses) {
    expenseByCategoryMap.set(expense.category, (expenseByCategoryMap.get(expense.category) ?? 0) + expense.amount)
  }
  const totalExpense = activeExpenses.reduce((s, e) => s + e.amount, 0)
  const expenseByCategory = [...expenseByCategoryMap.entries()]
    .map(([category, total]) => ({ category, total, percentage: totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0 }))
    .sort((a, b) => b.total - a.total)

  const topExpenses = activeExpenses
    .map((e) => ({ name: e.name, amount: e.amount, category: e.category }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const monthOverMonth = []
  for (let i = 1; i < forecast.length; i++) {
    const prev = forecast[i - 1]
    const curr = forecast[i]
    monthOverMonth.push({
      month: curr.month,
      expenseChange: curr.expenseTotal - prev.expenseTotal,
      incomeChange: curr.incomeTotal - prev.incomeTotal,
      balanceChange: curr.netBalance - prev.netBalance,
    })
  }

  const riskMonths = forecast
    .filter((m) => m.netBalance < 0 || m.incomeTotal < m.expenseTotal + m.installmentTotal)
    .map((m) => ({ month: m.month, balance: m.netBalance, incomeTotal: m.incomeTotal, expenseTotal: m.expenseTotal }))

  const savingsOpportunities: { category: string; currentAmount: number; potentialSavings: number; suggestion: string }[] = []
  const diningExpenses = activeExpenses.filter((e) => e.category === 'food_dining' || e.category === 'food' || e.category === 'dining')
  const diningTotal = diningExpenses.reduce((s, e) => s + e.amount, 0)
  if (diningTotal > 0) {
    savingsOpportunities.push({
      category: 'ค่าอาหาร',
      currentAmount: diningTotal,
      potentialSavings: Math.round(diningTotal * 0.2),
      suggestion: 'ลองลดค่าอาหารลง 20% โดยทำอาหารกินเองมากขึ้น',
    })
  }
  const entertainmentExpenses = activeExpenses.filter((e) => e.category === 'entertainment')
  const entertainmentTotal = entertainmentExpenses.reduce((s, e) => s + e.amount, 0)
  if (entertainmentTotal > 0) {
    savingsOpportunities.push({
      category: 'ความบันเทิง',
      currentAmount: entertainmentTotal,
      potentialSavings: Math.round(entertainmentTotal * 0.3),
      suggestion: 'ลองหากิจกรรมฟรีหรือลดความถี่ในการใช้บริการบันเทิง',
    })
  }
  const shoppingExpenses = activeExpenses.filter((e) => e.category === 'shopping')
  const shoppingTotal = shoppingExpenses.reduce((s, e) => s + e.amount, 0)
  if (shoppingTotal > 2000) {
    savingsOpportunities.push({
      category: 'ช้อปปิ้ง',
      currentAmount: shoppingTotal,
      potentialSavings: Math.round(shoppingTotal * 0.15),
      suggestion: 'รอซื้อในช่วงลดราคาหรือใช้กฎ 24 ชั่วโมงก่อนตัดสินใจซื้อ',
    })
  }

  return {
    currentMonth: month,
    expenseByCategory,
    topExpenses,
    monthOverMonth,
    riskMonths,
    savingsOpportunities,
  }
}

export type HealthScoreComponent = {
  name: string
  score: number
  maxScore: number
  weight: number
  status: 'excellent' | 'good' | 'fair' | 'poor'
  detail: string
}

export type HealthScoreResult = {
  overall: number
  maxOverall: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  gradeLabel: string
  components: HealthScoreComponent[]
  summary: string
}

function scoreStatus(value: number, excellent: number, good: number, fair: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (value >= excellent) return 'excellent'
  if (value >= good) return 'good'
  if (value >= fair) return 'fair'
  return 'poor'
}

function gradeFromScore(percentage: number): { grade: 'A' | 'B' | 'C' | 'D' | 'F'; label: string } {
  if (percentage >= 90) return { grade: 'A', label: 'ดีเยี่ยม' }
  if (percentage >= 75) return { grade: 'B', label: 'ดี' }
  if (percentage >= 60) return { grade: 'C', label: 'พอใช้' }
  if (percentage >= 40) return { grade: 'D', label: 'ควรปรับปรุง' }
  return { grade: 'F', label: 'วิกฤต' }
}

export function getFinancialHealthScore(input: SnapshotInput): HealthScoreResult {
  const month = getCurrentMonth()
  const summary = getMonthlySummary({
    month,
    incomes: input.incomes,
    expenses: input.expenses,
    accounts: input.accounts,
    installments: input.installments,
  })

  const income = summary.incomeTotal
  const expense = summary.expenseTotal
  const installment = summary.installmentTotal
  const netBalance = summary.netBalance

  const components: HealthScoreComponent[] = []

  const savingsRate = income > 0 ? netBalance / income : 0
  const savingsScore = Math.min(100, Math.round((savingsRate / 0.2) * 100))
  components.push({
    name: 'อัตราการออม',
    score: Math.min(100, savingsScore),
    maxScore: 100,
    weight: 25,
    status: scoreStatus(savingsRate, 0.2, 0.1, 0.05),
    detail: savingsRate >= 0.2
      ? `เก็บได้ ${(savingsRate * 100).toFixed(0)}% ของรายรับ — ดีมาก`
      : savingsRate >= 0.1
        ? `เก็บได้ ${(savingsRate * 100).toFixed(0)}% ของรายรับ — ควรเพิ่มเป็น 20%`
        : `เก็บได้เพียง ${(savingsRate * 100).toFixed(0)}% ของรายรับ — ต้องเพิ่มการออม`,
  })

  const expenseRatio = income > 0 ? expense / income : 1
  const expenseScore = Math.max(0, Math.min(100, Math.round((1 - expenseRatio / 0.8) * 100)))
  components.push({
    name: 'สัดส่วนรายจ่าย',
    score: expenseScore,
    maxScore: 100,
    weight: 25,
    status: scoreStatus(1 - expenseRatio, 0.5, 0.35, 0.2),
    detail: expenseRatio <= 0.5
      ? `รายจ่าย ${(expenseRatio * 100).toFixed(0)}% ของรายรับ — สมดุลดี`
      : expenseRatio <= 0.7
        ? `รายจ่าย ${(expenseRatio * 100).toFixed(0)}% ของรายรับ — ควรลดลง`
        : `รายจ่ายสูงถึง ${(expenseRatio * 100).toFixed(0)}% ของรายรับ — ต้องลดด่วน`,
  })

  const totalSavings = input.savingsGoals
    .filter((g) => g.status === 'active' || g.status === 'completed')
    .reduce((s, g) => s + g.savedAmount, 0)
  const monthlyExpenses = expense + installment
  const emergencyRatio = monthlyExpenses > 0 ? totalSavings / monthlyExpenses : 0
  const emergencyScore = Math.min(100, Math.round((emergencyRatio / 6) * 100))
  components.push({
    name: 'เงินสำรองฉุกเฉิน',
    score: Math.min(100, emergencyScore),
    maxScore: 100,
    weight: 20,
    status: scoreStatus(emergencyRatio, 6, 3, 1),
    detail: emergencyRatio >= 6
      ? `มีเงินสำรอง ${emergencyRatio.toFixed(1)} เท่า — เพียงพอดี`
      : emergencyRatio >= 3
        ? `มีเงินสำรอง ${emergencyRatio.toFixed(1)} เท่า — ควรเพิ่มเป็น 6 เท่า`
        : `มีเงินสำรองเพียง ${emergencyRatio.toFixed(1)} เท่า — เสี่ยงมาก`,
  })

  const debtBurden = income > 0 ? installment / income : 1
  const debtScore = Math.max(0, Math.min(100, Math.round((1 - debtBurden / 0.4) * 100)))
  components.push({
    name: 'ภาระหนี้',
    score: debtScore,
    maxScore: 100,
    weight: 20,
    status: scoreStatus(1 - debtBurden, 0.85, 0.7, 0.5),
    detail: debtBurden <= 0.3
      ? `ภาระหนี้ ${(debtBurden * 100).toFixed(0)}% ของรายรับ — อยู่ในเกณฑ์ดี`
      : debtBurden <= 0.4
        ? `ภาระหนี้ ${(debtBurden * 100).toFixed(0)}% ของรายรับ — ควรระวัง`
        : `ภาระหนี้สูงถึง ${(debtBurden * 100).toFixed(0)}% ของรายรับ — ต้องลดหนี้`,
  })

  const cashFlowScore = netBalance > 0
    ? Math.min(100, Math.round((netBalance / income) * 100 * 5))
    : Math.max(0, 100 + Math.round((netBalance / income) * 100))
  components.push({
    name: 'สภาพคล่องรายเดือน',
    score: Math.min(100, Math.max(0, cashFlowScore)),
    maxScore: 100,
    weight: 10,
    status: netBalance > 0 ? (netBalance > income * 0.2 ? 'excellent' : 'good') : netBalance > -income * 0.1 ? 'fair' : 'poor',
    detail: netBalance > 0
      ? `เงินเหลือ ${netBalance.toLocaleString()} บาท — มีสภาพคล่องดี`
      : `เงินติดลบ ${Math.abs(netBalance).toLocaleString()} บาท — ขาดสภาพคล่อง`,
  })

  const overall = Math.round(components.reduce((s, c) => s + (c.score / c.maxScore) * c.weight, 0))
  const maxOverall = components.reduce((s, c) => s + c.weight, 0)
  const { grade, label } = gradeFromScore((overall / maxOverall) * 100)

  const summaryText = grade === 'A' || grade === 'B'
    ? 'สุขภาพการเงินโดยรวมดี ควรรักษามาตรฐานนี้ต่อไป'
    : grade === 'C'
      ? 'สุขภาพการเงินพอใช้ ควรปรับปรุงบางด้าน'
      : 'สุขภาพการเงินอ่อนแอ ควรดำเนินการปรับปรุงโดยด่วน'

  return { overall, maxOverall, grade, gradeLabel: label, components, summary: summaryText }
}

export type GoalPlanInput = {
  targetName: string
  targetAmount: number
  targetMonths: number
}

export type GoalPlanResult = {
  targetName: string
  targetAmount: number
  targetMonths: number
  requiredMonthly: number
  currentMonthlySurplus: number
  shortfall: number
  feasible: boolean
  adjustedMonths: number
  recommendations: string[]
}

export function getGoalPlan(input: SnapshotInput, goalInput: GoalPlanInput): GoalPlanResult {
  const month = getCurrentMonth()
  const summary = getMonthlySummary({
    month,
    incomes: input.incomes,
    expenses: input.expenses,
    accounts: input.accounts,
    installments: input.installments,
  })

  const requiredMonthly = Math.ceil(goalInput.targetAmount / goalInput.targetMonths)
  const currentMonthlySurplus = Math.max(0, summary.netBalance)
  const shortfall = Math.max(0, requiredMonthly - currentMonthlySurplus)
  const feasible = shortfall <= 0
  const adjustedMonths = feasible
    ? goalInput.targetMonths
    : Math.ceil(goalInput.targetAmount / Math.max(1, currentMonthlySurplus))

  const recommendations: string[] = []
  if (!feasible) {
    recommendations.push(`ปัจจุบันคุณมีเงินเหลือเดือนละ ${currentMonthlySurplus.toLocaleString()} บาท`)
    recommendations.push(`ต้องเก็บเพิ่มอีกเดือนละ ${shortfall.toLocaleString()} บาท`)
    recommendations.push(`หากเก็บเท่าที่เหลืออยู่ตอนนี้ จะใช้เวลา ${adjustedMonths} เดือน`)
    if (summary.expenseTotal > 0) {
      const reduceTarget = Math.ceil(shortfall * 0.5)
      recommendations.push(`ลองลดรายจ่ายลงเดือนละ ${reduceTarget.toLocaleString()} บาท`)
    }
    recommendations.push(`หรือลองเพิ่มรายรับด้วยรายได้เสริม`)
  } else {
    recommendations.push(`สามารถบรรลุเป้าหมายได้ภายใน ${goalInput.targetMonths} เดือน`)
    recommendations.push(`เก็บเดือนละ ${requiredMonthly.toLocaleString()} บาท`)
    const extraPerMonth = currentMonthlySurplus - requiredMonthly
    if (extraPerMonth > 0) {
      recommendations.push(`เหลือเงินส่วนเกินเดือนละ ${extraPerMonth.toLocaleString()} บาท`)
    }
  }

  return {
    targetName: goalInput.targetName,
    targetAmount: goalInput.targetAmount,
    targetMonths: goalInput.targetMonths,
    requiredMonthly,
    currentMonthlySurplus,
    shortfall,
    feasible,
    adjustedMonths,
    recommendations,
  }
}

export type BudgetOverspend = {
  category: string
  currentSpending: number
  suggestedBudget: number
  overspendAmount: number
  percentageOver: number
}

export type BudgetCoachingResult = {
  month: string
  totalExpense: number
  totalIncome: number
  overspendCategories: BudgetOverspend[]
  suggestedTotalBudget: number
  budgetByCategory: { category: string; suggested: number; current: number }[]
}

export function getBudgetCoaching(input: SnapshotInput): BudgetCoachingResult {
  const month = getCurrentMonth()
  const summary = getMonthlySummary({
    month,
    incomes: input.incomes,
    expenses: input.expenses,
    accounts: input.accounts,
    installments: input.installments,
  })

  const activeExpenses = input.expenses.filter((e) => isExpenseActiveInMonth(e, month))
  const categoryTotals = new Map<string, number>()
  for (const expense of activeExpenses) {
    categoryTotals.set(expense.category, (categoryTotals.get(expense.category) ?? 0) + expense.amount)
  }

  const income = summary.incomeTotal
  const totalExpense = summary.expenseTotal

  const categoryBudgetPct: Record<string, number> = {
    housing: 0.25,
    food_dining: 0.15,
    transport: 0.10,
    utility: 0.10,
    shopping: 0.05,
    entertainment: 0.05,
    health: 0.05,
    education: 0.05,
    other: 0.10,
  }

  const overspendCategories: BudgetOverspend[] = []
  const budgetByCategory: { category: string; suggested: number; current: number }[] = []

  for (const [category, total] of categoryTotals) {
    const pct = categoryBudgetPct[category] ?? 0.10
    const suggestedBudget = Math.round(income * pct)
    budgetByCategory.push({ category, suggested: suggestedBudget, current: total })
    if (total > suggestedBudget) {
      overspendCategories.push({
        category,
        currentSpending: total,
        suggestedBudget,
        overspendAmount: total - suggestedBudget,
        percentageOver: Math.round(((total - suggestedBudget) / suggestedBudget) * 100),
      })
    }
  }

  const suggestedTotalBudget = Math.round(income * 0.7)

  return {
    month,
    totalExpense,
    totalIncome: income,
    overspendCategories: overspendCategories.sort((a, b) => b.overspendAmount - a.overspendAmount),
    suggestedTotalBudget,
    budgetByCategory,
  }
}

export type DetectedRisk = {
  type: 'negative_cashflow' | 'balance_shortage' | 'unusual_expense' | 'missing_emergency_fund' | 'high_debt_burden'
  severity: 'high' | 'medium' | 'low'
  title: string
  detail: string
  month?: string
  amount?: number
}

export type RiskDetectionResult = {
  risks: DetectedRisk[]
  riskCount: number
  hasHighRisk: boolean
  summary: string
}

export function getRiskDetection(input: SnapshotInput): RiskDetectionResult {
  const month = getCurrentMonth()
  const months = 12
  const forecast = getForecast({
    startMonth: month,
    months,
    incomes: input.incomes,
    expenses: input.expenses,
    accounts: input.accounts,
    installments: input.installments,
  })

  const risks: DetectedRisk[] = []

  const negativeMonths = forecast.filter((m) => m.netBalance < 0)
  if (negativeMonths.length > 0) {
    const earliest = negativeMonths[0]
    risks.push({
      type: 'negative_cashflow',
      severity: 'high',
      title: 'เดือนที่เงินติดลบ',
      detail: `เดือน ${earliest.month} คาดว่ายอดคงเหลือจะติดลบ ${Math.abs(earliest.netBalance).toLocaleString()} บาท`,
      month: earliest.month,
      amount: earliest.netBalance,
    })
  }

  const lowBalanceMonths = forecast.filter((m) => m.netBalance > 0 && m.netBalance < m.incomeTotal * 0.05)
  if (lowBalanceMonths.length > 0 && risks.length < 3) {
    const monthsList = lowBalanceMonths.slice(0, 3).map((m) => `${m.month} (${m.netBalance.toLocaleString()} บาท)`).join(', ')
    risks.push({
      type: 'balance_shortage',
      severity: 'medium',
      title: 'เดือนที่เงินเหลือน้อย',
      detail: `เดือน ${monthsList} มีเงินเหลือน้อยกว่า 5% ของรายรับ`,
    })
  }

  const summary = forecast[0]
  const activeExpenses = input.expenses.filter((e) => isExpenseActiveInMonth(e, month))
  const avgExpense = activeExpenses.length > 0
    ? activeExpenses.reduce((s, e) => s + e.amount, 0) / activeExpenses.length
    : 0
  const unusualExpenses = activeExpenses.filter((e) => avgExpense > 0 && e.amount > avgExpense * 3)
  if (unusualExpenses.length > 0) {
    for (const expense of unusualExpenses.slice(0, 3)) {
      risks.push({
        type: 'unusual_expense',
        severity: 'medium',
        title: `รายจ่ายสูงผิดปกติ: ${expense.name}`,
        detail: `${expense.name} จำนวน ${expense.amount.toLocaleString()} บาท สูงกว่าค่าเฉลี่ย ${Math.round((expense.amount / avgExpense) * 100)}%`,
        amount: expense.amount,
      })
    }
  }

  const totalSavings = input.savingsGoals
    .filter((g) => g.status === 'active' || g.status === 'completed')
    .reduce((s, g) => s + g.savedAmount, 0)
  const monthlyExpenses = summary.expenseTotal + summary.installmentTotal
  const emergencyRatio = monthlyExpenses > 0 ? totalSavings / monthlyExpenses : 0
  if (emergencyRatio < 3) {
    const target = Math.round(monthlyExpenses * 6)
    risks.push({
      type: 'missing_emergency_fund',
      severity: emergencyRatio < 1 ? 'high' : 'medium',
      title: 'เงินสำรองฉุกเฉินไม่เพียงพอ',
      detail: emergencyRatio === 0
        ? `ยังไม่มีเงินสำรองฉุกเฉิน ควรมีอย่างน้อย ${target.toLocaleString()} บาท (6 เท่าของรายจ่าย)`
        : `มีเงินสำรอง ${emergencyRatio.toFixed(1)} เท่า ควรมีอย่างน้อย 3-6 เท่า หรือประมาณ ${target.toLocaleString()} บาท`,
      amount: target,
    })
  }

  const debtBurden = summary.incomeTotal > 0 ? summary.installmentTotal / summary.incomeTotal : 1
  if (debtBurden > 0.35) {
    risks.push({
      type: 'high_debt_burden',
      severity: debtBurden > 0.5 ? 'high' : 'medium',
      title: 'ภาระหนี้สูง',
      detail: `ค่างวดคิดเป็น ${(debtBurden * 100).toFixed(0)}% ของรายรับ ควรไม่เกิน 30-35%`,
    })
  }

  return {
    risks: risks.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.severity] - order[b.severity]
    }),
    riskCount: risks.length,
    hasHighRisk: risks.some((r) => r.severity === 'high'),
    summary: risks.length === 0
      ? 'ไม่พบความเสี่ยงทางการเงินที่สำคัญ'
      : risks.length === 1
        ? `พบ ${risks.length} รายการความเสี่ยง`
        : `พบ ${risks.length} รายการความเสี่ยง${risks.some((r) => r.severity === 'high') ? ' ซึ่งมีความเสี่ยงสูง' : ''}`,
  }
}

export type AdvisorRecommendation = {
  priority: number
  category: 'savings' | 'debt' | 'spending' | 'emergency' | 'income' | 'goal'
  title: string
  detail: string
  quickAction: string
  expectedImpact: string
}

export type RecommendationsResult = {
  recommendations: AdvisorRecommendation[]
  topPicks: string[]
}

export function getRecommendations(input: SnapshotInput): RecommendationsResult {
  const health = getFinancialHealthScore(input)
  const trends = analyzeTrends(input)
  const month = getCurrentMonth()
  const summary = getMonthlySummary({
    month,
    incomes: input.incomes,
    expenses: input.expenses,
    accounts: input.accounts,
    installments: input.installments,
  })

  const recs: AdvisorRecommendation[] = []
  let priority = 1

  const emergencyComponent = health.components.find((c) => c.name === 'เงินสำรองฉุกเฉิน')
  if (emergencyComponent && emergencyComponent.score < 50) {
    const monthlyExpenses = summary.expenseTotal + summary.installmentTotal
    const target = monthlyExpenses * 6
    const quickAction = input.savingsGoals.length === 0
      ? 'สร้างเป้าหมายออมเงินฉุกเฉิน'
      : 'เพิ่มยอดเงินออมในเป้าหมายที่มี'
    recs.push({
      priority: priority++,
      category: 'emergency',
      title: 'สร้างเงินสำรองฉุกเฉิน',
      detail: `ควรมีเงินสำรองอย่างน้อย ${target.toLocaleString()} บาท (6 เท่าของรายจ่าย)`,
      quickAction,
      expectedImpact: `ลดความเสี่ยงทางการเงินเมื่อเกิดเหตุฉุกเฉิน`,
    })
  }

  const debtComponent = health.components.find((c) => c.name === 'ภาระหนี้')
  if (debtComponent && debtComponent.score < 60) {
    const debtBurden = summary.incomeTotal > 0 ? summary.installmentTotal / summary.incomeTotal : 1
    recs.push({
      priority: priority++,
      category: 'debt',
      title: 'ลดภาระหนี้',
      detail: `ค่างวด ${(debtBurden * 100).toFixed(0)}% ของรายรับ ควรลดให้เหลือน้อยกว่า 30%`,
      quickAction: 'ตรวจสอบรายการผ่อนชำระและหักชำระหนี้ที่มีดอกเบี้ยสูงก่อน',
      expectedImpact: `เพิ่มเงินเหลือรายเดือนประมาณ ${Math.round(summary.installmentTotal * 0.2).toLocaleString()} บาท`,
    })
  }

  const savingsComponent = health.components.find((c) => c.name === 'อัตราการออม')
  if (savingsComponent && savingsComponent.score < 60) {
    const savingsRate = summary.incomeTotal > 0 ? summary.netBalance / summary.incomeTotal : 0
    const targetSavings = Math.round(summary.incomeTotal * 0.2)
    const currentSavings = Math.max(0, summary.netBalance)
    recs.push({
      priority: priority++,
      category: 'savings',
      title: 'เพิ่มอัตราการออม',
      detail: `ปัจจุบันออม ${(savingsRate * 100).toFixed(0)}% ของรายรับ เป้าหมายคือ 20% หรือเดือนละ ${targetSavings.toLocaleString()} บาท`,
      quickAction: `ตั้งเป้าออมอัตโนมัติเดือนละ ${(targetSavings - currentSavings).toLocaleString()} บาท`,
      expectedImpact: `เพิ่มเงินออมปีละ ${((targetSavings - currentSavings) * 12).toLocaleString()} บาท`,
    })
  }

  if (trends.savingsOpportunities.length > 0) {
    for (const opp of trends.savingsOpportunities.slice(0, 2)) {
      recs.push({
        priority: priority++,
        category: 'spending',
        title: `ลด${opp.category}`,
        detail: opp.suggestion,
        quickAction: `ตั้งงบประมาณ${opp.category}เดือนละ ${(opp.currentAmount - opp.potentialSavings).toLocaleString()} บาท`,
        expectedImpact: `ประหยัดได้เดือนละ ${opp.potentialSavings.toLocaleString()} บาท`,
      })
    }
  }

  if (trends.riskMonths.length > 0) {
    const riskMonth = trends.riskMonths[0]
    recs.push({
      priority: priority++,
      category: 'spending',
      title: `เตรียมรับมือเดือน ${riskMonth.month}`,
      detail: `คาดว่าเดือนนี้จะมียอดคงเหลือ ${riskMonth.balance.toLocaleString()} บาท ควรวางแผนล่วงหน้า`,
      quickAction: `ตรวจสอบรายจ่ายและหักรายการที่ไม่จำเป็นออก`,
      expectedImpact: `ลดความเสี่ยงเงินติดลบในเดือนดังกล่าว`,
    })
  }

  const hasGoal = input.savingsGoals.some((g) => g.status === 'active')
  if (!hasGoal && summary.netBalance > 0) {
    recs.push({
      priority: priority++,
      category: 'goal',
      title: 'ตั้งเป้าหมายการออม',
      detail: 'การมีเป้าหมายการออมที่ชัดเจนช่วยให้มีวินัยทางการเงินมากขึ้น',
      quickAction: 'บอกเราได้เลยว่าอยากเก็บเงินเพื่ออะไร',
      expectedImpact: 'เพิ่มโอกาสประสบความสำเร็จในการออม',
    })
  }

  const filtered = recs.slice(0, 5)
  const topPicks = filtered.slice(0, 3).map((r) => r.title)

  return { recommendations: filtered, topPicks }
}
