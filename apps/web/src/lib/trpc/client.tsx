'use client';
import type { AppRouter } from '@bilardogo/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, loggerLink, TRPCClientError } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState } from 'react';
import superjson from 'superjson';

export const trpc = createTRPCReact<AppRouter>();

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: (count, err) => {
          if (err instanceof TRPCClientError) {
            const code = err.data?.code;
            if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN' || code === 'NOT_FOUND' || code === 'BAD_REQUEST' || code === 'PRECONDITION_FAILED') {
              return false;
            }
          }
          return count < 2;
        },
      },
    },
  });
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const [client] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({ enabled: (op) => process.env.NODE_ENV === 'development' && op.direction === 'down' && op.result instanceof Error }),
        httpBatchLink({ url: '/api/trpc', transformer: superjson, maxURLLength: 4000 }),
      ],
    }),
  );
  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

/** tRPC hatasından kullanıcıya gösterilecek Türkçe mesaj. */
export function errorMessage(err: unknown): string {
  if (err instanceof TRPCClientError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Bir hata oluştu.';
}
