import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '../lib/api'

interface AuthUser {
  id: string
  name: string
  email: string
}
interface AuthCompany {
  id: string
  name: string
}
interface AuthState {
  user: AuthUser | null
  company: AuthCompany | null
  role: string | null
  features: string[]
  token: string | null
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, company: null, role: null, features: [],
    token: localStorage.getItem('token'),
  })
  const [isLoading, setIsLoading] = useState(!!localStorage.getItem('token'))

  useEffect(() => {
    if (state.token) {
      api.get('/api/auth/me')
        .then(({ data }) => {
          setState(prev => ({ ...prev, user: data.user, company: data.company ?? prev.company, role: data.role, features: data.features ?? [] }))
        })
        .catch(() => logout())
        .finally(() => setIsLoading(false))
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('refreshToken', data.refreshToken)
    setState({ user: data.user, company: data.company, role: data.role, features: data.features ?? [], token: data.token })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setState({ user: null, company: null, role: null, features: [], token: null })
    setIsLoading(false)
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
