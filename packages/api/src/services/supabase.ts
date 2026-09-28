import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import type { AuthAdminService, Bucket, EmailService, PushService, Services, StorageService } from './types';

let adminClient: SupabaseClient | null = null;

/** Yalnız sunucuda: service role anahtarıyla Supabase istemcisi (RLS'i aşar). */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
    adminClient = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  }
  return adminClient;
}

export function supabaseStorage(): StorageService {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return {
    async createSignedUpload(bucket: Bucket, path: string) {
      const { data, error } = await getSupabaseAdmin().storage.from(bucket).createSignedUploadUrl(path);
      if (error || !data) throw new Error(`Yükleme bağlantısı oluşturulamadı: ${error?.message}`);
      return { path: data.path, token: data.token, signedUrl: data.signedUrl };
    },
    async createSignedRead(bucket, path, expiresInSec = 3600) {
      try {
        const { data } = await getSupabaseAdmin().storage.from(bucket).createSignedUrl(path, expiresInSec);
        return data?.signedUrl ?? null;
      } catch (err) {
        console.warn('[storage] imzalı bağlantı üretilemedi', err);
        return null;
      }
    },
    async createSignedReads(bucket, paths, expiresInSec = 3600) {
      if (paths.length === 0) return {};
      try {
        const { data } = await getSupabaseAdmin().storage.from(bucket).createSignedUrls(paths, expiresInSec);
        const out: Record<string, string> = {};
        for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
        return out;
      } catch (err) {
        console.warn('[storage] imzalı bağlantılar üretilemedi', err);
        return {};
      }
    },
    publicUrl(path: string) {
      return `${base}/storage/v1/object/public/public-media/${path.split('/').map(encodeURIComponent).join('/')}`;
    },
    async remove(bucket, paths) {
      if (paths.length) await getSupabaseAdmin().storage.from(bucket).remove(paths);
    },
  };
}

export function supabaseAuthAdmin(): AuthAdminService {
  return {
    async deleteUser(userId) {
      // Yumuşak silme: auth.users satırı kalır (maç kayıtlarının bütünlüğü), giriş ve e-posta devre dışı kalır.
      const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId, true);
      if (error) throw new Error(`Kullanıcı silinemedi: ${error.message}`);
    },
    async findUserIdByEmail(email) {
      // Supabase Admin API e-postaya göre doğrudan arama sunmaz; auth şemasında güvenli bir sorgu yaparız.
      let client: SupabaseClient;
      try {
        client = getSupabaseAdmin();
      } catch {
        return null;
      }
      const { data, error } = await client.rpc('bg_find_user_by_email', { p_email: email });
      if (error) return null;
      return (data as string | null) ?? null;
    },
    async getEmail(userId) {
      try {
        const { data } = await getSupabaseAdmin().auth.admin.getUserById(userId);
        return data.user?.email ?? null;
      } catch (err) {
        console.warn('[auth] e-posta alınamadı', err);
        return null;
      }
    },
  };
}

export function webPushService(): PushService {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:destek@bilardogo.com';
  const enabled = !!pub && !!priv;
  if (enabled) webpush.setVapidDetails(subject, pub!, priv!);
  return {
    enabled,
    async send(target, payload) {
      if (!enabled) return 'error';
      try {
        await webpush.sendNotification(
          { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
          JSON.stringify(payload),
          { TTL: 3600, urgency: 'normal' },
        );
        return 'ok';
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        return status === 404 || status === 410 ? 'gone' : 'error';
      }
    },
  };
}

export function resendEmail(): EmailService {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'BilardoGo <bildirim@bilardogo.com>';
  return {
    enabled: !!key,
    async send(to, subject, html) {
      if (!key) return;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (!res.ok) console.error('E-posta gönderilemedi', res.status, await res.text().catch(() => ''));
    },
  };
}

/** Next.js route handler'larında kullanılan üretim servisleri. `defer` olarak next/server `after` verilir. */
export function createServices(defer: (task: () => Promise<unknown>) => void): Services {
  return {
    storage: supabaseStorage(),
    authAdmin: supabaseAuthAdmin(),
    push: webPushService(),
    email: resendEmail(),
    defer: (task) =>
      defer(async () => {
        try {
          await task();
        } catch (err) {
          console.error('[deferred]', err);
        }
      }),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  };
}
