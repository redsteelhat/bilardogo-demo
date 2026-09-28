'use client';
import { Button, Field, Input, Notice, toast } from '@bilardogo/ui';
import Link from 'next/link';
import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Şifreni sıfırla</h1>
      <p className="mt-1 text-sm text-muted">E-posta adresine bir sıfırlama bağlantısı göndereceğiz.</p>
      {sent ? (
        <Notice tone="success" className="mt-6" title="Bağlantı gönderildi">
          Gelen kutunu (ve istenmeyen klasörünü) kontrol et.
        </Notice>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            const { error } = await getSupabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
              redirectTo: `${window.location.origin}/auth/callback?next=/sifre-yenile`,
            });
            setLoading(false);
            if (error) toast.error(error.message);
            else setSent(true);
          }}
        >
          <Field label="E-posta">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" block loading={loading}>
            Bağlantı gönder
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/giris" className="font-semibold text-brand">
          Girişe dön
        </Link>
      </p>
    </div>
  );
}
