import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserRole, Subscription } from '../types/database'

interface AuthState {
  user: User | null
  session: Session | null
  role: UserRole
  subscription: Subscription | null
  isLoading: boolean
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: 'user',
  subscription: null,
  isLoading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const role = await fetchUserRole(session.user.id)
      const subscription = await fetchSubscription(session.user.email!)
      set({ user: session.user, session, role, subscription, isLoading: false })
    } else {
      set({ isLoading: false })
    }

    supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
      if (session?.user) {
        const role = await fetchUserRole(session.user.id)
        const subscription = await fetchSubscription(session.user.email!)
        set({ user: session.user, session, role, subscription })
      } else {
        set({ user: null, session: null, role: 'user', subscription: null })
      }
    })
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  },

  signUp: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, role: 'user', subscription: null })
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) return { error: error.message }
    return { error: null }
  },
}))

async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle()
  if (data?.role === 'admin') return 'admin'
  return 'user'
}

async function fetchSubscription(email: string): Promise<Subscription | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('customer_email', email)
    .in('status', ['active', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}
