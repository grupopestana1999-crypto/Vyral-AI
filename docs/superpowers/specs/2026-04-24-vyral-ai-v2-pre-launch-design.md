# Vyral AI v2 — Design de correções e features pré-lançamento

**Data:** 2026-04-24 (quinta). Lançamento: 2026-04-26 (sábado).
**Status:** aprovado em brainstorm. Pronto pra plano de implementação.

---

## Contexto

Cliente Gabriel Pestana (contrato R$5k, 15 dias, domínio `appvyral.online`) revisou a primeira rodada de correções e trouxe 6 pontos novos. A primeira rodada já shipou: 4 painéis no Studio com todas as opções do TikShop, 13 boosters sem "em desenvolvimento", Calculadora com perfis, Referral dinâmico, seed de 20 produtos / 51 vídeos / 6 criadores / 16 avatares.

Depois dessa rodada o cliente reportou problemas de performance reais no device dele, features ausentes e decidiu a estratégia "liberar só 3 boosters 100% + cadear 10" pro lançamento de sábado.

Investigação via Supabase MCP + Playwright MCP revelou 3 bugs de root cause:

1. **`product_videos.product_id` é NULL em todos os 51 rows** — a query da página `/viral-videos` usa `products!inner(...)` (INNER JOIN) e por isso retorna 0 linhas apesar de haver 51 vídeos no banco. Esse é o `#01` "vídeos virais não aparecem nenhum".
2. **Todas as mídias** (produtos/avatares/vídeos/templates) **estão em CDN externo** — `mszdlupinucfzyzidttn.supabase.co` (Supabase da iaTikShop) e `files.manuscdn.com`. Isso gera DNS + TLS + cold start a cada request, sem controle de cache, e é a causa da lentidão dos pontos `#01` e `#04` reportados pelo cliente. Adicionalmente é dependência externa frágil (pode sumir).
3. **`product_videos.thumbnail_url` é NULL** em todos → sem fallback visual quando o vídeo falha.

## Objetivos

Ao final dessa iteração:

- Nenhuma tela principal carrega em mais que 2s na conexão normal do cliente.
- Nenhuma dependência em CDN externo — todas as mídias no nosso próprio Supabase Storage.
- 3 boosters 100% funcionais (Influencer Lab, Grok IA, Editar Imagem); 10 cadeados com badge "Em breve" e overlay de lock.
- Studio IA com 20 produtos virais visíveis + 16 avatares visíveis + novo **Prompt Generator** pós-imagem.
- Calculadora reorganizada em 3 painéis (Configure / Resumo / Projeções).
- Sistema de referral Hotmart com tracking via `sck` + fallback de matching por email.
- `/viral-videos` retorna os 51 vídeos populados (fix do product_id NULL + LEFT JOIN).

## Não-objetivos

- Não refazer identidade visual. Manter dark + neon atual.
- Não integrar outras APIs de IA além das 14 edge functions já deployadas.
- Não reimplementar a estrutura de pagamento do Hotmart/Stripe (já funciona). Só estender pra capturar `sck`.
- Não migrar pra CDN pago (Cloudinary/Bunny). Supabase Storage próprio é suficiente pro volume previsto.

## Arquitetura por bloco

### Bloco A — Fix crítico de dados (2h)

**Problema:** `/viral-videos` em branco; `products!inner` elimina 51 rows válidos.

**Abordagem:**

1. `src/pages/ViralVideosPage.tsx`: trocar o select `*, products!inner(...)` por `*, products(...)` (LEFT JOIN). Ao renderizar, tolerar `products` nulo (fallback no nome do criador ou categoria).
2. Script one-shot em SQL: tentar linkar `product_videos.product_id` aos produtos via `ILIKE` / trigram similarity no nome. Rows sem match claro ficam NULL (tolerado agora pela LEFT JOIN).
3. Revisar todas as outras páginas que fazem JOIN: `StudioPage.tsx` (não usa), `ViralProductsPage.tsx` (não usa), `ViralCreatorsPage.tsx` (não usa).
4. Lazy loading: adicionar `IntersectionObserver` em cada `<video>` das páginas de feed. `preload="none"` default. Só `.play()` quando entra no viewport.

**Arquivos:**
- `src/pages/ViralVideosPage.tsx` (query + fallbacks)
- SQL migration `link_videos_to_products.sql`
- Componente compartilhado `src/components/LazyVideo.tsx` (IntersectionObserver genérico)

### Bloco B — Migração de mídias (3-4h)

**Problema:** dependência externa = lentidão + risco de quebra.

**Abordagem:** edge function `migrate-external-media` one-shot, idempotente, roda uma vez via botão em `/admin/settings`.

**Fluxo:**

1. Busca em paralelo:
   - `products WHERE image_url LIKE '%mszdlupinucfzyzidttn%'`
   - `products WHERE additional_images::text LIKE '%mszdlupinucfzyzidttn%'`
   - `avatars WHERE image_url LIKE '%mszdlupinucfzyzidttn%'`
   - `product_videos WHERE video_url LIKE '%mszdlupinucfzyzidttn%'`
   - `prompt_templates WHERE media_url LIKE '%manuscdn.com%' OR thumbnail_url LIKE '%manuscdn.com%'`
2. Para cada row: `fetch(externalUrl)` → se >1MB, comprime via `ImageMagick`/vídeo como está → upload pro bucket `public-media` com path `{table}/{id}.{ext}` → update da coluna com a nova URL (`https://mdueuksfunifyxfqpmdv.supabase.co/storage/v1/object/public/public-media/...`).
3. Idempotente: se a URL já é do domínio próprio, pula.
4. Paralelismo controlado: `Promise.all` em batches de 5 pra não saturar.
5. **Cursor pra lidar com timeout 150s do Supabase**: client-side loop chama a edge function passando `{ cursor: lastProcessedId | 0, limit: 10 }`; a function processa 10 rows por chamada, retorna `{ migrated, failed, nextCursor }`. Admin UI roda num `while (nextCursor !== null)`. Não precisa tabela auxiliar — cursor é o último `id` processado por tabela.
6. Relatório final agregado no client: `{ migrated: N, skipped: M, failed: [{table, id, reason}] }`. Retry de failed: botão "Tentar de novo os falhos" que passa apenas os IDs que deram erro.
7. Depois da migração: nada bloqueia novos inserts externos (deixo pro backlog; baixo risco agora).

**Bucket necessário:** `public-media` com policy `authenticated can read; service_role can write`. Criado via SQL migration.

**Arquivos:**
- `supabase/functions/migrate-external-media/index.ts` (edge function nova)
- SQL migration `create_public_media_bucket.sql`
- `src/pages/admin/AdminSettings.tsx` (botão "Migrar mídias externas")

### Bloco C — Boosters: cadeado + 3 liberados (3h + 8h node graph)

#### C.1 — Cadeado nos 10 boosters (30min)

**`src/types/boosters.ts`:** adicionar em `BoosterDef`:
```ts
locked?: boolean
emptyStateText?: string
```

Status explícito dos 13 boosters:

| Slug | Título | Status v1 |
|---|---|---|
| `influencer-lab` | Influencer Lab | 🟢 liberado |
| `grok` | Grok IA | 🟢 liberado |
| `edit-image` | Editar Imagem | 🟢 liberado |
| `prompt` | Gerador de Prompt | 🔒 locked |
| `nano-banana` | Nano Banana Pro | 🔒 locked |
| `nano-banana-2` | Nano Banana 2 | 🔒 locked |
| `veo` | Veo 3.1 | 🔒 locked |
| `motion` | Imitar Movimento | 🔒 locked |
| `human-engine` | Human Engine | 🔒 locked |
| `avatar` | Avatar Builder | 🔒 locked |
| `kling` | Kling 3.0 | 🔒 locked |
| `skin` | Pele Ultra Realista | 🔒 locked |
| `sora` | Sora Remover | 🔒 locked |

**`BoostersPage.tsx`:** cards com `locked=true` renderizam:
- Overlay escuro (absolute, `bg-black/60`)
- Ícone `<Lock>` grande no centro
- Badge "Em breve" no canto superior direito (substitui badge de créditos)
- Sem navegação no click (ou toast "Disponível em breve")
- Vídeo preview continua tocando

Cards liberados ganham badge verde "Disponível agora".

Texto no topo: "Liberamos 3 ferramentas na v1. Os outros 10 virão conforme rodarmos as integrações".

#### C.2 — Grok IA fix (30min)

**`src/types/boosters.ts`:** reordenar `inputs` do `grok`: `prompt` primeiro, `image_url` depois. Adicionar `emptyStateText: 'Crie vídeos a partir de uma imagem usando o Grok IA'`.

**`src/pages/BoosterDetailPage.tsx`:** usar `booster.emptyStateText` (se existir) como título do empty state no painel direito.

**Vídeo preview 404:** reusa URL existente que funciona. Opção: `https://static.higgsfield.ai/explore/lipsync-studio.mp4` (já em veo-video) — aceita duplicata pra não ficar fallback. Se o cliente não curtir depois, troca. Alternativa mais limpa: subir um vídeo próprio pro Storage durante migração do bloco B e apontar pra ele.

#### C.3 — Editar Imagem painel 2 colunas (2h)

Novo componente `src/pages/EditImagePage.tsx` substituindo o genérico `BoosterDetailPage` só pra esse booster (rota `/booster/edit-image`):

Layout grid 2 colunas desktop, stack mobile:

- **Esquerda — "Imagem original"**:
  - Upload dropzone (reaproveita lógica do `ImageInput` atual)
  - Preview da imagem uploaded
  - Textarea "O que trocar?" (`mask_prompt`)
  - Textarea "Como trocar?" (`edit_prompt`)
  - Botão "Gerar edição"
  - Créditos visíveis
- **Direita — "Resultado"**:
  - Se não gerado ainda: empty state com "Sua imagem editada aparece aqui"
  - Se gerando: loading skeleton
  - Se gerado: preview da imagem editada + slider before/after (usar `react-compare-slider` ou implementação manual simples com clip-path)
  - Botão "Baixar imagem"

Registrar rota `/booster/edit-image` antes da rota genérica `/booster/:tool` em `App.tsx` (ordem de match importa).

#### C.4 — Influencer Lab node graph (8h)

**Stack:** `@xyflow/react` (sucessor do `reactflow`). Instalar via `npm install @xyflow/react`.

**Rota:** `/booster/influencer-lab` com componente novo `src/pages/InfluencerLabPage.tsx`.

**Estrutura de layout:**

```
┌─────────────┬────────────────────────┬──────────────┐
│  Sidebar    │                        │   Painel     │
│  (nodes     │   Canvas do ReactFlow  │   direito    │
│  arrastáveis│   (drag, connect)      │   Resultado  │
│  por drag)  │                        │              │
└─────────────┴────────────────────────┴──────────────┘
```

**Sidebar esquerda:** 5 nodes draggable:
1. `ProductNode` (ícone Package) — seleção de produto viral
2. `AvatarNode` (ícone User) — seleção de avatar
3. `SceneNode` (ícone Image) — cenário pronto ou prompt custom
4. `SettingsNode` (ícone Sliders) — pose / estilo / melhorias / formato
5. `GenerateNode` (ícone Sparkles) — nó terminal que executa

**Canvas central:**
- `ReactFlow` com custom node types.
- Cada node tem inputs/outputs com tipos: `product`, `avatar`, `scene`, `settings` → flui pra `GenerateNode`.
- Usuário arrasta nodes da sidebar pro canvas, conecta com edges.
- Ao conectar: valida tipo. Ex: saída de `ProductNode` é `product`, aceita em `GenerateNode.inputs.product`.
- `GenerateNode` mostra botão "Executar workflow" que valida se todas entradas obrigatórias estão conectadas.

**Painel direito:** mesmo componente de resultado do Studio — mostra imagem gerada ou loading.

**Backend:** reutiliza 100% a edge function `generate-influencer-image` existente. O `InfluencerLabPage` só serializa o grafo em params equivalentes ao que o Studio envia.

**State:** `useNodesState` / `useEdgesState` do XYFlow. Persistência opcional em `localStorage` pra não perder workflow ao recarregar.

**Arquivos:**
- `src/pages/InfluencerLabPage.tsx`
- `src/components/influencer-lab/` (5 node components + sidebar + toolbar)
- `src/types/lab.ts` (tipos do grafo)
- `App.tsx` (rota nova antes da genérica)

**Risco conhecido:** 8h é tight. Mitigação: MVP = 5 nodes + validação simples de tipo + botão Executar. Polish visual (conexões animadas, minimap, zoom) deixo pro V2.1 se sobrar tempo.

**Cut-off decision:** se na sexta-feira 18h o Influencer Lab ainda não executa o workflow end-to-end (gera imagem partindo do grafo), flipo `locked: true` nele e libero só Grok + Editar Imagem no sábado. Melhor entregar 2 ferramentas sólidas que 3 com uma bugada.

### Bloco D — Calculadora 3 painéis (1.5h)

**`src/pages/CalculatorPage.tsx` refactor:**

Grid 3 colunas (`lg:grid-cols-3 gap-4`) no desktop, vertical mobile:

**Painel 1 "Configure sua operação"** (card grande):
- Seletor de 3 perfis (já existe, move pra aqui)
- 6 sliders com dicas (já existe)

**Painel 2 "Resumo da Operação"** (4 mini-cards dentro do painel):
- Cards GMV / Comissão / Vendas / ROI (já existem, move pra aqui)
- Detalhamento diário (lista já existe)

**Painel 3 "Projeções mensais"** (novo painel):
- Gráfico simples (ou tabela) de projeção mês 1 / 3 / 6 / 12
- Growth rate estimado (ex: +15% MoM baseado em posts/dia + conversão)
- Box "Dicas para maximizar" (já existe, move pra aqui)

**Arquivo:** `src/pages/CalculatorPage.tsx`.

### Bloco E — Prompt Generator no Studio IA (2h)

**Gatilho:** aparece depois que `result.data` (imagem) existe no `StudioPage.tsx`.

**UI:**
- Card expandável com título "✨ Quer transformar essa imagem em vídeo?"
- Ao expandir: formulário com
  - Textarea "Descreva o movimento que você quer" (placeholder: "Ex: pessoa segurando o produto e sorrindo pra câmera")
  - Radio "Duração": 5s / 10s
  - Radio "Estilo": Casual / Dramático / Clean
- Botão "Gerar prompt VEO 3.1"
- Chama edge function `enhance-prompt` com `{ description, type: 'video', duration, style }` e recebe `{ prompt: string }`.
- Exibe o prompt gerado em `<pre>` + botão "Copiar pra Área de Transferência" + botão "Usar no Veo" (abre `/booster/veo` com o prompt pré-preenchido via query param).

**Arquivos:**
- `src/components/studio/PromptGeneratorPanel.tsx` (novo)
- `src/pages/StudioPage.tsx` (renderiza condicional após geração)
- `src/pages/BoosterDetailPage.tsx` (ler `?prompt=` da query string e pré-preencher input `prompt`)
- `supabase/functions/enhance-prompt/index.ts` (verificar signature atual — a edge function hoje recebe `{ description, type: 'image'|'video' }`. Se não aceita `duration`/`style`, **estender pra aceitar**: adicionar esses campos opcionais ao payload JSON antes de chamar o Gemini. Confirmado como sub-task do Bloco E.)

### Bloco F — Referral Hotmart sck (3h)

**Fluxo:**

1. **Landing/Auth** já captura `?ref=VYRAL-XXXX` em `AuthPage.tsx` e salva em `localStorage.vyral_ref`.
2. **Novo:** quando o usuário vai pra página de compra do plano (hoje é redirect pro checkout Hotmart), appendo `&sck={localStorage.vyral_ref}` na URL.
3. **Hotmart config (cliente faz):** no painel Hotmart, ativar "Rastreamento de origem" nos 3 produtos (7zmngs50 / 84giouqu / ui1qxdw1). Isso faz o `sck` aparecer em `purchase.tracking.source` no webhook.
4. **`supabase/functions/hotmart-webhook`:** adicionar handler que, ao receber `event = PURCHASE_APPROVED`:
   - **Extrair `sck` com prioridade ordenada** (primeiro match não-vazio ganha):
     1. `purchase.tracking.source`
     2. `buyer.custom_fields.sck`
     3. `subscriber.code` (usado em webhooks mais antigos)
     4. Fallback: match por `buyer.email` em `referrals_pending`
   - Valida formato `VYRAL-[A-Z0-9]{6}`. Se inválido, ignora e loga.
   - Se match válido: busca `referral_codes WHERE code = ...`.
   - Cria `referral_conversions { referral_code_id, invited_user_id, event_type: 'paid', credits_awarded: REFERRAL_CREDITS[plan] }`.
   - Credita o referidor em `subscriptions` (`credits_remaining += credits_awarded`) — idempotente por transaction_id pra não creditar 2x se Hotmart reenviar.
5. **Fallback:** ao usuário criar conta com `localStorage.vyral_ref` setado, salvamos um registro `referrals_pending { referral_code, invited_email, created_at }`. Se o webhook vier sem sck mas o `buyer.email` bater com `referrals_pending`, aplica o crédito do mesmo jeito.

**Tabelas:** `referral_codes` e `referral_conversions` já existem. Criar migration para `referrals_pending` (nova).

**Arquivos:**
- `supabase/functions/hotmart-webhook/index.ts` (estender)
- SQL migration `create_referrals_pending.sql`
- `src/pages/AuthPage.tsx` (salvar ref em localStorage + criar pending ao signup)
- `src/pages/CreditsPage.tsx` / wherever checkout link é gerado (anexar `sck`)

**Instruções pro cliente:** documento passo-a-passo de como ativar "Rastreamento de origem" no Hotmart. Entrego junto com a mensagem final.

## Estratégia de teste

Cada bloco é validado via Playwright MCP + Supabase MCP:

- **A (fix dados):** `SELECT count(*) FROM product_videos LEFT JOIN products ON ...` + Playwright em `/viral-videos` → ver 51 cards renderizados.
- **B (migração):** rodar a edge function → conferir `SELECT count(*) WHERE image_url LIKE '%mszdlupinucfzyzidttn%'` = 0 em todas as tabelas.
- **C.1 (cadeado):** Playwright `/booster` → ver 3 cards verdes + 10 cards com overlay escuro e badge "Em breve". Clicar um locked → toast.
- **C.2 (Grok):** Playwright `/booster/grok` → inputs na ordem Prompt→Imagem; empty-state text correto.
- **C.3 (Editar Imagem):** Playwright `/booster/edit-image` → layout 2 cols; upload + gen; slider before/after.
- **C.4 (Influencer Lab):** Playwright drag de node da sidebar pro canvas + conectar + executar. Ver crédito debitar + imagem.
- **D (Calc):** Playwright `/calculator` → 3 colunas visíveis no desktop; dados em cada painel.
- **E (Prompt Gen):** Studio gera imagem → painel "Prompt Generator" aparece → preenche + clica → recebe prompt texto. Botão "Usar no Veo" → `/booster/veo?prompt=...` preenchido.
- **F (Referral):** fluxo end-to-end não é testável sem Hotmart sandbox. Verifico manual: (a) link com ref salva em localStorage; (b) signup cria `referrals_pending`; (c) simular webhook call com payload Hotmart de teste → credita.

**Golden path final:** login → navega `/viral-videos` (vê 51 vídeos, não mais "nenhum encontrado") → navega `/templates` (renderiza rápido, sem lentidão) → vai pro Studio → gera imagem → usa Prompt Generator → vai pro Veo → sente o fluxo real de criar conteúdo.

## Verificação end-to-end final

1. `npm run build` → 0 erros TS.
2. Todos os bugs root-cause resolvidos (SQL confirma).
3. `/viral-videos`, `/templates`, `/studio` carregam em < 2s em aba incógnita.
4. Nenhuma request a `mszdlupinucfzyzidttn` ou `manuscdn.com` após migração.
5. 3 boosters 100% funcionais + 10 cadeados.
6. Playwright pass em todos os fluxos da seção "Estratégia de teste".
7. Instruções escritas pro cliente configurar o Hotmart.
8. Mensagem final pro cliente com o estado de cada ponto #01-#06.

## Commits previstos

1. `fix: link product_videos to products + LEFT JOIN tolerance`
2. `feat: migrate-external-media edge function + admin trigger`
3. `feat: lock UI on 10 boosters + "Em breve" badge`
4. `fix: grok-video input order + custom empty state text`
5. `feat: edit-image 2-column panel with before/after slider`
6. `feat: Influencer Lab visual workflow with XYFlow`
7. `refactor: calculator 3-panel layout (Configure/Resumo/Projeções)`
8. `feat: prompt-generator panel after studio image generation`
9. `feat: referral tracking via Hotmart sck + pending fallback`
10. `chore: docs and client instructions`

## Riscos conhecidos

- **Influencer Lab 8h é apertado.** Mitigação: reduzir a MVP (5 nodes + conexão tipo-checked + botão execute). Se não couber, voltar pra opção "Em breve" honesto no último momento — é melhor não entregar do que entregar bugado.
- **Migração de mídias pode bater timeout (edge function 150s).** Mitigação: rodar em batches via client-side loop chamando a function várias vezes com cursor. Cada run processa 10 rows.
- **Hotmart sck depende do cliente.** Mitigação: o fallback por email cobre 80% dos casos mesmo sem a config.
- **`@xyflow/react` adiciona ~150KB ao bundle.** Mitigação: code-splitting via `React.lazy` na rota `/booster/influencer-lab` pra não afetar load das outras páginas.
