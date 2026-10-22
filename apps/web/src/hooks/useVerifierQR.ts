import { useCallback, useEffect, useState } from 'react';

import { fetchVerifierQR } from '@/lib/services/qr';
import { VERIFIER_QR_REFRESH_MS } from '@/lib/services/verifier.constants';

interface UseVerifierQRResult {
  qrImageSrc: string | null;
  isLoading: boolean;
  isError: boolean;
  state: string;
}

export const useVerifierQR = (
  redirectUri: string = typeof window === 'undefined'
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/callback`
    : `${window.location.origin}/auth/callback`,
): UseVerifierQRResult => {
  const [qrImageSrc, setQrImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [state, setState] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);

  const fetchQR = useCallback(
    async (isCancelled: () => boolean) => {
      setIsLoading(true);
      setIsError(false);

      try {
        const { qrImageSrc: src, ok, state: serverState } = await fetchVerifierQR(redirectUri);
        if (isCancelled()) return;
        setQrImageSrc(src);
        setIsError(!ok);
        setState(serverState);
      } catch (e) {
        if (isCancelled()) return;
        // eslint-disable-next-line no-console -- visibility of QR authentication flow failures
        console.error('Error fetching verifier QR:', e);
        setIsError(true);
        setQrImageSrc(null);
      } finally {
        if (!isCancelled()) setIsLoading(false);
      }
    },
    [redirectUri],
  );

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchQR sets isLoading at the start of each request (initial load and refresh); the rest of the state updates asynchronously with an isCancelled guard
    void fetchQR(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchQR, refreshCount]);

  // The QR expires in the verifier: it is renewed beforehand. The new `state` makes useVerifierWebSocket close the previous socket and open a new one.
  useEffect(() => {
    if (!state || isLoading || isError) return;
    const timer = setTimeout(() => setRefreshCount((c) => c + 1), VERIFIER_QR_REFRESH_MS);
    return () => clearTimeout(timer);
  }, [state, isLoading, isError]);

  return { qrImageSrc, isLoading, isError, state };
};
