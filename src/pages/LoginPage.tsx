import { BarChart3, Cloud, LockKeyhole, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login, configured } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const handleLogin = async () => {
    setBusy(true); setError('')
    try { await login() } catch (reason) { setError(reason instanceof Error ? reason.message : 'เข้าสู่ระบบไม่สำเร็จ') } finally { setBusy(false) }
  }
  return <div className="grid min-h-screen bg-[#edf1e9] p-4 lg:grid-cols-2 lg:p-6">
    <section className="relative hidden overflow-hidden rounded-[2rem] bg-[#163b29] p-12 text-white lg:flex lg:flex-col">
      <div className="absolute -right-24 -top-24 size-80 rounded-full bg-[#dff574]/20 blur-2xl"/><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#dff574] text-[#173f2b]"><BarChart3/></span><span className="text-xl font-bold">Money MM</span></div>
      <div className="my-auto max-w-lg"><span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-[#dff574]"><Sparkles size={15}/>Personal finance, without the noise</span><h1 className="text-5xl font-bold leading-[1.08]">เห็นเงินวันนี้<br/>ก่อนใช้เงินของพรุ่งนี้</h1><p className="mt-6 max-w-md text-lg leading-relaxed text-white/60">รวมรายรับ รายจ่าย และยอดผ่อน แล้วคาดการณ์เงินคงเหลือล่วงหน้าในหน้าจอเดียว</p></div>
      <div className="grid grid-cols-2 gap-4"><div className="rounded-2xl bg-white/8 p-4"><Cloud className="mb-3 text-[#dff574]"/><p className="font-semibold">อยู่บน Cloud</p><p className="mt-1 text-sm text-white/50">เปิดเครื่องไหนก็เจอข้อมูลเดิม</p></div><div className="rounded-2xl bg-white/8 p-4"><LockKeyhole className="mb-3 text-[#dff574]"/><p className="font-semibold">เป็นของคุณคนเดียว</p><p className="mt-1 text-sm text-white/50">แยกข้อมูลด้วย Firebase Auth</p></div></div>
    </section>
    <section className="grid place-items-center p-4"><div className="w-full max-w-md"><div className="mb-10 flex items-center gap-3 lg:hidden"><span className="grid size-11 place-items-center rounded-2xl bg-[#173f2b] text-[#dff574]"><BarChart3/></span><span className="text-xl font-bold">Money MM</span></div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">ยินดีต้อนรับ</p><h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">เริ่มวางแผนเงินกัน</h2><p className="mt-3 text-slate-500">เข้าสู่ระบบด้วย Google Account ส่วนตัวของคุณ</p>
      <button disabled={busy || !configured} onClick={handleLogin} className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"><span className="text-xl font-bold text-blue-600">G</span>{busy ? 'กำลังเข้าสู่ระบบ…' : 'ดำเนินการต่อด้วย Google'}</button>
      {!configured && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">ยังไม่ได้ตั้งค่า Firebase กรุณาสร้างไฟล์ <code>.env.local</code> จาก <code>.env.example</code></p>}{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<p className="mt-8 text-center text-xs leading-relaxed text-slate-400">ข้อมูลการเงินจัดเก็บใน Cloud Firestore ของบัญชีคุณ<br/>ไม่มี backend หรือระบบวิเคราะห์ภายนอก</p></div></section>
  </div>
}
