import { config } from 'dotenv';
import pg from 'pg';

// Carregar variáveis de ambiente
config({ path: '.env.local' });

const { Client } = pg;

// SQL das tabelas de alimentação
const migrations = [
  // 1. Tabela pet_food_plans
  `CREATE TABLE IF NOT EXISTS pet_food_plans (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    food_type VARCHAR(50) NOT NULL,
    brand VARCHAR(200) NOT NULL,
    product_name VARCHAR(200),
    daily_amount INTEGER NOT NULL,
    portions_per_day INTEGER NOT NULL DEFAULT 2,
    portion_times TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_date TIMESTAMP NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // 2. Tabela pet_food_inventory
  `CREATE TABLE IF NOT EXISTS pet_food_inventory (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    brand VARCHAR(200) NOT NULL,
    product_name VARCHAR(200),
    quantity_received INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    received_date TIMESTAMP NOT NULL DEFAULT NOW(),
    expiration_date TIMESTAMP,
    batch_number VARCHAR(100),
    notes TEXT,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // 3. Tabela pet_food_history
  `CREATE TABLE IF NOT EXISTS pet_food_history (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    food_plan_id INTEGER REFERENCES pet_food_plans(id) ON DELETE SET NULL,
    brand VARCHAR(200) NOT NULL,
    product_name VARCHAR(200),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    acceptance VARCHAR(20),
    digestion VARCHAR(20),
    stool_quality VARCHAR(20),
    coat_condition VARCHAR(20),
    energy_level VARCHAR(20),
    allergic_reaction BOOLEAN DEFAULT false,
    allergic_details TEXT,
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    notes TEXT,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // 4. Tabela pet_treats
  `CREATE TABLE IF NOT EXISTS pet_treats (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    treat_type VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    brand VARCHAR(200),
    purpose VARCHAR(100),
    frequency VARCHAR(50),
    max_per_day INTEGER,
    calories_per_unit INTEGER,
    acceptance VARCHAR(20),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // 5. Tabela pet_natural_food
  `CREATE TABLE IF NOT EXISTS pet_natural_food (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    meal_type VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    ingredients TEXT,
    protein_source VARCHAR(200),
    portion_size INTEGER,
    frequency VARCHAR(50),
    preparation_notes TEXT,
    acceptance VARCHAR(20),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // Índices
  `CREATE INDEX IF NOT EXISTS idx_pet_food_plans_pet_id ON pet_food_plans(pet_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pet_food_inventory_pet_id ON pet_food_inventory(pet_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pet_food_history_pet_id ON pet_food_history(pet_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pet_treats_pet_id ON pet_treats(pet_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pet_natural_food_pet_id ON pet_natural_food(pet_id)`,
];

async function runFoodMigration() {
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
    console.log('');
    console.log('📝 Executando migração das tabelas de alimentação...');
    console.log('');
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const sql of migrations) {
      try {
        await client.query(sql);
        const preview = sql.substring(0, 60).replace(/\n/g, ' ').replace(/\s+/g, ' ');
        console.log(`  ✅ ${preview}...`);
        successCount++;
      } catch (err) {
        if (err.code === '42P07' || err.code === '42710') {
          const preview = sql.substring(0, 50).replace(/\n/g, ' ').replace(/\s+/g, ' ');
          console.log(`  ⏭️  Já existe: ${preview}...`);
          skipCount++;
        } else {
          console.error(`  ❌ Erro: ${err.message}`);
          console.error(`     SQL: ${sql.substring(0, 80)}...`);
          errorCount++;
        }
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 Resumo da Migração:');
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ⏭️  Ignorados (já existiam): ${skipCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    if (errorCount === 0) {
      console.log('🎉 Migração concluída com sucesso!');
      console.log('');
      console.log('📋 Tabelas criadas/verificadas:');
      console.log('   • pet_food_plans (Planos de alimentação)');
      console.log('   • pet_food_inventory (Estoque de ração)');
      console.log('   • pet_food_history (Histórico e reações)');
      console.log('   • pet_treats (Petiscos)');
      console.log('   • pet_natural_food (Alimentação natural)');
    } else {
      console.log('⚠️  Migração concluída com alguns erros. Verifique acima.');
    }
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runFoodMigration();
