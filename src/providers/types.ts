import type { JWT } from 'next-auth/jwt'

export interface UserContext {
  userId: string
  credentials: Record<string, unknown>
  // Add other context fields as needed
}

export interface AuthProvider {
  id: string
  name: string
  type: 'oauth' | 'email' | 'credentials'
  // Add other provider fields as needed
}

export interface TokenPayload extends JWT {
  sub: string
  email: string
  // Add other token fields as needed
}