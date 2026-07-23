import { Card, PageTitle } from '../components/ui'
import { AIChatThread } from '../components/AIChatThread'

export function AIPage() {
  return <div className="mx-auto max-w-[1100px] max-lg:max-w-full">
    <PageTitle title="ผู้ช่วย AI" detail="ถามสถานะการเงิน ขอคำแนะนำ หรือให้ช่วยบันทึกรายการได้จากตรงนี้" />
    <Card className="mt-8 h-[calc(100vh-260px)] min-h-[480px]">
      <AIChatThread />
    </Card>
  </div>
}

