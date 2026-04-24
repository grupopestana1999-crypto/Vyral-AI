import { useState } from 'react'
import { Key, Globe, Mail, CreditCard, Upload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
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

export function AdminSettings() {
  return (
    <div className="max-w-2xl space-y-6">
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
