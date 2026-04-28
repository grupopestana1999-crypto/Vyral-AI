import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PING_INTERVAL_MS = 60_000

export function useHeartbeat() {
  useEffect(() => {
    let active = true
    async function ping() {
      if (!active) return
      try { await supabase.rpc('ping_user_activity') } catch (_) {}
    }
    ping()
    const id = setInterval(ping, PING_INTERVAL_MS)
    return () => { active = false; clearInterval(id) }
  }, [])
}
