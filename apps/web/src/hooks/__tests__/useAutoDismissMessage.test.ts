import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoDismissMessage } from '@/hooks/useAutoDismissMessage';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAutoDismissMessage', () => {
  it('starts with no message', () => {
    const { result } = renderHook(() => useAutoDismissMessage());
    expect(result.current[0]).toBeNull();
  });

  it('sets the message immediately', () => {
    const { result } = renderHook(() => useAutoDismissMessage());
    act(() => result.current[1]('Guardado correctamente'));
    expect(result.current[0]).toBe('Guardado correctamente');
  });

  it('clears the message automatically after the default duration', () => {
    const { result } = renderHook(() => useAutoDismissMessage());
    act(() => result.current[1]('Guardado correctamente'));
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current[0]).toBeNull();
  });

  it('respects a custom duration', () => {
    const { result } = renderHook(() => useAutoDismissMessage(1000));
    act(() => result.current[1]('Guardado correctamente'));
    act(() => vi.advanceTimersByTime(999));
    expect(result.current[0]).toBe('Guardado correctamente');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current[0]).toBeNull();
  });

  it('resets the timer when a new message is set before the previous one expires', () => {
    const { result } = renderHook(() => useAutoDismissMessage(1000));
    act(() => result.current[1]('First'));
    act(() => vi.advanceTimersByTime(700));
    act(() => result.current[1]('Second'));
    act(() => vi.advanceTimersByTime(700));
    expect(result.current[0]).toBe('Second');
    act(() => vi.advanceTimersByTime(300));
    expect(result.current[0]).toBeNull();
  });

  it('clears the message immediately when set to null', () => {
    const { result } = renderHook(() => useAutoDismissMessage());
    act(() => result.current[1]('Guardado correctamente'));
    act(() => result.current[1](null));
    expect(result.current[0]).toBeNull();
  });

  it('clears the pending timeout on unmount', () => {
    const { result, unmount } = renderHook(() => useAutoDismissMessage());
    act(() => result.current[1]('Guardado correctamente'));
    unmount();
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
  });
});
