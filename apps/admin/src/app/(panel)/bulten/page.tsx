'use client';
import { BULLETIN_KIND_LABELS, BULLETIN_STATUS_LABELS } from '@bilardogo/domain';
import { Badge, Button, EmptyState, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Tabs, toast } from '@bilardogo/ui';
import { Archive, Bell, BellOff, Eye, FileEdit, MoreHorizontal, Newspaper, Pencil, Plus, Send, Trash2, Video } from 'lucide-react';
import { useState } from 'react';
import { AdminPage, ConfirmDialog, DataTable, Td } from '@/components/admin-ui';
import { BulletinEditor, type Bulletin } from '@/components/admin/bulletin-editor';
import { cityList, QueryError, TableSkeleton } from '@/components/admin/common';
import { formatDateTime } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Status = 'draft' | 'scheduled' | 'published' | 'archived';
const STATUS_TONE: Record<Status, 'neutral' | 'info' | 'success' | 'warning'> = { draft: 'neutral', scheduled: 'info', published: 'success', archived: 'warning' };
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

export default function BulletinsPage() {
  const [tab, setTab] = useState<Status | 'all'>('all');
  const [editing, setEditing] = useState<Bulletin | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Bulletin | null>(null);
  const [publishing, setPublishing] = useState<Bulletin | null>(null);
  const utils = trpc.useUtils();
  const q = trpc.admin.bulletins.useQuery({ status: tab === 'all' ? undefined : tab });
  const setStatus = trpc.admin.setBulletinStatus.useMutation({
    onSuccess: async (_d, v) => {
      toast.success(v.status === 'published' ? 'Yayına alındı.' : v.status === 'archived' ? 'Arşive taşındı.' : 'Taslağa alındı.');
      setPublishing(null);
      await utils.admin.bulletins.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = trpc.admin.deleteBulletin.useMutation({
    onSuccess: async () => {
      toast.success('İçerik silindi.');
      setDeleting(null);
      await utils.admin.bulletins.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <AdminPage
      title="Bülten / Duyurular"
      description="Haber, canlı yayın, video, eğitim, yeni özellik ve sistem duyuruları"
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Yeni içerik
        </Button>
      }
    >
      <Tabs
        className="mb-4 max-w-2xl"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'all', label: 'Tümü' },
          { value: 'draft', label: 'Taslak' },
          { value: 'scheduled', label: 'Planlandı' },
          { value: 'published', label: 'Yayında' },
          { value: 'archived', label: 'Arşiv' },
        ]}
      />
      {q.isLoading ? (
        <TableSkeleton />
      ) : q.error ? (
        <QueryError error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState
          icon={<Newspaper />}
          title="Bu durumda içerik yok"
          action={
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Yeni içerik
            </Button>
          }
        />
      ) : (
        <DataTable columns={['İçerik', 'Tür', 'Durum', 'Hedef', 'Yayın', 'Bildirim', '']}>
          {q.data.map((b) => (
            <tr key={b.id} className="hover:bg-surface-2">
              <Td>
                <button type="button" className="flex items-center gap-3 text-left" onClick={() => setEditing(b)}>
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-3 text-subtle">
                    {b.mediaUrl && b.mediaType === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.mediaUrl} alt="" className="h-full w-full object-cover" />
                    ) : b.mediaUrl || b.videoUrl ? (
                      <Video className="h-5 w-5" />
                    ) : (
                      <Newspaper className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="line-clamp-1 font-semibold hover:text-brand">{b.title}</div>
                    <div className="line-clamp-1 max-w-md text-xs text-muted">{b.body || '—'}</div>
                  </div>
                </button>
              </Td>
              <Td>
                <Badge>{BULLETIN_KIND_LABELS[b.kind]}</Badge>
              </Td>
              <Td>
                <Badge tone={STATUS_TONE[b.status]} dot>
                  {BULLETIN_STATUS_LABELS[b.status]}
                </Badge>
              </Td>
              <Td className="max-w-48 text-sm text-muted">{cityList(b.cityPlates)}</Td>
              <Td className="whitespace-nowrap text-sm text-muted">
                {b.status === 'scheduled' && b.publishAt ? (
                  <span className="text-info">{formatDateTime(b.publishAt)}</span>
                ) : b.publishedAt ? (
                  formatDateTime(b.publishedAt)
                ) : (
                  '—'
                )}
              </Td>
              <Td>
                {b.notifiedAt ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <Bell className="h-3.5 w-3.5" /> Gönderildi
                  </span>
                ) : b.notify ? (
                  <span className="inline-flex items-center gap-1 text-xs text-info">
                    <Bell className="h-3.5 w-3.5" /> Yayında gidecek
                  </span>
                ) : (
                  <BellOff className="h-3.5 w-3.5 text-subtle" />
                )}
              </Td>
              <Td className="text-right">
                <Menu>
                  <MenuTrigger asChild>
                    <Button size="icon-sm" variant="ghost" aria-label="İşlemler">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </MenuTrigger>
                  <MenuContent>
                    <MenuItem icon={<Pencil />} onSelect={() => setEditing(b)}>
                      Düzenle
                    </MenuItem>
                    {b.status === 'published' ? (
                      <MenuItem icon={<Eye />} onSelect={() => window.open(`${APP_URL}/bulten/${b.id}`, '_blank', 'noopener')}>
                        Uygulamada gör
                      </MenuItem>
                    ) : null}
                    <MenuSeparator />
                    {b.status !== 'published' ? (
                      <MenuItem icon={<Send />} onSelect={() => (b.notify && !b.notifiedAt ? setPublishing(b) : setStatus.mutate({ id: b.id, status: 'published' }))}>
                        Şimdi yayınla
                      </MenuItem>
                    ) : null}
                    {b.status !== 'draft' ? (
                      <MenuItem icon={<FileEdit />} onSelect={() => setStatus.mutate({ id: b.id, status: 'draft' })}>
                        Taslağa al
                      </MenuItem>
                    ) : null}
                    {b.status !== 'archived' ? (
                      <MenuItem icon={<Archive />} onSelect={() => setStatus.mutate({ id: b.id, status: 'archived' })}>
                        Arşivle
                      </MenuItem>
                    ) : null}
                    <MenuSeparator />
                    <MenuItem danger icon={<Trash2 />} onSelect={() => setDeleting(b)}>
                      Sil
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}

      <BulletinEditor bulletin={editing} open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} />
      <ConfirmDialog
        open={!!publishing}
        onOpenChange={(o) => !o && setPublishing(null)}
        title="Yayınlansın mı?"
        description={`“${publishing?.title ?? ''}” yayına girer ve ${publishing?.cityPlates.length ? cityList(publishing.cityPlates) + ' illerindeki' : 'tüm'} aktif kullanıcılara bildirim gönderilir.`}
        confirmLabel="Yayınla ve bildir"
        loading={setStatus.isPending}
        onConfirm={() => publishing && setStatus.mutate({ id: publishing.id, status: 'published' })}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="İçerik silinsin mi?"
        description={`“${deleting?.title ?? ''}” kalıcı olarak silinir. Yayından kaldırmak için arşivlemeyi tercih edebilirsiniz.`}
        confirmLabel="Sil"
        tone="danger"
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate({ id: deleting.id })}
      />
    </AdminPage>
  );
}
