import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não está definida');
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

const email = 'rodrigorochameire@gmail.com';
const newPassword = 'Defesa9dp*';

try {
  // Hash da nova senha
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Atualizar senha no banco
  await db.execute(`
    UPDATE users 
    SET password = '${hashedPassword}', 
        updated_at = NOW() 
    WHERE email = '${email}'
  `);
  
  console.log('✅ Senha resetada com sucesso!');
  console.log(`Email: ${email}`);
  console.log(`Nova senha: ${newPassword}`);
  
} catch (error) {
  console.error('❌ Erro:', error.message);
} finally {
  await client.end();
}
