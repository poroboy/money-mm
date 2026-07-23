# รายงานการปรับปรุงความสามารถ AI (AI Capability Improvements)

## สรุปภาพรวม รอบที่ 2

ยกระดับ AI จาก chatbot ตอบคำถาม สู่ **ที่ปรึกษาทางการเงินส่วนตัว** ที่สามารถให้คะแนนสุขภาพการเงิน วางแผนเป้าหมาย โค้ชชิ่งงบประมาณ ตรวจจับความเสี่ยง และแนะนำแบบมีลำดับความสำคัญ

---

## 1. ความสามารถใหม่ (New Capabilities)

### 1.1 การให้คะแนนสุขภาพการเงิน (`financial_health_score`)

วัด 5 ด้าน พร้อมคะแนน 100 คะแนนเต็ม เกรด A-F:

| องค์ประกอบ | น้ำหนัก | เกณฑ์วัด |
|---|---|---|
| อัตราการออม | 25% | เงินเหลือ / รายรับ (เป้าหมาย ≥ 20%) |
| สัดส่วนรายจ่าย | 25% | รายจ่าย / รายรับ (เป้าหมาย ≤ 50%) |
| เงินสำรองฉุกเฉิน | 20% | เงินออมทั้งหมด / รายจ่ายรายเดือน (เป้าหมาย ≥ 6 เท่า) |
| ภาระหนี้ | 20% | ค่างวด / รายรับ (เป้าหมาย ≤ 30%) |
| สภาพคล่องรายเดือน | 10% | เงินคงเหลือจริง (ติดลบ = เสี่ยง) |

**การทำงาน:**
- แต่ละด้านมีคะแนน 0-100 status (excellent/good/fair/poor) และคำอธิบายภาษาไทย
- คะแนนรวมถ่วงน้ำหนัก แปลงเป็นเกรด A (≥90%) / B (≥75%) / C (≥60%) / D (≥40%) / F (<40%)
- สรุปภาพรวมและชี้จุดที่ต้องปรับปรุง

### 1.2 การวางแผนเป้าหมาย (`goal_planning`)

**ตัวอย่าง:** "อยากเก็บ 300,000 บาท ใน 24 เดือน"

**ขั้นตอน:**
1. รับชื่อเป้าหมาย จำนวนเงิน และระยะเวลา
2. คำนวณ: ต้องเก็บเดือนละ 12,500 บาท
3. เทียบกับเงินเหลือปัจจุบัน: เช่น เหลือเดือนละ 8,000 บาท
4. ชี้ส่วนต่าง: ขาด 4,500 บาท/เดือน
5. แนะนำ:
   - ถ้าเก็บเท่าที่เหลืออยู่ตอนนี้ จะใช้เวลา 38 เดือน
   - แนะนำลดรายจ่ายหรือเพิ่มรายได้
   - เสนอทางเลือกขยายระยะเวลา
6. เมื่อผู้ใช้ยืนยัน ให้ถามว่าต้องการสร้างเป้าหมายในระบบหรือไม่

### 1.3 การโค้ชชิ่งงบประมาณ (`budget_coaching`)

วิเคราะห์รายจ่ายตามหมวด เทียบกับสัดส่วนที่เหมาะสม:

| หมวด | สัดส่วนแนะนำ |
|---|---|
| ที่อยู่อาศัย | ≤ 25% |
| อาหาร | ≤ 15% |
| เดินทาง | ≤ 10% |
| สาธารณูปโภค | ≤ 10% |
| ช้อปปิ้ง | ≤ 5% |
| ความบันเทิง | ≤ 5% |
| อื่นๆ | ≤ 10% |
| รวมรายจ่าย | ≤ 70% |

**ผลลัพธ์:**
- รายการหมวดที่ใช้จ่ายเกิน พร้อมส่วนต่างและ %
- งบประมาณที่แนะนำในแต่ละหมวด
- งบรวมที่ควรตั้ง

### 1.4 การตรวจจับความเสี่ยง (`risk_detection`)

ตรวจจับอัตโนมัติ 5 ประเภท:

| ประเภทความเสี่ยง | ความรุนแรง | เงื่อนไข |
|---|---|---|
| เดือนที่เงินติดลบ | high | netBalance < 0 ใน forecast |
| สภาพคล่องไม่พอ | medium | netBalance < 5% ของรายรับ |
| รายจ่ายผิดปกติ | medium | รายการ > 3 เท่าของค่าเฉลี่ย |
| เงินสำรองฉุกเฉินไม่พอ | high/medium | < 3 เท่าของรายจ่าย |
| ภาระหนี้สูง | high/medium | ค่างวด > 35% ของรายรับ |

### 1.5 คำแนะนำแบบมีลำดับ (`get_recommendations`)

วิเคราะห์จาก health score + trends สร้างคำแนะนำที่:
- เรียงตามลำดับความสำคัญ (priority 1-5)
- มีหมวดหมู่: savings, debt, spending, emergency, income, goal
- แต่ละข้อมี: ชื่อ, รายละเอียด, การดำเนินการด่วน (quick action), ผลกระทบที่คาดหวัง
- สรุป Top 3 เรื่องที่ควรทำ

---

## 2. การปรับปรุง System Prompt

**ไฟล์ที่แก้ไข:** `src/lib/ai/client.ts`

**ส่วนที่เพิ่มใหม่:**
- **Financial Health Scoring** — วิธีใช้ `financial_health_score` และอธิบายแต่ละด้าน
- **Goal Planning Workflow** — ขั้นตอนการวางแผนเป้าหมาย: คำนวณ → เทียบ → ชี้ส่วนต่าง → ถามยืนยัน → สร้าง
- **Budget Coaching** — วิธีใช้ `budget_coaching` และแนะนำงบตามหลัก 50/30/20
- **Risk Detection** — เรียก `risk_detection` ก่อนให้คำแนะนำ และแจ้งระดับความรุนแรง
- **Prioritized Recommendations** — เรียก `get_recommendations` ทุกครั้ง นำเสนอ Top 3 + Quick Actions + Expected Impact

**ส่วนที่ปรับปรุง:**
- **Proactive Insights** — ปรับให้ใช้ `risk_detection` และ `get_recommendations` ร่วมด้วย
- **Personalized Recommendations** — ปรับให้เรียงลำดับและมี expected impact

---

## 3. ตัวอย่างการใช้งาน (Usage Examples)

### 3.1 "คะแนนสุขภาพการเงินฉันเท่าไหร่"

```
การตอบสนอง:
- เรียก financial_health_score
- แสดงคะแนน 5 ด้าน พร้อมเกรด
- "คะแนนรวม 68/100 (เกรด C: พอใช้) 
   - อัตราการออม 15/25 ✅ 
   - สัดส่วนรายจ่าย 18/25 ✅ 
   - เงินสำรองฉุกเฉิน 8/20 ⚠️ 
   - ภาระหนี้ 17/20 ✅ 
   - สภาพคล่อง 10/10 ✅
   ด้านที่ควรปรับปรุง: เงินสำรองฉุกเฉิน"
```

### 3.2 "อยากเก็บ 300,000 ใน 24 เดือน"

```
การตอบสนอง:
1. เรียก goal_planning({ targetName: "เที่ยวญี่ปุ่น", targetAmount: 300000, targetMonths: 24 })
2. คำนวณ: ต้องเก็บเดือนละ 12,500 บาท
3. "ปัจจุบันคุณมีเงินเหลือเดือนละ 8,000 บาท
   ยังขาดอีกเดือนละ 4,500 บาท"
4. "ถ้าเก็บเท่าที่เหลืออยู่ตอนนี้ จะใช้เวลา 38 เดือน
   หรือลองลดรายจ่ายลงเดือนละ 2,250 บาท"
5. "ต้องการให้สร้างเป้าหมาย 'เที่ยวญี่ปุ่น' ในระบบไหมครับ"
```

### 3.3 "ความเสี่ยงทางการเงินมีอะไรบ้าง"

```
การตอบสนอง:
- เรียก risk_detection
- แจ้งความเสี่ยงตาม severity
- "พบ 3 รายการความเสี่ยง:
   🔴 สูง: เดือน 2026-11 เงินติดลบ 2,500 บาท
   🟡 กลาง: เงินสำรองฉุกเฉินเพียง 1.2 เท่า (ควรมี 6 เท่า)
   🟡 กลาง: ภาระหนี้ 42% ของรายรับ"
```

### 3.4 "ช่วยแนะนำหน่อย"

```
การตอบสนอง:
1. เรียก get_financial_snapshot, risk_detection, get_recommendations
2. "Top 3 เรื่องที่ควรทำ:
   1. 🔴 สร้างเงินสำรองฉุกเฉิน — ควรมีอย่างน้อย 120,000 บาท
      → Quick: สร้างเป้าหมายออมเงินฉุกเฉิน
      → Impact: ลดความเสี่ยงเมื่อเกิดเหตุฉุกเฉิน
   2. 🟡 ลดภาระหนี้ — ค่างวด 42% ของรายรับ
      → Quick: ตรวจสอบรายการผ่อนและโปะหนี้ดอกเบี้ยสูง
      → Impact: เพิ่มเงินเหลือเดือนละ 3,000 บาท
   3. 🟡 เพิ่มอัตราการออม — ปัจจุบันออม 8% เป้าหมาย 20%
      → Quick: ตั้งเป้าออมอัตโนมัติเดือนละ 4,200 บาท
      → Impact: เพิ่มเงินออมปีละ 50,400 บาท"
```

---

## 4. โครงสร้างข้อมูล (Data Structures)

### HealthScoreResult
```typescript
{
  overall: number      // คะแนนรวม
  maxOverall: number   // คะแนนเต็ม
  grade: 'A'|'B'|'C'|'D'|'F'
  gradeLabel: string   // ภาษาไทย
  components: [{ name, score, maxScore, weight, status, detail }]
  summary: string
}
```

### GoalPlanResult
```typescript
{
  targetName: string
  targetAmount: number
  targetMonths: number
  requiredMonthly: number     // ต้องเก็บต่อเดือน
  currentMonthlySurplus: number // เหลือจริง
  shortfall: number           // ส่วนต่าง
  feasible: boolean
  adjustedMonths: number      // เวลาที่ใช้ถ้าเก็บเท่าที่เหลือ
  recommendations: string[]
}
```

### BudgetCoachingResult
```typescript
{
  month: string
  totalExpense: number
  totalIncome: number
  overspendCategories: [{ category, currentSpending, suggestedBudget, overspendAmount, percentageOver }]
  suggestedTotalBudget: number
  budgetByCategory: [{ category, suggested, current }]
}
```

### RiskDetectionResult
```typescript
{
  risks: [{ type, severity, title, detail, month?, amount? }]
  riskCount: number
  hasHighRisk: boolean
  summary: string
}
```

### RecommendationsResult
```typescript
{
  recommendations: [{ priority, category, title, detail, quickAction, expectedImpact }]
  topPicks: string[]  // Top 3 titles
}
```

---

## 5. การตรวจสอบความถูกต้อง (Validation)

| การตรวจสอบ | ผลลัพธ์ |
|---|---|
| TypeScript compilation (`tsc -b`) | ผ่าน ไม่มี error |
| Vite production build (`vite build`) | ผ่าน |
| Unit tests (`vitest run`) | 13/13 ผ่าน (4 test files) |
| ไม่มีการแก้ไข UI | ตรวจสอบแล้ว (ไม่มีการแก้ไข component, page, หรือ routing) |
| ไม่มีการแก้ไข Firebase | ตรวจสอบแล้ว (ไม่มีการแก้ไข firestore.rules, firebase.json, หรือ DataContext) |

### ไฟล์ที่แก้ไข (เฉพาะ AI logic):
- `src/lib/ai/snapshot.ts` — เพิ่ม 5 ฟังก์ชันหลัก (health, goal, budget, risk, recommendations)
- `src/lib/ai/tools.ts` — เพิ่ม 5 tool definitions
- `src/lib/ai/executeTool.ts` — เพิ่ม 5 handlers
- `src/lib/ai/client.ts` — ปรับปรุง system prompt

### ไฟล์ที่ไม่ได้แก้ไข:
- `src/lib/forecast.ts`, `format.ts`, `types.ts`, `payments.ts`, `goals.ts`
- `src/context/` — ไม่มีการเปลี่ยนแปลง (ยกเว้น cleanup รอบก่อน)
- `src/components/` — ไม่มีการเปลี่ยนแปลง
- `src/pages/` — ไม่มีการเปลี่ยนแปลง
- `ai-proxy/` — ไม่มีการเปลี่ยนแปลง
- การตั้งค่าหรือสถาปัตยกรรม Firebase — ไม่มีการเปลี่ยนแปลง
