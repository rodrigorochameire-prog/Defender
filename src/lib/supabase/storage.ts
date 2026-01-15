import { getSupabaseAdmin } from "./client";

// Buckets disponíveis
const BUCKETS = {
  PET_PHOTOS: "pet-photos",
  DOCUMENTS: "documents",
  WALL_MEDIA: "wall-media",
} as const;

type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/**
 * Faz upload de uma foto de pet
 * Path: pets/{petId}/{timestamp}-{random}.{ext}
 */
export async function uploadPetPhoto(
  file: File,
  petId: number
): Promise<{ url: string; path: string }> {
  return uploadFile(file, BUCKETS.PET_PHOTOS, `pets/${petId}`);
}

/**
 * Faz upload de um documento de pet
 * Path: pets/{petId}/{timestamp}-{random}.{ext}
 */
export async function uploadDocument(
  file: File,
  petId: number
): Promise<{ url: string; path: string }> {
  return uploadFile(file, BUCKETS.DOCUMENTS, `pets/${petId}`);
}

/**
 * Faz upload de mídia do mural
 * Path: posts/{timestamp}-{random}.{ext}
 */
export async function uploadWallMedia(
  file: File
): Promise<{ url: string; path: string }> {
  return uploadFile(file, BUCKETS.WALL_MEDIA, "posts");
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
  petId: number
): Promise<{ url: string; path: string }> {
  const supabase = getSupabaseAdmin();

  const fileExt = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const uniqueName = `pets/${petId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(BUCKETS.PET_PHOTOS)
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
    .from(BUCKETS.PET_PHOTOS)
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
  bucket: BucketName = BUCKETS.PET_PHOTOS
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

export async function deletePetPhoto(path: string): Promise<void> {
  return deleteFile(path, BUCKETS.PET_PHOTOS);
}

export async function deleteDocument(path: string): Promise<void> {
  return deleteFile(path, BUCKETS.DOCUMENTS);
}

export async function deleteWallMedia(path: string): Promise<void> {
  return deleteFile(path, BUCKETS.WALL_MEDIA);
}

/**
 * Gera uma URL assinada para acesso temporário
 */
export async function getSignedUrl(
  path: string,
  bucket: BucketName = BUCKETS.PET_PHOTOS,
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
  bucket: BucketName = BUCKETS.PET_PHOTOS
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
export const uploadImage = uploadPetPhoto;
export const deleteImage = deletePetPhoto;
export const listImages = async (folder: string = "pets") => {
  const files = await listFiles(folder, BUCKETS.PET_PHOTOS);
  return files.map(f => f.url);
};
