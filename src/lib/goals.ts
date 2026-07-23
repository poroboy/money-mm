import { diffMonths, isValidMonth } from './forecast'
import type { SavingsGoal } from './types'

export type SavingsGoalPlan = {
  targetAmount: number
  savedAmount: number
  remainingAmount: number
  monthsRemaining: number
  monthlyRequired: number
  weeklyRequired: number
  progress: number
  isOverdue: boolean
}

const safeMoney = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0

export function getSavingsGoalPlan(goal: SavingsGoal, currentMonth: string): SavingsGoalPlan {
  const targetAmount = safeMoney(goal.targetAmount)
  const savedAmount = Math.min(safeMoney(goal.savedAmount), targetAmount)
  const remainingAmount = Math.max(0, targetAmount - savedAmount)
  const monthDifference = isValidMonth(goal.targetMonth) && isValidMonth(currentMonth)
    ? diffMonths(currentMonth, goal.targetMonth)
    : 0
  const monthsRemaining = remainingAmount === 0 ? 0 : Math.max(1, monthDifference)
  const monthlyRequired = goal.status === 'active' && monthsRemaining > 0 ? remainingAmount / monthsRemaining : 0
  return {
    targetAmount,
    savedAmount,
    remainingAmount,
    monthsRemaining,
    monthlyRequired,
    weeklyRequired: monthlyRequired * 12 / 52,
    progress: targetAmount > 0 ? savedAmount / targetAmount : 0,
    isOverdue: monthDifference < 0 && remainingAmount > 0,
  }
}

export function applySavingsContribution(goal: SavingsGoal, contribution: number): SavingsGoal {
  const targetAmount = safeMoney(goal.targetAmount)
  const nextSavedAmount = Math.min(targetAmount, safeMoney(goal.savedAmount) + safeMoney(contribution))
  return {
    ...goal,
    savedAmount: nextSavedAmount,
    status: targetAmount > 0 && nextSavedAmount >= targetAmount ? 'completed' : goal.status,
  }
}
