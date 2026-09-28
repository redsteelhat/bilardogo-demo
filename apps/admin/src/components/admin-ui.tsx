'use client';
import { Button, cn, Dialog, DialogContent, DialogFooter, Input, Textarea } from '@bilardogo/ui';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Sayfa başlığı + açıklama + sağda eylemler. */
export function AdminPage({
  title,
  description,
  actions,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Basit tablo. */
export function DataTable({
  columns,
  children,
  empty,
  className,
}: {
  columns: React.ReactNode[];
  children: React.ReactNode;
  empty?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-border bg-surface', className)}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-subtle">
          <tr>
            {columns.map((c, i) => (
              <th key={i} className="px-4 py-3 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
      {empty ? <div className="p-8 text-center text-sm text-muted">Kayıt yok.</div> : null}
    </div>
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />;
}

export function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-muted">
      <span>
        {total} kayıt · sayfa {page}/{pages}
      </span>
      <div className="flex gap-1">
        <Button size="icon-sm" variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Önceki">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="icon-sm" variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Sonraki">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** 300 ms gecikmeli arama kutusu. */
export function SearchInput({ value, onChange, placeholder = 'Ara…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => onChange(v), 300);
    return () => clearTimeout(t);
  }, [v, onChange]);
  return (
    <div className={cn('relative w-full max-w-xs', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="h-10 pl-9" />
    </div>
  );
}

/** Onay penceresi; istenirse not alanı ile. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Onayla',
  tone = 'primary',
  withNote,
  noteRequired,
  notePlaceholder,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
  withNote?: boolean;
  noteRequired?: boolean;
  notePlaceholder?: string;
  loading?: boolean;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        {withNote ? <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={notePlaceholder ?? 'Açıklama'} /> : null}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} disabled={noteRequired && !note.trim()} onClick={() => onConfirm(note.trim())}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
