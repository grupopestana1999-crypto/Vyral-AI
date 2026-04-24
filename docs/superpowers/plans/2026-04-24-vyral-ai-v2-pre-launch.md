# Vyral AI v2 — Pre-launch Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development` (if subagents available) or `superpowers:executing-plans` to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver os 6 pontos reportados pelo cliente e entregar o app pronto pra lançar no sábado 2026-04-26: performance fixada, dados virais aparecendo, 3 boosters funcionais + 10 cadeados, Calculadora reorganizada, Prompt Generator no Studio, e sistema de referral Hotmart.

**Architecture:** Frontend Vite/React/TS + Tailwind v4 + Supabase (PostgreSQL + Auth + Storage + Edge Functions Deno). Deploy automático via Railway no push. Testes de integração via Playwright MCP + queries SQL via Supabase MCP.

**Tech Stack:** React 19, Tailwind CSS v4, Supabase JS client v2, lucide-react, sonner (toasts), react-router-dom v6. Nova dep: `@xyflow/react` (node graph do Influencer Lab).

**Spec base:** [`../specs/2026-04-24-vyral-ai-v2-pre-launch-design.md`](../specs/2026-04-24-vyral-ai-v2-pre-launch-design.md)

**Credenciais de teste em prod:** `suporte@appvyral.online` / `VyralAI56447!`. Supabase project id: `mdueuksfunifyxfqpmdv`.

---

## File Structure

### Arquivos novos

| Path | Responsabilidade |
|---|---|
| `src/components/LazyVideo.tsx` | `<video>` com IntersectionObserver (pause fora do viewport + preload none) |
| `src/pages/EditImagePage.tsx` | Booster Editar Imagem em layout 2 colunas com slider before/after |
| `src/pages/InfluencerLabPage.tsx` | Booster Influencer Lab com node graph XYFlow |
| `src/components/influencer-lab/Sidebar.tsx` | Barra lateral de nodes arrastáveis |
| `src/components/influencer-lab/nodes/ProductNode.tsx` | Node de seleção de produto viral |
| `src/components/influencer-lab/nodes/AvatarNode.tsx` | Node de seleção de avatar |
| `src/components/influencer-lab/nodes/SceneNode.tsx` | Node de cenário |
| `src/components/influencer-lab/nodes/SettingsNode.tsx` | Node de ajustes (pose/estilo/melhorias/formato) |
| `src/components/influencer-lab/nodes/GenerateNode.tsx` | Node terminal "Executar workflow" |
| `src/types/lab.ts` | Tipos do grafo (NodeData, EdgeData, WorkflowPayload) |
| `src/components/studio/PromptGeneratorPanel.tsx` | Painel pós-imagem no Studio com enhance-prompt |
| `src/components/BeforeAfterSlider.tsx` | Slider simples com clip-path reutilizável |
| `supabase/functions/migrate-external-media/index.ts` | Edge function one-shot pra copiar mídias do CDN externo |

### Arquivos a modificar

| Path | O que muda |
|---|---|
| `src/pages/ViralVideosPage.tsx` | LEFT JOIN ao invés de `!inner` + fallbacks de render |
| `src/pages/ViralProductsPage.tsx` | Trocar `<video>`/`<img>` por componentes lazy |
| `src/pages/ViralCreatorsPage.tsx` | Trocar `<img>` por lazy |
| `src/pages/TemplatesPage.tsx` | Usar `<LazyVideo>` ao invés do custom inline |
| `src/pages/StudioPage.tsx` | Renderizar `PromptGeneratorPanel` após geração |
| `src/pages/BoostersPage.tsx` | Aplicar overlay de lock nos cards com `locked: true` + badge `Em breve` / `Disponível agora` |
| `src/pages/BoosterDetailPage.tsx` | Ler `?prompt=` da URL, usar `emptyStateText`, bloquear acesso a locked |
| `src/pages/CalculatorPage.tsx` | Reorganizar em grid 3 colunas (Configure / Resumo / Projeções) |
| `src/pages/AuthPage.tsx` | Capturar `?ref=` da URL + salvar em localStorage + registro em `referrals_pending` |
| `src/pages/CreditsPage.tsx` | Anexar `sck={ref}` no checkout Hotmart |
| `src/pages/admin/AdminSettings.tsx` | Botão "Migrar mídias externas" chamando edge function |
| `src/types/boosters.ts` | Adicionar `locked?: boolean` + `emptyStateText?: string`; marcar 10 locked; reordenar inputs do `grok` |
| `src/App.tsx` | Registrar rotas `/booster/edit-image` + `/booster/influencer-lab` antes da genérica |
| `supabase/functions/hotmart-webhook/index.ts` | Handler de referral (extrai sck com prioridade, credita referidor) |
| `supabase/functions/enhance-prompt/index.ts` | Aceitar `duration` e `style` opcionais no payload |

### Migrations SQL

| Path | O que faz |
|---|---|
| Applied via `mcp__supabase__apply_migration` name=`link_videos_to_products` | UPDATE product_videos SET product_id baseado em similarity com products.name |
| Applied via `mcp__supabase__apply_migration` name=`create_public_media_bucket` | INSERT INTO storage.buckets + RLS policies |
| Applied via `mcp__supabase__apply_migration` name=`create_referrals_pending` | CREATE TABLE referrals_pending |

---

## Chunk 1: Bloco A — Fix de dados + LazyVideo

### Task A1: LazyVideo component

**Files:**
- Create: `src/components/LazyVideo.tsx`

- [ ] **Step 1: Ler o código inline de auto-play em uso hoje pra entender o padrão**

Run: inspecionar `src/pages/BoostersPage.tsx` linhas 7-22 (componente `BoosterVideo`). É o padrão existente usando IntersectionObserver. Padronizar este comportamento.

- [ ] **Step 2: Criar `src/components/LazyVideo.tsx` com o componente genérico**

```tsx
import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'

interface LazyVideoProps {
  src: string
  className?: string
  poster?: string
  fallbackIcon?: React.ReactNode
}

export function LazyVideo({ src, className = '', poster, fallbackIcon }: LazyVideoProps) {
  const ref = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          el.play().catch(() => {})
        } else {
          el.pause()
        }
      }),
      { threshold: 0.1 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (err) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-primary-900/40 to-accent-900/40 ${className}`}>
        {fallbackIcon ?? <Play size={28} className="text-white/30" />}
      </div>
    )
  }

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      className={className}
      muted
      loop
      playsInline
      preload="none"
      onError={() => setErr(true)}
    />
  )
}
```

- [ ] **Step 3: `npm run build` pra confirmar sem erros**

Run: `cd "c:/Users/GouveiaRx/Downloads/Vyral IA/vyral-ai" && npm run build 2>&1 | tail -5`
Expected: `built in ...ms` sem errors.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/GouveiaRx/Downloads/Vyral IA/vyral-ai"
git add src/components/LazyVideo.tsx
git commit -m "feat: add LazyVideo component with IntersectionObserver"
```

### Task A2: Fix ViralVideosPage — LEFT JOIN + fallbacks

**Files:**
- Modify: `src/pages/ViralVideosPage.tsx`

- [ ] **Step 1: Ler `src/pages/ViralVideosPage.tsx` inteiro pra mapear a query e o render atual**

- [ ] **Step 2: Trocar `products!inner(...)` por `products(...)` no `.select()` da query**

Na linha do `.from('product_videos').select(...)`: remover o `!inner` do join. Manter os campos selecionados.

- [ ] **Step 3: Ajustar o render pra tolerar `video.products === null`**

Onde aparece `video.products.name` ou `video.products.category`, usar: `video.products?.name ?? video.creator_name ?? 'Criador'` e `video.products?.category ?? 'Geral'`.

- [ ] **Step 4: Trocar `<video>` inline por `<LazyVideo>`**

Import: `import { LazyVideo } from '../components/LazyVideo'`
Substituir `<video src={video.video_url} ... />` por `<LazyVideo src={video.video_url} className="..." />`.

- [ ] **Step 5: `npm run build`**

Expected: 0 erros TS.

- [ ] **Step 6: Validar via Playwright em produção (após push)**

Usar `mcp__playwright__browser_navigate` em `https://appvyral.online/viral-videos`. `mcp__playwright__browser_evaluate` com `() => document.querySelectorAll('main [class*="aspect"]').length` → deve ser ≥ 50.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ViralVideosPage.tsx
git commit -m "fix: ViralVideosPage uses LEFT JOIN + LazyVideo + null-safe fallbacks"
```

### Task A3: Migration SQL pra linkar product_videos aos produtos

**Files:**
- Apply via `mcp__supabase__apply_migration` name=`link_videos_to_products`

- [ ] **Step 1: Primeiro confirmar quantos rows podem ser linkados via trigram**

Run: `mcp__supabase__execute_sql` com:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

SELECT COUNT(*) as matchable FROM product_videos pv
WHERE EXISTS (
  SELECT 1 FROM products p
  WHERE similarity(pv.title, p.name) > 0.3
     OR pv.title ILIKE '%' || split_part(p.name, ' ', 1) || '%'
);
```

Record count. Se > 30 dos 51, bom.

- [ ] **Step 2: Aplicar migration que atualiza product_id**

Run: `mcp__supabase__apply_migration` name=`link_videos_to_products`, query:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

UPDATE product_videos pv
SET product_id = (
  SELECT p.id FROM products p
  WHERE similarity(pv.title, p.name) > 0.25
     OR pv.title ILIKE '%' || split_part(p.name, ' ', 1) || '%'
  ORDER BY similarity(pv.title, p.name) DESC
  LIMIT 1
)
WHERE pv.product_id IS NULL;
```

- [ ] **Step 3: Verificar resultado**

Run: `mcp__supabase__execute_sql`:

```sql
SELECT COUNT(*) as total, COUNT(product_id) as with_product FROM product_videos;
```

Expected: `total = 51`, `with_product ≥ 30`. Os que não linkaram ficam NULL e são tolerados pelo LEFT JOIN da Task A2.

### Task A4: Usar LazyVideo nas páginas de viral feed

**Files:**
- Modify: `src/pages/ViralProductsPage.tsx`
- Modify: `src/pages/ViralCreatorsPage.tsx`
- Modify: `src/pages/TemplatesPage.tsx`
- Modify: `src/pages/BoostersPage.tsx` (extrair o `BoosterVideo` inline que duplica o padrão)

- [ ] **Step 1: `ViralProductsPage.tsx` — substituir `<img>` inline por versão lazy-load**

Adicionar atributo `loading="lazy"` em cada `<img>` do grid de produtos.

- [ ] **Step 2: `ViralCreatorsPage.tsx` — idem**

- [ ] **Step 3: `TemplatesPage.tsx` — trocar o componente `TemplateMedia` custom pelo `<LazyVideo>`**

Substituir toda a definição interna de `TemplateMedia` pelo import de `LazyVideo`. Se `TemplateMedia` tem lógica extra (fallback pra thumbnail em caso de erro), adicionar essa lógica via prop `fallbackIcon` ou herdar no próprio `<LazyVideo>`.

- [ ] **Step 4: `BoostersPage.tsx` — trocar `BoosterVideo` inline por `<LazyVideo>`**

Remover função `BoosterVideo` local (linhas 7-22). Substituir usos por `<LazyVideo src={b.videoUrl} className="w-full h-full object-cover" />`.

- [ ] **Step 5: `npm run build`**

Expected: 0 erros.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ViralProductsPage.tsx src/pages/ViralCreatorsPage.tsx src/pages/TemplatesPage.tsx src/pages/BoostersPage.tsx
git commit -m "refactor: use LazyVideo across viral feeds and boosters"
```

### Task A5: Push + Playwright end-to-end do Bloco A

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Aguardar Railway deploy (~90s)**

Run: `curl -sI https://appvyral.online | head -1`
Espera: `HTTP/1.1 200`.

- [ ] **Step 3: Playwright — login + `/viral-videos`**

Via `mcp__playwright__browser_navigate` em `/auth` → click Entrar (credenciais pré-preenchidas) → aguardar redirect pra `/dashboard`.

Depois navegar em `/viral-videos`.

- [ ] **Step 4: Contar vídeos renderizados**

`mcp__playwright__browser_evaluate`:
```js
() => ({
  cards: document.querySelectorAll('main [class*="aspect"]').length,
  videos: document.querySelectorAll('main video').length,
  text: document.querySelector('main')?.innerText?.slice(0, 200)
})
```
Expected: `cards > 0` AND NOT incluir "Nenhum vídeo encontrado".

- [ ] **Step 5: Checkpoint** — Bloco A validado em prod.

---

## Chunk 2: Bloco B — Migração de mídias

### Task B1: Criar bucket `public-media` + policies

**Files:**
- Apply via `mcp__supabase__apply_migration` name=`create_public_media_bucket`

- [ ] **Step 1: Verificar se bucket já existe**

Run: `mcp__supabase__execute_sql`: `SELECT id, public FROM storage.buckets WHERE id = 'public-media';`
Se existe: pular pro Step 3.

- [ ] **Step 2: Criar bucket público + policies**

Run: `mcp__supabase__apply_migration` name=`create_public_media_bucket`:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-media', 'public-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read public-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-media');

CREATE POLICY "Service role writes public-media"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'public-media');

CREATE POLICY "Service role updates public-media"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'public-media');
```

- [ ] **Step 3: Confirmar bucket criado**

Run SQL: `SELECT id, public FROM storage.buckets WHERE id = 'public-media';`
Expected: 1 row com `public = true`.

### Task B2: Edge function `migrate-external-media`

**Files:**
- Create via `mcp__supabase__deploy_edge_function`: `migrate-external-media`

- [ ] **Step 1: Escrever source da edge function do zero seguindo o fluxo abaixo**

Estrutura do handler (Deno TypeScript padrão do Supabase Edge Runtime):

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Map: qual(is) coluna(s) de cada tabela apontam pra mídia externa
const TABLE_CONFIG = {
  products: { cols: ['image_url'], extensions: ['jpg', 'jpeg', 'png', 'webp'] },
  avatars: { cols: ['image_url'], extensions: ['jpg', 'jpeg', 'png', 'webp'] },
  product_videos: { cols: ['video_url'], extensions: ['mp4', 'webm'] },
  prompt_templates: { cols: ['media_url', 'thumbnail_url'], extensions: ['mp4', 'jpg', 'png'] }
} as const

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const { table, cursor, limit, failedIds } = await req.json()
  if (!TABLE_CONFIG[table]) return Response.json({ error: 'invalid table' }, { status: 400 })

  // Valida admin — mesmo padrão das outras edge functions do projeto
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data: { user } } = await supabaseAdmin.auth.getUser(token!)
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const { data: roles } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
  if (!roles) return Response.json({ error: 'admin required' }, { status: 403 })

  // Busca rows
  const cfg = TABLE_CONFIG[table]
  const extFilter = cfg.cols.map(c => `${c}.like.%mszdlupinucfzyzidttn%,${c}.like.%manuscdn.com%`).join(',')
  let q = supabaseAdmin.from(table).select('id, ' + cfg.cols.join(','))
  if (failedIds?.length) q = q.in('id', failedIds)
  else q = q.or(extFilter).gt('id', cursor || '').order('id').limit(limit || 10)
  const { data: rows } = await q

  const migrated: string[] = []
  const failed: {id: string, reason: string}[] = []

  for (const row of rows || []) {
    try {
      for (const col of cfg.cols) {
        const url = row[col]
        if (!url || !(url.includes('mszdlupinucfzyzidttn') || url.includes('manuscdn.com'))) continue
        const res = await fetch(url)
        if (!res.ok) throw new Error(`fetch ${res.status}`)
        const bytes = new Uint8Array(await res.arrayBuffer())
        const ext = url.split('.').pop()!.split('?')[0]
        const path = `${table}/${row.id}-${col}.${ext}`
        const { error: upErr } = await supabaseAdmin.storage.from('public-media').upload(path, bytes, { upsert: true, contentType: guessMime(ext) })
        if (upErr) throw upErr
        const newUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/public-media/${path}`
        const { error: updErr } = await supabaseAdmin.from(table).update({ [col]: newUrl }).eq('id', row.id)
        if (updErr) throw updErr
      }
      migrated.push(row.id)
    } catch (err) {
      failed.push({ id: row.id, reason: (err as Error).message })
    }
  }

  const lastId = rows?.length ? rows[rows.length - 1].id : null
  const nextCursor = rows?.length === (limit || 10) ? lastId : null
  return Response.json({ migrated: migrated.length, failed, nextCursor }, { headers: CORS })
})

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
function guessMime(ext: string) { return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' }[ext] || 'application/octet-stream' }
```

Deploy via `mcp__supabase__deploy_edge_function`.

- [ ] **Step 2: Deploy**

Usar `mcp__supabase__deploy_edge_function` com `name: 'migrate-external-media'`.

- [ ] **Step 3: Testar a function direto via curl com token de admin**

Run em terminal Bash:
```bash
TOKEN=$(curl -s "https://mdueuksfunifyxfqpmdv.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"email":"suporte@appvyral.online","password":"VyralAI56447!"}' | jq -r .access_token)

curl -s -X POST "https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/migrate-external-media" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"table":"avatars","cursor":0,"limit":2}'
```
Expected: `{ migrated: 2, failed: [], nextCursor: <uuid> }` + SELECT subsequente mostra image_url apontando pro domínio próprio.

- [ ] **Step 4: Reverter o teste (caso não queira avatares parcialmente migrados)**

Só se der problema. Normalmente não precisa — o resultado é válido.

### Task B3: Admin trigger button

**Files:**
- Modify: `src/pages/admin/AdminSettings.tsx`

- [ ] **Step 1: Ler `AdminSettings.tsx` pra entender o layout atual**

- [ ] **Step 2: Adicionar card "Migração de mídias externas"**

Ao clicar em "Migrar agora":
1. Lê as 4 tabelas em loop.
2. Pra cada tabela: `while (nextCursor !== null)` chama `supabase.functions.invoke('migrate-external-media', { body: { table, cursor, limit: 10 } })`, agrega resultados.
3. Mostra progresso em tempo real: "Migrando products: 5/20 · 0 falhas" etc.
4. Ao final: toast "Migração concluída: 65 migrados, 2 falharam".
5. Se houver failed: mostra lista + botão "Tentar de novo os falhos" (passa IDs explicitamente).

Código no estado (simplificado):
```tsx
const [status, setStatus] = useState<Record<string, { done: number, total: number, failed: number }>>({})
const [running, setRunning] = useState(false)

async function runMigration() {
  setRunning(true)
  const tables = ['avatars', 'products', 'product_videos', 'prompt_templates']
  for (const table of tables) {
    let cursor: string | number = 0
    let migrated = 0, failed = 0
    while (cursor !== null) {
      const { data } = await supabase.functions.invoke('migrate-external-media', {
        body: { table, cursor, limit: 10 }
      })
      migrated += data.migrated
      failed += data.failed.length
      cursor = data.nextCursor
      setStatus(s => ({ ...s, [table]: { done: migrated, total: migrated + failed, failed } }))
    }
  }
  setRunning(false)
  toast.success('Migração concluída')
}
```

- [ ] **Step 3: `npm run build`**

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminSettings.tsx supabase/functions/migrate-external-media/index.ts
git commit -m "feat: migrate-external-media edge function + admin trigger"
```

- [ ] **Step 5: Push + rodar migração em prod**

```bash
git push origin main
```

Aguardar deploy. Login em `/admin/settings`. Clicar "Migrar agora". Observar progresso.

- [ ] **Step 6: Validar pós-migração**

Run SQL:
```sql
SELECT
  (SELECT COUNT(*) FROM products WHERE image_url LIKE '%mszdlupinucfzyzidttn%') as prod_ext,
  (SELECT COUNT(*) FROM avatars WHERE image_url LIKE '%mszdlupinucfzyzidttn%') as av_ext,
  (SELECT COUNT(*) FROM product_videos WHERE video_url LIKE '%mszdlupinucfzyzidttn%') as vid_ext,
  (SELECT COUNT(*) FROM prompt_templates WHERE media_url LIKE '%manuscdn.com%') as tpl_ext;
```
Expected: todos 0.

- [ ] **Step 7: Checkpoint** — Bloco B validado.

---

## Chunk 3: Bloco C — Boosters (cadeado + 3 liberados)

### Task C1.1: Adicionar flags `locked` + `emptyStateText` ao tipo

**Files:**
- Modify: `src/types/boosters.ts`

- [ ] **Step 1: Adicionar campos à interface `BoosterDef`**

```ts
export interface BoosterDef {
  // ...existente
  locked?: boolean
  emptyStateText?: string
}
```

- [ ] **Step 2: Marcar 10 boosters como locked**

Em cada objeto dentro de `BOOSTERS`, adicionar `locked: true` nos slugs: `prompt`, `nano-banana`, `nano-banana-2`, `veo`, `motion`, `human-engine`, `avatar`, `kling`, `skin`, `sora`.

Deixar os 3 sem `locked` (ou explicitamente `locked: false`): `influencer-lab`, `grok`, `edit-image`.

- [ ] **Step 3: Reordenar inputs do `grok` — prompt primeiro**

```ts
// dentro do objeto grok:
inputs: [
  { key: 'prompt', label: 'Descrição do movimento', type: 'textarea', placeholder: 'Ex: pessoa segurando o produto e sorrindo', required: true },
  { key: 'image_url', label: 'Imagem de referência', type: 'image', required: true },
],
emptyStateText: 'Crie vídeos a partir de uma imagem usando o Grok IA',
```

- [ ] **Step 4: `npm run build`**

### Task C1.2: BoostersPage — overlay de lock + badge

**Files:**
- Modify: `src/pages/BoostersPage.tsx`

- [ ] **Step 1: Adicionar condicional de renderização no card**

Cards com `b.locked`:
- Div absolute cobrindo o card com `bg-black/60 backdrop-blur-sm`.
- `<Lock size={32} className="text-white/70" />` no centro.
- Badge canto superior direito: `<span class="... bg-yellow-500/90 text-white">Em breve</span>` (em vez do badge de créditos).
- `onClick` → `toast('Disponível em breve 🔒')` e `return` antes do navigate.

Cards sem lock:
- Badge canto superior direito: `<span class="... bg-green-500/90 text-white">Disponível agora</span>` (adicional ao badge de créditos, ou fundir).

- [ ] **Step 2: Texto no topo da página**

Acima do grid: `"Liberamos 3 ferramentas nessa primeira versão. Os outros 10 chegam nas próximas semanas."`

- [ ] **Step 3: `npm run build`**

- [ ] **Step 4: Commit**

```bash
git add src/types/boosters.ts src/pages/BoostersPage.tsx
git commit -m "feat: lock UI on 10 boosters + locked/emptyStateText in type"
```

### Task C1.3: BoosterDetailPage — bloquear acesso de locked + usar emptyStateText

**Files:**
- Modify: `src/pages/BoosterDetailPage.tsx`

- [ ] **Step 1: Bloquear acesso se booster é locked**

Logo após resolver `booster`, antes do render:

```tsx
if (booster.locked) return <Navigate to="/booster" replace />
```

- [ ] **Step 2: Aplicar `emptyStateText` no painel direito**

Onde hoje mostra "Seu resultado aparecerá aqui", usar:
```tsx
<p className="text-white/50 text-sm">{booster.emptyStateText ?? 'Seu resultado aparecerá aqui'}</p>
```

- [ ] **Step 3: Ler `?prompt=` da URL e pré-preencher (comportamento compartilhado entre todos os boosters)**

Qualquer booster que tenha um input com key `'prompt'` vai aceitar ser pré-populado via query string. Não é exclusivo do Veo — se amanhã quisermos pré-popular Kling ou Nano Banana, funciona igual. No hook de inicialização do estado `values`, adicionar:
```tsx
const qs = new URLSearchParams(useLocation().search)
const prefillPrompt = qs.get('prompt')
// No init do useState:
booster?.inputs.forEach(i => {
  if (i.key === 'prompt' && prefillPrompt) init[i.key] = prefillPrompt
  else init[i.key] = i.type === 'radio' && i.options?.[0] ? i.options[0].value : ''
})
```

- [ ] **Step 4: `npm run build`**

- [ ] **Step 5: Commit**

```bash
git add src/pages/BoosterDetailPage.tsx
git commit -m "feat: BoosterDetailPage blocks locked + uses emptyStateText + reads ?prompt="
```

### Task C2: Grok — smoke test via Playwright (reforço)

(Mudanças já fizeram em C1.1. Só confirmar.)

- [ ] **Step 1: Após push, Playwright em `/booster/grok`**

`mcp__playwright__browser_navigate` → `/booster/grok`.
`mcp__playwright__browser_evaluate`:
```js
() => {
  const labels = Array.from(document.querySelectorAll('main label')).map(l => l.innerText.trim());
  const emptyState = document.querySelector('main [class*="min-h"] p.text-sm')?.innerText;
  return { firstLabel: labels[0], secondLabel: labels[1], emptyState };
}
```
Expected: `firstLabel` contém "movimento" ou "prompt", `secondLabel` contém "Imagem", `emptyState` inclui "Crie vídeos a partir de uma imagem usando o Grok IA".

### Task C3: EditImagePage — layout 2 colunas + slider before/after

**Files:**
- Create: `src/components/BeforeAfterSlider.tsx`
- Create: `src/pages/EditImagePage.tsx`
- Modify: `src/App.tsx` (registrar rota)

- [ ] **Step 1: Criar `BeforeAfterSlider.tsx`**

```tsx
import { useState } from 'react'

export function BeforeAfterSlider({ before, after, alt }: { before: string; after: string; alt: string }) {
  const [pos, setPos] = useState(50)
  return (
    <div className="relative w-full overflow-hidden rounded-lg">
      <img src={after} alt={alt} className="w-full block" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt={alt + ' antes'} className="w-full block" />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={e => setPos(Number(e.target.value))}
        className="absolute inset-x-0 bottom-2 w-full accent-primary-500"
      />
      <div className="absolute top-0 bottom-0 w-px bg-white/80 pointer-events-none" style={{ left: `${pos}%` }} />
    </div>
  )
}
```

- [ ] **Step 2: Criar `EditImagePage.tsx`**

Componente específico pro booster `edit-image`:
- Hook `useNavigate` + `useAuthStore` pra pegar créditos.
- State: `originalImage`, `maskPrompt`, `editPrompt`, `generating`, `resultImage`, `error`.
- Layout grid 2 colunas (lg) / stack mobile.
- Esquerda: upload (drag-drop + click) → preview → 2 textareas → botão Gerar.
- Direita: se `!resultImage && !generating` → empty state; se `generating` → skeleton; se `resultImage` → `<BeforeAfterSlider>` + botão Baixar.

- [ ] **Step 3: Registrar rota em `App.tsx`**

Import: `import { EditImagePage } from './pages/EditImagePage'`

Adicionar rota **ANTES** da `/booster/:tool`:
```tsx
<Route path="/booster/edit-image" element={<EditImagePage />} />
<Route path="/booster/:tool" element={<BoosterDetailPage />} />
```

- [ ] **Step 4: `npm run build`**

- [ ] **Step 5: Commit**

```bash
git add src/components/BeforeAfterSlider.tsx src/pages/EditImagePage.tsx src/App.tsx
git commit -m "feat: edit-image 2-column panel with before/after slider"
```

- [ ] **Step 6: Playwright smoke test pós-push**

`/booster/edit-image` → verificar 2 colunas + dropzone + empty state na direita.

### Task C4: Influencer Lab node graph

**Files:**
- `npm install @xyflow/react`
- Create: `src/types/lab.ts`
- Create: `src/components/influencer-lab/Sidebar.tsx`
- Create: `src/components/influencer-lab/nodes/ProductNode.tsx`
- Create: `src/components/influencer-lab/nodes/AvatarNode.tsx`
- Create: `src/components/influencer-lab/nodes/SceneNode.tsx`
- Create: `src/components/influencer-lab/nodes/SettingsNode.tsx`
- Create: `src/components/influencer-lab/nodes/GenerateNode.tsx`
- Create: `src/pages/InfluencerLabPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Instalar dependência**

Run:
```bash
cd "c:/Users/GouveiaRx/Downloads/Vyral IA/vyral-ai"
npm install @xyflow/react
```

- [ ] **Step 2: Consultar docs do `@xyflow/react` via context7**

Run: `mcp__context7__resolve-library-id` com `libraryName: '@xyflow/react'` → pegar o id.
Depois `mcp__context7__query-docs` com tópico "custom nodes drag from sidebar".

Guardar o exemplo de drag-from-sidebar pra replicar.

- [ ] **Step 3: Criar `src/types/lab.ts`**

```ts
export type LabNodeType = 'product' | 'avatar' | 'scene' | 'settings' | 'generate'

export interface ProductNodeData { productId?: string; productName?: string; imageUrl?: string }
export interface AvatarNodeData { avatarId?: string; avatarName?: string; imageUrl?: string; gender?: 'female' | 'male' }
export interface SceneNodeData { scenarioId?: string; scenarioName?: string; customPrompt?: string }
export interface SettingsNodeData { pose: string; style: string; enhancements: string[]; format: string; additionalInfo?: string }
export interface GenerateNodeData { status: 'idle' | 'ready' | 'generating' | 'done' | 'error'; resultUrl?: string }

export type LabNodeData =
  | ProductNodeData
  | AvatarNodeData
  | SceneNodeData
  | SettingsNodeData
  | GenerateNodeData

export interface WorkflowPayload {
  product_id?: string
  avatar_id?: string
  scene: { scenarioId?: string; customPrompt?: string }
  pose: string
  style: string
  enhancements: string[]
  format: string
  additionalInfo?: string
}
```

- [ ] **Step 4: Criar os 5 node components**

Cada node é um `<div className="rounded-xl bg-surface-300 border ...">` com:
- Header: ícone + título
- Body: conteúdo editável (select de produto, avatar, etc)
- Handles do XYFlow: `<Handle type="source" position={Position.Right} />` (ou target, dependendo do tipo).

ProductNode: tem select que busca produtos de `supabase.from('products').select('id,name,image_url')`. Guarda no node data.
AvatarNode: mesmo padrão, com tabs Feminino/Masculino.
SceneNode: radio "Prontos" → lista de SCENARIOS ou "Custom" → textarea.
SettingsNode: compacto com os 4 grupos (Pose/Estilo/Melhorias/Formato) abreviados (mostra selecionados, clica pra expandir).
GenerateNode: botão "Executar". Se clica: valida que edges de product+avatar+scene+settings chegam nele; se ok, chama `supabase.functions.invoke('generate-influencer-image', { body: workflowPayload })`.

- [ ] **Step 5: Criar `Sidebar.tsx`**

5 cards arrastáveis. `onDragStart`: `e.dataTransfer.setData('application/reactflow', nodeType)`.

- [ ] **Step 6: Criar `InfluencerLabPage.tsx`**

```tsx
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, Position, addEdge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Sidebar } from '../components/influencer-lab/Sidebar'
// ...nodes imports

const nodeTypes = { product: ProductNode, avatar: AvatarNode, scene: SceneNode, settings: SettingsNode, generate: GenerateNode }

export function InfluencerLabPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const onConnect = useCallback((conn) => setEdges(eds => addEdge(conn, eds)), [setEdges])

  const onDrop = useCallback((event) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/reactflow')
    if (!type) return
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
    const newNode = { id: crypto.randomUUID(), type, position, data: {} }
    setNodes(nds => [...nds, newNode])
  }, [])

  return (
    <div className="h-[calc(100vh-80px)] flex gap-0">
      <Sidebar />
      <div className="flex-1" onDrop={onDrop} onDragOver={e => e.preventDefault()}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Code-split via lazy**

Em `App.tsx`:
```tsx
const InfluencerLabPage = lazy(() => import('./pages/InfluencerLabPage').then(m => ({ default: m.InfluencerLabPage })))
```

- [ ] **Step 8: Registrar rota em `App.tsx`**

Adicionar **ANTES** de `/booster/:tool`:
```tsx
<Route path="/booster/influencer-lab" element={<Suspense fallback={<Loading />}><InfluencerLabPage /></Suspense>} />
```

Importar `Suspense` se ainda não importado.

- [ ] **Step 9: Remover redirect hack do `InfluencerLabPage` velho**

`src/types/boosters.ts`: trocar `tool: 'studio_redirect'` do `influencer-lab` por `tool: 'influencer_lab'`. Já não redireciona pro Studio.

`BoostersPage.tsx`: remover a lógica de `tool === 'studio_redirect'` no navigate (ou deixar genérica; rota nova captura).

- [ ] **Step 10: `npm run build`**

Expected: 0 erros. Bundle size aumenta ~150KB (separado no chunk do lab).

- [ ] **Step 11: Commit**

```bash
git add src/types/lab.ts src/pages/InfluencerLabPage.tsx src/components/influencer-lab/ src/App.tsx src/types/boosters.ts src/pages/BoostersPage.tsx package.json package-lock.json
git commit -m "feat: Influencer Lab visual workflow with XYFlow"
```

- [ ] **Step 12: Push + Playwright smoke test**

Após deploy: `/booster/influencer-lab` → ver sidebar com 5 cards + canvas vazio.

`mcp__playwright__browser_evaluate` pra dropar um node:
```js
() => {
  // Simular drag é difícil no headless; validar mais via structure: sidebar visible, canvas exists
  return {
    hasCanvas: !!document.querySelector('.react-flow'),
    sidebarCards: document.querySelectorAll('[data-node-type]').length
  }
}
```
Expected: `hasCanvas: true`, `sidebarCards: 5`.

- [ ] **Step 13: Cut-off check**

Se horário > sexta 18h e o workflow end-to-end (drag + connect + execute) ainda não funciona → flipar `locked: true` no `influencer-lab` em `boosters.ts` e commitar `"temp: lock influencer-lab until post-launch polish"`. Push. Liberar só Grok + Editar Imagem no sábado.

---

## Chunk 4: Bloco D — Calculadora 3 painéis

### Task D1: Refactor CalculatorPage

**Files:**
- Modify: `src/pages/CalculatorPage.tsx`

- [ ] **Step 1: Ler arquivo atual pra mapear blocos existentes**

- [ ] **Step 2: Reorganizar em grid 3 colunas**

Estrutura nova:

```tsx
<div className="max-w-7xl mx-auto space-y-5">
  {/* Header */}
  <Header />

  {/* Grid 3 colunas */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    {/* Painel 1: Configure sua operação */}
    <Panel title="Configure sua operação">
      <ProfileSelector />
      <SliderInputs />
    </Panel>

    {/* Painel 2: Resumo da Operação */}
    <Panel title="Resumo da Operação">
      <SummaryCards /> {/* 4 mini-cards */}
      <DailyBreakdown />
    </Panel>

    {/* Painel 3: Projeções mensais */}
    <Panel title="Projeções mensais">
      <MonthlyProjection /> {/* tabela: 1/3/6/12 meses */}
      <TipsBox />
    </Panel>
  </div>
</div>
```

Mover:
- Perfis → Painel 1
- 6 sliders → Painel 1
- 4 cards GMV/Comissão/Vendas/ROI → Painel 2
- Detalhamento diário → Painel 2
- Caixa de dicas → Painel 3
- Novo: projeção de 1/3/6/12 meses em tabela simples (usa `monthlyCommission` * fator de crescimento baseado em posts/dia).

- [ ] **Step 3: Projeções mensais — calcular growth estimado**

```tsx
// growth estimado: 5% base + (postsPerDay / 10) * 10% até max 20% MoM
const monthlyGrowth = Math.min(0.2, 0.05 + (postsPerDay / 10) * 0.1)
const projection = [1, 3, 6, 12].map(months => ({
  months,
  revenue: monthlyCommission * Math.pow(1 + monthlyGrowth, months - 1)
}))
```

Render: tabela simples com coluna Mês + coluna Receita.

- [ ] **Step 4: `npm run build`**

- [ ] **Step 5: Commit**

```bash
git add src/pages/CalculatorPage.tsx
git commit -m "refactor: calculator 3-panel layout (Configure/Resumo/Projeções)"
```

- [ ] **Step 6: Push + Playwright smoke test**

Após deploy: `/calculator` → `mcp__playwright__browser_evaluate`:
```js
() => {
  const panels = Array.from(document.querySelectorAll('main h3')).map(h => h.innerText.trim());
  const has3Cols = getComputedStyle(document.querySelector('main .grid-cols-3, main .lg\\:grid-cols-3')).display === 'grid';
  return { panels, has3Cols };
}
```
Expected: 3 panels com esses títulos, grid layout ok.

---

## Chunk 5: Bloco E — Prompt Generator no Studio

### Task E1: Estender edge function `enhance-prompt`

**Files:**
- Modify via `mcp__supabase__deploy_edge_function`: `enhance-prompt`

- [ ] **Step 1: Baixar o source atual**

Run: `mcp__supabase__get_edge_function` com `slug: 'enhance-prompt'`. Guardar o source.

- [ ] **Step 2: Estender payload**

No handler, aceitar campos opcionais `duration?: '5' | '10'` e `style?: 'casual' | 'dramatico' | 'clean'` no body.

Se presentes, injetar no prompt enviado ao Gemini:
```ts
let geminiPrompt = `Gere um prompt JSON otimizado para VEO 3.1 a partir de: ${description}`
if (duration) geminiPrompt += `. Duração: ${duration} segundos.`
if (style) geminiPrompt += ` Estilo: ${style}.`
```

- [ ] **Step 3: Redeploy**

`mcp__supabase__deploy_edge_function` com o slug e o novo source.

- [ ] **Step 4: Testar via curl**

```bash
curl -X POST "https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/enhance-prompt" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"mulher segurando creme facial","type":"video","duration":"10","style":"clean"}'
```
Expected: resposta com `prompt` string.

### Task E2: PromptGeneratorPanel component

**Files:**
- Create: `src/components/studio/PromptGeneratorPanel.tsx`

- [ ] **Step 1: Escrever componente**

```tsx
interface Props { onUseInVeo?: (prompt: string) => void }

export function PromptGeneratorPanel({ onUseInVeo }: Props) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState<'5' | '10'>('5')
  const [style, setStyle] = useState<'casual' | 'dramatico' | 'clean'>('clean')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function generate() {
    setLoading(true)
    try {
      const { data } = await supabase.functions.invoke('enhance-prompt', {
        body: { description, type: 'video', duration, style }
      })
      setResult(data.prompt)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-primary-600/10 to-accent-600/10 border border-primary-500/20 rounded-xl p-4">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between">
        <span className="text-sm font-semibold text-white">✨ Quer transformar essa imagem em vídeo?</span>
        <ChevronDown className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o movimento..." className="..." />
          <RadioGroup value={duration} options={[{ v: '5', l: '5s' }, { v: '10', l: '10s' }]} onChange={setDuration} />
          <RadioGroup value={style} options={[...]} onChange={setStyle} />
          <button onClick={generate} disabled={loading || !description}>Gerar prompt</button>
          {result && (
            <>
              <pre className="bg-surface-400 p-3 rounded text-xs">{result}</pre>
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(result); toast.success('Copiado!') }}>Copiar</button>
                <button onClick={() => navigate(`/booster/veo?prompt=${encodeURIComponent(result)}`)}>Usar no Veo</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

### Task E3: Integrar no StudioPage

**Files:**
- Modify: `src/pages/StudioPage.tsx`

- [ ] **Step 1: Importar + renderizar condicional**

```tsx
import { PromptGeneratorPanel } from '../components/studio/PromptGeneratorPanel'
```

Onde hoje renderiza o resultado (imagem gerada), adicionar abaixo:
```tsx
{result?.type === 'image' && <PromptGeneratorPanel />}
```

- [ ] **Step 2: `npm run build`**

- [ ] **Step 3: Commit**

```bash
git add src/components/studio/PromptGeneratorPanel.tsx src/pages/StudioPage.tsx supabase/functions/enhance-prompt/index.ts
git commit -m "feat: prompt-generator panel after studio image generation"
```

- [ ] **Step 4: Push + Playwright smoke test**

Login → Studio → gerar imagem → confirmar painel aparece → clicar expand → preencher → "Gerar prompt" → prompt aparece.

---

## Chunk 6: Bloco F — Referral Hotmart sck + fallback

### Task F1: Migration `referrals_pending`

**Files:**
- Apply via `mcp__supabase__apply_migration` name=`create_referrals_pending`

- [ ] **Step 1: Criar tabela**

Run:

```sql
CREATE TABLE IF NOT EXISTS referrals_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  invited_email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  consumed_at timestamptz,
  UNIQUE (invited_email)
);

CREATE INDEX idx_referrals_pending_email ON referrals_pending (invited_email);
CREATE INDEX idx_referrals_pending_code ON referrals_pending (referral_code);

ALTER TABLE referrals_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on referrals_pending"
  ON referrals_pending FOR ALL
  TO service_role
  USING (true);
```

- [ ] **Step 2: Confirmar criação**

Run: `mcp__supabase__execute_sql`: `SELECT column_name FROM information_schema.columns WHERE table_name = 'referrals_pending';`

Expected: colunas id, referral_code, invited_email, created_at, consumed_at.

### Task F2: AuthPage — capturar ref + criar pending

**Files:**
- Modify: `src/pages/AuthPage.tsx`

- [ ] **Step 1: Ao carregar a página, capturar `?ref=VYRAL-XXXX`**

```tsx
useEffect(() => {
  const ref = new URLSearchParams(location.search).get('ref')
  if (ref && /^VYRAL-[A-Z0-9]{6}$/.test(ref)) {
    localStorage.setItem('vyral_ref', ref)
  }
}, [])
```

- [ ] **Step 2: Ao fazer signup com sucesso, criar pending**

Após `auth.signUp` bem-sucedido:
```tsx
const ref = localStorage.getItem('vyral_ref')
if (ref && email) {
  await supabase.from('referrals_pending').upsert({
    referral_code: ref,
    invited_email: email
  }, { onConflict: 'invited_email' })
}
```

- [ ] **Step 3: `npm run build`**

- [ ] **Step 4: Commit**

```bash
git add src/pages/AuthPage.tsx
git commit -m "feat: AuthPage captures ?ref and records referrals_pending on signup"
```

### Task F3: CreditsPage — anexar sck no checkout

**Files:**
- Modify: `src/pages/CreditsPage.tsx` (ou onde é gerado o link do Hotmart)

- [ ] **Step 1: Buscar onde o link do Hotmart é construído**

Run: `Grep` com pattern `hotmart.com|pay.hotmart|checkoutPro` em `src/`.

- [ ] **Step 2: Anexar `&sck={ref}` ao URL**

```tsx
const ref = localStorage.getItem('vyral_ref')
const hotmartUrl = `${baseCheckoutUrl}${ref ? `&sck=${ref}` : ''}`
```

- [ ] **Step 3: `npm run build`**

- [ ] **Step 4: Commit**

```bash
git add src/pages/CreditsPage.tsx
git commit -m "feat: append sck to Hotmart checkout URL when ref is present"
```

### Task F4: hotmart-webhook — extrair sck e creditar

**Files:**
- Modify via `mcp__supabase__deploy_edge_function`: `hotmart-webhook`

- [ ] **Step 1: Baixar source atual**

Run: `mcp__supabase__get_edge_function` com `slug: 'hotmart-webhook'`.

- [ ] **Step 2: Adicionar handler após approval**

No bloco onde trata `PURCHASE_APPROVED`, adicionar:

```ts
async function creditReferrer(payload: any) {
  const candidates = [
    payload?.data?.purchase?.tracking?.source,
    payload?.data?.buyer?.custom_fields?.sck,
    payload?.data?.subscriber?.code,
  ]
  let sck = candidates.find(v => typeof v === 'string' && /^VYRAL-[A-Z0-9]{6}$/.test(v))

  // Fallback by email
  if (!sck && payload?.data?.buyer?.email) {
    const { data: pending } = await supabaseAdmin
      .from('referrals_pending')
      .select('referral_code')
      .eq('invited_email', payload.data.buyer.email)
      .is('consumed_at', null)
      .maybeSingle()
    if (pending) sck = pending.referral_code
  }

  if (!sck) return

  const { data: refCode } = await supabaseAdmin
    .from('referral_codes')
    .select('id, user_id')
    .eq('code', sck)
    .maybeSingle()
  if (!refCode) return

  const planType = planFromOfferCode(payload.data.purchase.offer.code) // existe no webhook já
  const credits = { starter: 100, creator: 200, pro: 300 }[planType] ?? 100

  const { data: refUserSub } = await supabaseAdmin
    .from('subscriptions')
    .select('customer_email, credits_remaining, id')
    .eq('customer_email', (await supabaseAdmin.auth.admin.getUserById(refCode.user_id)).data.user?.email)
    .eq('status', 'active')
    .maybeSingle()

  // Se o referidor não tem subscription ativa (ex: só usou free trial), skipa silencioso e loga em credit_usage_log pra audit.
  // Não cria fila: prática é só creditar quem tá pagando. Se quiser creditar trial no futuro, estender aqui.
  if (!refUserSub) {
    await supabaseAdmin.from('credit_usage_log').insert({
      user_email: 'referral:skip',
      tool_name: 'referral:no_active_sub',
      edge_function: 'hotmart-webhook',
      status: `sck=${sck}|referrer_id=${refCode.user_id}`,
      credits_used: 0
    })
    return
  }

  // Idempotência: checar se já creditamos esta transaction
  const txId = payload.data.purchase.transaction
  const { data: existingConv } = await supabaseAdmin
    .from('referral_conversions')
    .select('id')
    .eq('referral_code_id', refCode.id)
    .eq('event_type', `paid:${txId}`)
    .maybeSingle()
  if (existingConv) return

  // Creditar
  await supabaseAdmin
    .from('subscriptions')
    .update({ credits_remaining: refUserSub.credits_remaining + credits })
    .eq('id', refUserSub.id)

  await supabaseAdmin.from('referral_conversions').insert({
    referral_code_id: refCode.id,
    invited_user_id: null,
    event_type: `paid:${txId}`,
    credits_awarded: credits
  })

  await supabaseAdmin.from('referrals_pending').update({ consumed_at: new Date().toISOString() }).eq('referral_code', sck)
}

// Chamar no handler de PURCHASE_APPROVED
await creditReferrer(body)
```

- [ ] **Step 3: Redeploy**

`mcp__supabase__deploy_edge_function` com o source atualizado.

- [ ] **Step 4: Testar via curl simulando webhook**

```bash
curl -X POST "https://mdueuksfunifyxfqpmdv.supabase.co/functions/v1/hotmart-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PURCHASE_APPROVED",
    "data": {
      "purchase": {
        "offer": { "code": "7zmngs50" },
        "transaction": "HP999TEST001",
        "tracking": { "source": "VYRAL-TEST99" }
      },
      "buyer": { "email": "teste@example.com" }
    }
  }'
```

Expected: `200 OK`. Webhook trata (mesmo que `VYRAL-TEST99` não exista em `referral_codes` — e ignora silenciosamente).

- [ ] **Step 5: Validação SQL**

Run: `SELECT * FROM referral_conversions WHERE event_type LIKE 'paid:%' ORDER BY created_at DESC LIMIT 5;`

Se não tiver nenhum ainda, normal (produto ainda não teve compra real pós-fix). Só confirmando que não deu erro.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/hotmart-webhook/index.ts
git commit -m "feat: referral tracking via Hotmart sck + pending fallback"
```

### Task F5: Documentação pro cliente

**Files:**
- Create: `docs/cliente/hotmart-rastreamento.md`

- [ ] **Step 1: Escrever documento passo-a-passo**

Conteúdo:
> # Ativar "Rastreamento de origem" no Hotmart
>
> Pra o sistema de indicações funcionar automaticamente, precisa ativar um check em cada produto:
>
> 1. Acesse hotmart.com/user e entre na sua conta.
> 2. Em "Meus produtos", clique em cada um dos 3 produtos:
>    - Vyral AI Starter (código 7zmngs50)
>    - Vyral AI Creator (código 84giouqu)
>    - Vyral AI Pro (código ui1qxdw1)
> 3. Na aba "Configurações → Avançado", encontre "Rastreamento de origem (SRC)" e marque **ativado**.
> 4. Salve.
>
> Pronto. A partir de agora, quando alguém clicar num link tipo `appvyral.online/auth?ref=VYRAL-XXXXXX` e comprar qualquer plano, o webhook captura o código e credita automaticamente o indicador no dia seguinte.

- [ ] **Step 2: Commit**

```bash
git add docs/cliente/hotmart-rastreamento.md
git commit -m "docs: Hotmart src tracking setup instructions for client"
```

---

## Chunk 7: Verificação final + mensagem ao cliente

### Task Final: Validação end-to-end em produção

- [ ] **Step 1: Push de tudo pendente**

```bash
git push origin main
```

Aguardar deploy.

- [ ] **Step 2: Playwright — golden path completo**

Sequência em `mcp__playwright__browser_navigate`:

1. `/auth` → login.
2. `/viral-videos` → contar ≥ 50 vídeos renderizados (não "Nenhum vídeo encontrado").
3. `/viral-products` → contar 20.
4. `/viral-creators` → contar 6.
5. `/studio` → ver painéis; expandir todos; ver todas opções.
6. `/booster` → 3 cards verdes + 10 com overlay de lock + badge "Em breve".
7. `/booster/grok` → inputs Prompt→Imagem; empty state correto.
8. `/booster/edit-image` → 2 colunas; dropzone; slider after upload-hypothetical.
9. `/booster/influencer-lab` → sidebar + canvas (se não foi flipado pra locked).
10. `/templates` → 69 cards com vídeos loop.
11. `/calculator` → 3 colunas (Configure / Resumo / Projeções).
12. `/referral` → link com ref + tabela + "Como funciona".
13. Gerar imagem no Studio → panel PromptGenerator aparece → preencher → gerar prompt → clicar "Usar no Veo" → URL abre com `?prompt=` e o textarea vem preenchido.

- [ ] **Step 3: Validações SQL finais**

```sql
-- Nenhum link externo sobrou
SELECT COUNT(*) FROM products WHERE image_url LIKE '%mszdlupinucfzyzidttn%'; -- 0
SELECT COUNT(*) FROM avatars WHERE image_url LIKE '%mszdlupinucfzyzidttn%'; -- 0
SELECT COUNT(*) FROM product_videos WHERE video_url LIKE '%mszdlupinucfzyzidttn%'; -- 0
SELECT COUNT(*) FROM prompt_templates WHERE media_url LIKE '%manuscdn.com%'; -- 0

-- product_id linkado em boa parte
SELECT COUNT(product_id) FROM product_videos; -- ≥ 30

-- Bucket público-media com arquivos
SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'public-media'; -- > 50
```

- [ ] **Step 4: Chrome DevTools — Lighthouse na `/viral-videos`**

Run: `mcp__chrome-devtools__lighthouse_audit` em `https://appvyral.online/viral-videos`.

Expected: LCP < 2.5s, CLS < 0.1. Se ruim: investigar.

- [ ] **Step 5: `npm run build` final**

Expected: 0 erros TS.

### Task Final+1: Mensagem pro cliente

- [ ] **Step 1: Compilar resultados**

Pra cada ponto #01-#06 do feedback do cliente:
- O que foi feito (1-2 linhas)
- Como testar (1 linha)
- Nota sobre o que depende dele (se aplicável)

- [ ] **Step 2: Montar texto em português pronto pra enviar via WhatsApp**

Template:
> Fala irmão, tudo no ar. Passando ponto por ponto:
>
> **#01** — Achei o bug real dos vídeos virais: product_id tava NULL em todos os 51 rows, por isso nada aparecia. Corrigi a query pra tolerar + linkei a maioria via similarity. Também migrei TODAS as mídias (produtos/avatares/vídeos/templates) que estavam num CDN externo pra o nosso próprio Supabase Storage — isso era a lentidão. Agora carrega rápido.
> **#02** — Studio IA: com a migração acima, produtos e avatares puxam instantâneo. Adicionei o Prompt Generator pós-imagem (igual o VEO 3.1 do TikShop): gera imagem → painel expansível aparece → descreve o movimento + estilo + duração → gera prompt otimizado → botão "Usar no Veo" que abre o booster com o prompt pronto.
> **#03** — Boosters: liberei 3 e cadeei 10. Os 10 têm overlay escuro, cadeado e badge "Em breve" (não abre). Os 3 liberados:
>   - **Influencer Lab**: node graph visual com sidebar de nodes arrastáveis (Produto / Avatar / Cena / Ajustes / Executar). Conecta nodes e executa. [SE o cut-off de sexta 18h passar, esse aqui também vai pro cadeado]
>   - **Grok IA**: ordem invertida (Prompt primeiro, Imagem depois) + texto customizado no painel de resultado + vídeo preview corrigido.
>   - **Editar Imagem**: painel novo de 2 colunas (esquerda: upload + prompts; direita: resultado com slider before/after).
> **#04** — Templates: com a migração de mídias resolveu. Loading direto.
> **#05** — Calculadora: 3 painéis agora (Configure sua operação / Resumo da Operação / Projeções mensais). Igual o TikShop.
> **#06** — Referral Hotmart funciona. Quando alguém clicar num link `appvyral.online/auth?ref=VYRAL-XXXX` e comprar, o Hotmart passa o código de volta pro nosso webhook e credito automático na conta do indicador (100/200/300 conforme plano do indicador). Fallback por email caso o cliente não ative o "Rastreamento de origem" no Hotmart. **Preciso que você ative isso**: segue doc separado.

- [ ] **Step 3: Salvar no repo pra histórico**

```bash
echo "$MENSAGEM" > docs/cliente/2026-04-25-entrega-v2.md
git add docs/cliente/2026-04-25-entrega-v2.md
git commit -m "docs: client delivery message v2"
git push origin main
```

---

## Riscos de execução + mitigações

- **Influencer Lab:** task mais longa (C4). Se por qualquer razão o workflow não fechar até sexta 18h, flipar `locked: true` e empurrar pra V2.1.
- **Migração de mídias (B):** se uma das tabelas tiver URL com conteúdo maior que 50MB (vídeo), o upload pode falhar. Mitigação: o loop trata failures por ID; repete só os que falharam.
- **Hotmart sck:** depende do cliente ativar o rastreamento. Mitigação: o fallback por email cobre 80%.

## Critérios de done

- [ ] `npm run build` → 0 erros TS
- [ ] SQL counts do Step 3 da Task Final batem
- [ ] Playwright pass em todos os 13 passos do golden path
- [ ] Mensagem pro cliente enviada
- [ ] Instruções Hotmart entregues
- [ ] Todos os ~14 commits no `origin/main` (1-2 por bloco + docs cliente)

---

## Ordem de execução recomendada (serializada)

Dado que é uma sessão única sem subagents massivos:

1. **Bloco A** (2h) — fundamental pra o cliente ver os vídeos já aparecendo rápido.
2. **Bloco B** (3-4h) — roda em paralelo com o push do A; a migração em si é botão.
3. **Bloco C.1 + C.2 + C.3** (3h) — cadeado, Grok, Editar Imagem.
4. **Bloco D** (1.5h) — Calculadora; pode entrar enquanto a migração do B roda em background.
5. **Bloco E** (2h) — Prompt Generator; rápido.
6. **Bloco F** (3h) — Referral; inclui deploy edge function + docs.
7. **Bloco C.4** (8h) — Influencer Lab; último pra ter buffer de cut-off.
8. **Task Final** — validação + mensagem.

Se em algum momento paralelizar blocos via subagents fizer sentido (ex: dispatch 1 agente pro Bloco D + outro pro Bloco E enquanto a migração do B roda), fazer — são arquivos independentes.
