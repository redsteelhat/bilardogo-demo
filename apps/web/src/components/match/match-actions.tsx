'use client';
import { GAME_LABELS, GAME_SHORT_LABELS, MATCH_TIMEOUTS, type GameType } from '@bilardogo/domain';
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  DialogContent,
  DialogFooter,
  Field,
  Notice,
  Segmented,
  Textarea,
  toast,
} from '@bilardogo/ui';
import { Check, Flag, Hourglass, MessageCircle, QrCode, ShoppingBag, Timer, Undo2, UserPlus, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorMessage, trpc } from '@/lib/trpc/client';
import { elapsed, sides, type Match } from './helpers';
import { ResultForm } from './result-form';
import { Scoreboard } from './scoreboard';
import { useNow } from './use-now';

function useMatchMutations(match: Match) {
  const utils = trpc.useUtils();
  const router = useRouter();
  const refresh = async () => {
    await Promise.all([utils.matches.invalidate(), utils.venues.live.invalidate()]);
  };
  const onError = (e: unknown) => toast.error(errorMessage(e));
  return {
    respond: trpc.matches.respond.useMutation({ onSuccess: refresh, onError }),
    cancel: trpc.matches.cancel.useMutation({ onSuccess: refresh, onError }),
    approveJoin: trpc.matches.approveJoin.useMutation({ onSuccess: refresh, onError }),
    rejectJoin: trpc.matches.rejectJoin.useMutation({ onSuccess: refresh, onError }),
    finish: trpc.matches.finish.useMutation({ onSuccess: refresh, onError }),
    confirm: trpc.matches.confirmResult.useMutation({ onSuccess: refresh, onError }),
    reject: trpc.matches.rejectResult.useMutation({ onSuccess: refresh, onError }),
    openDm: trpc.social.openDm.useMutation({ onSuccess: (r) => router.push(`/sosyal/${r.id}`), onError }),
    id: match.id,
  };
}

/** Rolüme ve maç durumuna göre birincil eylem paneli. */
export function MatchActions({ match, meId }: { match: Match; meId: string }) {
  const mut = useMatchMutations(match);
  const router = useRouter();
  const { opponent } = sides(match);
  const dmButton = opponent ? (
    <Button variant="secondary" loading={mut.openDm.isPending} onClick={() => mut.openDm.mutate({ userId: opponent.id })}>
      <MessageCircle className="h-4 w-4" /> Mesaj Gönder
    </Button>
  ) : null;

  switch (match.status) {
    case 'requested':
      return match.mySlot === 2 ? (
        <Panel title="Maç isteği" description={`${opponent?.displayName ?? 'Rakip'} seninle ${GAME_LABELS[match.gameType]} oynamak istiyor.`}>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="success"
              size="lg"
              loading={mut.respond.isPending && mut.respond.variables?.action === 'accept'}
              disabled={mut.respond.isPending}
              onClick={() =>
                mut.respond.mutate(
                  { matchId: match.id, action: 'accept' },
                  { onSuccess: () => toast.success('Maç kabul edildi', { description: 'Durum: Maç Yapacak' }) },
                )
              }
            >
              <Check className="h-4 w-4" /> Kabul Et
            </Button>
            <Button
              variant="danger"
              size="lg"
              loading={mut.respond.isPending && mut.respond.variables?.action === 'decline'}
              disabled={mut.respond.isPending}
              onClick={() => mut.respond.mutate({ matchId: match.id, action: 'decline' }, { onSuccess: () => toast('İstek reddedildi') })}
            >
              <X className="h-4 w-4" /> Reddet
            </Button>
          </div>
          <div className="mt-2 grid">{dmButton}</div>
        </Panel>
      ) : (
        <Panel title="Rakibin yanıtı bekleniyor" description="Rakibin kabul ettiğinde maç “Maç Yapacak” durumuna geçer." icon={<Hourglass className="h-5 w-5" />}>
          <div className="grid grid-cols-2 gap-2">
            {dmButton}
            <Button variant="ghost" loading={mut.cancel.isPending} onClick={() => mut.cancel.mutate({ matchId: match.id }, { onSuccess: () => toast('İstek iptal edildi') })}>
              <X className="h-4 w-4" /> İsteği iptal et
            </Button>
          </div>
        </Panel>
      );

    case 'accepted':
      return (
        <Panel title="Maç Yapacak" description="Masaya geçtiğinizde maçı başlatmak için masadaki BilardoGo QR kodunu okutun. Maç o masaya bağlanır ve masa dolu görünür.">
          <Button size="lg" block onClick={() => router.push(`/qr?mac=${match.id}`)}>
            <QrCode className="h-5 w-5" /> Maç Başladı — Masadaki QR’ı okut
          </Button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {dmButton}
            <ConfirmButton
              label="Maçı iptal et"
              title="Maçı iptal et?"
              description="Kabul edilmiş maç iptal edilir ve rakibin bilgilendirilir."
              confirmLabel="İptal et"
              pending={mut.cancel.isPending}
              onConfirm={(close) => mut.cancel.mutate({ matchId: match.id }, { onSuccess: () => (close(), toast('Maç iptal edildi')) })}
            />
          </div>
        </Panel>
      );

    case 'waiting_opponent':
      return <WalkInPanel match={match} mut={mut} />;

    case 'in_progress':
      return <InProgressPanel match={match} mut={mut} />;

    case 'awaiting_result':
      return (
        <Card>
          <CardHeader title="Sonucu gir" description="Maç bitti, masa boşaldı. Sonucu biriniz girer, diğeri onaylar." icon={<Flag className="h-5 w-5" />} />
          <CardBody className="space-y-3">
            {match.lastRejection ? (
              <Notice tone="warning" title={match.lastRejection.by === meId ? 'Sonucu reddettin' : 'Rakibin sonucu reddetti'}>
                {match.lastRejection.reason ? `Sebep: ${match.lastRejection.reason}` : 'Sonucu düzeltip yeniden gönderin.'}
              </Notice>
            ) : null}
            <ResultForm match={match} />
          </CardBody>
        </Card>
      );

    case 'pending_confirmation':
      return <ConfirmPanel match={match} meId={meId} mut={mut} />;

    default:
      return null;
  }
}

type Mut = ReturnType<typeof useMatchMutations>;

function WalkInPanel({ match, mut }: { match: Match; mut: Mut }) {
  const { p1, p2 } = sides(match);
  const now = useNow(1000);
  const deadline = new Date(match.createdAt).getTime() + MATCH_TIMEOUTS.walkInJoinMinutes * 60_000;
  const left = Math.max(0, deadline - now);
  const live = trpc.venues.live.useQuery({ venueId: match.venue?.id ?? '' }, { enabled: !!match.venue && match.mySlot === 1 });
  const allowed = live.data?.tables.find((t) => t.id === match.table?.id)?.allowedGameTypes ?? [match.gameType];
  const [game, setGame] = useState<GameType>(match.gameType);

  if (match.mySlot === 2) {
    return (
      <Panel title="Onay bekleniyor" description={`${p1?.displayName ?? 'Masa sahibi'} seni onaylayınca maç başlar.`} icon={<Hourglass className="h-5 w-5" />}>
        <Button variant="ghost" block loading={mut.cancel.isPending} onClick={() => mut.cancel.mutate({ matchId: match.id }, { onSuccess: () => toast('Oturumdan ayrıldın') })}>
          Oturumdan ayrıl
        </Button>
      </Panel>
    );
  }
  if (!p2) {
    return (
      <Panel
        title="Rakibin bekleniyor"
        description={`Rakibin aynı masanın QR kodunu okutsun${match.table ? ` (Masa ${match.table.number})` : ''}.`}
        icon={<UserPlus className="h-5 w-5" />}
      >
        <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-3">
          <span className="text-sm text-muted">Oturum süresi</span>
          <span className="font-display text-2xl font-bold tabular-nums text-brand">{left > 0 ? elapsed(new Date(now - left), now) : 'Doldu'}</span>
        </div>
        <Button variant="ghost" block className="mt-2" loading={mut.cancel.isPending} onClick={() => mut.cancel.mutate({ matchId: match.id }, { onSuccess: () => toast('Masa oturumu kapatıldı') })}>
          Oturumu kapat
        </Button>
      </Panel>
    );
  }
  return (
    <Panel title="Rakip katıldı" description="Katılan oyuncuyu doğrula ve maçı başlat.">
      <div className="flex items-center gap-3 rounded-2xl border border-brand/40 bg-brand-soft p-3">
        <Avatar name={p2.displayName} src={p2.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{p2.displayName}</div>
          <div className="truncate text-xs text-muted">{p2.username ? `@${p2.username}` : ''}</div>
        </div>
      </div>
      {allowed.length > 1 ? (
        <div className="mt-3">
          <div className="mb-1.5 text-xs font-semibold text-muted">Oyun türü</div>
          <Segmented size="sm" value={game} onChange={setGame} options={allowed.map((g) => ({ value: g, label: GAME_SHORT_LABELS[g] }))} />
          {game !== match.gameType ? <p className="mt-1 text-[11px] text-subtle">Tür değişirse varsayılan format kullanılır.</p> : null}
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="danger"
          loading={mut.rejectJoin.isPending}
          disabled={mut.approveJoin.isPending}
          onClick={() => mut.rejectJoin.mutate({ matchId: match.id }, { onSuccess: () => toast('Oyuncu reddedildi') })}
        >
          <X className="h-4 w-4" /> Reddet
        </Button>
        <Button
          loading={mut.approveJoin.isPending}
          disabled={mut.rejectJoin.isPending}
          onClick={() =>
            mut.approveJoin.mutate(
              { matchId: match.id, gameType: game !== match.gameType ? game : undefined },
              { onSuccess: () => toast.success('Maç başladı. İyi oyunlar!') },
            )
          }
        >
          <Check className="h-4 w-4" /> Onayla ve Başlat
        </Button>
      </div>
    </Panel>
  );
}

function InProgressPanel({ match, mut }: { match: Match; mut: Mut }) {
  const now = useNow(1000);
  return (
    <Card className="overflow-hidden border-danger/30">
      <div className="bg-[radial-gradient(circle_at_50%_0%,rgba(248,113,113,0.18),transparent_70%)] p-5 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
          <span className="h-2 w-2 animate-pulse rounded-full bg-danger" /> Maçta{match.table ? ` · Masa ${match.table.number}` : ''}
        </div>
        <div className="mt-3 font-display text-5xl font-bold tabular-nums">{match.startedAt ? elapsed(match.startedAt, now) : '00:00'}</div>
        <div className="mt-1 flex items-center justify-center gap-1 text-xs text-muted">
          <Timer className="h-3.5 w-3.5" /> Geçen süre
        </div>
      </div>
      <CardBody className="space-y-2 pt-4">
        <ConfirmButton
          label="Maçı Bitir"
          variant="primary"
          size="lg"
          title="Maçı bitir?"
          description="Masa hemen boşalır. Ardından sonucu biriniz girer, diğeri onaylar."
          confirmLabel="Maçı Bitir"
          pending={mut.finish.isPending}
          onConfirm={(close) =>
            mut.finish.mutate({ matchId: match.id }, { onSuccess: () => (close(), toast.success('Maç bitti, masa boşaldı', { description: 'Şimdi sonucu gir.' })) })
          }
        />
        {match.venue ? (
          <Link href={`/salon/${match.venue.slug}/siparis?mac=${match.id}`} className="block">
            <Button variant="secondary" block>
              <ShoppingBag className="h-4 w-4" /> Sipariş ver
            </Button>
          </Link>
        ) : null}
      </CardBody>
    </Card>
  );
}

function ConfirmPanel({ match, meId, mut }: { match: Match; meId: string; mut: Mut }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const result = match.result;
  if (!result) return null;
  const mine = result.submittedBy === meId;
  const reasonError = reason.trim().length < 3 ? 'Ret sebebini yaz (en az 3 karakter).' : null;
  return (
    <Card>
      <CardHeader
        title={mine ? 'Rakip onayı bekleniyor' : 'Sonucu onayla'}
        description={mine ? 'Rakibin onaylayınca sonuç ve istatistikler iki profile de işlenir.' : 'Rakibin sonucu girdi. Doğruysa onayla; hatalıysa reddet ve düzeltmeye gönder.'}
        icon={<Flag className="h-5 w-5" />}
      />
      <CardBody className="space-y-3">
        <Scoreboard match={match} result={result} />
        {mine ? (
          <ConfirmButton
            label="Geri çek ve düzelt"
            icon={<Undo2 className="h-4 w-4" />}
            title="Sonucu geri çek?"
            description="Sonuç geri çekilir ve yeniden girebilirsin."
            confirmLabel="Geri çek"
            pending={mut.reject.isPending}
            onConfirm={(close) =>
              mut.reject.mutate({ matchId: match.id, reason: 'Düzeltme için geri çekildi' }, { onSuccess: () => (close(), toast('Sonuç geri çekildi')) })
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" size="lg" onClick={() => setOpen(true)} disabled={mut.confirm.isPending}>
              <X className="h-4 w-4" /> Reddet
            </Button>
            <Button
              variant="success"
              size="lg"
              loading={mut.confirm.isPending}
              onClick={() => mut.confirm.mutate({ matchId: match.id }, { onSuccess: () => toast.success('Sonuç onaylandı', { description: 'Maç tamamlandı.' }) })}
            >
              <Check className="h-4 w-4" /> Onayla
            </Button>
          </div>
        )}
      </CardBody>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Sonucu reddet" description="Sonuç işlenmez ve rakibine düzeltmesi için geri gönderilir.">
          <Field label="Ret sebebi" required error={tried ? reasonError : null}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Örn. Sayılar yanlış girilmiş, 30-24 bitti." autoFocus />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              loading={mut.reject.isPending}
              onClick={() => {
                setTried(true);
                if (reasonError) return;
                mut.reject.mutate(
                  { matchId: match.id, reason: reason.trim() },
                  {
                    onSuccess: () => {
                      setOpen(false);
                      setReason('');
                      toast('Sonuç reddedildi', { description: 'Rakibin düzeltip yeniden gönderecek.' });
                    },
                  },
                );
              }}
            >
              Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Panel({ title, description, icon, children }: { title: string; description?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} icon={icon} />
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function ConfirmButton({
  label,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
  variant = 'ghost',
  size = 'md',
  icon,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: (close: () => void) => void;
  variant?: 'ghost' | 'primary' | 'danger' | 'secondary';
  size?: 'md' | 'lg';
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} block onClick={() => setOpen(true)}>
        {icon}
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={title} description={description}>
          <DialogFooter className="mt-0">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button variant={variant === 'ghost' ? 'danger' : 'primary'} loading={pending} onClick={() => onConfirm(() => setOpen(false))}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
