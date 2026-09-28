'use client';
import { Button, Field, Input, Notice, toast } from '@bilardogo/ui';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Divider, GoogleButton } from '@/components/common/google-button';
import { getSupabaseBrowser } from '@/lib/supabase/client';

function RegisterForm() {
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/';
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto h-12 w-12 text-brand" />
        <h1 className="mt-4 font-display text-2xl font-semibold">E-postanı kontrol et</h1>
        <p className="mt-2 text-sm text-muted">
          <b className="text-fg">{form.email}</b> adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıkladıktan sonra profilini tamamlayabilirsin.
        </p>
        <Button variant="secondary" className="mt-6" onClick={() => router.push('/giris')}>
          Giriş sayfasına dön
        </Button>
      </div>
    );
  }
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">BilardoGo’ya katıl</h1>
      <p className="mt-1 text-sm text-muted">30 gün ücretsiz. Şehrindeki salonları ve oyuncuları keşfet.</p>
      <div className="mt-6">
        <GoogleButton next={next} />
      </div>
      <Divider />
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (form.password.length < 8) {
            toast.error('Şifre en az 8 karakter olmalı.');
            return;
          }
          setLoading(true);
          const { data, error } = await getSupabaseBrowser().auth.signUp({
            email: form.email.trim(),
            password: form.password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/profil-tamamla')}`,
              data: { full_name: form.fullName.trim() },
            },
          });
          setLoading(false);
          if (error) {
            toast.error(error.message.includes('already registered') ? 'Bu e-posta zaten kayıtlı.' : error.message);
            return;
          }
          if (data.session) {
            router.replace('/profil-tamamla');
            router.refresh();
          } else setSent(true);
        }}
      >
        <Field label="Ad soyad">
          <Input autoComplete="name" required minLength={2} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </Field>
        <Field label="E-posta">
          <Input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Şifre" hint="En az 8 karakter">
          <Input type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Notice tone="info">
          Devam ederek{' '}
          <Link href="/yasal/user_agreement" className="underline" target="_blank">
            Kullanıcı Sözleşmesi
          </Link>{' '}
          ve{' '}
          <Link href="/yasal/kvkk_notice" className="underline" target="_blank">
            KVKK Aydınlatma Metni
          </Link>
          ’ni okuduğunu kabul edersin. Onaylarını bir sonraki adımda vereceksin.
        </Notice>
        <Button type="submit" size="lg" block loading={loading}>
          Kayıt ol
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Zaten hesabın var mı?{' '}
        <Link href="/giris" className="font-semibold text-brand">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
