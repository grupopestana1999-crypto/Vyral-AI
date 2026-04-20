import { Key, Globe, Mail, CreditCard } from 'lucide-react'

export function AdminSettings() {
  return (
    <div className="max-w-2xl space-y-6">
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
