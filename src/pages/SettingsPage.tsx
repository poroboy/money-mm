import { useState } from 'react'
import { Card, Field, PageTitle } from '../components/ui'
import { useData } from '../context/DataContext'
import type { UserSettings } from '../lib/types'

export function SettingsPage() {
  const { settings, saveSettings } = useData()
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)
  const submit = async (event: React.FormEvent) => { event.preventDefault(); await saveSettings(form); setSaved(true); setTimeout(() => setSaved(false), 2500) }
  return <><PageTitle title="ตั้งค่า" detail="ปรับช่วง forecast และรอบเดือนให้เหมาะกับการใช้งาน"/><Card className="max-w-2xl p-6 sm:p-8"><form className="grid gap-5" onSubmit={submit}><Field label="สกุลเงิน"><select className="field" value="THB" disabled><option>THB — บาทไทย</option></select></Field><Field label="จำนวนเดือนที่ต้องการคาดการณ์"><select className="field" value={form.forecastMonths} onChange={(event) => setForm({ ...form, forecastMonths: Number(event.target.value) as UserSettings['forecastMonths'] })}>{[6,12,18,24].map((value) => <option key={value} value={value}>{value} เดือน</option>)}</select></Field><Field label="วันที่เริ่มรอบเดือน"><input className="field" type="number" min="1" max="31" value={form.monthStartDay} onChange={(event) => setForm({ ...form, monthStartDay: Number(event.target.value) })}/></Field><div className="flex items-center gap-3"><button className="btn-primary" type="submit">บันทึกการตั้งค่า</button>{saved && <span className="text-sm text-emerald-700">บันทึกขึ้น Cloud แล้ว</span>}</div></form></Card></>
}
