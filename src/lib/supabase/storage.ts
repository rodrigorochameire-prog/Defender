import { getSupabaseAdmin } from "./client";

// Buckets disponíveis
const BUCKETS = {
  PHOTOS: "photos",
  DOCUMENTS: "documents",
} as const;

type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/**
 * Faz upload de uma foto
 * Path: {folder}/{timestamp}-{random}.{ext}
 */
export async function uploadPhoto(
  file: File,
  folder: string = "uploads"
): Promise<{ url: string; path: string }> {
  return uploadFile(file, BUCKETS.PHOTOS, folder);
}

/**
 * Faz upload de um documento
 * Path: {folder}/{timestamp}-{random}.{ext}
 */
export async function uploadDocument(
  file: File,
  folder: string = "documents"
): Promise<{ url: string; path: string }> {
  return uploadFile(file, BUCKETS.DOCUMENTS, folder);
}

/**
 * Função genérica de upload
 */
async function uploadFile(
  file: File,
  bucket: BucketName,
  folder: string
): Promise<{ url: string; path: string }> {
  const supabase = getSupabaseAdmin();

  // Gerar nome único para o arquivo
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Upload do arquivo
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    console.error("Erro no upload:", error);
    throw new Error(`Falha no upload: ${error.message}`);
  }

  // Para buckets privados, gerar URL assinada
  const { data: urlData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 ano

  if (!urlData?.signedUrl) {
    // Fallback para URL pública
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
    
    return {
      url: publicUrlData.publicUrl,
      path: data.path,
    };
  }

  return {
    url: urlData.signedUrl,
    path: data.path,
  };
}

/**
 * Faz upload de uma imagem a partir de um Buffer
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  folder: string = "uploads"
): Promise<{ url: string; path: string }> {
  const supabase = getSupabaseAdmin();

  const fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(BUCKETS.PHOTOS)
    .upload(uniqueName, buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });

  if (error) {
    console.error("Erro no upload:", error);
    throw new Error(`Falha no upload: ${error.message}`);
  }

  const { data: urlData } = await supabase.storage
    .from(BUCKETS.PHOTOS)
    .createSignedUrl(data.path, 60 * 60 * 24 * 365);

  return {
    url: urlData?.signedUrl || "",
    path: data.path,
  };
}

/**
 * Deleta um arquivo do storage
 */
export async function deleteFile(
  path: string,
  bucket: BucketName = BUCKETS.PHOTOS
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error("Erro ao deletar:", error);
    throw new Error(`Falha ao deletar: ${error.message}`);
  }
}

export async function deletePhoto(path: string): Promise<void> {
  return deleteFile(path, BUCKETS.PHOTOS);
}

export async function deleteDocument(path: string): Promise<void> {
  return deleteFile(path, BUCKETS.DOCUMENTS);
}

/**
 * Gera uma URL assinada para acesso temporário
 */
export async function getSignedUrl(
  path: string,
  bucket: BucketName = BUCKETS.PHOTOS,
  expiresIn: number = 60 * 60
): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("Erro ao gerar URL assinada:", error);
    throw new Error(`Falha ao gerar URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Lista arquivos de uma pasta
 */
export async function listFiles(
  folder: string,
  bucket: BucketName = BUCKETS.PHOTOS
): Promise<Array<{ name: string; url: string }>> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder);

  if (error) {
    console.error("Erro ao listar:", error);
    return [];
  }

  const files = await Promise.all(
    data.map(async (file) => {
      const path = `${folder}/${file.name}`;
      const { data: urlData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24);

      return {
        name: file.name,
        url: urlData?.signedUrl || "",
      };
    })
  );

  return files;
}

export { BUCKETS };

// Compatibilidade
export const uploadImage = uploadPhoto;
export const deleteImage = deletePhoto;
export const listImages = async (folder: string = "uploads") => {
  const files = await listFiles(folder, BUCKETS.PHOTOS);
  return files.map(f => f.url);
};
