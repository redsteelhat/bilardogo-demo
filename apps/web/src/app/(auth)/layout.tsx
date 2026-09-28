import { Logo } from '@/components/common/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand/20 blur-3xl" />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-safe">
        <div className="flex h-16 items-center justify-center">
          <Logo className="text-3xl" />
        </div>
        <div className="flex flex-1 flex-col justify-center py-6">{children}</div>
      </div>
    </div>
  );
}
