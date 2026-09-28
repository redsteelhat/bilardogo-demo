import { MEDIA_LIMITS } from '@bilardogo/domain';
import { z } from 'zod';
import type { Bucket } from '../services/types';
import { badRequest, forbidden } from './errors';

export const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(3).max(100),
  size: z.number().int().positive(),
});
export type UploadRequest = z.infer<typeof uploadRequestSchema>;

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'application/pdf': 'pdf',
};

function rand() {
  const b = new Uint8Array(9);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export type MediaKind = 'image' | 'video' | 'image_or_video' | 'document';

/** Dosya türünü ve boyutunu doğrular, benzersiz bir yol üretir. */
export function buildUploadPath(prefix: string, req: UploadRequest, kind: MediaKind): { path: string; mediaType: 'image' | 'video' | null } {
  const isImage = (MEDIA_LIMITS.imageTypes as readonly string[]).includes(req.contentType);
  const isVideo = (MEDIA_LIMITS.videoTypes as readonly string[]).includes(req.contentType);
  const isDoc = (MEDIA_LIMITS.documentTypes as readonly string[]).includes(req.contentType);
  if (kind === 'image' && !isImage) badRequest('Yalnız görsel yükleyebilirsin (JPG, PNG, WEBP, HEIC).');
  if (kind === 'video' && !isVideo) badRequest('Yalnız video yükleyebilirsin (MP4, MOV, WEBM).');
  if (kind === 'image_or_video' && !isImage && !isVideo) badRequest('Yalnız fotoğraf veya video paylaşılabilir.');
  if (kind === 'document' && !isDoc) badRequest('Belge PDF, JPG veya PNG olmalı.');
  if (isImage && kind !== 'document' && req.size > MEDIA_LIMITS.imageBytes) badRequest('Görsel en fazla 10 MB olabilir.');
  if (isVideo && req.size > MEDIA_LIMITS.videoBytes) badRequest('Video en fazla 50 MB olabilir.');
  if (kind === 'document' && req.size > MEDIA_LIMITS.documentBytes) badRequest('Belge en fazla 15 MB olabilir.');
  const ext = EXT[req.contentType] ?? 'bin';
  return { path: `${prefix}/${Date.now().toString(36)}-${rand()}.${ext}`, mediaType: isImage ? 'image' : isVideo ? 'video' : null };
}

/** İstemcinin gönderdiği yolun, sunucunun o kullanıcı/kaynak için verdiği önekle başladığını doğrular. */
export function assertOwnedPath(path: string | null | undefined, prefix: string): void {
  if (!path) return;
  if (path.includes('..') || !path.startsWith(`${prefix}/`)) forbidden('Geçersiz dosya yolu.');
}

export const BUCKETS: Record<'public' | 'chat' | 'docs', Bucket> = {
  public: 'public-media',
  chat: 'chat-media',
  docs: 'business-docs',
};

/** Avatar Google'dan gelen tam URL ya da storage yolu olabilir. */
export function resolveMediaUrl(publicUrl: (p: string) => string, path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return publicUrl(path);
}
