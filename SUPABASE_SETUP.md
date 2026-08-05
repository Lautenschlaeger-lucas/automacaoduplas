# Configuração do Supabase

## 1. Criar o projeto

1. Acesse **https://supabase.com** e crie uma conta (grátis).
2. Clique em **New project**:
   - **Name:** `painel-implantacao`
   - **Database password:** anote em um lugar seguro
   - **Region:** a mais próxima de você (ex: São Paulo)
   - Clique em **Create new project** e aguarde (1-2 min).

## 2. Rodar o banco de dados

1. No menu lateral, vá em **SQL Editor**.
2. Clique em **New query**.
3. Cole **todo o conteúdo** do arquivo `supabase/schema.sql`.
4. Clique em **Run**.
5. Teve sucesso se aparecer as tabelas `profiles`, `clients` e `tickets` na aba **Table Editor**.

> O schema já cria as políticas de segurança (RLS), os gatilhos automáticos e
> clientes/tickets de exemplo para você testar.

## 3. Pegar as chaves de conexão

1. Menu lateral → **Project Settings** → **API** (ou **Data API**).
2. Copie:
   - **Project URL** (ex: `https://abc123.supabase.co`)
   - **anon public** (string longa `eyJ...`)

## 4. Configurar o app

1. Na raiz do projeto, copie o `.env.example` para `.env`:
   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
   ```
2. Rode o app:
   ```
   npm install
   npm run dev
   ```

## 5. Criar os usuários

- Abra o app no navegador e use **Criar conta** — cada usuário cadastrado já
  entra com o papel **Técnica**.
- Para definir quem é **Treinamento** e quem é **Admin**, faça:
  1. Menu lateral → **Authentication** → **Users**, abra o usuário e anote o UUID.
  2. Voce pode alterar o papel direto no **Table Editor** > `profiles` (mude a coluna `role`),
     ou rodar no SQL Editor:
     ```sql
     update public.profiles set role = 'treinamento' where id = 'UUID_DO_USUARIO';
     update public.profiles set role = 'admin' where id = 'UUID_DO_ADMIN';
     ```

## Dicas

- **Realtime:** o Kanban atualiza em tempo real quando alguém mexe. Já está habilitado no schema.
- Para apagar os dados de exemplo depois:
  ```sql
  delete from public.tickets;
  delete from public.clients where codigo in ('324','299','301','287','330');
  ```