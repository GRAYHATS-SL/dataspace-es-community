'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_DURATION_MS = 4000;

/** Temporary message that clears itself after `durationMs`; returns `[message, setMessage]`. */
export function useAutoDismissMessage(
  durationMs: number = DEFAULT_DURATION_MS,
): [string | null, (value: string | null) => void] {
  const [message, setMessageState] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const setMessage = useCallback(
    (value: string | null) => {
      clearTimeout(timeoutRef.current);
      setMessageState(value);
      if (value) {
        timeoutRef.current = setTimeout(() => setMessageState(null), durationMs);
      }
    },
    [durationMs],
  );

  return [message, setMessage];
}
