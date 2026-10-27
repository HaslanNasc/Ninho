# 🪹 Ninho — Casa, Finanças e Rotina Compartilhada

Aplicativo web (PWA) leve para você e a Bianca administrarem finanças pessoais
(privadas), além de inventário/mercado, calendário, reforma, pets e compras
(compartilhados). Funciona no celular e no computador, dá pra instalar na tela
inicial e tem botão pra limpar o cache.

> **Importante / honestidade:** este pacote é o **código-fonte completo e pronto
> para publicar**. Ele NÃO vem com um site já no ar, porque hospedagem e banco de
> dados exigem **a sua conta** (gratuita). São ~10 minutos seguindo o passo a
> passo abaixo. Enquanto você não configurar, o app já abre e funciona em
> **Modo Demonstração** (dados salvos só no seu navegador, sem login real nem
> sincronização entre aparelhos).

---

## O que já está pronto
- Login por **telefone + senha** (sem precisar de SMS pago — veja a nota abaixo).
- Perfis com nome/apelido e foto; casa compartilhada com convite por código.
- **Privacidade real no banco** (RLS): finanças pessoais privadas; casa compartilhada.
- Dashboard com saldos, dívidas, gráfico de distribuição, compromissos e mercado.
- Contas/instituições, dívidas com **pagamento parcial**, caixinhas/metas com contribuições.
- Inventário/mercado com **quantidade + unidade** (corrigido: nunca vira porcentagem).
- Reforma com orçamento, itens e **parcelas pagas por pessoas diferentes**.
- Pets com remédios, higiene, roupinhas, brinquedos e lembretes.
- Compras parceladas com **recibo em PNG** e botão de compartilhar.
- Calendário/tarefas com abas Pendentes / Concluídos / Todos.
- PWA instalável + service worker (network-first, corrige o “quebra ao voltar”).

---

## Passo a passo para publicar (grátis)

### 1) Criar o banco (Supabase)
1. Crie uma conta em https://supabase.com e um **New project** (plano Free).
2. Guarde a senha do banco. Espere o projeto subir (~2 min).
3. Menu **SQL Editor > New query**: cole o conteúdo de `supabase/schema.sql` e clique **Run**.
4. Nova query: cole `supabase/policies.sql` e **Run**.
5. Menu **Storage > New bucket**: crie um bucket chamado **`ninho`** (deixe privado).
6. Menu **Authentication > Providers > Email**: mantenha **Email** ativo e
   **desligue “Confirm email”** (Authentication > Settings), para o login por
   telefone funcionar na hora.

### 2) Conectar o app
1. Em **Project Settings > API**, copie **Project URL** e a chave **anon public**.
2. Abra `app/config.js` e preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

### 3) Hospedar (escolha 1 — todas grátis)
- **Netlify Drop (mais fácil):** acesse https://app.netlify.com/drop e arraste a
  pasta `app/`. Pronto, vem uma URL pública.
- **Vercel:** `npm i -g vercel` e rode `vercel` dentro de `app/`.
- **GitHub Pages:** suba a pasta `app/` num repositório e ative Pages.
- **Cloudflare Pages:** conecte o repositório e defina a pasta `app/`.

Não precisa de build: são arquivos estáticos.

### 4) Primeiro uso
1. Abra a URL, toque em **Criar conta**, informe telefone + senha.
2. Em **Perfil e configurações**, gere um **código de convite** e mande pra Bianca.
3. Ela cria a conta dela e usa **“Tenho um código”** para entrar na mesma casa.
4. No celular, use **“Adicionar à tela inicial”** para instalar como app.

---

## Nota sobre login por telefone
Login direto por telefone com SMS exige um provedor pago (Twilio etc.). Para
manter **custo zero**, o app usa o telefone como identificador e cria um e-mail
interno (`u<numero>@ninho.app`) no Supabase — você só digita telefone + senha, a
conversão é automática e invisível. Se um dia quiser SMS de verdade, basta ativar
o provedor de telefone no Supabase.

## Segurança
- Senhas ficam no Supabase (hash), nunca em texto puro nem no código.
- A chave `anon` pode ficar no frontend; **nunca** coloque a `service_role`.
- As políticas RLS garantem no servidor que dados privados de uma pessoa não
  aparecem para a outra — não é só “esconder na tela”.

## Manutenção / backup
- Exporte seus dados em **Relatórios > Baixar JSON**.
- Backup do banco: Supabase > Database > Backups.
- Ao publicar uma atualização, troque a versão em `sw.js` (`ninho-vX`) para limpar
  o cache antigo automaticamente. O app também tem **“Limpar cache”** no menu.

## Estrutura
```
ninho/
  app/            → o aplicativo (publique esta pasta)
    index.html, styles.css, app.js, db.js, config.js
    sw.js, manifest.webmanifest, icon-192.png, icon-512.png
  supabase/
    schema.sql    → tabelas
    policies.sql  → segurança (RLS) + gatilhos + storage
  .env.example
  README.md
  RELATORIO_FINAL.md
```
