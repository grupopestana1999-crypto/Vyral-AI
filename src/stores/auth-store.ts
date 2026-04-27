import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import type { RealtimeChannel } from '@supabase/supabase-js'
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
  setCreditsRemaining: (n: number) => void
}

let subscriptionChannel: RealtimeChannel | null = null

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
      subscribeToSubscriptionChanges(session.user.email!, set)
    } else {
      set({ isLoading: false })
    }

    supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
      if (session?.user) {
        const role = await fetchUserRole(session.user.id)
        const subscription = await fetchSubscription(session.user.email!)
        set({ user: session.user, session, role, subscription })
        subscribeToSubscriptionChanges(session.user.email!, set)
      } else {
        unsubscribeFromSubscriptionChanges()
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
    unsubscribeFromSubscriptionChanges()
    await supabase.auth.signOut()
    set({ user: null, session: null, role: 'user', subscription: null })
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) return { error: error.message }
    return { error: null }
  },

  setCreditsRemaining: (n: number) => set(state => ({
    subscription: state.subscription ? { ...state.subscription, credits_remaining: n } : null
  })),
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

function subscribeToSubscriptionChanges(email: string, set: (partial: Partial<AuthState>) => void) {
  unsubscribeFromSubscriptionChanges()
  const normalized = email.toLowerCase()
  subscriptionChannel = supabase
    .channel(`subscription-${normalized}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'subscriptions', filter: `customer_email=eq.${normalized}` },
      (payload) => {
        const next = payload.new as Subscription
        if (next && (next.status === 'active' || next.status === 'approved')) {
          set({ subscription: next })
        }
      }
    )
    .subscribe()
}

function unsubscribeFromSubscriptionChanges() {
  if (subscriptionChannel) {
    supabase.removeChannel(subscriptionChannel)
    subscriptionChannel = null
  }
}
