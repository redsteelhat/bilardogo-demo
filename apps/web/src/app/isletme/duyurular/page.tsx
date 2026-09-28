'use client';
import { Badge, Button, Card, EmptyState, Menu, MenuContent, MenuItem, MenuTrigger, toast } from '@bilardogo/ui';
import { CalendarRange, Megaphone, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { POST_KIND_LABELS, PostDialog, type VenuePost } from '@/components/business/post-dialog';
import { BizPage, ConfirmDialog, Gate } from '@/components/business/ui';
import { formatDateTime, timeAgo } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

function validity(p: VenuePost) {
  const now = Date.now();
  const from = p.validFrom ? new Date(p.validFrom).getTime() : null;
  const to = p.validTo ? new Date(p.validTo).getTime() : null;
  if (to && to < now) return { tone: 'neutral' as const, label: 'Süresi doldu' };
  if (from && from > now) return { tone: 'info' as const, label: 'Planlandı' };
  return { tone: 'success' as const, label: 'Yayında' };
}

function PostCard({ post, onEdit, onDelete }: { post: VenuePost; onEdit: () => void; onDelete: () => void }) {
  const v = validity(post);
  return (
    <Card className="overflow-hidden">
      {post.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt="" className="max-h-48 w-full object-cover" />
      ) : null}
      <div className="p-4">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <Badge tone={post.kind === 'campaign' ? 'brand' : 'info'}>{POST_KIND_LABELS[post.kind]}</Badge>
            <Badge tone={v.tone} dot>
              {v.label}
            </Badge>
          </div>
          <Menu>
            <MenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label="Duyuru işlemleri">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem icon={<Pencil />} onSelect={onEdit}>
                Düzenle
              </MenuItem>
              <MenuItem icon={<Trash2 />} danger onSelect={onDelete}>
                Sil
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
        <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{post.title}</h3>
        <p className="mt-1 whitespace-pre-line text-sm text-fg/85">{post.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          <span>{timeAgo(post.createdAt)} paylaşıldı</span>
          {post.validFrom || post.validTo ? (
            <span className="inline-flex items-center gap-1">
              <CalendarRange className="h-3 w-3" />
              {post.validFrom ? formatDateTime(post.validFrom) : '…'} – {post.validTo ? formatDateTime(post.validTo) : '…'}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function Posts({ venueId }: { venueId: string }) {
  const utils = trpc.useUtils();
  const q = trpc.business.posts.useQuery({ venueId });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<VenuePost | null>(null);
  const [deleting, setDeleting] = useState<VenuePost | null>(null);
  const del = trpc.business.deletePost.useMutation({
    onSuccess: () => {
      toast.success('Duyuru silindi.');
      setDeleting(null);
      void utils.business.posts.invalidate({ venueId });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      <Button block className="mb-4" onClick={() => setCreating(true)}>
        <Plus className="h-4 w-4" />
        Yeni duyuru / kampanya
      </Button>
      {q.isLoading ? (
        <ListSkeleton rows={3} />
      ) : q.error ? (
        <QueryError error={q.error} retry={() => q.refetch()} />
      ) : q.data?.length ? (
        <div className="space-y-3">
          {q.data.map((p) => (
            <PostCard key={p.id} post={p} onEdit={() => setEditing(p)} onDelete={() => setDeleting(p)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Megaphone />}
          title="Henüz duyuru yok"
          description="Örn. “17.00–19.00 arasında masalarda %10 indirim” veya “Çuhalarımız yenilenmiştir”."
        />
      )}
      {creating ? <PostDialog open={creating} onOpenChange={setCreating} venueId={venueId} /> : null}
      {editing ? <PostDialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)} venueId={venueId} post={editing} /> : null}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Duyuru silinsin mi?"
        description={deleting?.title}
        confirmLabel="Sil"
        tone="danger"
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate({ postId: deleting.id })}
      />
    </>
  );
}

export default function PostsPage() {
  return (
    <BizPage title="Duyurular" subtitle="Salon duyuruları ve kampanyalar">
      <Gate perm="posts" needsApproval>
        {({ venueId }) => <Posts venueId={venueId} />}
      </Gate>
    </BizPage>
  );
}
