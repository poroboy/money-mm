import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Account, Expense, Income, Installment, UserSettings } from '../lib/types'
import { useAuth } from './AuthContext'

type CollectionName = 'incomes' | 'expenses' | 'accounts' | 'installments'
type AnyEntity = Income | Expense | Account | Installment
type EntityPayload = Omit<AnyEntity, 'id' | 'createdAt' | 'updatedAt'>

type DataValue = {
  incomes: Income[]
  expenses: Expense[]
  accounts: Account[]
  installments: Installment[]
  settings: UserSettings
  loading: boolean
  error: string
  save: (name: CollectionName, payload: EntityPayload, id?: string) => Promise<void>
  remove: (name: CollectionName, id: string) => Promise<void>
  saveSettings: (settings: Pick<UserSettings, 'currency' | 'forecastMonths' | 'monthStartDay'>) => Promise<void>
}

const defaults: UserSettings = { currency: 'THB', forecastMonths: 12, monthStartDay: 1 }
const DataContext = createContext<DataValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [incomes, setIncomes] = useState<Income[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [installments, setInstallments] = useState<Installment[]>([])
  const [settings, setSettings] = useState<UserSettings>(defaults)
  const [pending, setPending] = useState(5)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    setPending(5)
    setError('')
    const root = ['users', user.uid] as const
    const subscribe = <T extends AnyEntity>(name: CollectionName, setter: (items: T[]) => void) =>
      onSnapshot(collection(db, ...root, name), (snapshot) => {
        setter(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T))
        setPending((value) => Math.max(0, value - 1))
      }, (reason) => { setError(reason.message); setPending(0) })

    const stops = [
      subscribe<Income>('incomes', setIncomes),
      subscribe<Expense>('expenses', setExpenses),
      subscribe<Account>('accounts', setAccounts),
      subscribe<Installment>('installments', setInstallments),
    ]
    const settingsRef = doc(db, ...root, 'settings', 'main')
    getDoc(settingsRef).then(async (snapshot) => {
      if (snapshot.exists()) setSettings(snapshot.data() as UserSettings)
      else await setDoc(settingsRef, { ...defaults, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      setPending((value) => Math.max(0, value - 1))
    }).catch((reason: Error) => { setError(reason.message); setPending(0) })
    stops.push(onSnapshot(settingsRef, (snapshot) => { if (snapshot.exists()) setSettings(snapshot.data() as UserSettings) }))
    return () => stops.forEach((stop) => stop())
  }, [user])

  const value = useMemo<DataValue>(() => ({
    incomes, expenses, accounts, installments, settings, loading: pending > 0, error,
    save: async (name, payload, id) => {
      if (!user) return
      const path = collection(db, 'users', user.uid, name)
      if (id) await updateDoc(doc(path, id), { ...payload, updatedAt: serverTimestamp() })
      else await addDoc(path, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    },
    remove: async (name, id) => {
      if (!user) return
      await deleteDoc(doc(db, 'users', user.uid, name, id))
    },
    saveSettings: async (next) => {
      if (!user) return
      await setDoc(doc(db, 'users', user.uid, 'settings', 'main'), { ...next, updatedAt: serverTimestamp() }, { merge: true })
    },
  }), [incomes, expenses, accounts, installments, settings, pending, error, user])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const value = useContext(DataContext)
  if (!value) throw new Error('useData must be used inside DataProvider')
  return value
}
