import { exec } from "child_process";
import { promisify } from "util";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

const execAsync = promisify(exec);

interface BackupResult {
  success: boolean;
  filename?: string;
  url?: string;
  error?: string;
  size?: number;
}

/**
 * Creates a PostgreSQL database backup and uploads it to S3
 * @returns Promise with backup result
 */
export async function createDatabaseBackup(): Promise<BackupResult> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.sql`;
    const tempPath = `/tmp/${filename}`;

    // Extract database credentials from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL not configured");
    }

    // Parse DATABASE_URL: postgresql://user:password@host:port/database
    const urlMatch = dbUrl.match(/postgres(ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!urlMatch) {
      throw new Error("Invalid DATABASE_URL format. Expected PostgreSQL connection string.");
    }

    const [, , user, password, host, port, database] = urlMatch;

    // Create pg_dump command
    // Set PGPASSWORD environment variable to avoid password prompt
    const dumpCommand = `PGPASSWORD='${password.replace(/'/g, "\\'")}' pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F c -f ${tempPath}`;

    console.log(`[Backup] Starting database backup: ${filename}`);

    // Execute mysqldump
    await execAsync(dumpCommand);

    // Check file size
    const { stdout: sizeOutput } = await execAsync(`stat -c%s ${tempPath}`);
    const fileSize = parseInt(sizeOutput.trim());

    if (fileSize === 0) {
      throw new Error("Backup file is empty");
    }

    console.log(`[Backup] Backup created successfully (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    // Read backup file
    const { readFile } = await import("fs/promises");
    const backupData = await readFile(tempPath);

    // Upload to S3
    const s3Key = `backups/${filename}`;
    const { url } = await storagePut(s3Key, backupData, "application/sql");

    console.log(`[Backup] Backup uploaded to S3: ${url}`);

    // Clean up temp file
    await execAsync(`rm ${tempPath}`);

    // Notify owner
    await notifyOwner({
      title: "Backup Automático Concluído",
      content: `Backup do banco de dados criado com sucesso!\n\nArquivo: ${filename}\nTamanho: ${(fileSize / 1024 / 1024).toFixed(2)} MB\nData: ${new Date().toLocaleString("pt-BR")}`,
    });

    return {
      success: true,
      filename,
      url,
      size: fileSize,
    };
  } catch (error: any) {
    console.error("[Backup] Error creating backup:", error);

    // Notify owner of failure
    await notifyOwner({
      title: "Erro no Backup Automático",
      content: `Falha ao criar backup do banco de dados.\n\nErro: ${error.message}\nData: ${new Date().toLocaleString("pt-BR")}`,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Schedule automatic backups (call this from a cron job or scheduler)
 */
export async function scheduleBackup() {
  console.log("[Backup] Running scheduled backup...");
  const result = await createDatabaseBackup();
  
  if (result.success) {
    console.log(`[Backup] Scheduled backup completed: ${result.filename}`);
  } else {
    console.error(`[Backup] Scheduled backup failed: ${result.error}`);
  }
  
  return result;
}
