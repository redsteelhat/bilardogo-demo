import Link from 'next/link';

export function Logo({ href = '/', className = '' }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`font-display text-2xl font-bold tracking-tight ${className}`} aria-label="BilardoGo ana sayfa">
      Bilardo<span className="text-brand">Go</span>
    </Link>
  );
}
