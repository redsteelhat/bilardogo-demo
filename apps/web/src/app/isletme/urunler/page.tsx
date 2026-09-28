'use client';
import { EmptyState, Input, Segmented } from '@bilardogo/ui';
import { Package, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { useBusiness } from '@/components/business/context';
import { OwnerProductRow, StaffProductRow } from '@/components/business/product-row';
import { BizPage, Gate, PaymentNotice, PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from '@/components/business/ui';
import { trpc } from '@/lib/trpc/client';

type Filter = 'all' | 'mine' | 'missing';

function trLower(s: string) {
  return s.toLocaleLowerCase('tr-TR');
}

function Catalog({ venueId }: { venueId: string }) {
  const { isOwner } = useBusiness();
  const q = trpc.business.products.useQuery({ venueId });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>(isOwner ? 'all' : 'mine');
  const products = q.data ?? [];
  const inMenu = products.filter((p) => p.venueProductId).length;
  const visible = useMemo(() => {
    const s = trLower(search.trim());
    return products.filter((p) => {
      if (!isOwner && !p.venueProductId) return false;
      if (filter === 'mine' && !p.venueProductId) return false;
      if (filter === 'missing' && p.venueProductId) return false;
      return !s || trLower(p.name).includes(s);
    });
  }, [products, search, filter, isOwner]);

  if (q.isLoading) return <ListSkeleton rows={6} />;
  if (q.error) return <QueryError error={q.error} retry={() => q.refetch()} />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {isOwner
          ? 'BilardoGo ürün kataloğundan salonunda olanları seç, fiyat ve stok gir. Oyuncular yalnız “bende var” dediğin ürünleri görür. Stok boş bırakılırsa takip edilmez.'
          : 'Ürünleri “şu an yok” olarak işaretleyebilir ve stok güncelleyebilirsin. Fiyatları işletme sahibi belirler.'}
      </p>
      <PaymentNotice />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input placeholder="Ürün ara (ör. çay, tost)" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>
      {isOwner ? (
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `Tümü (${products.length})` },
            { value: 'mine', label: `Menümde (${inMenu})` },
            { value: 'missing', label: `Menümde yok (${products.length - inMenu})` },
          ]}
        />
      ) : null}
      {visible.length ? (
        PRODUCT_CATEGORIES.map((cat) => {
          const items = visible.filter((p) => p.category === cat);
          if (!items.length) return null;
          return (
            <section key={cat}>
              <h2 className="mb-2 mt-4 flex items-center gap-2 font-display text-lg font-semibold">
                {PRODUCT_CATEGORY_LABELS[cat]}
                <span className="text-xs font-normal text-muted">{items.length}</span>
              </h2>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
                {items.map((p) =>
                  isOwner ? <OwnerProductRow key={p.productId} p={p} venueId={venueId} /> : <StaffProductRow key={p.productId} p={p} venueId={venueId} />,
                )}
              </ul>
            </section>
          );
        })
      ) : (
        <EmptyState
          icon={<Package />}
          title={search ? 'Aramana uygun ürün yok' : isOwner ? 'Bu filtrede ürün yok' : 'Menüde ürün yok'}
          description={isOwner ? undefined : 'İşletme sahibi menüye ürün ekleyince burada görünür.'}
        />
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <BizPage title="Ürünler" subtitle="Menü, fiyat ve stok">
      <Gate perm="orders">{({ venueId }) => <Catalog venueId={venueId} />}</Gate>
    </BizPage>
  );
}
