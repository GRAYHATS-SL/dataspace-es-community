import { QueryProvider } from './queryClientProvider';

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return <QueryProvider>{children}</QueryProvider>;
}
