import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { DataProvider } from './context/DataContext'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForecastPage } from './pages/ForecastPage'
import { SettingsPage } from './pages/SettingsPage'
import { AccountsPage, ExpensesPage, IncomesPage, InstallmentsPage } from './pages/CrudPages'

function ProtectedApp() {
  const { user, loading } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">กำลังตรวจสอบการเข้าสู่ระบบ…</div>
  if (!user) return <Navigate to="/login" replace />
  return <DataProvider><AppShell /></DataProvider>
}

export default function App() {
  const { user } = useAuth()
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
    <Route element={<ProtectedApp />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/incomes" element={<IncomesPage />} />
      <Route path="/expenses" element={<ExpensesPage />} />
      <Route path="/accounts" element={<AccountsPage />} />
      <Route path="/installments" element={<InstallmentsPage />} />
      <Route path="/forecast" element={<ForecastPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
  </Routes>
}
