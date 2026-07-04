import { describe, expect, it } from 'vitest'
import { getSavingsGoalPlan } from './goals'
import type { SavingsGoal } from './types'

const goal: SavingsGoal = {
  id: 'china',
  name: 'เที่ยวจีน',
  targetAmount: 60000,
  savedAmount: 12000,
  targetMonth: '2027-07',
  priority: 'high',
  status: 'active',
}

describe('savings goal plan', () => {
  it('calculates the monthly and weekly saving recommendation', () => {
    const plan = getSavingsGoalPlan(goal, '2026-07')
    expect(plan.monthsRemaining).toBe(12)
    expect(plan.remainingAmount).toBe(48000)
    expect(plan.monthlyRequired).toBe(4000)
    expect(Math.round(plan.weeklyRequired)).toBe(923)
    expect(plan.progress).toBe(0.2)
  })

  it('does not recommend contributions for paused or completed goals', () => {
    expect(getSavingsGoalPlan({ ...goal, status: 'paused' }, '2026-07').monthlyRequired).toBe(0)
    expect(getSavingsGoalPlan({ ...goal, savedAmount: 60000, status: 'completed' }, '2026-07').remainingAmount).toBe(0)
  })

  it('marks unfinished past targets as overdue', () => {
    expect(getSavingsGoalPlan({ ...goal, targetMonth: '2026-06' }, '2026-07').isOverdue).toBe(true)
  })
})
