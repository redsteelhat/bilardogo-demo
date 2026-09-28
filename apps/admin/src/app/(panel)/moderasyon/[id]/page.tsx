'use client';
import { REPORT_REASON_LABELS } from '@bilardogo/domain';
import { Avatar, Badge, Button, cn, Dialog, DialogContent, DialogFooter, Field, Input, Notice, Segmented, Textarea, toast } from '@bilardogo/ui';
import { AlertTriangle, Ban, EyeOff, Lock, Power, ShieldAlert, X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminPage } from '@/components/admin-ui';
import { BackLink, KV, PageSkeleton, Panel, QueryError, ToneBadge, UserCell } from '@/components/admin/common';
import { CONVERSATION_TYPE_LABELS, REPORT_STATUS, REPORT_TARGET_LABELS } from '@/components/admin/labels';
import { formatDateTime, formatTime } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Action = 'dismiss' | 'hide_message' | 'warn' | 'ban_user' | 'passive_venue';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

const ACTIONS: Record<Action, { label: string; title: string; desc: string; tone: 'primary' | 'danger'; icon: React.ReactNode }> = {
  dismiss: { label: 'Reddet', title: 'Şikâyet reddedilsin mi?', desc: 'İhlal bulunmadı; bu hedefe ait açık şikâyetler kapatılır.', tone: 'primary', icon: <X className="h-4 w-4" /> },
  hide_message: { label: 'Mesajı kaldır', title: 'Mesaj kaldırılsın mı?', desc: 'Mesaj sohbetten gizlenir (“moderasyon tarafından kaldırıldı”). Bu mesaja ait açık şikâyetler kapatılır.', tone: 'danger', icon: <EyeOff className="h-4 w-4" /> },
  warn: { label: 'Uyar', title: 'Kullanıcı uyarılsın mı?', desc: 'Şikâyet “işlem yapıldı” olarak kapatılır ve uyarı denetim kaydına yazılır.', tone: 'primary', icon: <AlertTriangle className="h-4 w-4" /> },
  ban_user: { label: 'Kullanıcıyı banla', title: 'Kullanıcı banlansın mı?', desc: 'Kullanıcı hesabı banlanır; mesaj şikâyetinde mesaj da kaldırılır.', tone: 'danger', icon: <Ban className="h-4 w-4" /> },
  passive_venue: { label: 'Salonu pasife al', title: 'Salon pasife alınsın mı?', desc: 'Salon uygulamada listelenmez; yeni maç ve sipariş alınamaz.', tone: 'danger', icon: <Power className="h-4 w-4" /> },
};

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // Bağlam her açılışta denetim kaydına yazılır; gereksiz yeniden sorguları önle.
  const q = trpc.admin.report.useQuery({ reportId: id }, { staleTime: Infinity, refetchOnWindowFocus: false });
  const [action, setAction] = useState<Action | null>(null);

  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data)
    return (
      <AdminPage title="Şikâyet">
        <BackLink href="/moderasyon">Moderasyon</BackLink>
        <QueryError error={q.error} onRetry={() => q.refetch()} />
      </AdminPage>
    );

  const { report: r, reporter, context, targetUser, targetVenue, reportsAgainstTarget } = q.data;
  const open = r.status === 'open';
  const available: Action[] = [
    'dismiss',
    ...(r.targetType === 'message' ? (['hide_message'] as const) : []),
    ...(targetUser ? (['warn', 'ban_user'] as const) : []),
    ...(r.targetType === 'venue' ? (['passive_venue'] as const) : []),
  ];

  return (
    <AdminPage
      title={`${REPORT_TARGET_LABELS[r.targetType]} şikâyeti`}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <ToneBadge value={REPORT_STATUS[r.status]} />
          <Badge tone="warning">{REPORT_REASON_LABELS[r.reason]}</Badge>
          <span>{formatDateTime(r.createdAt)}</span>
        </span>
      }
    >
      <BackLink href="/moderasyon">Moderasyon</BackLink>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {r.targetType === 'message' ? (
            <>
              <Notice tone="warning" icon={<Lock />} title="Gizlilik">
                Özel mesajlar yalnız şikâyet kapsamında ve bu bağlamla sınırlı açılır; bu görüntüleme denetim kaydına yazıldı.
              </Notice>
              <Panel
                title="Mesaj bağlamı"
                action={context?.conversationType ? <Badge>{CONVERSATION_TYPE_LABELS[context.conversationType] ?? context.conversationType}</Badge> : null}
                bodyClassName="p-3"
              >
                {!context ? (
                  <div className="space-y-2 p-2">
                    <p className="text-sm text-muted">Mesaj artık bulunamıyor. Şikâyet anındaki içerik:</p>
                    <blockquote className="rounded-xl border border-border bg-surface-2 p-3 text-sm">{String(r.snapshot?.body ?? '—')}</blockquote>
                  </div>
                ) : (
                  <ol className="space-y-1">
                    {context.messages.map((m) => (
                      <li
                        key={m.id}
                        className={cn(
                          'flex gap-2.5 rounded-xl p-2.5',
                          m.isTarget ? 'border border-danger/50 bg-danger-soft' : 'border border-transparent',
                        )}
                      >
                        <Avatar name={m.sender?.displayName ?? '?'} src={m.sender?.avatarUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-semibold text-fg">{m.sender?.displayName ?? 'Silinmiş kullanıcı'}</span>
                            <span className="text-subtle">{formatTime(m.createdAt)}</span>
                            {m.isTarget ? <Badge tone="danger">Şikâyet edilen</Badge> : null}
                            {m.hidden ? <Badge>Kaldırıldı</Badge> : null}
                            {m.deleted ? <Badge>Silindi</Badge> : null}
                          </div>
                          {m.body ? <p className={cn('mt-0.5 whitespace-pre-wrap break-words text-sm', (m.hidden || m.deleted) && 'text-muted line-through')}>{m.body}</p> : null}
                          {m.mediaUrl ? (
                            m.mediaType === 'video' ? (
                              <video src={m.mediaUrl} controls className="mt-1.5 max-h-56 rounded-lg" />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.mediaUrl} alt="" className="mt-1.5 max-h-56 rounded-lg" />
                            )
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="px-2 pt-2 text-xs text-subtle">Şikâyet edilen mesajın en fazla 10 öncesi ve 10 sonrası gösterilir.</p>
              </Panel>
            </>
          ) : null}

          <Panel title="Şikâyet">
            <KV
              items={[
                { label: 'Sebep', value: REPORT_REASON_LABELS[r.reason] },
                { label: 'Tarih', value: formatDateTime(r.createdAt) },
                { label: 'Şikâyet eden', value: <UserCell user={reporter} /> },
                { label: 'Hedef', value: REPORT_TARGET_LABELS[r.targetType] },
                { label: 'Açıklama', value: r.details, wide: true },
                ...(!open
                  ? [
                      { label: 'Sonuç', value: <ToneBadge value={REPORT_STATUS[r.status]} /> },
                      { label: 'İşlem tarihi', value: r.handledAt ? formatDateTime(r.handledAt) : null },
                      { label: 'Karar notu', value: r.resolutionNote, wide: true },
                    ]
                  : []),
              ]}
            />
          </Panel>
        </div>

        <div className="space-y-4">
          {targetUser ? (
            <Panel title={r.targetType === 'message' ? 'Mesajı gönderen' : 'Şikâyet edilen kullanıcı'}>
              <UserCell user={targetUser} size="md" />
              <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2 p-3">
                <span className="text-sm text-muted">Hakkındaki toplam şikâyet</span>
                <span className={cn('font-display text-2xl font-semibold', reportsAgainstTarget > 2 && 'text-danger')}>{reportsAgainstTarget}</span>
              </div>
              <Link href={`/kullanicilar/${targetUser.id}`} className="mt-3 block text-sm font-semibold text-brand hover:underline">
                Kullanıcı detayı →
              </Link>
            </Panel>
          ) : null}
          {targetVenue ? (
            <Panel title="Şikâyet edilen salon">
              <div className="font-semibold">{targetVenue.name}</div>
              <div className="mt-3 flex flex-col gap-1.5 text-sm">
                <Link href={`/salonlar/${targetVenue.id}`} className="font-semibold text-brand hover:underline">
                  Salon detayı →
                </Link>
                <a href={`${APP_URL}/salon/${targetVenue.slug}`} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-fg">
                  Genel sayfayı aç ↗
                </a>
              </div>
            </Panel>
          ) : null}
          {!targetUser && !targetVenue && r.targetType !== 'message' ? <Notice tone="info">Hedef artık bulunamıyor.</Notice> : null}

          <Panel title="Karar">
            {open ? (
              <div className="grid gap-2">
                {available.map((a) => (
                  <Button key={a} variant={ACTIONS[a].tone === 'danger' ? 'danger' : a === 'dismiss' ? 'secondary' : 'soft'} block onClick={() => setAction(a)}>
                    {ACTIONS[a].icon} {ACTIONS[a].label}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted">
                <ShieldAlert className="h-4 w-4" /> Bu şikâyet sonuçlandırıldı.
              </p>
            )}
          </Panel>
        </div>
      </div>

      <ResolveDialog
        reportId={id}
        action={action}
        onClose={() => setAction(null)}
        onDone={() => {
          setAction(null);
          router.push('/moderasyon');
        }}
      />
    </AdminPage>
  );
}

function ResolveDialog({ reportId, action, onClose, onDone }: { reportId: string; action: Action | null; onClose: () => void; onDone: () => void }) {
  const utils = trpc.useUtils();
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'temp' | 'perm'>('temp');
  const [days, setDays] = useState('7');
  const m = trpc.admin.resolveReport.useMutation({
    onSuccess: async () => {
      toast.success('Şikâyet sonuçlandırıldı.');
      setNote('');
      await Promise.all([utils.admin.reports.invalidate(), utils.admin.report.invalidate({ reportId }), utils.admin.dashboard.invalidate(), utils.admin.users.invalidate(), utils.admin.venues.invalidate()]);
      onDone();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const d = Number(days);
  const daysInvalid = action === 'ban_user' && mode === 'temp' && (!Number.isInteger(d) || d < 1 || d > 3650);
  const noteRequired = action === 'ban_user' || action === 'warn';
  return (
    <Dialog open={!!action} onOpenChange={(o) => !o && onClose()}>
      {action ? (
        <DialogContent title={ACTIONS[action].title} description={ACTIONS[action].desc}>
          <div className="space-y-4">
            {action === 'ban_user' ? (
              <Field label="Ban süresi">
                <Segmented
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'temp', label: 'Belirli süre' },
                    { value: 'perm', label: 'Süresiz' },
                  ]}
                />
                {mode === 'temp' ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} className="w-28" />
                    <span className="text-sm text-muted">gün</span>
                  </div>
                ) : null}
                {daysInvalid ? <p className="mt-1 text-xs text-danger">1 ile 3650 gün arasında bir süre girin.</p> : null}
              </Field>
            ) : null}
            <Field label="Karar notu" required={noteRequired} hint="Denetim kaydında ve şikâyet sonucunda saklanır.">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={action === 'dismiss' ? 'İsteğe bağlı' : 'Ör. hakaret içerikli mesaj'} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Vazgeç
            </Button>
            <Button
              variant={ACTIONS[action].tone === 'danger' ? 'danger' : 'primary'}
              loading={m.isPending}
              disabled={(noteRequired && !note.trim()) || daysInvalid}
              onClick={() => m.mutate({ reportId, action, note: note.trim() || null, banDays: action === 'ban_user' && mode === 'temp' ? d : null })}
            >
              {ACTIONS[action].label}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
