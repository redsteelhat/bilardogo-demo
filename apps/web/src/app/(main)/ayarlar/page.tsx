'use client';
import { Button, EmptyState } from '@bilardogo/ui';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { PageLoading } from '@/components/common/states';
import {
  AccountActions,
  BlockedUsers,
  BusinessLink,
  ConsentSettings,
  SubscriptionCard,
} from '@/components/profile/account-settings';
import { NotificationSettings } from '@/components/profile/notification-settings';
import { useSession } from '@/lib/session';

export default function SettingsPage() {
  const { session, loading } = useSession();
  if (loading) return <PageLoading />;
  if (!session) {
    return (
      <>
        <PageHeader title="Ayarlar" />
        <PageBody>
          <EmptyState
            icon={<Settings />}
            title="Ayarlar için giriş yap"
            action={
              <Link href="/giris?next=/ayarlar">
                <Button>Giriş yap</Button>
              </Link>
            }
          />
        </PageBody>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Ayarlar" subtitle={session.email ?? (session.username ? `@${session.username}` : undefined)} />
      <PageBody className="space-y-4">
        <NotificationSettings />
        <SubscriptionCard session={session} />
        <ConsentSettings />
        <BusinessLink session={session} />
        <BlockedUsers />
        <AccountActions />
        <p className="pb-2 text-center text-[11px] text-subtle">BilardoGo · Ödeme almaz; sipariş ve turnuva ödemeleri salona yapılır.</p>
      </PageBody>
    </>
  );
}
