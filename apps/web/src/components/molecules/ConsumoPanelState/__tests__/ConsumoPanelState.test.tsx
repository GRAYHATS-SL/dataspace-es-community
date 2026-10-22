import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConsumoPanelState from '@/components/molecules/ConsumoPanelState';

const props = {
  isLoading: false,
  isError: false,
  isEmpty: false,
  emptyMessage: 'Vacío',
  onRetry: vi.fn(),
};

afterEach(cleanup);

describe('ConsumoPanelState', () => {
  it('carga: skeletons con aria-busy', () => {
    const { container } = render(<ConsumoPanelState {...props} isLoading skeletonCount={3} />);
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3);
  });

  it('carga: 2 skeletons por defecto', () => {
    const { container } = render(<ConsumoPanelState {...props} isLoading />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(2);
  });

  it('error: mensaje y reintento', () => {
    const onRetry = vi.fn();
    render(<ConsumoPanelState {...props} isError errorMessage="Fallo X" onRetry={onRetry} />);
    expect(screen.getByRole('alert').textContent).toContain('Fallo X');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('error: mensaje genérico sin errorMessage', () => {
    render(<ConsumoPanelState {...props} isError />);
    expect(screen.getByText(/No se pudo consultar el consumo/)).toBeTruthy();
  });

  it('vacío: muestra el mensaje', () => {
    render(<ConsumoPanelState {...props} isEmpty />);
    expect(screen.getByText('Vacío')).toBeTruthy();
  });

  it('con datos no renderiza nada', () => {
    const { container } = render(<ConsumoPanelState {...props} />);
    expect(container.innerHTML).toBe('');
  });

  it('carga prevalece sobre error y vacío', () => {
    render(<ConsumoPanelState {...props} isLoading isError isEmpty />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Vacío')).toBeNull();
  });
});
