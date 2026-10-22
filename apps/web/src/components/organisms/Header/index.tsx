import { getValidSession } from '@/lib/session';

import { HeaderContent } from './HeaderContent';

export interface HeaderProps {
  className?: string;
}

/**
 * Header - Main navigation header
 *
 * @description Server Component that reads the session and renders `HeaderContent`.
 */
export default async function Header({ className }: Readonly<HeaderProps>) {
  const session = await getValidSession();
  const user = session.userProfile ?? null;

  return <HeaderContent user={user} className={className} />;
}
