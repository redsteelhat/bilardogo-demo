'use client';
import { Button, Field, Input, Notice, toast } from '@bilardogo/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Divider, GoogleButton } from '@/components/common/google-button';
import { getSupabaseBrowser } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Tekrar hoş geldin</h1>
      <p className="mt-1 text-sm text-muted">Salondakileri gör, maç ayarla, istatistiklerini takip et.</p>
      {params.get('hata') ? (
        <Notice tone="danger" className="mt-4">
          Bağlantı geçersiz veya süresi dolmuş. Lütfen tekrar dene.
        </Notice>
      ) : null}
      <div className="mt-6">
        <GoogleButton next={next} />
      </div>
      <Divider />
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          const { error } = await getSupabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
          setLoading(false);
          if (error) {
            toast.error(error.message === 'Invalid login credentials' ? 'E-posta veya şifre hatalı.' : error.message);
            return;
          }
          router.replace(next);
          router.refresh();
        }}
      >
        <Field label="E-posta">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Şifre">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="text-right">
          <Link href="/sifremi-unuttum" className="text-xs font-semibold text-brand">
            Şifremi unuttum
          </Link>
        </div>
        <Button type="submit" size="lg" block loading={loading}>
          Giriş yap
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Hesabın yok mu?{' '}
        <Link href={`/kayit${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand">
          Kayıt ol
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-subtle">
        Salon sahibi misin? Giriş yaptıktan sonra <span className="text-muted">Profil → İşletme hesabı</span> ile başvurabilirsin.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
