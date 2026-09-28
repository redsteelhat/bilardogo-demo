'use client';
import { Button, Card, Field, Input, Notice, toast } from '@bilardogo/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';

function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm p-6">
        <div className="font-display text-2xl font-bold">
          Bilardo<span className="text-brand">Go</span> <span className="text-muted">Admin</span>
        </div>
        <p className="mt-1 text-sm text-muted">Sistemin kontrol merkezi. Yalnız yetkili hesaplar.</p>
        {params.get('yetki') === 'yok' ? (
          <Notice tone="danger" className="mt-4">
            Bu hesabın admin yetkisi yok.
          </Notice>
        ) : null}
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            const { error } = await getSupabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
            setLoading(false);
            if (error) return toast.error('E-posta veya şifre hatalı.');
            router.replace(params.get('next') ?? '/');
            router.refresh();
          }}
        >
          <Field label="E-posta">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Şifre">
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          <Button type="submit" block loading={loading}>
            Giriş yap
          </Button>
        </form>
        <Button
          variant="secondary"
          block
          className="mt-3"
          onClick={() =>
            getSupabaseBrowser().auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
            })
          }
        >
          Google ile giriş
        </Button>
      </Card>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLogin />
    </Suspense>
  );
}
