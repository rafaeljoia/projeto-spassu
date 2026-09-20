import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from '../../src/components/Toast';

describe('Componente Toast', () => {
  it('renderiza a mensagem em texto escuro e botão de fechar', () => {
    render(<Toast message="VENDA REALIZADA COM SUCESSO!" onClose={vi.fn()} />);

    expect(screen.getByText('VENDA REALIZADA COM SUCESSO!')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /fechar notificação/i })
    ).toBeInTheDocument();
  });

  it('chama onClose ao clicar no botão X de fechar', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<Toast message="VENDA ALTERADA COM SUCESSO!" onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: /fechar notificação/i });
    await user.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('chama onClose automaticamente após o tempo padrão de 4 segundos', () => {
    vi.useFakeTimers();
    const handleClose = vi.fn();
    render(<Toast message="VENDA REMOVIDA COM SUCESSO!" onClose={handleClose} duration={4000} />);

    expect(handleClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(4000);

    expect(handleClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
