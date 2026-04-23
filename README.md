# Vyral AI

Plataforma SaaS para afiliados do TikTok Shop: mineração de produtos virais, geração de conteúdo UGC com IA, Studio de criação de influencers virtuais e ferramentas premium (Boosters).

**Produção:** https://appvyral.online

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS v4
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Edge Functions / Deno)
- **Deploy:** Railway (Dockerfile → nginx static)
- **Pagamentos:** Hotmart (planos vitalícios) + Stripe (créditos avulsos)
- **E-mail transacional:** Resend
- **IA (imagens):** Google Gemini (direto)
- **IA (vídeos):** KIE AI

## Estrutura

```
vyral-ai/
├── src/
│   ├── pages/          # 22 páginas (auth, dashboard, studio, boosters, admin, legal)
│   │   └── admin/      # 9 módulos do painel administrativo
│   ├── components/     # Layout (sidebar, header), auth guards
│   ├── stores/         # Zustand (auth store)
│   ├── lib/            # Supabase client
│   ├── types/          # TypeScript types + constantes de créditos
│   └── assets/         # Logo
├── public/             # manifest.json, sw.js, logo
├── Dockerfile          # Node 20 + serve estático
├── railway.toml        # Build config Railway
└── .env.production     # Config pública do Supabase (anon key)
```

## Scripts

```bash
npm run dev       # Dev server em http://localhost:5173
npm run build     # Build de produção em dist/
npm run lint      # ESLint
```

## Planos (Hotmart)

| Plano | Preço | Créditos | Offer Code |
|-------|-------|----------|------------|
| Starter | R$147 | 600 | `7zmngs50` |
| Creator | R$197 | 900 | `84giouqu` |
| Pro | R$297 | 1.500 | `ui1qxdw1` |

Créditos não expiram. Webhook Hotmart identifica o plano pelo `offer.code` (fallback por preço).

## Pacotes de créditos avulsos (Stripe)

- **Fast** — R$19,90 / 150 créditos
- **Beginner** — R$49,90 / 500 créditos
- **Worker** — R$99,90 / 1.200 créditos
- **Ultra** — R$249,90 / 3.200 créditos
- **Personalizado** — R$14,90 a cada 100 créditos

## Consumo por ferramenta

**Regra:** 1 crédito = R$ 0,05 de custo interno (margem real).

| Ferramenta | Provedor | Créditos |
|-----------|----------|----------|
| Studio IA (imagem UGC) | Gemini | 5 |
| Editar Imagem | Gemini | 5 |
| Nano Banana Pro | Gemini | 5 |
| Avatar Builder | Gemini | 5 |
| Pele Ultra Realista | Gemini | 5 |
| Gerador de Prompt | Gemini | FREE (5/dia) |
| Nano Banana 2 | KIE (flux-kontext) | 15 |
| Sora Remover | KIE | 20 |
| Human Engine | Gemini | 35 |
| Grok IA (vídeo) | KIE | 55 |
| Imitar Movimento | KIE | 55 |
| Kling 3.0 | KIE | 55 |
| Veo 3.1 | KIE | 90 |

## Referral (indicação)

Créditos para o indicador são liberados **após o indicado pagar**:

- Starter indica: ganha 100 créditos
- Creator indica: ganha 200 créditos
- Pro indica: ganha 300 créditos

## Edge Functions (14 ativas)

**Créditos / usuário:**
- `get-user-credits` — retorna plano e saldo
- `admin-add-credits` — ajuste manual (requer role admin)

**IA Gemini:**
- `generate-influencer-image` (5cr)
- `edit-image-inpaint` (5cr)
- `enhance-prompt` (FREE, 5/dia)

**IA KIE (vídeo):**
- `generate-grok-video` (55cr)
- `generate-veo-video` (90cr)
- `generate-motion-video` (55cr)
- `generate-kling3-video` (55cr)
- `sora-watermark-remover` (20cr)
- `generate-nano-banana-2` (15cr)

**Pagamentos:**
- `stripe-checkout` — cria sessão Stripe
- `stripe-webhook` — credita saldo após pagamento
- `hotmart-webhook` — cria/atualiza subscription após compra Hotmart

**Arquitetura:** todas as functions de usuário rodam com `verify_jwt: false` e validam o token internamente via `admin.auth.getUser(token)` — necessário porque o gateway do Supabase não aceitou o algoritmo de assinatura padrão do projeto.

## Banco de dados (18 tabelas)

| Tabela | Propósito |
|--------|-----------|
| `subscriptions` | Planos ativos (email, plan_type, créditos, hotmart_transaction_id) |
| `user_roles` | Papéis (admin, super_admin) |
| `avatars` | 16 influencers virtuais com descrição física detalhada |
| `prompt_templates` | 69 templates de prompt UGC com mídias de preview |
| `products`, `product_videos`, `creators` | Dados virais (populados manualmente pelo admin) |
| `credit_usage_log` | Log de todas as operações com créditos |
| `credit_purchases` | Compras via Stripe |
| `video_generation_queue` | Fila de gerações pendentes/processando |
| `daily_image_usage`, `daily_booster_usage` | Contadores de uso diário |
| `referral_codes`, `referral_conversions` | Sistema de indicação |
| `template_favorites` | Templates favoritados por usuário |
| `notifications`, `notification_views` | Notificações do sistema |
| `blocked_purchase_attempts` | Compras bloqueadas por fraude |

**Segurança:** RLS ativo em todas as tabelas, policies baseadas em `auth.jwt() ->> 'email'` ou `auth.uid()`.

## Secrets necessários no Supabase

| Secret | Status | Descrição |
|--------|--------|-----------|
| `GEMINI_API_KEY` | ✅ configurado | Google AI Studio |
| `KIE_API_KEY` | ✅ configurado | https://kie.ai |
| `STRIPE_WEBHOOK_SECRET` | ✅ configurado | Signing secret do webhook Stripe |
| `STRIPE_SECRET_KEY` | ⚠️ **pendente** | Secret key da conta Stripe (`sk_live_...`) — necessária pra checkout de créditos avulsos |
| `HOTMART_HOTTOK` | opcional | Token de validação do postback Hotmart |

## Webhooks

**Hotmart** — `https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/hotmart-webhook`
- Eventos: `PURCHASE_APPROVED`, `PURCHASE_REFUNDED`, `PURCHASE_CHARGEBACK`, `PURCHASE_CANCELED`, `SUBSCRIPTION_CANCELLATION`
- Versão do postback: 2.0.0
- Mapeamento: offer code primeiro, preço como fallback

**Stripe** — `https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/stripe-webhook`
- Evento: `checkout.session.completed`

## Infraestrutura

- **Supabase project:** `mdueuksfunifyxfqpmdv` (us-east-1)
- **Railway project:** `6e0a63c7-d438-4f40-b461-16d220bae604`
- **Domínio:** appvyral.online (Hostinger → Railway CNAME)
- **Repo:** https://github.com/grupopestana1999-crypto/Vyral-AI

## Operação

**Dados virais:** populados manualmente pelo admin nas tabelas `products`, `product_videos`, `creators` (foco do produto no lançamento é Studio IA + Boosters).

**E-mail transacional:** Resend configurado como SMTP no Supabase Auth. Domínio `appvyral.online` verificado no Resend. Remetente: `suporte@appvyral.online`.

## Empresa

- **Razão social:** PESTANA TREINAMENTO PROFISSIONAL LTDA
- **CNPJ:** 63.675.747/0001-60
- **Sede:** Salvador/BA
- **Suporte/DPO:** Gabriel Pestana Pereira — suporte@appvyral.online
