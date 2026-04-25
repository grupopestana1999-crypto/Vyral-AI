# Auth setup — 2 toggles que faltam você ativar no Supabase

Esses 2 ajustes precisam ser feitos no dashboard do Supabase porque não dá pra fazer via SQL/código. São cliques rápidos, somando uns 3 minutos no total.

## 1) Block Compromised Passwords (Have I Been Pwned)

**Por quê:** quando alguém vai cadastrar conta com uma senha que já vazou em algum data breach famoso (`123456`, `password`, etc.), o Supabase consulta o HaveIBeenPwned e bloqueia. Reduz drasticamente account takeover.

**Como ativar:**

1. Entra em [supabase.com/dashboard](https://supabase.com/dashboard) e seleciona o projeto **Vyral IA**.
2. No menu lateral, **Authentication → Policies** (ou direto em [esse link](https://supabase.com/dashboard/project/mdueuksfunifyxfqpmdv/auth/providers)).
3. Procura a opção **"Block compromised passwords"** ou **"Leaked password protection"** (Auth provider settings → Email).
4. Marca **enabled**.
5. Salva.

## 2) Email Confirmation (signup com confirmação obrigatória)

**Por quê:** garante que o email que o usuário cadastrou existe de verdade antes de liberar acesso. Bloqueia signups com email inválido / typos / fake.

**Como confirmar / ativar:**

1. Mesma área: **Authentication → Providers → Email**.
2. Procura **"Confirm email"** (ou "Enable email confirmations").
3. Se já estiver **enabled** (provavelmente está): nada a fazer.
4. Se estiver **disabled**: marca enabled e salva.

**Importante:** depois disso, todo cadastro novo só consegue fazer login depois que o usuário clicar no link de confirmação que chega no email dele. Se quiser uma experiência mais fluida (signup → login direto), pode deixar desabilitado e a gente trata fraude depois — mas o caminho recomendado pra produção é ativado.

## 3) (Bônus se quiser endurecer ainda mais) Rate limiting de signup

**Por quê:** evita bot criando 1000 contas por minuto.

**Como:** mesma área, **Auth → Rate Limits**. Setar `Sign up` em algo tipo 5 por hora por IP. Default já é razoável; só ajuste se vir spam.

## Resumo

Depois desses 2 toggles, o aviso laranja "Leaked Password Protection Disabled" some do dashboard e seu app fica resistente aos 2 vetores de ataque mais comuns em SaaS (password reuse + email fake).
