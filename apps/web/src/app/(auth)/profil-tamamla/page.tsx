'use client';
import { Button, Card, Notice, SwitchRow, toast } from '@bilardogo/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageLoading } from '@/components/common/states';
import { isProfileValid, ProfileFields, type ProfileFormValue } from '@/components/profile/profile-fields';
import { errorMessage, trpc } from '@/lib/trpc/client';

export default function OnboardingPage() {
  const router = useRouter();
  const session = trpc.me.session.useQuery();
  const [value, setValue] = useState<ProfileFormValue | null>(null);
  const [consent, setConsent] = useState({ agreement: false, kvkk: false, explicit: false, marketing: false });
  const complete = trpc.me.completeOnboarding.useMutation();

  useEffect(() => {
    if (session.data === null) router.replace('/giris');
    if (session.data?.onboarded) router.replace('/');
    if (session.data && !value) {
      const guess = (session.data.email ?? '').split('@')[0]!.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20);
      setValue({
        fullName: session.data.fullName,
        username: session.data.username ?? guess,
        cityPlate: session.data.cityPlate ?? 34,
        level: session.data.level,
        gameTypes: session.data.gameTypes.length ? session.data.gameTypes : ['three_cushion'],
        bio: session.data.bio ?? '',
      });
    }
  }, [session.data, router, value]);

  if (!value) return <PageLoading />;
  const canSubmit = isProfileValid(value) && consent.agreement && consent.kvkk;
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Profilini tamamla</h1>
      <p className="mt-1 text-sm text-muted">Diğer oyuncular seni bu bilgilerle görecek.</p>
      <div className="mt-6">
        <ProfileFields value={value} onChange={setValue} />
      </div>
      <Card className="mt-6 divide-y divide-border px-4">
        <SwitchRow
          label={
            <>
              <Link href="/yasal/user_agreement" target="_blank" className="text-brand underline">
                Kullanıcı Sözleşmesi
              </Link>
              ’ni kabul ediyorum
            </>
          }
          checked={consent.agreement}
          onCheckedChange={(v) => setConsent({ ...consent, agreement: v })}
        />
        <SwitchRow
          label={
            <>
              <Link href="/yasal/kvkk_notice" target="_blank" className="text-brand underline">
                KVKK Aydınlatma Metni
              </Link>
              ’ni okudum
            </>
          }
          checked={consent.kvkk}
          onCheckedChange={(v) => setConsent({ ...consent, kvkk: v })}
        />
        <SwitchRow
          label={
            <>
              Verilerimin yurt dışındaki altyapıya aktarılmasına{' '}
              <Link href="/yasal/explicit_consent" target="_blank" className="text-brand underline">
                açık rıza
              </Link>{' '}
              veriyorum
            </>
          }
          description="Opsiyonel"
          checked={consent.explicit}
          onCheckedChange={(v) => setConsent({ ...consent, explicit: v })}
        />
        <SwitchRow
          label="Kampanya ve etkinlik duyurularını almak istiyorum"
          description="Opsiyonel · Ticari elektronik ileti izni"
          checked={consent.marketing}
          onCheckedChange={(v) => setConsent({ ...consent, marketing: v })}
        />
      </Card>
      <Notice tone="brand" className="mt-4">
        İlk 30 gün ücretsiz. Deneme süresi bitince abonelik bilgisi profilinde görünür.
      </Notice>
      <Button
        size="lg"
        block
        className="mt-6"
        disabled={!canSubmit}
        loading={complete.isPending}
        onClick={async () => {
          try {
            await complete.mutateAsync({
              fullName: value.fullName.trim(),
              username: value.username,
              cityPlate: value.cityPlate,
              level: value.level,
              gameTypes: value.gameTypes,
              bio: value.bio.trim() || null,
              acceptUserAgreement: true,
              acknowledgeKvkk: true,
              explicitConsent: consent.explicit,
              marketingConsent: consent.marketing,
            });
            window.localStorage.setItem('bg_city', String(value.cityPlate));
            toast.success('Hoş geldin! 🎱');
            router.replace('/');
            router.refresh();
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      >
        Başla
      </Button>
    </div>
  );
}
