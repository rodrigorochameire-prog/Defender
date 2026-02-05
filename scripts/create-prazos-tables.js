// Script para criar as tabelas de prazos diretamente no banco
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createPrazosTables() {
  const client = await pool.connect();

  try {
    console.log('🔧 Criando tabelas de prazos...\n');

    // 1. Criar enum area_direito (se não existir)
    console.log('1. Criando enum area_direito...');
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE area_direito AS ENUM ('CRIMINAL', 'CIVEL', 'TRABALHISTA', 'EXECUCAO_PENAL', 'JURI');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('   ✅ Enum area_direito OK\n');

    // 2. Criar tabela tipo_prazos
    console.log('2. Criando tabela tipo_prazos...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tipo_prazos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        nome VARCHAR(150) NOT NULL,
        descricao TEXT,
        prazo_legal_dias INTEGER NOT NULL,
        area_direito area_direito NOT NULL DEFAULT 'CRIMINAL',
        contar_em_dias_uteis BOOLEAN DEFAULT false,
        aplicar_dobro_defensoria BOOLEAN DEFAULT true,
        tempo_leitura_dias INTEGER DEFAULT 10,
        termo_inicial VARCHAR(50) DEFAULT 'INTIMACAO',
        categoria VARCHAR(50),
        fase VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        workspace_id INTEGER REFERENCES workspaces(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS tipo_prazos_codigo_idx ON tipo_prazos(codigo);
      CREATE INDEX IF NOT EXISTS tipo_prazos_area_direito_idx ON tipo_prazos(area_direito);
      CREATE INDEX IF NOT EXISTS tipo_prazos_categoria_idx ON tipo_prazos(categoria);
      CREATE INDEX IF NOT EXISTS tipo_prazos_workspace_id_idx ON tipo_prazos(workspace_id);
    `);
    console.log('   ✅ Tabela tipo_prazos OK\n');

    // 3. Criar tabela feriados_forenses
    console.log('3. Criando tabela feriados_forenses...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS feriados_forenses (
        id SERIAL PRIMARY KEY,
        data DATE NOT NULL,
        nome VARCHAR(150) NOT NULL,
        tipo VARCHAR(30) NOT NULL DEFAULT 'FERIADO',
        abrangencia VARCHAR(30) DEFAULT 'NACIONAL',
        estado VARCHAR(2),
        comarca VARCHAR(100),
        tribunal VARCHAR(20),
        suspende_prazo BOOLEAN DEFAULT true,
        apenas_expediente BOOLEAN DEFAULT false,
        data_fim DATE,
        workspace_id INTEGER REFERENCES workspaces(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS feriados_forenses_data_idx ON feriados_forenses(data);
      CREATE INDEX IF NOT EXISTS feriados_forenses_tipo_idx ON feriados_forenses(tipo);
      CREATE INDEX IF NOT EXISTS feriados_forenses_abrangencia_idx ON feriados_forenses(abrangencia);
      CREATE INDEX IF NOT EXISTS feriados_forenses_estado_idx ON feriados_forenses(estado);
      CREATE INDEX IF NOT EXISTS feriados_forenses_tribunal_idx ON feriados_forenses(tribunal);
      CREATE INDEX IF NOT EXISTS feriados_forenses_workspace_id_idx ON feriados_forenses(workspace_id);
    `);
    console.log('   ✅ Tabela feriados_forenses OK\n');

    // 4. Criar tabela calculos_prazos
    console.log('4. Criando tabela calculos_prazos...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS calculos_prazos (
        id SERIAL PRIMARY KEY,
        demanda_id INTEGER REFERENCES demandas(id) ON DELETE CASCADE,
        tipo_prazo_id INTEGER REFERENCES tipo_prazos(id),
        tipo_prazo_codigo VARCHAR(50),
        data_expedicao DATE,
        data_leitura DATE,
        data_termo_inicial DATE,
        data_termo_final DATE NOT NULL,
        prazo_base_dias INTEGER NOT NULL,
        prazo_com_dobro_dias INTEGER NOT NULL,
        dias_uteis_suspensos INTEGER DEFAULT 0,
        area_direito VARCHAR(20),
        contado_em_dias_uteis BOOLEAN DEFAULT false,
        aplicou_dobro BOOLEAN DEFAULT true,
        tempo_leitura_aplicado INTEGER DEFAULT 10,
        observacoes TEXT,
        calculo_manual BOOLEAN DEFAULT false,
        workspace_id INTEGER REFERENCES workspaces(id),
        calculado_por_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS calculos_prazos_demanda_id_idx ON calculos_prazos(demanda_id);
      CREATE INDEX IF NOT EXISTS calculos_prazos_tipo_prazo_id_idx ON calculos_prazos(tipo_prazo_id);
      CREATE INDEX IF NOT EXISTS calculos_prazos_data_termo_final_idx ON calculos_prazos(data_termo_final);
      CREATE INDEX IF NOT EXISTS calculos_prazos_workspace_id_idx ON calculos_prazos(workspace_id);
    `);
    console.log('   ✅ Tabela calculos_prazos OK\n');

    // 5. Adicionar coluna tipo_prazo_id à tabela demandas (se não existir)
    console.log('5. Adicionando coluna tipo_prazo_id em demandas...');
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE demandas ADD COLUMN tipo_prazo_id INTEGER REFERENCES tipo_prazos(id);
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END $$;

      DO $$ BEGIN
        ALTER TABLE demandas ADD COLUMN data_expedicao DATE;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END $$;
    `);
    console.log('   ✅ Colunas adicionadas em demandas OK\n');

    console.log('🎉 Todas as tabelas de prazos foram criadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createPrazosTables();
