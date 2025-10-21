import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase
// ⚠️ IMPORTANTE: Estas chaves são usadas APENAS no servidor (API routes)
// O Next.js garante que código em /app/api/* nunca é exposto no navegador
const supabaseUrl = 'https://vlnekqfpasxsrkrbhfrf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbmVrcWZwYXN4c3JrcmJoZnJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk4Nzk4OCwiZXhwIjoyMDc2NTYzOTg4fQ.rk_dXRvolN6yukgiUjFmHAh7dnOYJbiDsx687dOBH-o'

// Cliente com service role key para operações do servidor
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
