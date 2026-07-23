export type ToolDefinition = {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

const collectionEnum = ['incomes', 'expenses', 'accounts', 'installments', 'savingsGoals'] as const

const payloadShapes = [
  'รูปแบบ payload ตาม collection (ส่งเฉพาะฟิลด์ที่เกี่ยวข้อง, เดือนทุกช่องเป็น "YYYY-MM"):',
  '- incomes: { name, amount, type: "once"|"monthly"|"fixed_months", startMonth, endMonth?, repeatMonths?, receiveDay?, isActive, note? }',
  '- expenses: { name, amount, category, type: "once"|"fixed_months"|"forever", startMonth, repeatMonths?, payDay?, isActive, note? }',
  '- accounts: { name, type: "credit_card"|"paylater"|"loan"|"other", statementDay?, paymentDueDay?, isActive, note? }',
  '- installments: { accountId, name, monthlyAmount, totalMonths, firstPaymentMonth, paymentDay?, status: "active"|"completed"|"cancelled", note? }',
  '- savingsGoals: { name, targetAmount, savedAmount, targetMonth, priority: "high"|"medium"|"low", status: "active"|"paused"|"completed", note? }',
].join('\n')

export const aiTools: ToolDefinition[] = [
  {
    name: 'get_financial_snapshot',
    description: [
      'ดึงภาพรวมการเงินปัจจุบันของผู้ใช้: รายรับ/รายจ่าย/ผ่อนที่กำลังทำงานอยู่ทั้งหมด,',
      'พยากรณ์รายเดือนล่วงหน้า, สถานะสุขภาพการเงินรายเดือน, รายการที่ยังไม่จ่ายเดือนนี้',
      'และเป้าหมายการออม เรียกใช้ก่อนเสมอเมื่อผู้ใช้ถามเกี่ยวกับสถานะการเงิน',
      'ขอคำแนะนำ หรือให้วิเคราะห์ เพื่อให้ตอบจากข้อมูลจริงแทนการเดา',
    ].join(' '),
    input_schema: {
      type: 'object',
      properties: {
        forecastMonths: { type: 'number', description: 'จำนวนเดือนที่ต้องการพยากรณ์ล่วงหน้า (ค่าเริ่มต้น 6, สูงสุด 24)' },
      },
    },
  },
  {
    name: 'list_items',
    description: 'ดึงรายการทั้งหมดใน collection ที่ระบุ พร้อม id ของแต่ละรายการ (ใช้ id นี้ตอนจะ update/delete)',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string', enum: [...collectionEnum] },
      },
      required: ['collection'],
    },
  },
  {
    name: 'add_item',
    description: `เพิ่มรายการใหม่ใน collection ที่ระบุ\n\n${payloadShapes}`,
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string', enum: [...collectionEnum] },
        payload: { type: 'object', description: 'ข้อมูลของรายการใหม่ ตามรูปแบบของ collection นั้น' },
      },
      required: ['collection', 'payload'],
    },
  },
  {
    name: 'update_item',
    description: `แก้ไขรายการที่มีอยู่แล้วด้วย id (เรียก list_items ก่อนถ้ายังไม่รู้ id) ส่งเฉพาะฟิลด์ที่ต้องการเปลี่ยน\n\n${payloadShapes}`,
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string', enum: [...collectionEnum] },
        id: { type: 'string' },
        payload: { type: 'object', description: 'เฉพาะฟิลด์ที่ต้องการแก้ไข' },
      },
      required: ['collection', 'id', 'payload'],
    },
  },
  {
    name: 'delete_item',
    description: 'ลบรายการออกจาก collection ด้วย id — ต้องถามยืนยันกับผู้ใช้ก่อนเรียกเครื่องมือนี้เสมอ',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string', enum: [...collectionEnum] },
        id: { type: 'string' },
      },
      required: ['collection', 'id'],
    },
  },
  {
    name: 'set_payment_status',
    description: 'ตั้งสถานะจ่ายแล้ว/ยังไม่จ่าย ของรายจ่ายหรือรายการผ่อนในเดือนที่ระบุ (เช่น ผู้ใช้พิมพ์ "จ่ายค่าไฟแล้ว")',
    input_schema: {
      type: 'object',
      properties: {
        itemType: { type: 'string', enum: ['expense', 'installment'] },
        itemId: { type: 'string' },
        month: { type: 'string', description: 'รูปแบบ YYYY-MM' },
        isPaid: { type: 'boolean' },
      },
      required: ['itemType', 'itemId', 'month', 'isPaid'],
    },
  },
  {
    name: 'analyze_trends',
    description: [
      'วิเคราะห์แนวโน้มการใช้จ่ายและรายได้ของผู้ใช้แบบละเอียด',
      'รวมถึงการแยกยอดตามหมวดหมู่ รายการที่ใช้จ่ายสูงสุด',
      'การเปลี่ยนแปลงระหว่างเดือน ความเสี่ยงทางการเงิน',
      'และโอกาสในการประหยัดเงิน',
      'เรียกใช้เมื่อผู้ใช้ต้องการวิเคราะห์แนวโน้ม หรือเมื่อตอบคำถามเชิงลึกเกี่ยวกับพฤติกรรมการเงิน',
    ].join(' '),
    input_schema: {
      type: 'object',
      properties: {
        forecastMonths: { type: 'number', description: 'จำนวนเดือนที่ต้องการวิเคราะห์ (ค่าเริ่มต้น 6, สูงสุด 24)' },
      },
    },
  },
  {
    name: 'financial_health_score',
    description: [
      'คำนวณคะแนนสุขภาพการเงินแบบครอบคลุม โดยวัดจาก 5 ด้าน:',
      'อัตราการออม, สัดส่วนรายจ่าย, เงินสำรองฉุกเฉิน, ภาระหนี้, และสภาพคล่องรายเดือน',
      'ให้คะแนนแบบ 100 คะแนน พร้อมเกรด A-F และคำอธิบายแต่ละด้าน',
      'เรียกเมื่อผู้ใช้ถามถึงสุขภาพการเงิน คะแนนความมั่นคง หรือต้องการประเมินสถานะ',
    ].join(' '),
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'goal_planning',
    description: [
      'วางแผนการออมเพื่อเป้าหมายทางการเงิน เช่น "อยากเก็บ 300,000 ใน 24 เดือน"',
      'คำนวณจำนวนเงินที่ต้องเก็บต่อเดือน เปรียบเทียบกับเงินเหลือในปัจจุบัน',
      'ชี้จุดที่ต้องปรับปรุง และแนะนำแนวทางที่เหมาะสม',
      'เรียกเมื่อผู้ใช้บอกเป้าหมายการออมหรือถามว่าเป็นไปได้ไหม',
    ].join(' '),
    input_schema: {
      type: 'object',
      properties: {
        targetName: { type: 'string', description: 'ชื่อเป้าหมาย เช่น "เที่ยวญี่ปุ่น" "เงินดาวน์รถ"' },
        targetAmount: { type: 'number', description: 'จำนวนเงินที่ต้องการ (บาท)' },
        targetMonths: { type: 'number', description: 'จำนวนเดือนที่ต้องการ' },
      },
      required: ['targetName', 'targetAmount', 'targetMonths'],
    },
  },
  {
    name: 'budget_coaching',
    description: [
      'วิเคราะห์งบรายจ่ายตามหมวดหมู่ เทียบกับสัดส่วนที่เหมาะสม',
      'ชี้หมวดหมู่ที่ใช้จ่ายเกินควร และแนะนำงบประมาณที่เหมาะสม',
      'เรียกเมื่อผู้ใช้ต้องการปรับปรุงงบประมาณ หรือถามว่าควรใช้จ่ายแต่ละหมวดเท่าไหร่',
    ].join(' '),
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'risk_detection',
    description: [
      'ตรวจจับความเสี่ยงทางการเงินอัตโนมัติ: เงินติดลบ, สภาพคล่องไม่เพียงพอ,',
      'รายจ่ายผิดปกติ, เงินสำรองฉุกเฉินไม่พอ, และภาระหนี้สูงเกินไป',
      'เรียกก่อนให้คำแนะนำเชิงรุก หรือเมื่อผู้ใช้ถามเกี่ยวกับความเสี่ยง',
    ].join(' '),
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_recommendations',
    description: [
      'สร้างคำแนะนำเชิงปฏิบัติการแบบเรียงลำดับความสำคัญ',
      'รวมถึง Top 3 เรื่องที่ควรทำ, การดำเนินการด่วน, และผลกระทบที่คาดหวัง',
      'เรียกก่อนสรุปคำแนะนำการเงินทุกครั้ง เพื่อให้คำแนะนำที่ตรงจุด',
    ].join(' '),
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'what_if_simulation',
    description: [
      'จำลองสถานการณ์ทางการเงินโดยการเพิ่ม/ลบ/แก้ไขรายการสมมุติชั่วคราว',
      'แล้วคำนวณผลลัพธ์โดยไม่บันทึกข้อมูลจริงลง Firestore',
      'ใช้เมื่อผู้ใช้ถามถึงสถานการณ์สมมุติ เช่น',
      '"ถ้าผมกู้รถเพิ่มอีก 15000 ต่อเดือน", "ถ้าเก็บเงินเพิ่มเดือนละ 2000",',
      '"ถ้ารายจ่ายค่าไฟลดลงครึ่งหนึ่ง"',
      'ส่งเฉพาะฟิลด์ที่ต้องการเปลี่ยนแปลง ส่งรายการที่ต้องการจำลอง',
      'ผลลัพธ์จะแสดงตัวเลขก่อนและหลังเปลี่ยนแปลงเทียบกัน',
    ].join(' '),
    input_schema: {
      type: 'object',
      properties: {
        changes: {
          type: 'array',
          description: 'รายการเปลี่ยนแปลงที่ต้องการจำลอง',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['add', 'update', 'remove'], description: 'add=เพิ่มรายการใหม่, update=แก้ไขรายการที่มี, remove=ลบรายการ' },
              collection: { type: 'string', enum: [...collectionEnum] },
              id: { type: 'string', description: 'required ถ้า action เป็น update หรือ remove' },
              payload: { type: 'object', description: 'required ถ้า action เป็น add หรือ update — ข้อมูลรายการตามรูปแบบของ collection นั้น' },
            },
            required: ['action', 'collection'],
          },
        },
        forecastMonths: { type: 'number', description: 'จำนวนเดือนที่ต้องการพยากรณ์ (ค่าเริ่มต้น 6, สูงสุด 24)' },
      },
      required: ['changes'],
    },
  },
]
