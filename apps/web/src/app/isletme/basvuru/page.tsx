'use client';
import { formatTrPhone, normalizeTrPhone, WEEKDAY_LABELS, WEEKDAYS } from '@bilardogo/domain';
import { Button, Card, CardBody, Notice, cn, toast } from '@bilardogo/ui';
import { ArrowLeft, ArrowRight, Check, FileText, Info, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageLoading } from '@/components/common/states';
import {
  BusinessInfoFields,
  cleanBusinessInfo,
  EMPTY_BUSINESS_INFO,
  validateBusinessInfo,
  type BusinessInfoErrors,
  type BusinessInfoValue,
} from '@/components/business/business-info-fields';
import { useBusiness } from '@/components/business/context';
import { BizPage } from '@/components/business/ui';
import { EMPTY_VENUE, validateVenue, VenueFields, type VenueFormErrors, type VenueFormValue } from '@/components/business/venue-fields';
import { cityName } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

const STEPS = ['Ticari bilgiler', 'Salon bilgileri', 'Sözleşme ve onay'];

function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="mb-5 flex items-center gap-2">
      {STEPS.map((s, i) => (
        <li key={s} className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              i < step ? 'bg-brand text-brand-fg' : i === step ? 'border-2 border-brand text-brand' : 'border border-border text-subtle',
            )}
          >
            {i < step ? <Check className="h-4 w-4" /> : i + 1}
          </span>
          <span className={cn('hidden truncate text-xs font-semibold sm:block', i === step ? 'text-fg' : 'text-muted')}>{s}</span>
          {i < STEPS.length - 1 ? <span className={cn('h-px flex-1', i < step ? 'bg-brand' : 'bg-border')} /> : null}
        </li>
      ))}
    </ol>
  );
}

function Summary({ info, venue }: { info: BusinessInfoValue; venue: VenueFormValue }) {
  const openDays = WEEKDAYS.filter((d) => venue.openingHours[d]);
  const rows: [string, string][] = [
    ['Ticari unvan', info.legalName],
    ['VKN / TCKN', info.taxId],
    ['Vergi dairesi', info.taxOffice],
    ['İletişim', formatTrPhone(normalizeTrPhone(info.contactPhone)) || info.contactPhone],
    ['Salon', venue.name],
    ['Adres', [venue.address, venue.district, cityName(venue.cityPlate)].filter(Boolean).join(', ')],
    ['Açık günler', openDays.length === 7 ? 'Her gün' : openDays.map((d) => WEEKDAY_LABELS[d]).join(', ') || 'Belirtilmedi'],
  ];
  return (
    <dl className="divide-y divide-border rounded-2xl border border-border text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-3 px-3 py-2">
          <dt className="w-28 shrink-0 text-xs text-subtle">{k}</dt>
          <dd className="min-w-0 flex-1 break-words font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ApplyPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const b = useBusiness();
  const [step, setStep] = useState(0);
  const [info, setInfo] = useState<BusinessInfoValue>(EMPTY_BUSINESS_INFO);
  const [infoErrors, setInfoErrors] = useState<BusinessInfoErrors>({});
  const [venue, setVenue] = useState<VenueFormValue>(EMPTY_VENUE);
  const [venueErrors, setVenueErrors] = useState<VenueFormErrors>({});
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const submit = trpc.business.submitApplication.useMutation({
    onSuccess: async (res) => {
      b.select(res.venueId);
      await Promise.all([utils.business.mine.invalidate(), utils.me.session.invalidate()]);
      toast.success('Başvurun alındı!', { description: 'Şimdi belgelerini yükleyerek incelemeyi hızlandır.' });
      router.replace('/isletme');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (b.loading) return <PageLoading />;
  const existing = b.businesses.find((x) => x.role === 'owner' && x.status !== 'rejected');
  if (existing) {
    return (
      <BizPage title="İşletme başvurusu">
        <Notice tone="info" icon={<Info />} title="Zaten bir işletme başvurun var">
          {existing.legalName} için başvurun bulunuyor.{' '}
          <Link href="/isletme" className="font-semibold text-brand underline">
            Başvuru durumunu gör
          </Link>
        </Notice>
      </BizPage>
    );
  }

  const top = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const next = () => {
    if (step === 0) {
      const e = validateBusinessInfo(info);
      setInfoErrors(e);
      if (Object.keys(e).length) return toast.error('Lütfen işaretli alanları düzeltin.');
    }
    if (step === 1) {
      const { errors } = validateVenue(venue);
      setVenueErrors(errors);
      if (Object.keys(errors).length) return toast.error('Lütfen işaretli alanları düzeltin.');
    }
    setStep((s) => s + 1);
    top();
  };
  const send = () => {
    if (!accepted) {
      setAcceptError('Devam etmek için işletme sözleşmesini kabul etmelisin.');
      return;
    }
    const { data, errors } = validateVenue(venue);
    const infoErr = validateBusinessInfo(info);
    if (!data || Object.keys(infoErr).length) {
      setVenueErrors(errors);
      setInfoErrors(infoErr);
      setStep(Object.keys(infoErr).length ? 0 : 1);
      return;
    }
    submit.mutate({ ...cleanBusinessInfo(info), venue: data, acceptBusinessAgreement: true });
  };

  return (
    <BizPage title="İşletme hesabı oluştur" subtitle={`Adım ${step + 1}/3 · ${STEPS[step]}`}>
      <StepIndicator step={step} />
      <Card>
        <CardBody className="pt-4">
          {step === 0 ? (
            <>
              <p className="mb-4 text-sm text-muted">Bu bilgiler yalnız BilardoGo ekibi tarafından doğrulama için görülür; oyunculara gösterilmez.</p>
              <BusinessInfoFields value={info} onChange={setInfo} errors={infoErrors} />
            </>
          ) : step === 1 ? (
            <>
              <p className="mb-4 text-sm text-muted">Oyuncuların salon sayfanda göreceği bilgiler. Sonradan panelden düzenleyebilirsin.</p>
              <VenueFields value={venue} onChange={setVenue} errors={venueErrors} />
            </>
          ) : (
            <div className="space-y-4">
              <Summary info={info} venue={venue} />
              <div className="rounded-2xl border border-border bg-surface-2/50 p-3">
                <Link
                  href="/yasal/business_agreement"
                  target="_blank"
                  className="flex items-center gap-2 text-sm font-semibold text-brand underline"
                >
                  <FileText className="h-4 w-4" />
                  İşletme sözleşmesini oku
                </Link>
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => {
                      setAccepted(e.target.checked);
                      setAcceptError(null);
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                  />
                  <span>
                    İşletme sözleşmesini okudum ve kabul ediyorum. Verdiğim bilgilerin doğru olduğunu beyan ederim.
                  </span>
                </label>
                {acceptError ? <p className="mt-1 text-xs text-danger">{acceptError}</p> : null}
              </div>
              <Notice tone="info" icon={<Info />}>
                Başvurundan sonra vergi levhası, imza sirküleri gibi belgelerini yüklemen istenecek. Onaylandığında ücretsiz deneme süren başlar.
              </Notice>
            </div>
          )}
        </CardBody>
      </Card>
      <div className="mt-4 flex gap-2">
        {step > 0 ? (
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setStep((s) => s - 1);
              top();
            }}
            disabled={submit.isPending}
          >
            <ArrowLeft className="h-4 w-4" />
            Geri
          </Button>
        ) : null}
        {step < 2 ? (
          <Button size="lg" className="flex-1" onClick={next}>
            Devam
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" className="flex-1" onClick={send} loading={submit.isPending}>
            <Send className="h-4 w-4" />
            Başvuruyu gönder
          </Button>
        )}
      </div>
    </BizPage>
  );
}
