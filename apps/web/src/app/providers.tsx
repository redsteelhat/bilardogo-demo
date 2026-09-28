'use client';
import { Toaster } from '@bilardogo/ui';
import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/push';
import { TRPCProvider } from '@/lib/trpc/client';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') void registerServiceWorker();
  }, []);
  return (
    <TRPCProvider>
      {children}
      <Toaster
        theme="dark"
        position="top-center"
        richColors
        toastOptions={{ style: { background: '#1b1b1b', border: '1px solid #262626', color: '#f5f5f4' } }}
      />
    </TRPCProvider>
  );
}
