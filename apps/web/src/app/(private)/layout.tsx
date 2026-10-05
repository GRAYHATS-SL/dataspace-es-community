import { SessionWatcher } from '@/lib/providers/SessionWatcher';
import { getValidSession } from '@/lib/session';

export default async function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getValidSession();

  return (
    <>
      <SessionWatcher
        initialExpiresAt={session.expiresAt ?? null}
        initialUserProfile={session.userProfile ?? null}
      />
      {children}
    </>
  );
}
