import { BarChart3, CalendarRange, CreditCard, HandCoins, LayoutDashboard, LogOut, Menu, ReceiptText, Settings, WalletCards, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
  { to: '/incomes', label: 'รายรับ', icon: HandCoins },
  { to: '/expenses', label: 'รายจ่าย', icon: ReceiptText },
  { to: '/accounts', label: 'บัญชี / บัตร', icon: CreditCard },
  { to: '/installments', label: 'รายการผ่อน', icon: WalletCards },
  { to: '/forecast', label: 'คาดการณ์', icon: CalendarRange },
  { to: '/settings', label: 'ตั้งค่า', icon: Settings },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  return <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
    {open && <button className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setOpen(false)} aria-label="ปิดเมนู"/>}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col bg-[#153827] p-5 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="mb-8 flex items-center justify-between px-2"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#dff574] text-[#173f2b]"><BarChart3 size={22}/></span><div><p className="font-bold">Money MM</p><p className="text-xs text-white/50">วางแผนเงินให้อยู่หมัด</p></div></div><button className="lg:hidden" onClick={() => setOpen(false)}><X/></button></div>
      <nav className="grid gap-1">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white text-[#173f2b]' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}><Icon size={19}/>{label}</NavLink>)}</nav>
      <div className="mt-auto border-t border-white/10 pt-4"><div className="mb-3 flex items-center gap-3 px-2"><img src={user?.photoURL ?? ''} className="size-9 rounded-full bg-white/10" alt=""/><div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.displayName}</p><p className="truncate text-xs text-white/45">{user?.email}</p></div></div><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/65 hover:bg-white/10 hover:text-white"><LogOut size={18}/>ออกจากระบบ</button></div>
    </aside>
    <main className="min-w-0"><header className="sticky top-0 z-20 flex h-16 items-center border-b border-black/5 bg-[#f4f6f1]/90 px-4 backdrop-blur lg:hidden"><button className="rounded-xl bg-white p-2 shadow-sm" onClick={() => setOpen(true)}><Menu/></button><p className="ml-3 font-bold">Money MM</p></header><div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10"><Outlet/></div></main>
  </div>
}
