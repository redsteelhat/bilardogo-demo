'use client';
import { Button, Card, CardBody, EmptyState, toast } from '@bilardogo/ui';
import { UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { PageLoading } from '@/components/common/states';
import { AvatarEditor } from '@/components/profile/avatar-editor';
import { isProfileValid, ProfileFields, type ProfileFormValue } from '@/components/profile/profile-fields';
import { useSession } from '@/lib/session';
import { errorMessage, trpc } from '@/lib/trpc/client';

export default function EditProfilePage() {
  const { session, loading } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [value, setValue] = useState<ProfileFormValue | null>(null);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (session && !value) {
      setValue({
        fullName: session.fullName ?? '',
        username: session.username ?? '',
        cityPlate: session.cityPlate ?? 34,
        level: session.level,
        gameTypes: session.gameTypes,
        bio: session.bio ?? '',
      });
    }
  }, [session, value]);
  const update = trpc.me.update.useMutation({
    onSuccess: async (_r, vars) => {
      await Promise.all([utils.me.session.invalidate(), utils.players.profile.invalidate()]);
      toast.success('Profilin güncellendi');
      router.push(`/profil/${vars.username}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (loading) return <PageLoading />;
  if (!session) {
    return (
      <>
        <PageHeader title="Profili düzenle" />
        <PageBody>
          <EmptyState
            icon={<UserRound />}
            title="Profilini düzenlemek için giriş yap"
            action={
              <Link href="/giris?next=/profil/duzenle">
                <Button>Giriş yap</Button>
              </Link>
            }
          />
        </PageBody>
      </>
    );
  }
  if (!value) return <PageLoading />;

  const errors = [
    value.fullName.trim().length < 2 ? 'Ad soyad en az 2 karakter olmalı.' : null,
    !/^[a-z0-9_.]{3,20}$/.test(value.username) ? 'Kullanıcı adı 3–20 karakter; küçük harf, rakam, nokta, alt çizgi.' : null,
    value.gameTypes.length === 0 ? 'En az bir oyun türü seç.' : null,
  ].filter(Boolean) as string[];

  const save = () => {
    setTouched(true);
    if (!isProfileValid(value)) return;
    update.mutate({
      fullName: value.fullName.trim(),
      username: value.username,
      cityPlate: value.cityPlate,
      level: value.level,
      gameTypes: value.gameTypes,
      bio: value.bio.trim() || null,
    });
  };

  return (
    <>
      <PageHeader title="Profili düzenle" backHref={session.username ? `/profil/${session.username}` : '/profil'} />
      <PageBody className="space-y-4">
        <AvatarEditor name={session.fullName} avatarUrl={session.avatarUrl} />
        <Card>
          <CardBody className="pt-4">
            <ProfileFields value={value} onChange={setValue} initialUsername={session.username} />
          </CardBody>
        </Card>
        {touched && errors.length ? (
          <ul className="space-y-1 rounded-2xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}
        <Button size="lg" block loading={update.isPending} onClick={save}>
          Kaydet
        </Button>
      </PageBody>
    </>
  );
}
