import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Dropdown from '@/components/molecules/Dropdown';

const options = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
];

afterEach(cleanup);

describe('Dropdown', () => {
  it('sin value no entra en bucle de renderizado y muestra el placeholder', () => {
    render(<Dropdown options={options} placeholder="Todos" />);
    expect(screen.getByText('Todos')).toBeTruthy();
  });

  it('selección múltiple: actualiza al instante y notifica al padre', () => {
    const onSelectionChange = vi.fn();
    render(<Dropdown options={options} onSelectionChange={onSelectionChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('CSV'));
    fireEvent.click(screen.getByText('JSON'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['csv', 'json']);
    expect(screen.getAllByText('2 seleccionados').length).toBeGreaterThan(0);
  });

  it('selección simple: alterna y cierra el menú', () => {
    const onSelectionChange = vi.fn();
    render(<Dropdown options={options} multiple={false} onSelectionChange={onSelectionChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('JSON'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['json']);
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('se sincroniza cuando el padre cambia value', () => {
    const { rerender } = render(<Dropdown options={options} value={['csv']} />);
    expect(screen.getByText('CSV')).toBeTruthy();
    rerender(<Dropdown options={options} value={['json']} />);
    expect(screen.getByText('JSON')).toBeTruthy();
    expect(screen.queryByText('CSV')).toBeNull();
  });

  it('Limpiar vacía la selección y notifica', () => {
    const onSelectionChange = vi.fn();
    render(<Dropdown options={options} value={['csv']} onSelectionChange={onSelectionChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Limpiar'));
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });
});
