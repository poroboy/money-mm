# Money MM

แอปวางแผนการเงินส่วนตัวบน Firebase สำหรับติดตามรายรับ รายจ่าย รายการผ่อน และคาดการณ์เงินคงเหลือล่วงหน้า

## Stack

- React 19 + Vite + TypeScript
- Firebase Authentication (Google) + Cloud Firestore
- Firebase Hosting (Spark plan, ไม่มี Cloud Functions/Storage)
- Tailwind CSS + Recharts

## เริ่มใช้งาน

```bash
npm install
cp .env.example .env.local
npm run dev
```

ใส่ Firebase Web SDK config ใน `.env.local` จาก Firebase Console หรือใช้:

```bash
npx firebase apps:sdkconfig WEB <APP_ID> --project money-planner-871b8
```

เปิด Google provider ที่ Firebase Console > Authentication > Sign-in method และสร้าง Firestore database หากยังไม่มี

## ตรวจสอบและ deploy

```bash
npm test
npm run build
npm run deploy
```

ข้อมูลทั้งหมดจัดเก็บใต้ `users/{uid}` และ Firestore rules อนุญาตเฉพาะเจ้าของ uid เท่านั้น
