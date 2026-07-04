import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase'

type AuthValue = {
  user: User | null
  loading: boolean
  configured: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => onAuthStateChanged(auth, (nextUser) => { setUser(nextUser); setLoading(false) }), [])

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    configured: isFirebaseConfigured,
    login: async () => { await signInWithPopup(auth, googleProvider) },
    logout: async () => { await signOut(auth) },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
