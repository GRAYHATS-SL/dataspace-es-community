import NotificationsProvider from '@/lib/providers/NotificationsProvider';
import { SessionWatcher } from '@/lib/providers/SessionWatcher';
import { getValidSession } from '@/lib/session';
import { getJWTExp } from '@/lib/utils/jwtEdge';

export default async function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getValidSession();
  const exp = session.accessToken ? getJWTExp(session.accessToken) : null;

  return (
    <NotificationsProvider>
      <SessionWatcher
        initialExpiresAt={exp !== null ? exp * 1000 : null}
        initialUserProfile={session.userProfile ?? null}
      />
      {session.userProfile && !session.userProfile.organizationId && (
        <div
          role="alert"
          className="mx-auto mt-4 max-w-5xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          No hemos podido vincular tu credencial a ninguna organización. Algunas funciones pueden no
          estar disponibles; contacta con soporte si el problema continúa.
        </div>
      )}
      {children}
    </NotificationsProvider>
  );
}
