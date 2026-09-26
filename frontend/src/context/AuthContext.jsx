import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, setToken, clearToken, getToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const bootstrap = useCallback(async () => {
    setLoading(true)
    try {
      if (getToken()) {
        const me = await api.me()
        setUser(me)
      } else {
        const session = await api.createGuestSession()
        setToken(session.access_token)
        setUser({ user_id: session.user_id, name: session.name, is_guest: true })
      }
    } catch {
      // Stale/invalid token — fall back to a fresh guest session
      clearToken()
      const session = await api.createGuestSession()
      setToken(session.access_token)
      setUser({ user_id: session.user_id, name: session.name, is_guest: true })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  const upgrade = async ({ email, password, name }) => {
    const res = await api.signup({ email, password, name })
    setToken(res.access_token)
    setUser({ user_id: res.user_id, name: res.name, is_guest: false })
  }

  const login = async ({ email, password }) => {
    const res = await api.login({ email, password })
    setToken(res.access_token)
    setUser({ user_id: res.user_id, name: res.name, is_guest: false })
  }

  const logout = async () => {
    clearToken()
    setUser(null)
    await bootstrap() // drop back into a fresh guest session, matching the "no signup wall" model
  }

  return (
    <AuthContext.Provider value={{ user, loading, upgrade, login, logout, refresh: bootstrap }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
