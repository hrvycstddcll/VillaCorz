import { createContext } from 'react'
import type { User } from './types'

export type AuthContextType = {
    user: User | null
    loading: boolean
    refreshUser: () => Promise<void>
    setUser: (user: User | null) => void
    logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
