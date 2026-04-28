import { useState, useEffect } from 'react'
import { Key, Globe, Mail, CreditCard, Upload, Loader2, CheckCircle2, AlertTriangle, Coins, Save, DollarSign } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

type TableName = 'avatars' | 'products' | 'product_videos' | 'prompt_templates'
interface MigrationStatus { done: number; failed: number; running: boolean; cursor: string | null }
const TABLES: TableName[] = ['avatars', 'products', 'product_videos', 'prompt_templates']
const LABELS: Record<TableName, string> = {
  avatars: 'Avatares',
  products: 'Produtos',
  product_videos: 'Vídeos virais',
  prompt_templates: 'Templates',
}

function MediaMigrationCard() {
  const [status, setStatus] = useState<Record<TableName, MigrationStatus>>({
    avatars: { done: 0, failed: 0, running: false, cursor: null },
    products: { done: 0, failed: 0, running: false, cursor: null },
    product_videos: { done: 0, failed: 0, running: false, cursor: null },
    prompt_templates: { done: 0, failed: 0, running: false, cursor: null },
  })
  const [running, setRunning] = useState(false)
  const [failedDetails, setFailedDetails] = useState<{ table: TableName; id: string; reason: string }[]>([])

  async function runMigration() {
    setRunning(true)
    setFailedDetails([])
    for (const table of TABLES) {
      setStatus(s => ({ ...s, [table]: { ...s[table], running: true } }))
      let cursor: string | null = null
      let done = 0
      let failed = 0
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase.functions.invoke('migrate-external-media', {
          body: { table, cursor, limit: 10 },
        })
        if (error) {
          toast.error(`Erro ao migrar ${LABELS[table]}: ${error.message}`)
          break
        }
        const result = data as { migrated: number; failed: { id: string; reason: string }[]; nextCursor: string | null }
        done += result.migrated
        failed += result.failed.length
        if (result.failed.length > 0) {
          setFailedDetails(prev => [...prev, ...result.failed.map(f => ({ table, ...f }))])
        }
        cursor = result.nextCursor
        setStatus(s => ({ ...s, [table]: { ...s[table], done, failed, cursor } }))
        if (!cursor) break
      }
      setStatus(s => ({ ...s, [table]: { ...s[table], running: false } }))
    }
    setRunning(false)
    toast.success('Migração concluída. Confira o relatório abaixo.')
  }

  return (
    <div className="bg-surface-300 border border-white/5 rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Upload size={16} className="text-primary-400" /> Migração de mídias externas
          </h3>
          <p className="text-xs text-white/50 mt-1">
            Copia imagens e vídeos hospedados em CDNs externos (iaTikShop / manuscdn) pro nosso Storage próprio.
            Processo é idempotente — pode rodar várias vezes sem duplicar.
          </p>
        </div>
        <button
          onClick={runMigration}
          disabled={running}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer whitespace-nowrap"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {running ? 'Migrando...' : 'Migrar agora'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TABLES.map(t => {
          const s = status[t]
          return (
            <div key={t} className="p-3 bg-surface-400 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white">{LABELS[t]}</p>
                <p className="text-[10px] text-white/40">
                  {s.done} migrados
                  {s.failed > 0 && <span className="text-red-400"> · {s.failed} falhas</span>}
                </p>
              </div>
              {s.running ? <Loader2 size={14} className="animate-spin text-primary-400" />
                : s.done > 0 ? <CheckCircle2 size={14} className="text-green-400" />
                : <div className="w-3.5 h-3.5 rounded-full bg-white/10" />}
            </div>
          )
        })}
      </div>
      {failedDetails.length > 0 && (
        <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
          <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mb-2">
            <AlertTriangle size={12} /> {failedDetails.length} items falharam
          </p>
          <ul className="text-[10px] text-white/40 space-y-0.5 max-h-32 overflow-y-auto font-mono">
            {failedDetails.slice(0, 20).map((f, i) => (
              <li key={i}>{f.table}/{f.id}: {f.reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface AppSetting { key: string; value: unknown }

function PricingCard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [creditPrice, setCreditPrice] = useState('')
  const [planCredits, setPlanCredits] = useState({ starter: '', creator: '', pro: '' })
  const [planPrices, setPlanPrices] = useState({ starter: '', creator: '', pro: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('app_settings').select('*')
    const map: Record<string, unknown> = {}
    ;(data ?? []).forEach((r: AppSetting) => { map[r.key] = r.value })
    setCreditPrice(String(map.credit_brl_price ?? '0.05'))
    const pc = (map.plan_credits ?? {}) as { starter?: number; creator?: number; pro?: number }
    setPlanCredits({ starter: String(pc.starter ?? 250), creator: String(pc.creator ?? 750), pro: String(pc.pro ?? 2000) })
    const pp = (map.plan_prices ?? {}) as { starter?: number; creator?: number; pro?: number }
    setPlanPrices({ starter: String(pp.starter ?? 47), creator: String(pp.creator ?? 97), pro: String(pp.pro ?? 197) })
    setLoading(false)
  }

  async function save(key: string, value: unknown) {
    setSaving(key)
    const { error } = await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    setSaving(null)
    if (error) toast.error('Erro: ' + error.message)
    else { toast.success('Salvo'); load() }
  }

  if (loading) return <div className="bg-surface-300 border border-white/5 rounded-xl p-6 h-40 animate-pulse" />

  return (
    <div className="bg-surface-300 border border-white/5 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2"><DollarSign size={16} className="text-primary-400" /> Preços e Créditos</h3>

      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-surface-400 rounded-lg">
          <Coins size={14} className="text-neon shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-white/70">Valor do crédito avulso (R$)</p>
            <p className="text-[10px] text-white/30">Usado pra calcular receita estimada no dashboard</p>
          </div>
          <input type="number" step="0.01" value={creditPrice} onChange={e => setCreditPrice(e.target.value)}
            className="w-20 px-2 py-1 bg-surface-300 border border-white/10 rounded text-white text-sm text-right focus:outline-none focus:border-primary-500" />
          <button onClick={() => save('credit_brl_price', Number(creditPrice))} disabled={saving === 'credit_brl_price'}
            className="px-2 py-1 rounded bg-primary-600 text-white text-xs cursor-pointer disabled:opacity-50">
            {saving === 'credit_brl_price' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          </button>
        </div>

        <div className="p-3 bg-surface-400 rounded-lg space-y-2">
          <p className="text-xs text-white/70 mb-2">Créditos por plano</p>
          {(['starter','creator','pro'] as const).map(p => (
            <div key={p} className="flex items-center gap-2">
              <span className="w-16 text-xs uppercase text-white/60">{p}</span>
              <input type="number" value={planCredits[p]} onChange={e => setPlanCredits(prev => ({ ...prev, [p]: e.target.value }))}
                className="flex-1 px-2 py-1 bg-surface-300 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-primary-500" />
              <span className="text-[10px] text-white/40">cr</span>
            </div>
          ))}
          <button onClick={() => save('plan_credits', { starter: Number(planCredits.starter), creator: Number(planCredits.creator), pro: Number(planCredits.pro) })}
            disabled={saving === 'plan_credits'}
            className="w-full px-2 py-1.5 rounded bg-primary-600 text-white text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1">
            {saving === 'plan_credits' ? <Loader2 size={12} className="animate-spin" /> : <><Save size={12} /> Salvar créditos por plano</>}
          </button>
        </div>

        <div className="p-3 bg-surface-400 rounded-lg space-y-2">
          <p className="text-xs text-white/70 mb-2">Preço dos planos (R$/mês)</p>
          {(['starter','creator','pro'] as const).map(p => (
            <div key={p} className="flex items-center gap-2">
              <span className="w-16 text-xs uppercase text-white/60">{p}</span>
              <input type="number" step="0.01" value={planPrices[p]} onChange={e => setPlanPrices(prev => ({ ...prev, [p]: e.target.value }))}
                className="flex-1 px-2 py-1 bg-surface-300 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-primary-500" />
              <span className="text-[10px] text-white/40">R$</span>
            </div>
          ))}
          <button onClick={() => save('plan_prices', { starter: Number(planPrices.starter), creator: Number(planPrices.creator), pro: Number(planPrices.pro) })}
            disabled={saving === 'plan_prices'}
            className="w-full px-2 py-1.5 rounded bg-primary-600 text-white text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1">
            {saving === 'plan_prices' ? <Loader2 size={12} className="animate-spin" /> : <><Save size={12} /> Salvar preços</>}
          </button>
        </div>
      </div>
      <p className="text-[10px] text-white/30">Boosters por plano: todos planos têm acesso a todos boosters. A diferença é só a quantidade de créditos. Configure boosters individuais em <code className="text-primary-400">/admin/boosters</code>.</p>
    </div>
  )
}

function ApiHealthCard() {
  const apis = [
    { name: 'Kie AI', env: 'KIE_API_KEY', desc: 'Veo, Kling, Sora, Motion, Skin, Voice, Transcribe' },
    { name: 'Gemini', env: 'GEMINI_API_KEY', desc: 'Gerador de prompts, Influencer Lab' },
    { name: 'Resend', env: 'RESEND_API_KEY', desc: 'Emails transacionais (welcome, recovery)' },
    { name: 'Hotmart', env: 'HOTMART_WEBHOOK_TOKEN', desc: 'Validação de webhook' },
  ]
  return (
    <div className="bg-surface-300 border border-white/5 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2"><CheckCircle2 size={16} className="text-primary-400" /> Status das APIs</h3>
      <div className="space-y-2">
        {apis.map(a => (
          <div key={a.env} className="flex items-center justify-between p-3 bg-surface-400 rounded-lg">
            <div>
              <p className="text-sm text-white">{a.name}</p>
              <p className="text-[10px] text-white/30">{a.desc}</p>
            </div>
            <code className="text-[10px] text-white/30 font-mono">{a.env}</code>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-white/30">Configure as chaves no Supabase: Settings &gt; Edge Functions &gt; Secrets</p>
    </div>
  )
}

export function AdminSettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <PricingCard />
      <ApiHealthCard />
      <MediaMigrationCard />
      <div className="bg-surface-300 border border-white/5 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Key size={16} className="text-primary-400" /> Chaves de API</h3>
        <div className="space-y-3">
          {[
            { label: 'Gemini API Key', env: 'GEMINI_API_KEY', desc: 'Google AI Studio - geração de imagens e prompts' },
            { label: 'Stripe Secret Key', env: 'STRIPE_SECRET_KEY', desc: 'Pagamentos de créditos avulsos' },
            { label: 'Stripe Webhook Secret', env: 'STRIPE_WEBHOOK_SECRET', desc: 'Verificação de webhooks Stripe' },
          ].map(item => (
            <div key={item.env} className="flex items-center justify-between p-3 bg-surface-400 rounded-lg">
              <div>
                <p className="text-sm text-white">{item.label}</p>
                <p className="text-[10px] text-white/30">{item.desc}</p>
              </div>
              <code className="text-xs text-white/20 font-mono">{item.env}</code>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/30">Configure as chaves no painel do Supabase: Settings &gt; Edge Functions &gt; Secrets</p>
      </div>

      <div className="bg-surface-300 border border-white/5 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Globe size={16} className="text-primary-400" /> Domínio</h3>
        <div className="p-3 bg-surface-400 rounded-lg">
          <p className="text-sm text-white">appvyral.online</p>
          <p className="text-[10px] text-white/30">Configurar DNS na Hostinger apontando para Railway</p>
        </div>
      </div>

      <div className="bg-surface-300 border border-white/5 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Mail size={16} className="text-primary-400" /> E-mail Transacional</h3>
        <div className="p-3 bg-surface-400 rounded-lg">
          <p className="text-sm text-white">Resend</p>
          <p className="text-[10px] text-white/30">Configurar no Supabase: Authentication &gt; Email Templates</p>
        </div>
      </div>

      <div className="bg-surface-300 border border-white/5 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2"><CreditCard size={16} className="text-primary-400" /> Webhooks</h3>
        <div className="space-y-2">
          <div className="p-3 bg-surface-400 rounded-lg">
            <p className="text-sm text-white">Stripe Webhook</p>
            <code className="text-[10px] text-primary-400 font-mono block mt-1">https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/stripe-webhook</code>
          </div>
          <div className="p-3 bg-surface-400 rounded-lg">
            <p className="text-sm text-white">Hotmart Webhook</p>
            <p className="text-[10px] text-white/30">Configurar quando webhook Hotmart for criado</p>
          </div>
        </div>
      </div>
    </div>
  )
}
