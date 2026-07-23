import { useMemo } from 'react'
import { PageTitle, EmptyState } from '../components/ui'
import { useData } from '../context/DataContext'
import { useAIChat } from '../context/AIChatContext'
import { SummaryCards } from '../components/dashboard/SummaryCards'
import { ChartsSection } from '../components/dashboard/ChartsSection'
import { BudgetOverview } from '../components/dashboard/BudgetOverview'
import { RecentTransactions } from '../components/dashboard/RecentTransactions'
import { FinancialInsights } from '../components/dashboard/FinancialInsights'

export function DashboardPage() {
  const data = useData()
  const { send, setWidgetOpen } = useAIChat()

  const noData = useMemo(() => !data.incomes.length && !data.expenses.length && !data.installments.length, [data.incomes, data.expenses, data.installments])

  const handleAnalyze = (prompt: string) => {
    setWidgetOpen(true)
    setTimeout(() => void send(prompt), 300)
  }

  if (data.loading) {
    return <div className="grid min-h-[400px] place-items-center"><p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p></div>
  }

  return <>
    <PageTitle title="ภาพรวมการเงิน" detail="ภาพรวมสถานะการเงินของคุณในเดือนนี้" />

    {data.error && <div className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">เชื่อมต่อข้อมูลไม่สำเร็จ: {data.error}</div>}

    <SummaryCards data={data} />

    {noData ? (
      <div className="mt-6">
        <EmptyState title="เริ่มต้นด้วยการเพิ่มรายรับ เช่น เงินเดือน" detail="จากนั้นเพิ่มรายจ่ายประจำและรายการผ่อน เพื่อดู dashboard ที่สมบูรณ์" />
      </div>
    ) : (
      <>
        <div className="mt-6"><ChartsSection data={data} /></div>
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.3fr_1fr]">
          <BudgetOverview data={data} />
          <FinancialInsights data={data} onAnalyze={handleAnalyze} />
        </div>
        <div className="mt-5"><RecentTransactions data={data} /></div>
      </>
    )}
  </>
}
