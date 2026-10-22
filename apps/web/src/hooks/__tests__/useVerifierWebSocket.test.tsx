import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVerifierWebSocket } from '@/hooks/useVerifierWebSocket';

const WS_NORMAL_CLOSURE = 1000;
const WS_POLICY_VIOLATION = 1008;

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

const send = (socket: MockWebSocket, data: unknown) => {
  socket.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) });
};

describe('useVerifierWebSocket', () => {
  it('does not construct a WebSocket when state is falsy/empty', () => {
    renderHook(() => useVerifierWebSocket(''));
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('constructs a WebSocket with the url containing ?state=<encoded state> when state is non-empty', () => {
    renderHook(() => useVerifierWebSocket('my state/with special&chars'));

    expect(MockWebSocket.instances).toHaveLength(1);
    const url = MockWebSocket.instances[0].url;
    expect(url).toContain(`?state=${encodeURIComponent('my state/with special&chars')}`);
  });

  it('navigates and closes with 1000 when redirectUrl is same-origin', () => {
    renderHook(() => useVerifierWebSocket('state-1'));
    const socket = MockWebSocket.instances[0];

    send(socket, { type: 'authenticated', redirectUrl: 'https://app.example.com/dashboard' });

    expect(window.location.href).toBe('https://app.example.com/dashboard');
    expect(socket.close).toHaveBeenCalledWith(WS_NORMAL_CLOSURE);
  });

  it('does NOT navigate and closes with 1008 when redirectUrl is cross-origin (open-redirect protection)', () => {
    renderHook(() => useVerifierWebSocket('state-1'));
    const socket = MockWebSocket.instances[0];
    const hrefBefore = window.location.href;

    send(socket, { type: 'authenticated', redirectUrl: 'https://evil.example.com/steal' });

    expect(window.location.href).toBe(hrefBefore);
    expect(socket.close).toHaveBeenCalledWith(WS_POLICY_VIOLATION);
  });

  it('does NOT navigate and closes with 1008 when redirectUrl is unparseable', () => {
    renderHook(() => useVerifierWebSocket('state-1'));
    const socket = MockWebSocket.instances[0];
    const hrefBefore = window.location.href;

    send(socket, { type: 'authenticated', redirectUrl: 'not a valid url::::' });

    expect(window.location.href).toBe(hrefBefore);
    expect(socket.close).toHaveBeenCalledWith(WS_POLICY_VIOLATION);
  });

  it('closes the socket on an "error" message', () => {
    renderHook(() => useVerifierWebSocket('state-1'));
    const socket = MockWebSocket.instances[0];

    send(socket, { type: 'error' });

    expect(socket.close).toHaveBeenCalled();
  });

  it('is a no-op and keeps the socket open on a "session" message', () => {
    renderHook(() => useVerifierWebSocket('state-1'));
    const socket = MockWebSocket.instances[0];

    send(socket, { type: 'session' });

    expect(socket.close).not.toHaveBeenCalled();
  });

  it('does not throw on unparseable JSON in event.data', () => {
    renderHook(() => useVerifierWebSocket('state-1'));
    const socket = MockWebSocket.instances[0];

    expect(() => send(socket, '{not valid json')).not.toThrow();
    expect(socket.close).not.toHaveBeenCalled();
  });

  it('closes the socket with 1000 on unmount', () => {
    const { unmount } = renderHook(() => useVerifierWebSocket('state-1'));
    const socket = MockWebSocket.instances[0];

    unmount();

    expect(socket.close).toHaveBeenCalledWith(WS_NORMAL_CLOSURE);
  });

  it('opens a new socket (and closes the previous one) when state changes', () => {
    const { rerender } = renderHook(({ state }) => useVerifierWebSocket(state), {
      initialProps: { state: 'state-1' },
    });
    const first = MockWebSocket.instances[0];

    rerender({ state: 'state-2' });

    expect(first.close).toHaveBeenCalledWith(WS_NORMAL_CLOSURE);
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(MockWebSocket.instances[1].url).toContain('state=state-2');
  });
});
