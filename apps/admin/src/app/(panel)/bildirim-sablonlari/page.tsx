'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { Badge, Button, Card, cn, EmptyState, Field, Input, Notice, Skeleton, Switch, Textarea, toast } from '@bilardogo/ui';
import { Bell, Info, RotateCcw, Save, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminPage } from '@/components/admin-ui';
import { QueryError } from '@/components/admin/common';
import { NOTIF_CATEGORY_LABELS } from '@/components/admin/labels';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Template = RouterOutputs['admin']['templates'][number];

const SAMPLE: Record<string, string> = {
  kullanici: 'Berkay',
  salon: 'FBN Bilardo',
  saat: '20:30',
  oyuncu: 'Berkay',
  oyuncu1: 'Ahmet',
  oyuncu2: 'Kenan',
  kazanan: 'Ahmet',
  oyun: '3 Bant',
  skor: '40 – 32',
  sebep: 'skor hatalı girildi',
  masa: '4',
  mesaj: 'Akşam masa var mı?',
  baslik: 'Yeni lig sezonu başlıyor',
  isletme: 'FBN Bilardo',
  not: 'Vergi levhası okunaklı değil',
  gun: '3',
};

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function TemplatesPage() {
  const q = trpc.admin.templates.useQuery();
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const current = q.data?.find((t) => t.key === selected) ?? q.data?.[0] ?? null;
  const list = useMemo(() => {
    const s = filter.trim().toLocaleLowerCase('tr-TR');
    return (q.data ?? []).filter((t) => !s || t.key.includes(s) || (t.description ?? '').toLocaleLowerCase('tr-TR').includes(s) || t.title.toLocaleLowerCase('tr-TR').includes(s));
  }, [q.data, filter]);

  return (
    <AdminPage title="Bildirim şablonları" description="Metinler kod içine sabit yazılmaz; burada düzenlenir.">
      {q.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      ) : q.error ? (
        <QueryError error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState icon={<Bell />} title="Şablon yok" description="Veritabanı tohumlandığında varsayılan şablonlar oluşturulur." />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[360px_1fr]">
          <Card className="overflow-hidden lg:sticky lg:top-4">
            <div className="border-b border-border p-3">
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Şablon ara…" className="h-9 text-sm" />
            </div>
            <ul className="max-h-[70dvh] divide-y divide-border overflow-y-auto">
              {list.map((t) => (
                <TemplateRow key={t.key} t={t} active={current?.key === t.key} onSelect={() => setSelected(t.key)} />
              ))}
            </ul>
          </Card>
          {current ? <TemplateEditor key={current.key + current.updatedAt.toString()} t={current} /> : null}
        </div>
      )}
    </AdminPage>
  );
}

function TemplateRow({ t, active, onSelect }: { t: Template; active: boolean; onSelect: () => void }) {
  const utils = trpc.useUtils();
  const m = trpc.admin.saveTemplate.useMutation({
    onSuccess: async (_d, v) => {
      toast.success(v.isActive ? 'Şablon etkin.' : 'Şablon kapatıldı; bu bildirim gönderilmeyecek.');
      await utils.admin.templates.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <li className={cn('flex cursor-pointer items-start gap-3 px-4 py-3', active ? 'bg-brand-soft' : 'hover:bg-surface-2')} onClick={onSelect}>
      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-sm font-semibold', active && 'text-brand', !t.isActive && 'text-muted line-through')}>{t.description || t.key}</div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <code className="truncate text-[11px] text-subtle">{t.key}</code>
          <Badge className="px-1.5 py-0 text-[10px]">{NOTIF_CATEGORY_LABELS[t.category] ?? t.category}</Badge>
        </div>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={t.isActive}
          disabled={m.isPending}
          aria-label="Etkin"
          onCheckedChange={(v) => m.mutate({ key: t.key, title: t.title, body: t.body, isActive: v })}
        />
      </div>
    </li>
  );
}

function TemplateEditor({ t }: { t: Template }) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(t.title);
  const [body, setBody] = useState(t.body);
  const [isActive, setIsActive] = useState(t.isActive);
  const [vars, setVars] = useState<Record<string, string>>(() => Object.fromEntries(t.variables.map((v) => [v, SAMPLE[v] ?? v])));
  const lastField = useRef<'title' | 'body'>('body');
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dTitle = useDebounced(title);
  const dBody = useDebounced(body);
  const dVars = useDebounced(vars);
  const preview = trpc.admin.previewTemplate.useQuery({ title: dTitle, body: dBody, vars: dVars }, { placeholderData: (p) => p });
  const dirty = title !== t.title || body !== t.body || isActive !== t.isActive;
  const isDefault = t.defaultTitle !== null && title === t.defaultTitle && body === t.defaultBody;

  const save = trpc.admin.saveTemplate.useMutation({
    onSuccess: async () => {
      toast.success('Şablon kaydedildi.');
      await utils.admin.templates.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const test = trpc.admin.testTemplate.useMutation({
    onSuccess: (r) => (r.sent ? toast.success('Test bildirimi size gönderildi. Uygulamadaki Bildirimler sayfasından kontrol edebilirsiniz.') : toast.warning('Bildirim gönderilmedi (şablon kapalı veya bildirim tercihleriniz kapalı olabilir).')),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const errors = {
    title: !title.trim() ? 'Başlık boş olamaz.' : title.length > 120 ? 'Başlık en fazla 120 karakter.' : null,
    body: !body.trim() ? 'Metin boş olamaz.' : body.length > 500 ? 'Metin en fazla 500 karakter.' : null,
  };
  const unknownVars = useMemo(() => {
    const used = [...`${title} ${body}`.matchAll(/\{\{\s*([a-zA-Z0-9_]+)/g)].map((m) => m[1]!);
    return [...new Set(used.filter((v) => !t.variables.includes(v)))];
  }, [title, body, t.variables]);

  function insert(v: string) {
    const token = `{{${v}}}`;
    if (lastField.current === 'title') {
      const el = titleRef.current;
      const s = el?.selectionStart ?? title.length;
      const e = el?.selectionEnd ?? title.length;
      setTitle(title.slice(0, s) + token + title.slice(e));
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(s + token.length, s + token.length);
      });
    } else {
      const el = bodyRef.current;
      const s = el?.selectionStart ?? body.length;
      const e = el?.selectionEnd ?? body.length;
      setBody(body.slice(0, s) + token + body.slice(e));
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(s + token.length, s + token.length);
      });
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold">{t.description || t.key}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <code>{t.key}</code>
              <Badge>{NOTIF_CATEGORY_LABELS[t.category] ?? t.category}</Badge>
              {isDefault ? <Badge tone="info">Varsayılan metin</Badge> : <Badge tone="brand">Özelleştirilmiş</Badge>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onCheckedChange={setIsActive} /> {isActive ? 'Etkin' : 'Kapalı'}
          </label>
        </div>

        <div className="space-y-4">
          <Field label="Başlık" required error={errors.title} hint={`${title.length} / 120`}>
            <Input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} onFocus={() => (lastField.current = 'title')} maxLength={120} />
          </Field>
          <Field label="Metin" required error={errors.body} hint={`${body.length} / 500`}>
            <Textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} onFocus={() => (lastField.current = 'body')} rows={3} maxLength={500} />
          </Field>
          <div>
            <div className="mb-1.5 text-xs font-semibold text-muted">Değişkenler (tıklayınca imlecin olduğu yere eklenir)</div>
            <div className="flex flex-wrap gap-1.5">
              {t.variables.length === 0 ? <span className="text-xs text-subtle">Bu şablonda değişken yok.</span> : null}
              {t.variables.map((v) => (
                <button
                  key={v}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(v)}
                  className="rounded-lg border border-brand/40 bg-brand-soft px-2 py-1 font-mono text-xs text-brand hover:bg-brand/20"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
            {unknownVars.length ? (
              <p className="mt-2 text-xs text-warning">Bu şablon için tanımlı olmayan değişken: {unknownVars.map((v) => `{{${v}}}`).join(', ')} — gönderimde boş kalır.</p>
            ) : null}
          </div>
          <Notice tone="info" icon={<Info />} title="Türkçe ek filtreleri">
            <ul className="mt-1 space-y-0.5 text-xs">
              <li>
                <code>{'{{salon|de}}'}</code> → “FBN&apos;de”, “FBN Bilardo&apos;da” (bulunma eki, ünlü uyumuna göre)
              </li>
              <li>
                <code>{'{{saat|den}}'}</code> → “20:30&apos;dan”, “21:00&apos;den” (ayrılma eki)
              </li>
              <li>
                <code>{'{{oyuncu|in}}'}</code> → “Berkay&apos;ın” (tamlayan eki)
              </li>
              <li>
                <code>{'{{salon|upper}}'}</code> → “FBN BİLARDO” (büyük harf)
              </li>
            </ul>
          </Notice>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button loading={save.isPending} disabled={!dirty || !!errors.title || !!errors.body} onClick={() => save.mutate({ key: t.key, title: title.trim(), body: body.trim(), isActive })}>
            <Save className="h-4 w-4" /> Kaydet
          </Button>
          <Button
            variant="secondary"
            disabled={t.defaultTitle === null || isDefault}
            onClick={() => {
              if (t.defaultTitle !== null && t.defaultBody !== null) {
                setTitle(t.defaultTitle);
                setBody(t.defaultBody);
                toast.info('Varsayılan metin geri yüklendi. Kalıcı olması için kaydedin.');
              }
            }}
          >
            <RotateCcw className="h-4 w-4" /> Varsayılana dön
          </Button>
          {dirty ? (
            <Button variant="ghost" onClick={() => { setTitle(t.title); setBody(t.body); setIsActive(t.isActive); }}>
              Değişiklikleri geri al
            </Button>
          ) : null}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="flex-1 font-display text-lg font-semibold">Canlı önizleme</h3>
          <Button size="sm" variant="outline" loading={test.isPending} onClick={() => test.mutate({ key: t.key, vars })} title={dirty ? 'Kaydedilmiş sürüm gönderilir' : undefined}>
            <Send className="h-4 w-4" /> Kendime test gönder
          </Button>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-fg">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] text-subtle">
              <span className="font-semibold">BilardoGo</span> · şimdi
              {preview.isFetching ? <span className="animate-pulse">·</span> : null}
            </div>
            {preview.error ? (
              <p className="text-sm text-danger">{errorMessage(preview.error)}</p>
            ) : (
              <>
                <div className="font-semibold">{preview.data?.title || <span className="text-subtle">—</span>}</div>
                <div className="text-sm text-fg/90">{preview.data?.body || <span className="text-subtle">—</span>}</div>
              </>
            )}
          </div>
        </div>
        {dirty ? <p className="mt-2 text-xs text-warning">Test bildirimi kaydedilmiş sürümle gönderilir; önce kaydedin.</p> : null}
        {t.variables.length ? (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold text-muted">Örnek değerler</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {t.variables.map((v) => (
                <label key={v} className="flex items-center gap-2">
                  <code className="w-24 shrink-0 truncate text-xs text-subtle">{v}</code>
                  <Input value={vars[v] ?? ''} onChange={(e) => setVars({ ...vars, [v]: e.target.value })} className="h-9 text-sm" />
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
