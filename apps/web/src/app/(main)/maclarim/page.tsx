'use client';
import { Button, EmptyState, SectionTitle, toast } from '@bilardogo/ui';
import { Check, CheckCheck, ClipboardList, Hourglass, History, Inbox, MessageCircle, Send, Swords, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { sides, type Match } from '@/components/match/helpers';
import { MatchCard } from '@/components/match/match-card';
import { useSession } from '@/lib/session';
import { errorMessage, trpc } from '@/lib/trpc/client';

export default function MyMatchesPage() {
  const { session, loading } = useSession();
  const router = useRouter();
  const mine = trpc.matches.mine.useQuery(undefined, { enabled: !!session, refetchInterval: 20_000 });

  if (!loading && !session) {
    return (
      <>
        <PageHeader title="Maçlarım" />
        <PageBody>
          <EmptyState
            icon={<Swords />}
            title="Maçlarını görmek için giriş yap"
            action={<Button onClick={() => router.push('/giris?next=/maclarim')}>Giriş yap</Button>}
          />
        </PageBody>
      </>
    );
  }
  const d = mine.data;
  const total = d ? Object.values(d).reduce((a, l) => a + l.length, 0) : 0;

  return (
    <>
      <PageHeader title="Maçlarım" subtitle="İstekler, aktif maçlar ve sonuçlar" />
      <PageBody>
        {mine.isLoading || loading ? (
          <ListSkeleton rows={4} />
        ) : mine.error ? (
          <QueryError error={mine.error} retry={() => mine.refetch()} />
        ) : !d || total === 0 ? (
          <EmptyState
            icon={<Swords />}
            title="Henüz maçın yok"
            description="Bir salona gir, “Salonda Kimler Var?” ekranından rakip seç ya da masadaki QR’ı okutarak hemen oyna."
            action={
              <Link href="/">
                <Button>Salonlara göz at</Button>
              </Link>
            }
          />
        ) : (
          <>
            <Section title="Gelen istekler" icon={<Inbox />} list={d.incoming} first>
              {(m) => <IncomingActions match={m} />}
            </Section>
            <Section title="Aktif maç" icon={<Swords />} list={d.active} />
            <Section title="Sonuç bekleyenler" icon={<ClipboardList />} list={d.needsResult}>
              {(m) => (
                <Link href={`/maclarim/${m.id}`} className="flex-1">
                  <Button size="sm" block>
                    Sonucu gir
                  </Button>
                </Link>
              )}
            </Section>
            <Section title="Onayını bekleyenler" icon={<CheckCheck />} list={d.toConfirm}>
              {(m) => (
                <Link href={`/maclarim/${m.id}`} className="flex-1">
                  <Button size="sm" block>
                    Sonucu incele ve onayla
                  </Button>
                </Link>
              )}
            </Section>
            <Section title="Rakip onayı bekleniyor" icon={<Hourglass />} list={d.waitingOpponentConfirm} />
            <Section title="Giden istekler" icon={<Send />} list={d.outgoing}>
              {(m) => <CancelAction match={m} />}
            </Section>
            <Section title="Geçmiş" icon={<History />} list={d.history} />
          </>
        )}
      </PageBody>
    </>
  );
}

function Section({
  title,
  icon,
  list,
  children,
  first,
}: {
  title: string;
  icon: React.ReactNode;
  list: Match[];
  children?: (m: Match) => React.ReactNode;
  first?: boolean;
}) {
  if (list.length === 0) return null;
  return (
    <section>
      <SectionTitle icon={icon} count={list.length} className={first ? 'mt-2' : undefined}>
        {title}
      </SectionTitle>
      <div className="space-y-2.5">
        {list.map((m) => (
          <MatchCard key={m.id} match={m}>
            {children?.(m)}
          </MatchCard>
        ))}
      </div>
    </section>
  );
}

function IncomingActions({ match }: { match: Match }) {
  const utils = trpc.useUtils();
  const router = useRouter();
  const [action, setAction] = useState<'accept' | 'decline' | null>(null);
  const respond = trpc.matches.respond.useMutation({
    onSuccess: async (_r, vars) => {
      await utils.matches.invalidate();
      if (vars.action === 'accept') {
        toast.success('Maç kabul edildi', { description: 'Masaya geçince “Maç Başladı” ile masadaki QR’ı okutun.' });
        router.push(`/maclarim/${match.id}`);
      } else toast('İstek reddedildi');
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => setAction(null),
  });
  const openDm = trpc.social.openDm.useMutation({
    onSuccess: (r) => router.push(`/sosyal/${r.id}`),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const opp = sides(match).opponent;
  return (
    <div className="grid w-full grid-cols-3 gap-2">
      <Button
        size="sm"
        variant="success"
        loading={respond.isPending && action === 'accept'}
        disabled={respond.isPending}
        onClick={() => {
          setAction('accept');
          respond.mutate({ matchId: match.id, action: 'accept' });
        }}
      >
        <Check className="h-4 w-4" /> Kabul Et
      </Button>
      <Button
        size="sm"
        variant="danger"
        loading={respond.isPending && action === 'decline'}
        disabled={respond.isPending}
        onClick={() => {
          setAction('decline');
          respond.mutate({ matchId: match.id, action: 'decline' });
        }}
      >
        <X className="h-4 w-4" /> Reddet
      </Button>
      <Button size="sm" variant="secondary" loading={openDm.isPending} disabled={!opp} onClick={() => opp && openDm.mutate({ userId: opp.id })}>
        <MessageCircle className="h-4 w-4" /> Mesaj Gönder
      </Button>
    </div>
  );
}

function CancelAction({ match }: { match: Match }) {
  const utils = trpc.useUtils();
  const cancel = trpc.matches.cancel.useMutation({
    onSuccess: async () => {
      await utils.matches.invalidate();
      toast('İstek iptal edildi');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Button size="sm" variant="ghost" className="ml-auto" loading={cancel.isPending} onClick={() => cancel.mutate({ matchId: match.id })}>
      <X className="h-4 w-4" /> İsteği iptal et
    </Button>
  );
}
