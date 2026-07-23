import { textOf, type ChatMessage } from './client'

export type SuggestedAction = {
  label: string
  prompt: string
}

const ACTION_RULES: { keywords: string[]; label: string; prompt: string }[] = [
  { keywords: ['รายจ่าย', 'ค่าใช้จ่าย', 'ใช้จ่าย', 'expense'], label: 'แสดงรายจ่ายเดือนนี้', prompt: 'แสดงรายจ่ายเดือนนี้ให้หน่อย' },
  { keywords: ['คาดการ', 'forecast', 'เดือนหน้า', 'แนวโน้ม', 'แนวโน้'], label: 'คาดการณ์เดือนหน้า', prompt: 'คาดการณ์สถานะการเงินเดือนหน้าให้หน่อย' },
  { keywords: ['อาหาร', 'ลด', 'ประหยัด'], label: 'จำลองลดค่าอาหาร', prompt: 'จำลองสถานการณ์ถ้าลดค่าอาหารลง 20%' },
  { keywords: ['งบประมาณ', 'budget', 'แผน', 'วางแผน'], label: 'วางแผนงบประมาณ', prompt: 'ช่วยวางแผนงบประมาณรายเดือนให้หน่อย' },
  { keywords: ['จ่าย', 'payment', 'ค้าง', 'ต้องจ่าย'], label: 'ดูกำหนดการจ่าย', prompt: 'แสดงรายการที่ต้องจ่ายเดือนนี้ให้หน่อย' },
  { keywords: ['บัญชี', 'account', 'ยอด', 'balance', 'คงเหลือ'], label: 'เช็คยอดบัญชี', prompt: 'แสดงยอดคงเหลือในบัญชีให้หน่อย' },
  { keywords: ['เป้าหมาย', 'goal', 'ออม', 'เก็บเงิน'], label: 'ตรวจสอบเป้าหมายออม', prompt: 'แสดงความคืบหน้าเป้าหมายการออมให้หน่อย' },
  { keywords: ['สุขภาพ', 'health', 'สถานะ', 'ภาพรวม'], label: 'ดูภาพรวมการเงิน', prompt: 'เดือนนี้สถานะการเงินเป็นยังไงบ้าง' },
  { keywords: ['วิเคราะ', 'trend', 'แนวโน้ม'], label: 'วิเคราะห์แนวโน้ม', prompt: 'วิเคราะห์แนวโน้มรายจ่ายแต่ละหมวดให้หน่อย' },
  { keywords: ['ความเสี่ยง', 'risk', 'อันตราย', 'เดือน'], label: 'เช็คความเสี่ยง', prompt: 'เดือนไหนที่มีความเสี่ยงทางการเงินบ้าง' },
  { keywords: ['ฉุกเฉิน', 'emergency', 'สำรอง'], label: 'วางแผนเงินฉุกเฉิน', prompt: 'ควรมีเงินสำรองฉุกเฉินเท่าไหร่ดี' },
  { keywords: ['สมมุติ', 'ถ้า', 'simulate', 'ลอง'], label: 'ลองจำลองสถานการณ์', prompt: 'ลองจำลองสถานการณ์ให้หน่อย' },
  { keywords: ['ปรับ', 'เพิ่ม', 'ลด'], label: 'ดูคำแนะนำการปรับ', prompt: 'แนะนำวิธีปรับปรุงการเงินให้หน่อย' },
  { keywords: ['หมวด', 'category', 'ประเภท'], label: 'วิเคราะห์ตามหมวด', prompt: 'วิเคราะห์ค่าใช้จ่ายแยกตามหมวดหมู่ให้หน่อย' },
  { keywords: ['รายรับ', 'income', 'เงินเข้า', 'รายได้'], label: 'ตรวจสอบรายรับ', prompt: 'แสดงรายรับทั้งหมดให้หน่อย' },
]

function getConversationTopics(messages: ChatMessage[]): Set<string> {
  const topics = new Set<string>()
  for (const message of messages) {
    const text = textOf(message).toLowerCase()
    for (const rule of ACTION_RULES) {
      if (rule.keywords.some((kw) => text.includes(kw))) {
        topics.add(rule.label)
      }
    }
  }
  return topics
}

export function getSuggestedActions(messages: ChatMessage[]): SuggestedAction[] {
  if (messages.length < 2) return []
  const last = messages[messages.length - 1]
  if (last.role !== 'assistant') return []

  const text = textOf(last).toLowerCase()
  const recentTopics = getConversationTopics(messages.slice(-4))
  const result: SuggestedAction[] = []

  for (const rule of ACTION_RULES) {
    if (result.length >= 4) break
    if (rule.keywords.some((kw) => text.includes(kw))) {
      if (!recentTopics.has(rule.label) || result.length === 0) {
        result.push({ label: rule.label, prompt: rule.prompt })
      }
    }
  }

  if (result.length < 3) {
    for (const rule of ACTION_RULES) {
      if (result.length >= 3) break
      if (!recentTopics.has(rule.label) && !result.some((r) => r.label === rule.label)) {
        result.push({ label: rule.label, prompt: rule.prompt })
      }
    }
  }

  return result.slice(0, 4)
}
