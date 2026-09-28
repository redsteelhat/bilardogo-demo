'use client';
import { Button, toast } from '@bilardogo/ui';
import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';

export function GoogleButton({ next = '/' }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="secondary"
      size="lg"
      block
      loading={loading}
      onClick={async () => {
        setLoading(true);
        const { error } = await getSupabaseBrowser().auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) {
          setLoading(false);
          toast.error('Google ile giriş başlatılamadı', { description: error.message });
        }
      }}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 9.2-4.9 9.2-7.4 0-.5-.1-.9-.1-1.3H12z" />
      </svg>
      Google ile devam et
    </Button>
  );
}

export function Divider({ label = 'veya' }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-subtle">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
