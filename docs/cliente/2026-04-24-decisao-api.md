# Decisão sobre API de dados virais — mensagem pro cliente

## Contexto

Cliente pediu avaliação de 2 APIs como fonte pros dados virais (Produtos / Vídeos / Criadores): TikTok Shop API oficial (TTS API) e Apify.

## Texto pronto pra WhatsApp

---

Fala irmão, resposta às suas dúvidas sobre a API:

**1) TikTok Shop API oficial (TTS API) — NÃO serve pra gente.**

Pesquisei a fundo e ela é feita pra **sellers gerirem a própria loja** (cadastrar produtos, ver pedidos, calcular frete). NÃO tem endpoint pra descobrir produtos virais de **outros** sellers. Além disso precisa de aprovação como Partner TikTok + compliance review que leva semanas. Cancelado.

**2) Apify — SIM, essa resolve.**

Tem 2 opções boas lá:

- **(a) Trending Products Scraper** ($0.00005 por rodada, ~R$5/mês com 1 atualização diária). Entrega: top produtos virais TikTok Shop com GMV, vendas, número de criadores promovendo, categorias. Cobre 80%+ do que precisamos.

- **(b) TikTok Shop Scraper completo** ($20/mês flat). Cobertura maior: produtos + analytics de loja + perfis de criadores. Serve pras 3 abas (Produtos / Vídeos / Criadores) via 1 fonte.

**Minha recomendação:** começa com a **(a)** porque é 4x mais barato e cobre o essencial (produtos + info de criadores). Se depois faltar dado específico de vídeos, a gente complementa com outro actor. Com qualquer uma, eu crio uma edge function que puxa 1x por dia e popula o banco sozinha — você não precisa mais cadastrar nada na mão.

**3) Descoberta importante antes de você pagar:**

Fui investigar o TikShop IA por dentro (via Playwright, devagar). Eles **NÃO usam API paga**. Usam Supabase direto igual a gente, com a mesma query de produtos. A sensação de "mais rápido" que você tinha lá acho que vem de cache local do browser deles + provável diferença de região do servidor. Digo isso pra você decidir consciente se faz sentido pagar API mesmo sabendo que a referência não paga.

Resumindo: **pagar Apify é válido pra você não precisar cadastrar produto na mão e ter dados frescos toda manhã**. Não é por velocidade — a velocidade a gente resolve com código (ver ponto 4).

**4) Sobre o bug dos cards cinzas que ficam eternos**

Isso NÃO é fonte de dados, é bug nosso mesmo. Quando sua conexão dá um engasgo o código fica preso esperando uma resposta que nunca chega. **Já estou corrigindo AGORA**, vai pro ar em ~1h. Comportamento novo:
- Timeout de 12 segundos em qualquer request.
- Quando der erro, aparece mensagem clara + botão "Tentar de novo" em vez do skeleton infinito.
- Sessão auto-refresh quando o token expirar.
- Cache-control forçado pro index.html pra você sempre pegar o build novo após deploy.

Isso vai resolver a MAIORIA dos casos de "tela vazia até eu atualizar" — se acontecer de novo depois do deploy, você vai ver **o erro exato** em vez de ficar no escuro.

---

**Me responde qual caminho quer seguir:**

1. **Apify opção (a)** — eu monto edge function + cron, você só cria conta na apify.com e me manda um token API
2. **Apify opção (b)** — idem, mas com o scraper mais caro/completo
3. **Sem API paga** — continua seed manual via admin (com o bug já corrigido)

Se escolher 1 ou 2, os passos pra você:
1. Entra em [apify.com/sign-up](https://apify.com/sign-up) e cria conta (free tier serve pra testar)
2. Em "Settings → Integrations" copia o "Personal API token"
3. Me manda aqui que eu ligo no Vyral AI

Total de setup depois que você me passar o token: ~30 minutos.
