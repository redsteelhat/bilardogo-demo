export type Bucket = 'public-media' | 'chat-media' | 'business-docs';

export interface StorageService {
  /** Tarayıcının doğrudan yükleme yapabileceği imzalı URL + token üretir. */
  createSignedUpload(bucket: Bucket, path: string): Promise<{ path: string; token: string; signedUrl: string }>;
  /** Özel bucket'taki dosya için süreli okuma URL'i. */
  createSignedRead(bucket: Exclude<Bucket, 'public-media'>, path: string, expiresInSec?: number): Promise<string | null>;
  createSignedReads(
    bucket: Exclude<Bucket, 'public-media'>,
    paths: string[],
    expiresInSec?: number,
  ): Promise<Record<string, string>>;
  publicUrl(path: string): string;
  remove(bucket: Bucket, paths: string[]): Promise<void>;
}

export interface AuthAdminService {
  deleteUser(userId: string): Promise<void>;
  findUserIdByEmail(email: string): Promise<string | null>;
  getEmail(userId: string): Promise<string | null>;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };
export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export interface PushService {
  /** Gönderir; abonelik geçersizse (410/404) 'gone' döner ki kaydı silebilelim. */
  send(target: PushTarget, payload: PushPayload): Promise<'ok' | 'gone' | 'error'>;
  readonly enabled: boolean;
}

export interface EmailService {
  send(to: string, subject: string, html: string): Promise<void>;
  readonly enabled: boolean;
}

export interface Services {
  storage: StorageService;
  authAdmin: AuthAdminService;
  push: PushService;
  email: EmailService;
  /** Yanıt döndükten sonra çalışacak işler (Next.js `after`). Testlerde hemen çalışır. */
  defer(task: () => Promise<unknown>): void;
  appUrl: string;
}
