import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Cria um hash seguro da senha
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifica se a senha corresponde ao hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Valida requisitos mínimos da senha
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push("A senha deve ter no mínimo 6 caracteres");
  }

  if (password.length > 100) {
    errors.push("A senha deve ter no máximo 100 caracteres");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
