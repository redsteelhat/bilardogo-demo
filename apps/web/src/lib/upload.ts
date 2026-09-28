'use client';
import { getSupabaseBrowser } from './supabase/client';

type Signed = { path: string; token: string };
type Bucket = 'public-media' | 'chat-media' | 'business-docs';

/**
 * Sunucudan alınan imzalı yükleme bağlantısıyla dosyayı doğrudan Supabase Storage'a yükler.
 * @param requestUpload tRPC mutation: dosya bilgisiyle imzalı yol ister (sunucu tür/boyut doğrular)
 */
export async function uploadFile<T extends Signed>(
  bucket: Bucket,
  file: File,
  requestUpload: (info: { fileName: string; contentType: string; size: number }) => Promise<T>,
): Promise<T> {
  const signed = await requestUpload({ fileName: file.name, contentType: file.type || 'application/octet-stream', size: file.size });
  const { error } = await getSupabaseBrowser().storage.from(bucket).uploadToSignedUrl(signed.path, signed.token, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Yükleme başarısız: ${error.message}`);
  return signed;
}

/** Büyük fotoğrafları yüklemeden önce küçültür (uzun kenar 1600px, JPEG %82). */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type.includes('heic') || file.type.includes('heif')) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}
