import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Tenta obter a URL de conexão do banco
const connectionString = process.env.DATABASE_URL || 
  `postgres://postgres:[SUA_SENHA_DO_BANCO]@db.mlldruldahfgyskmejbs.supabase.co:5432/postgres`;

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function rodarSQL() {
  try {
    await client.connect();
    console.log('Conectado ao banco de dados Supabase!');

    const sql = `
      create table if not exists categorias (
        id uuid primary key default gen_random_uuid(),
        created_at timestamp with time zone default now(),
        nome text not null
      );

      alter table categorias enable row level security;

      drop policy if exists "Permitir acesso em categorias" on categorias;
      create policy "Permitir acesso em categorias" on categorias for all using (true);
    `;

    await client.query(sql);
    console.log('✅ Tabela "categorias" e políticas de acesso criadas com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao executar SQL:', err.message);
  } finally {
    await client.end();
  }
}

rodarSQL();