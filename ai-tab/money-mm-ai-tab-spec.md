# Spec: AI Assistant Tab สำหรับ Money MM

ให้ AI agent อ่านไฟล์นี้แล้ว implement ฟีเจอร์ "ผู้ช่วย AI" ลงใน repo `poroboy/money-mm`
(React 19 + Vite + TypeScript + Firebase Firestore, ดูโค้ดจริงก่อน implement เสมอ อย่าเดาโครงสร้าง)

## เป้าหมาย
เพิ่มผู้ช่วย AI ที่:
1. อ่านข้อมูลการเงินของผู้ใช้ (รายรับ/รายจ่าย/ผ่อน/เป้าหมายออม) แล้ววิเคราะห์/แนะนำได้
2. เพิ่ม/แก้ไข/ลบรายการให้ผู้ใช้ได้ผ่านการพิมพ์คุยธรรมดา (เช่น "จ่ายค่าไฟ 800 บาทแล้ว")
3. แสดงผลได้ 2 จุด: (a) แท็บเต็มหน้าในเมนูหลัก (b) แชทลอยมุมขวาล่างที่เปิดได้จากทุกหน้า
   ทั้งสองจุดต้องเห็นบทสนทนาเดียวกัน (shared state)

## บริบทโค้ดเดิมที่ต้องรู้ก่อนแก้
- Data model อยู่ที่ `src/lib/types.ts` — entity หลัก: `Income`, `Expense`, `Account`,
  `Installment`, `PaymentRecord`, `SavingsGoal` (อ่านไฟล์นี้ก่อน implement เสมอ)
- การอ่าน/เขียน Firestore ทั้งหมดอยู่ใน `src/context/DataContext.tsx` ผ่าน hook `useData()`
  ซึ่งมี `save(collection, payload, id?)`, `remove(collection, id)`,
  `setPaymentStatus(itemType, itemId, month, isPaid)` อยู่แล้ว — **ห้ามเขียน Firestore call ใหม่
  เอง ให้เรียกผ่าน methods พวกนี้เท่านั้น** เพื่อให้ security rules เดิม (`users/{uid}` only)
  ยังคุ้มครองอยู่ครบ
- Logic คำนวณ forecast/สุขภาพการเงินอยู่ที่ `src/lib/forecast.ts` (`getForecast`,
  `getFinancialHealth`, `getCurrentMonth` ฯลฯ) — ใช้ของเดิม อย่าคำนวณซ้ำเอง
- UI components ใช้ร่วมกันอยู่ที่ `src/components/ui.tsx` (`Card`, `PageTitle`, ฯลฯ) และ style
  เป็น Tailwind, ไม่มี semicolons, single quotes — ให้เขียนโค้ดสไตล์เดียวกับไฟล์เดิมในสิ่งที่เขียนใหม่
- Routing อยู่ที่ `src/App.tsx`, เมนูซ้ายอยู่ที่ `src/components/AppShell.tsx`

## ข้อจำกัดสำคัญ: ไม่มี Cloud Functions
Firebase project นี้ใช้ **Spark plan (free)** ซึ่งไม่มี Cloud Functions ดังนั้นห้ามเรียก
Anthropic API ตรงจาก browser (จะฝัง API key ไว้ใน client bundle ใครก็ขโมยไปใช้ได้) ต้องมี proxy
เล็กๆ แยกไปโฮสต์ที่อื่นที่มี server-side secret ได้ฟรี เช่น Cloudflare Workers หรือ Vercel Edge
Function — proxy ทำหน้าที่แค่รับ request จาก client แล้ว forward ไป
`https://api.anthropic.com/v1/messages` พร้อมแนบ API key ที่เก็บเป็น secret ฝั่ง server เท่านั้น
proxy **ไม่ต้องแตะ Firestore เลย** ข้อมูลการเงินยังอ่าน/เขียนจาก browser โดยตรงเหมือนเดิม

## ไฟล์ที่ต้องสร้าง/แก้

### สร้างใหม่
- `src/lib/ai/tools.ts` — array ของ tool definitions (รูปแบบ Anthropic tool schema) ให้ AI
  เรียกใช้ได้: อย่างน้อยต้องมี
  - `get_financial_snapshot` — ดึงสรุปการเงินปัจจุบัน (เดือนนี้ + พยากรณ์ล่วงหน้า + รายการยังไม่จ่าย
    + ความคืบหน้าเป้าหมายออม) โดยประกอบข้อมูลจาก `forecast.ts` ไม่ใช่ query Firestore เพิ่ม
  - `list_items(collection)` — คืนรายการทั้งหมดใน collection พร้อม id
  - `add_item(collection, payload)` / `update_item(collection, id, payload)` /
    `delete_item(collection, id)` — 1 ชุด ครอบคลุมทุก collection (incomes, expenses, accounts,
    installments, savingsGoals) แทนที่จะแยก tool ต่อ collection
  - `set_payment_status(itemType, itemId, month, isPaid)`
- `src/lib/ai/snapshot.ts` — ฟังก์ชัน build snapshot จาก `forecast.ts`
- `src/lib/ai/executeTool.ts` — mapping ชื่อ tool → เรียก `useData()` methods จริง
- `src/lib/ai/client.ts` — เรียก proxy, วน loop: ส่งข้อความ → ถ้า `stop_reason === 'tool_use'`
  รัน tool แล้วส่ง `tool_result` กลับ → วนจนกว่าจะจบ (ใส่ limit กันวน infinite เช่น 6 รอบ)
- `src/context/AIChatContext.tsx` — provider เก็บ `messages`, `sending`, `error`, `send()`,
  `widgetOpen` ให้ทั้งแท็บและแชทลอยใช้ร่วมกัน
- `src/components/AIChatThread.tsx` — UI รายการข้อความ + ช่องพิมพ์ (ใช้ร่วมกัน 2 ที่)
- `src/components/AIChatWidget.tsx` — ปุ่มลอยมุมขวาล่าง เปิด/ปิดแผงแชท
- `src/pages/AIPage.tsx` — หน้าเต็มสำหรับแท็บ AI
- `ai-proxy/` — โค้ด proxy (เลือก Cloudflare Workers หรือ Vercel ก็ได้) + README สั้นๆ วิธี deploy

### แก้ไฟล์เดิม
- `src/App.tsx` — เพิ่ม route `/ai`, ห่อด้วย `AIChatProvider`
- `src/components/AppShell.tsx` — เพิ่มเมนู "ผู้ช่วย AI" และ mount `<AIChatWidget />` (ซ่อนตอนอยู่
  หน้า `/ai` เอง กันซ้อนกับแท็บเต็มหน้า)
- `.env.example` — เพิ่ม `VITE_AI_PROXY_URL=`

## กฎพฤติกรรมของ AI (ใส่ใน system prompt)
- ตอบเป็นภาษาไทย กระชับ
- ต้องเรียก `get_financial_snapshot` ก่อนเสมอเมื่อถูกถามเรื่องสถานะ/คำแนะนำการเงิน ห้ามเดาตัวเลข
- ก่อนเรียก `delete_item` ต้องถามยืนยันจากผู้ใช้ในแชทก่อนเสมอ
- เงินหน่วยบาท, เดือนรูปแบบ `YYYY-MM`

## เกณฑ์ตรวจรับงาน
- [ ] `npx tsc -b` และ `npm run lint` ผ่านไม่มี error
- [ ] พิมพ์ "เดือนนี้สถานะการเงินเป็นไง" แล้ว AI ตอบด้วยตัวเลขจริงจาก Firestore (ไม่ใช่ตัวเลขมั่ว)
- [ ] พิมพ์ "จ่ายค่าไฟ 500 บาทแล้ว" (ต้องมีรายจ่ายชื่อใกล้เคียงอยู่แล้ว) แล้วสถานะจ่ายในหน้า
      "รายการที่ต้องจ่าย" เปลี่ยนจริง
      สั่งลบรายการแล้ว AI ต้องถามยืนยันก่อนลบจริง
- [ ] แชทลอยกับแท็บเต็มหน้าเห็นบทสนทนาเดียวกัน
- [ ] ถ้ายังไม่ตั้ง `VITE_AI_PROXY_URL` หน้า AI ต้องแจ้งเตือนแบบเข้าใจง่าย ไม่ error แตก

---

## สิ่งที่ AI agent ต้องถาม/ขอจากฉันก่อนหรือระหว่างทำ

ให้ agent หยุดถามคำถามต่อไปนี้ก่อนเริ่ม หรือระหว่างทำถ้าจำเป็น — อย่าเดาเอาเอง:

1. **Anthropic API key** — ต้องสมัครเองที่ https://console.anthropic.com/ (คนละอันกับ Claude
   subscription ปกติ ใช้จ่ายเงินตามการเรียกจริง) แล้วเอามาให้ agent ตอนตั้งค่า proxy secret
2. **จะ deploy proxy ที่ไหน** — Cloudflare Workers (มี free tier กว้างสุด แนะนำ) หรือ Vercel
   Edge Function หรืออื่น ๆ ถ้าไม่มี account อยู่แล้วต้องบอก agent ให้ช่วย sign up/setup ด้วย
3. **โมเดลที่จะใช้** — อยากได้ตอบฉลาด/วิเคราะห์ดี (`claude-sonnet-5`) หรือถูก/เร็วกว่า
   (`claude-haiku-4-5-20251001`)
4. **โดเมนจริงของแอปที่ deploy แล้ว** — ใช้จำกัด CORS origin ของ proxy กัน request จากที่อื่น
   (ถ้ายังไม่รู้ ให้ agent ตั้งเปิดกว้างไว้ก่อนแล้วมาจำกัดทีหลังได้)
5. **ระดับสิทธิ์ที่ไว้ใจให้ AI แก้ข้อมูล** — ยืนยันอีกครั้งว่าโอเคให้ AI เพิ่ม/แก้/ลบข้อมูลจริงได้เลย
   (ไม่ใช่แค่ตอบคำถาม) และการลบต้องมี confirm ในแชทก่อนทุกครั้ง
6. **งบประมาณต่อเดือนที่รับได้** — ถ้าจะจำกัด usage/budget alert ฝั่ง Anthropic console
   ต้องรู้เพดานคร่าวๆ (ปกติใช้คนเดียวหลักสิบบาท/เดือน)

ถ้า agent ไม่ถามคำถามพวกนี้เองแล้วเริ่มเดา ให้เอาข้อมูลด้านบนนี้กรอกไปให้ตรงๆ ได้เลย
