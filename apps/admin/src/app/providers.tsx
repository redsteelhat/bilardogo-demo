'use client';
import { Toaster } from '@bilardogo/ui';
import { TRPCProvider } from '@/lib/trpc/client';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      {children}
      <Toaster theme="dark" position="top-right" richColors />
    </TRPCProvider>
  );
}
