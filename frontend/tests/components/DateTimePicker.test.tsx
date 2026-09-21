import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateTimePicker } from '../../src/components/DateTimePicker';

describe('Componente DateTimePicker', () => {
  it('renderiza o valor inicial formatado como DD/MM/AAAA - HH:mm', () => {
    render(
      <DateTimePicker
        id="sold-at-test"
        label="Data e Hora da Venda"
        value="2026-09-21T14:30"
        onChange={vi.fn()}
      />
    );

    const input = screen.getByLabelText(/data e hora da venda/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('21/09/2026 - 14:30');
  });

  it('abre o popover com calendário e seção de horário ao clicar no botão de calendário', async () => {
    const user = userEvent.setup();
    render(
      <DateTimePicker
        id="sold-at-test"
        label="Data e Hora da Venda"
        value="2026-09-21T14:30"
        onChange={vi.fn()}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /abrir seletor de data e hora/i });
    await user.click(toggleButton);

    const popover = screen.getByRole('dialog', { name: /seletor de data e hora/i });
    expect(popover).toBeInTheDocument();
    expect(screen.getByText('setembro 2026')).toBeInTheDocument();
    expect(screen.getByText(/horário:/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Horas')).toHaveValue(14);
    expect(screen.getByLabelText('Minutos')).toHaveValue(30);
  });

  it('atualiza o valor emitido ao selecionar um novo dia no calendário mantendo o horário', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateTimePicker
        id="sold-at-test"
        label="Data e Hora da Venda"
        value="2026-09-21T14:30"
        onChange={onChange}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /abrir seletor de data e hora/i });
    await user.click(toggleButton);

    // Clica no dia 25 de setembro
    const day25 = screen.getByRole('button', { name: '25' });
    await user.click(day25);

    expect(onChange).toHaveBeenCalledWith('2026-09-25T14:30');
  });

  it('atualiza o valor ao alterar horas e minutos', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateTimePicker
        id="sold-at-test"
        label="Data e Hora da Venda"
        value="2026-09-21T14:30"
        onChange={onChange}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /abrir seletor de data e hora/i });
    await user.click(toggleButton);

    const hoursInput = screen.getByLabelText('Horas');
    await user.clear(hoursInput);
    await user.type(hoursInput, '18');

    expect(onChange).toHaveBeenCalledWith('2026-09-21T18:30');
  });

  it('não abre popover e aplica atributos disabled e readonly quando desabilitado', async () => {
    const user = userEvent.setup();
    render(
      <DateTimePicker
        id="sold-at-test"
        label="Data e Hora da Venda"
        value="2026-09-21T14:30"
        onChange={vi.fn()}
        disabled={true}
        readOnly={true}
      />
    );

    const input = screen.getByLabelText(/data e hora da venda/i);
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('readonly');

    const toggleButton = screen.getByRole('button', { name: /abrir seletor de data e hora/i });
    expect(toggleButton).toBeDisabled();

    await user.click(toggleButton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
