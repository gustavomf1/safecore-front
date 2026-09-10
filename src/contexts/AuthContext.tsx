import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PerfilUsuario } from '../types'

interface AuthUser {
  id: string
  nome: string
  email: string
  perfil: PerfilUsuario
  token: string
  isAdmin: boolean
}

interface AuthContextData {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (id: string, token: string, refreshToken: string, nome: string, email: string, perfil: PerfilUsuario, isAdmin: boolean) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

/** Decodifica o payload do JWT (sem verificar assinatura — isso é responsabilidade do backend).
 *  O objetivo é impedir que o perfil seja alterado via edição do localStorage. */
function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function loadUserFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem('safecore_user')
    const token = localStorage.getItem('safecore_token')
    if (raw && token) {
      const stored = JSON.parse(raw) as AuthUser
      const claims = decodeTokenPayload(token)
      // Sempre sobrescreve o perfil com o valor vindo do token assinado,
      // ignorando o que estiver salvo no localStorage.
      const perfil = (claims?.perfil as PerfilUsuario) ?? stored.perfil
      return { ...stored, token, perfil, isAdmin: stored.isAdmin ?? false }
    }
  } catch {
    // ignore
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUserFromStorage)
  const queryClient = useQueryClient()

  const login = useCallback((id: string, token: string, refreshToken: string, nome: string, email: string, perfil: PerfilUsuario, isAdmin: boolean) => {
    const authUser: AuthUser = { id, token, nome, email, perfil, isAdmin }
    localStorage.setItem('safecore_token', token)
    localStorage.setItem('safecore_refresh_token', refreshToken)
    localStorage.setItem('safecore_user', JSON.stringify(authUser))
    setUser(authUser)
  }, [])

  const logout = useCallback(() => {
    // Revoga o refresh token no servidor (fire-and-forget).
    const refreshToken = localStorage.getItem('safecore_refresh_token')
    if (refreshToken) {
      const base = (import.meta.env.VITE_API_URL ?? '/api') as string
      fetch(`${base}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        keepalive: true,
      }).catch(() => {})
    }
    localStorage.removeItem('safecore_token')
    localStorage.removeItem('safecore_refresh_token')
    localStorage.removeItem('safecore_user')
    localStorage.removeItem('safecore_empresa')
    localStorage.removeItem('safecore_estabelecimento')
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Separar useAuth exigiria atualizar import em ~25 arquivos pra um ganho só de Fast Refresh
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
