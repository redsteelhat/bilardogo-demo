'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { Badge, Button, Dialog, DialogContent, DialogFooter, EmptyState, Field, Input, Select, Switch, SwitchRow, toast } from '@bilardogo/ui';
import { Package, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AdminPage, DataTable, Td } from '@/components/admin-ui';
import { FilterSelect, QueryError, TableSkeleton, Toolbar } from '@/components/admin/common';
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS, type ProductCategory } from '@/components/admin/labels';
import { MediaField, type MediaValue } from '@/components/admin/media-field';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Product = RouterOutputs['admin']['catalog'][number];

export default function CatalogPage() {
  const q = trpc.admin.catalog.useQuery();
  const utils = trpc.useUtils();
  const [cat, setCat] = useState<ProductCategory | ''>('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const toggle = trpc.admin.saveCatalogProduct.useMutation({
    onSuccess: async (_d, v) => {
      toast.success(v.isActive ? 'Ürün aktif.' : 'Ürün pasif; salonlar yeni ekleyemez.');
      await utils.admin.catalog.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const groups = useMemo(() => {
    const items = (q.data ?? []).filter((p) => !cat || p.category === cat);
    return PRODUCT_CATEGORIES.map((c) => ({ c, items: items.filter((p) => p.category === c) })).filter((g) => g.items.length);
  }, [q.data, cat]);

  return (
    <AdminPage
      title="Ürün kataloğu"
      description="Salonların menülerine ekleyebildiği ortak ürün listesi; fiyatı her salon kendisi belirler"
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Yeni ürün
        </Button>
      }
    >
      <Toolbar>
        <FilterSelect value={cat} onChange={(v) => setCat(v as ProductCategory | '')} aria-label="Kategori">
          <option value="">Tüm kategoriler</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {PRODUCT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </FilterSelect>
        {q.data ? <span className="text-sm text-muted">{q.data.length} ürün</span> : null}
      </Toolbar>
      {q.isLoading ? (
        <TableSkeleton />
      ) : q.error ? (
        <QueryError error={q.error} onRetry={() => q.refetch()} />
      ) : !groups.length ? (
        <EmptyState icon={<Package />} title="Ürün yok" action={<Button size="sm" onClick={() => setCreating(true)}>Yeni ürün</Button>} />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.c}>
              <h2 className="mb-2 font-display text-lg font-semibold">
                {PRODUCT_CATEGORY_LABELS[g.c]} <span className="text-sm font-normal text-muted">· {g.items.length}</span>
              </h2>
              <DataTable columns={['Ürün', 'Sıra', 'Kullanan salon', 'Aktif', '']}>
                {g.items.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-2">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-3 text-subtle">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4" />
                          )}
                        </div>
                        <span className={p.isActive ? 'font-semibold' : 'font-semibold text-muted'}>{p.name}</span>
                      </div>
                    </Td>
                    <Td className="text-muted">{p.sort}</Td>
                    <Td>{p.venueCount ? <Badge tone="info">{p.venueCount} salon</Badge> : <span className="text-subtle">—</span>}</Td>
                    <Td>
                      <Switch
                        checked={p.isActive}
                        aria-label="Aktif"
                        disabled={toggle.isPending}
                        onCheckedChange={(v) => toggle.mutate({ id: p.id, name: p.name, category: p.category, imagePath: p.imagePath, sort: p.sort, isActive: v })}
                      />
                    </Td>
                    <Td className="text-right">
                      <Button size="icon-sm" variant="ghost" aria-label="Düzenle" onClick={() => setEditing(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Td>
                  </tr>
                ))}
              </DataTable>
            </section>
          ))}
        </div>
      )}
      <Dialog open={creating || !!editing} onOpenChange={(o) => !o && (setCreating(false), setEditing(null))}>
        {creating || editing ? (
          <DialogContent title={editing ? 'Ürünü düzenle' : 'Yeni katalog ürünü'}>
            <ProductForm key={editing?.id ?? 'new'} product={editing} defaultCategory={cat || 'hot_drink'} onClose={() => { setCreating(false); setEditing(null); }} />
          </DialogContent>
        ) : null}
      </Dialog>
    </AdminPage>
  );
}

function ProductForm({ product, defaultCategory, onClose }: { product: Product | null; defaultCategory: ProductCategory; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? defaultCategory);
  const [sort, setSort] = useState(String(product?.sort ?? 0));
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [image, setImage] = useState<MediaValue>({ path: product?.imagePath ?? null, type: product?.imagePath ? 'image' : null, url: product?.imageUrl ?? null });
  const [touched, setTouched] = useState(false);
  const upload = trpc.admin.catalogImageUpload.useMutation();
  const save = trpc.admin.saveCatalogProduct.useMutation({
    onSuccess: async () => {
      toast.success('Ürün kaydedildi.');
      await utils.admin.catalog.invalidate();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const sortN = Number(sort);
  const errors = {
    name: name.trim().length < 2 ? 'Ürün adı en az 2 karakter olmalı.' : name.length > 80 ? 'En fazla 80 karakter.' : null,
    sort: !Number.isInteger(sortN) || sortN < 0 || sortN > 10000 ? '0 ile 10000 arasında bir tam sayı girin.' : null,
  };
  return (
    <>
      <div className="space-y-4">
        <Field label="Ürün adı" required error={touched ? errors.name : null}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ör. Türk kahvesi" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategori" required>
            <Select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {PRODUCT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sıra" error={touched ? errors.sort : null} hint="Küçük olan önce gösterilir.">
            <Input type="number" min={0} max={10000} value={sort} onChange={(e) => setSort(e.target.value)} />
          </Field>
        </div>
        <Field label="Görsel">
          <MediaField compact allowVideo={false} label="Görsel yükle" value={image} onChange={setImage} request={(info) => upload.mutateAsync(info)} />
        </Field>
        <div className="rounded-xl border border-border bg-surface-2 px-4">
          <SwitchRow label="Aktif" description="Pasif ürünü salonlar menülerine yeni ekleyemez." checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Vazgeç
        </Button>
        <Button
          loading={save.isPending}
          disabled={upload.isPending}
          onClick={() => {
            setTouched(true);
            if (errors.name || errors.sort) return;
            save.mutate({ id: product?.id, name: name.trim(), category, imagePath: image.path, isActive, sort: sortN });
          }}
        >
          Kaydet
        </Button>
      </DialogFooter>
    </>
  );
}
