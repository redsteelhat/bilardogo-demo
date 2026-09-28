'use client';
import { Button, Field, Input, toast } from '@bilardogo/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Yeni şifre</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (password.length < 8) return toast.error('Şifre en az 8 karakter olmalı.');
          setLoading(true);
          const { error } = await getSupabaseBrowser().auth.updateUser({ password });
          setLoading(false);
          if (error) return toast.error(error.message);
          toast.success('Şifren güncellendi.');
          router.replace('/');
        }}
      >
        <Field label="Yeni şifre" hint="En az 8 karakter">
          <Input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" block loading={loading}>
          Kaydet
        </Button>
      </form>
    </div>
  );
}
