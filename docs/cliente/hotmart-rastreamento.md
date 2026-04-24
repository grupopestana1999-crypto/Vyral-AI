# Ativar "Rastreamento de origem" (SRC) no Hotmart

Pra o sistema de indicações (créditos grátis) funcionar 100% automático, precisa ativar UM check em cada produto da Hotmart. Isso faz o link `?ref=VYRAL-XXXX` que os usuários compartilham voltar corretamente pro webhook — aí o sistema credita o indicador sozinho, sem você precisar mexer em nada.

## Passo a passo (2 minutos)

1. Entra em **hotmart.com/user** com a sua conta.
2. Abre **Produtos → Meus produtos**.
3. Pra cada um dos 3 produtos (Starter / Creator / Pro), faz:
   - Clica no produto pra abrir.
   - Vai em **Configurações → Avançado** (ou a aba que tiver "Rastreamento").
   - Encontra a opção **Rastreamento de origem (SRC)** — também pode aparecer como **"Ativar SRC"** ou **"Source Code tracking"**.
   - Marca **✅ Ativado**.
   - **Salva**.

## Códigos dos produtos (referência)

| Plano | Código da oferta | Valor |
|---|---|---|
| Starter | `7zmngs50` | R$ 147 |
| Creator | `84giouqu` | R$ 197 |
| Pro | `ui1qxdw1` | R$ 297 |

## Como testar que funcionou

1. Abre uma aba anônima.
2. Cola: `https://appvyral.online/auth?ref=VYRAL-TESTE1` (código de teste).
3. Acessa. O app mostra "Indicado por VYRAL-TESTE1".
4. Simule o clique no botão de comprar. O Hotmart abre o checkout.
5. **Na URL do Hotmart**, tem que aparecer `&sck=VYRAL-TESTE1` no final. Se aparecer: tracking tá OK.

Se o `sck` não aparecer na URL do checkout: o rastreamento não foi ativado. Revisa o passo 3.

## Cenário redundante: fallback por email

Mesmo que você esqueça de ativar o tracking, o sistema tem um fallback: se o usuário **registrou a conta** usando o link com `?ref=`, guardamos esse código numa tabela interna. Quando o webhook do Hotmart chega, se não vier com `sck`, a gente cruza por email e credita do mesmo jeito.

Resumo: ativar o SRC faz funcionar pra **100% dos casos**. Sem ativar, funciona pra **80%** (só os que registraram com o link antes de comprar).

## O que acontece depois

Quando o indicado compra um plano aprovado, no mesmo instante:
- O indicador recebe **100 / 200 / 300 créditos** (conforme o plano DO INDICADOR).
- Aparece na tela dele em **Créditos Grátis**.
- É enviado email de notificação (quando Resend tiver templates de referral configurados — backlog).

Nada disso precisa de ação manual sua. 100% automático.

## Qualquer problema

Se não funcionar após ativar, me manda print da tela de configuração + um exemplo de link de teste que você fez. Eu diagnostico no log do webhook (tabela `credit_usage_log` no Supabase) e ajusto.
