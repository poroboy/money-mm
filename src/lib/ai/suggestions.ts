import { getCurrentMonth, getMonthlySummary, addMonths, getFinancialHealth } from '../forecast'
import { getBudgetCoaching, getRiskDetection } from './snapshot'
import type { DataValue } from '../../context/DataContext'

export type Suggestion = { label: string; prompt: string }

export function getSmartSuggestions(data: DataValue): Suggestion[] {
  const month = getCurrentMonth()
  const summary = getMonthlySummary({ month, incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments })
  const totalExpense = summary.expenseTotal + summary.installmentTotal
  const health = getFinancialHealth(summary)
  const snapshot = { incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments, paymentRecords: data.paymentRecords, savingsGoals: data.savingsGoals }

  const result: Suggestion[] = []

  if (summary.incomeTotal > 0 || totalExpense > 0) {
    const prevMonth = addMonths(month, -1)
    const prevSummary = getMonthlySummary({ month: prevMonth, incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments })
    const prevTotal = prevSummary.expenseTotal + prevSummary.installmentTotal
    if (prevTotal > 0 && totalExpense > prevTotal * 1.1) {
      result.push({ label: 'ทำไมเดือนนี้รายจ่ายเพิ่ม?', prompt: 'ทำไมเดือนนี้รายจ่ายถึงเพิ่มขึ้นเมื่อเทียบกับเดือนที่แล้ว?' })
    }
  }

  const activeGoals = data.savingsGoals.filter((g) => g.status === 'active')
  if (activeGoals.length > 0) {
    result.push({ label: 'ถึงเป้าหมายออมเมื่อไหร่?', prompt: 'อีกกี่เดือนถึงจะถึงเป้าหมายออมเงิน? แสดงรายละเอียดแต่ละเป้าหมาย' })
  } else {
    result.push({ label: 'ตั้งเป้าหมายออมเงิน', prompt: 'ช่วยวางแผนเป้าหมายการออมให้หน่อย อยากเก็บเงินให้ได้ตามเป้าหมาย' })
  }

  const budgetCoaching = getBudgetCoaching(snapshot)
  if (budgetCoaching.overspendCategories.length > 0) {
    const top = budgetCoaching.overspendCategories[0]
    result.push({ label: `ลด${top.category}ยังไงดี?`, prompt: `หมวด${top.category}ใช้เงินเยอะมาก มีวิธีลดยังไงบ้าง?` })
  } else if (summary.incomeTotal > 0) {
    result.push({ label: 'ลดรายจ่ายหมวดไหนดี?', prompt: 'ช่วยวิเคราะห์หน่อยว่าควรลดรายจ่ายหมวดไหนก่อน?' })
  }

  const risk = getRiskDetection(snapshot)
  if (risk.risks.length > 0) {
    result.push({ label: 'มีความเสี่ยงอะไรบ้าง?', prompt: 'มีความเสี่ยงทางการเงินอะไรบ้างในตอนนี้?' })
  }

  if (health.status === 'danger' || health.status === 'warning') {
    result.push({ label: 'ปรับปรุงการเงินด่วน!', prompt: 'สุขภาพการเงินเดือนนี้ไม่ดีเลย มีวิธีปรับปรุงยังไงบ้าง?' })
  }

  if (summary.incomeTotal > 0 && totalExpense > 0) {
    const savingsRate = Math.max(0, summary.netBalance) / summary.incomeTotal
    if (savingsRate < 0.2) {
      result.push({ label: 'เพิ่มเงินออม 5,000', prompt: 'ฉันอยากเก็บเพิ่มเดือนละ 5,000 บาท มีวิธีไหนบ้าง?' })
    } else {
      result.push({ label: 'เพิ่มเงินออมได้ไหม?', prompt: 'ออมเพิ่มอีกเดือนละ 5,000 บาทได้ไหม?' })
    }
  }

  result.push({ label: 'เทียบกับเดือนที่แล้ว', prompt: 'เปรียบเทียบสถานะการเงินเดือนนี้กับเดือนที่แล้วให้หน่อย' })

  if (data.settings.forecastMonths >= 6) {
    result.push({ label: 'แนวโน้มระยะยาว', prompt: 'แนวโน้มการเงิน 6 เดือนข้างหน้าเป็นยังไงบ้าง?' })
  }

  return result.slice(0, 6)
}
