// INTEGRATION test: useVerifierQR + useVerifierWebSocket composed as in (public)/inicio-sesion/page.tsx — the `state` that useVerifierQR obtains asynchronously from the Server Action is really passed to useVerifierWebSocket, which opens the WebSocket with that same value. The existing unit tests do not cover this wiring: useVerifierQR.test.tsx does not render the WebSocket hook, and useVerifierWebSocket.test.tsx passes a fixed `state` hand-written in the test, not one produced by the previous hook. Only the real boundary is mocked: the `fetchVerifierQR` Server Action (equivalent to mocking `fetch` in the unit tests) and the global `WebSocket` (it does not exist in jsdom).
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/qr', () => ({ fetchVerifierQR: vi.fn() }));

import { useVerifierQR } from '@/hooks/useVerifierQR';
import { useVerifierWebSocket } from '@/hooks/useVerifierWebSocket';
import { fetchVerifierQR } from '@/lib/services/qr';

const WS_NORMAL_CLOSURE = 1000;
const WS_POLICY_VIOLATION = 1008;
const STATE = 'server-issued-state-abc123';

class MockWebSocket {
  static readonly instances: MockWebSocket[] = [];
  url: string;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }
}

const originalWebSocket = globalThis.WebSocket;
const originalLocation = window.location;

function setLocation(origin: string) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { origin, href: `${origin}/` },
  });
}

function useLoginPageFlow() {
  const qr = useVerifierQR('https://app.example.com/auth/callback');
  useVerifierWebSocket(qr.state);
  return qr;
}

const send = (socket: MockWebSocket, data: unknown) => {
  socket.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) });
};

beforeEach(() => {
  MockWebSocket.instances.length = 0;
  // @ts-expect-error -- test-only override of the global WebSocket constructor
  globalThis.WebSocket = MockWebSocket;
  setLocation('https://app.example.com');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  globalThis.WebSocket = originalWebSocket;
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  vi.restoreAllMocks();
});

describe('flujo QR -> WebSocket -> redireccion (useVerifierQR + useVerifierWebSocket compuestos)', () => {
  it('abre el WebSocket con el state real obtenido del QR y redirige en un mensaje same-origin', async () => {
    vi.mocked(fetchVerifierQR).mockResolvedValue({
      qrImageSrc: 'data:image/png;base64,AAA',
      ok: true,
      status: 200,
      state: STATE,
    });

    const { result } = renderHook(() => useLoginPageFlow());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.state).toBe(STATE);

    // The WebSocket is opened in a separate effect, reacting to the already-resolved `state`.
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];
    expect(socket.url).toContain(`?state=${encodeURIComponent(STATE)}`);

    send(socket, { type: 'authenticated', redirectUrl: 'https://app.example.com/dashboard' });

    expect(window.location.href).toBe('https://app.example.com/dashboard');
    expect(socket.close).toHaveBeenCalledWith(WS_NORMAL_CLOSURE);
  });

  it('bloquea la redireccion cuando el verifier comprometido intenta un open-redirect cross-origin', async () => {
    vi.mocked(fetchVerifierQR).mockResolvedValue({
      qrImageSrc: 'data:image/png;base64,AAA',
      ok: true,
      status: 200,
      state: STATE,
    });

    const { result } = renderHook(() => useLoginPageFlow());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];
    const hrefBefore = window.location.href;

    send(socket, { type: 'authenticated', redirectUrl: 'https://evil.example.com/steal-session' });

    expect(window.location.href).toBe(hrefBefore);
    expect(socket.close).toHaveBeenCalledWith(WS_POLICY_VIOLATION);
  });

  it('cuando el QR falla (ok:false), no se genera state y el WebSocket nunca se abre', async () => {
    vi.mocked(fetchVerifierQR).mockResolvedValue({
      qrImageSrc: null,
      ok: false,
      status: 502,
      state: '',
    });

    const { result } = renderHook(() => useLoginPageFlow());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.state).toBe('');
    expect(MockWebSocket.instances).toHaveLength(0);
  });
});
