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

export const aiTools: ToolDefinition[] = [
  {
    name: 'get_financial_snapshot',
    description: 'ภาพรวมการเงิน: รายรับ/รายจ่าย/ผ่อน, forecast, สุขภาพ, รายการค้างชำระ, เป้าหมายออม',
    input_schema: {
      type: 'object',
      properties: {
        forecastMonths: { type: 'number', description: 'เดือนล่วงหน้า (default 3, max 24)' },
      },
    },
  },
  {
    name: 'list_items',
    description: 'รายการทั้งหมดใน collection พร้อม id',
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
    description: 'เพิ่มรายการใหม่ — ห้ามเรียกตรง ต้องผ่าน request_confirmation ก่อนเท่านั้น',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string', enum: [...collectionEnum] },
        payload: { type: 'object', description: 'ข้อมูลรายการ' },
      },
      required: ['collection', 'payload'],
    },
  },
  {
    name: 'update_item',
    description: 'แก้ไขรายการที่มีอยู่ — ห้ามเรียกตรง ต้องผ่าน request_confirmation ก่อนเท่านั้น เรียก list_items ก่อนถ้าไม่รู้ id',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string', enum: [...collectionEnum] },
        id: { type: 'string' },
        payload: { type: 'object', description: 'เฉพาะฟิลด์ที่เปลี่ยน' },
      },
      required: ['collection', 'id', 'payload'],
    },
  },
  {
    name: 'delete_item',
    description: 'ลบรายการ ใช้ผ่าน request_confirmation เท่านั้น',
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
    description: 'ตั้งว่าจ่ายแล้ว/ยังไม่จ่าย — ห้ามเรียกตรง ต้องผ่าน request_confirmation ก่อนเท่านั้น',
    input_schema: {
      type: 'object',
      properties: {
        itemType: { type: 'string', enum: ['expense', 'installment'] },
        itemId: { type: 'string' },
        month: { type: 'string', description: 'YYYY-MM' },
        isPaid: { type: 'boolean' },
      },
      required: ['itemType', 'itemId', 'month', 'isPaid'],
    },
  },
  {
    name: 'analyze_trends',
    description: 'วิเคราะห์แนวโน้ม: หมวดหมู่, รายการสูงสุด, MoM, ความเสี่ยง, โอกาสประหยัด',
    input_schema: {
      type: 'object',
      properties: {
        forecastMonths: { type: 'number', description: 'เดือน (default 3, max 24)' },
      },
    },
  },
  {
    name: 'financial_health_score',
    description: 'คะแนนสุขภาพ 5 ด้าน: ออม, รายจ่าย, ฉุกเฉิน, หนี้, สภาพคล่อง — พร้อมเกรด A-F',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'goal_planning',
    description: 'วางแผนเป้าหมาย เช่น "เก็บ 300,000 ใน 24 เดือน" — คำนวณยอดต่อเดือน, เทียบ, ชี้ส่วนต่าง',
    input_schema: {
      type: 'object',
      properties: {
        targetName: { type: 'string', description: 'ชื่อเป้าหมาย' },
        targetAmount: { type: 'number', description: 'บาท' },
        targetMonths: { type: 'number', description: 'เดือน' },
      },
      required: ['targetName', 'targetAmount', 'targetMonths'],
    },
  },
  {
    name: 'budget_coaching',
    description: 'เทียบรายจ่ายแต่ละหมวดกับสัดส่วนเหมาะสม ชี้หมวดที่เกินและวงเงินที่ควรเป็น',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'risk_detection',
    description: 'ตรวจจับ: เงินติดลบ, สภาพคล่องไม่พอ, รายจ่ายผิดปกติ, ฉุกเฉินไม่พอ, หนี้สูง',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_recommendations',
    description: 'คำแนะนำเรียงลำดับ Top 3 + quick action + expected impact',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'request_confirmation',
    description: 'ขอยืนยันจากผู้ใช้ก่อนเพิ่ม/แก้ไข/ลบรายการใด ๆ — ต้องเรียกทุกครั้งก่อน add_item, update_item, delete_item, set_payment_status',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'ชื่อ tool ที่ต้องการยืนยัน' },
        args: { type: 'object', description: 'arguments' },
        summary: { type: 'string', description: 'ข้อความสั้นอธิบายสิ่งที่กำลังทำ' },
      },
      required: ['action', 'args'],
    },
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
