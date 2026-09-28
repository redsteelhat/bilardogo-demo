'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { Badge, Button, Card, CardBody, CardHeader, toast } from '@bilardogo/ui';
import { ExternalLink, Heart, MessageCircle, Save, Store } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { ImagesManager } from '@/components/business/images-manager';
import { OrderQrCard } from '@/components/business/order-qr-card';
import { BizPage, Gate } from '@/components/business/ui';
import { validateVenue, venueToForm, VenueFields, type VenueFormErrors, type VenueFormValue } from '@/components/business/venue-fields';
import { cityName } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

type VenueData = RouterOutputs['business']['venue'];

function VenueForm({ venue }: { venue: VenueData }) {
  const utils = trpc.useUtils();
  const [value, setValue] = useState<VenueFormValue>(() => venueToForm(venue));
  const [errors, setErrors] = useState<VenueFormErrors>({});
  const update = trpc.business.updateVenue.useMutation({
    onSuccess: (r) => {
      toast.success('Salon bilgileri kaydedildi.', { description: r.slug !== venue.slug ? `Yeni salon adresi: /salon/${r.slug}` : undefined });
      void utils.business.venue.invalidate({ venueId: venue.id });
      void utils.business.mine.invalidate();
      void utils.me.session.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const save = () => {
    const { data, errors: e } = validateVenue(value);
    setErrors(e);
    if (!data) return toast.error('Lütfen işaretli alanları düzeltin.');
    update.mutate({ venueId: venue.id, data });
  };
  return (
    <Card>
      <CardHeader icon={<Store className="h-5 w-5" />} title="Salon bilgileri" description="Oyuncuların salon sayfanda gördüğü bilgiler." />
      <CardBody>
        <VenueFields value={value} onChange={setValue} errors={errors} />
        <div className="sticky bottom-20 z-10 mt-5 lg:bottom-4">
          <Button block size="lg" onClick={save} loading={update.isPending}>
            <Save className="h-4 w-4" />
            Kaydet
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function SalonProfile({ venueId }: { venueId: string }) {
  const q = trpc.business.venue.useQuery({ venueId });
  if (q.isLoading) return <ListSkeleton rows={4} />;
  if (q.error) return <QueryError error={q.error} retry={() => q.refetch()} />;
  const v = q.data!;
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="relative h-32 bg-surface-2 sm:h-44">
          {v.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-subtle">
              <Store className="h-10 w-10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <div className="font-display text-2xl font-semibold text-white">{v.name}</div>
            <div className="text-xs text-white/80">
              {[v.district, cityName(v.cityPlate)].filter(Boolean).join(', ')}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-3">
          <Badge tone="brand">
            <Heart className="h-3 w-3" /> {v.followerCount} takipçi
          </Badge>
          {v.state === 'passive' ? <Badge tone="warning">Pasif</Badge> : null}
          {v.businessStatus !== 'approved' ? <Badge tone="warning">Onay bekliyor — uygulamada görünmüyor</Badge> : null}
          <div className="ml-auto flex gap-1.5">
            {v.conversationId ? (
              <Link href={`/sosyal/${v.conversationId}`}>
                <Button size="sm" variant="secondary">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Salon sohbeti
                </Button>
              </Link>
            ) : null}
            <Link href={`/salon/${v.slug}`} target="_blank">
              <Button size="sm" variant="outline">
                <ExternalLink className="h-3.5 w-3.5" />
                Salon sayfası
              </Button>
            </Link>
          </div>
        </div>
      </Card>
      <ImagesManager venueId={venueId} images={v.images} coverPath={v.coverPath} />
      <VenueForm key={v.id} venue={v} />
      <OrderQrCard venueId={venueId} />
    </div>
  );
}

export default function SalonPage() {
  return (
    <BizPage title="Salon profili" subtitle="Bilgiler, fotoğraflar ve çalışma saatleri">
      <Gate ownerOnly>{({ venueId }) => <SalonProfile venueId={venueId} />}</Gate>
    </BizPage>
  );
}
