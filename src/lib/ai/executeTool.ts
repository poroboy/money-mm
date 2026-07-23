import type { useData } from '../../context/DataContext'
import type { PaymentItemType } from '../types'
import { buildFinancialSnapshot, simulateChanges, analyzeTrends, getFinancialHealthScore, getGoalPlan, getBudgetCoaching, getRiskDetection, getRecommendations, type SimulatedChange } from './snapshot'

type DataApi = ReturnType<typeof useData>
type CollectionName = 'incomes' | 'expenses' | 'accounts' | 'installments' | 'savingsGoals'

export async function executeTool(name: string, input: Record<string, unknown>, data: DataApi): Promise<unknown> {
  switch (name) {
    case 'get_financial_snapshot':
      return buildFinancialSnapshot({
        incomes: data.incomes,
        expenses: data.expenses,
        accounts: data.accounts,
        installments: data.installments,
        paymentRecords: data.paymentRecords,
        savingsGoals: data.savingsGoals,
        forecastMonths: input.forecastMonths as number | undefined,
      })

    case 'list_items': {
      const collection = input.collection as CollectionName
      const map: Record<CollectionName, unknown[]> = {
        incomes: data.incomes,
        expenses: data.expenses,
        accounts: data.accounts,
        installments: data.installments,
        savingsGoals: data.savingsGoals,
      }
      return map[collection] ?? { error: `unknown collection: ${collection}` }
    }

    case 'add_item': {
      const collection = input.collection as CollectionName
      const payload = input.payload as Record<string, unknown>
      await data.save(collection, payload as never)
      return { ok: true }
    }

    case 'update_item': {
      const collection = input.collection as CollectionName
      const payload = input.payload as Record<string, unknown>
      await data.save(collection, payload as never, input.id as string)
      return { ok: true }
    }

    case 'delete_item': {
      const collection = input.collection as CollectionName
      await data.remove(collection, input.id as string)
      return { ok: true }
    }

    case 'set_payment_status':
      await data.setPaymentStatus(input.itemType as PaymentItemType, input.itemId as string, input.month as string, input.isPaid as boolean)
      return { ok: true }

    case 'analyze_trends':
      return analyzeTrends({
        incomes: data.incomes,
        expenses: data.expenses,
        accounts: data.accounts,
        installments: data.installments,
        paymentRecords: data.paymentRecords,
        savingsGoals: data.savingsGoals,
        forecastMonths: (input.forecastMonths as number) ?? 6,
      })

    case 'financial_health_score':
      return getFinancialHealthScore({
        incomes: data.incomes,
        expenses: data.expenses,
        accounts: data.accounts,
        installments: data.installments,
        paymentRecords: data.paymentRecords,
        savingsGoals: data.savingsGoals,
      })

    case 'goal_planning':
      return getGoalPlan(
        {
          incomes: data.incomes,
          expenses: data.expenses,
          accounts: data.accounts,
          installments: data.installments,
          paymentRecords: data.paymentRecords,
          savingsGoals: data.savingsGoals,
        },
        { targetName: input.targetName as string, targetAmount: input.targetAmount as number, targetMonths: input.targetMonths as number },
      )

    case 'budget_coaching':
      return getBudgetCoaching({
        incomes: data.incomes,
        expenses: data.expenses,
        accounts: data.accounts,
        installments: data.installments,
        paymentRecords: data.paymentRecords,
        savingsGoals: data.savingsGoals,
      })

    case 'risk_detection':
      return getRiskDetection({
        incomes: data.incomes,
        expenses: data.expenses,
        accounts: data.accounts,
        installments: data.installments,
        paymentRecords: data.paymentRecords,
        savingsGoals: data.savingsGoals,
      })

    case 'get_recommendations':
      return getRecommendations({
        incomes: data.incomes,
        expenses: data.expenses,
        accounts: data.accounts,
        installments: data.installments,
        paymentRecords: data.paymentRecords,
        savingsGoals: data.savingsGoals,
      })

    case 'what_if_simulation':
      return simulateChanges(
        {
          incomes: data.incomes,
          expenses: data.expenses,
          accounts: data.accounts,
          installments: data.installments,
          paymentRecords: data.paymentRecords,
          savingsGoals: data.savingsGoals,
          forecastMonths: (input.forecastMonths as number) ?? 6,
        },
        input.changes as SimulatedChange[],
      )

    default:
      return { error: `unknown tool: ${name}` }
  }
}
