import { readFileSync } from 'fs';
import { config } from 'dotenv';
import pg from 'pg';

// Carregar variáveis de ambiente
config({ path: '.env.local' });

const { Client } = pg;

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não configurada');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado!');

    // Ler o script SQL
    const sqlScript = readFileSync('./EXECUTAR_NO_SUPABASE_V2.sql', 'utf-8');
    
    console.log('📝 Executando migração...');
    
    // Executar cada statement separadamente
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.length > 0) {
        try {
          await client.query(statement);
          // Log resumido
          const preview = statement.substring(0, 50).replace(/\n/g, ' ');
          console.log(`  ✓ ${preview}...`);
        } catch (err) {
          // Ignorar erros de tabela/índice já existente
          if (err.code === '42P07' || err.code === '42710') {
            console.log(`  ⏭ Já existe: ${statement.substring(0, 40)}...`);
          } else {
            console.error(`  ❌ Erro: ${err.message}`);
          }
        }
      }
    }

    console.log('\n✅ Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
