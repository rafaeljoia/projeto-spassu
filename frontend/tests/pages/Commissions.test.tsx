import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Commissions } from '../../src/pages/Commissions';
import { commissionService } from '../../src/services/commissionService';
import { CommissionReport } from '../../src/types';

vi.mock('../../src/services/commissionService', () => ({
  commissionService: {
    getCommissionReport: vi.fn(),
  },
}));

describe('Commissions Report Page Component', () => {
  const mockReport: CommissionReport = {
    start_date: '2026-09-01',
    end_date: '2026-09-15',
    salespeople: [
      {
        salesperson_id: 1,
        salesperson_name: 'Carlos Eduardo Lima',
        sales_count: 3,
        total_commission: '345.80',
      },
      {
        salesperson_id: 2,
        salesperson_name: 'Mariana Souza',
        sales_count: 5,
        total_commission: '612.40',
      },
    ],
    grand_total_commission: '958.20',
  };

  const mockEmptyReport: CommissionReport = {
    start_date: '2026-01-01',
    end_date: '2026-01-10',
    salespeople: [],
    grand_total_commission: '0.00',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza os campos inicialmente vazios e carrega o relatório somente após a busca', async () => {
    const user = userEvent.setup();
    vi.mocked(commissionService.getCommissionReport).mockResolvedValueOnce(mockReport);

    render(<Commissions />);

    // Valida que os campos estão inicialmente vazios
    const startInput = screen.getByLabelText(/data inicial/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/data final/i) as HTMLInputElement;
    expect(startInput.value).toBe('');
    expect(endInput.value).toBe('');

    // Valida que nenhuma chamada à API foi feita no carregamento inicial
    expect(commissionService.getCommissionReport).not.toHaveBeenCalled();

    // Valida exibição do estado vazio inicial
    expect(
      screen.getByText(/para visualizar o relatório, selecione um período nos campos acima/i)
    ).toBeInTheDocument();

    // Usuário preenche as datas e clica na lupa de busca
    await user.type(startInput, '2026-09-01');
    await user.type(endInput, '2026-09-15');
    const submitBtn = screen.getByRole('button', { name: /consultar comissões/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Carlos Eduardo Lima')).toBeInTheDocument();
      expect(screen.getByText('Mariana Souza')).toBeInTheDocument();
    });

    // Valida total geral no rodapé da tabela
    expect(screen.getByText(/total de comissões do período/i)).toBeInTheDocument();
    expect(screen.getByText(/r\$\s*958,20/i)).toBeInTheDocument();

    // Valida comissões individuais
    expect(screen.getByText(/r\$\s*345,80/i)).toBeInTheDocument();
    expect(screen.getByText(/r\$\s*612,40/i)).toBeInTheDocument();

    // Valida contagem de vendas pura
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('exibe mensagem amigável de estado vazio quando o período não possui vendas', async () => {
    const user = userEvent.setup();
    vi.mocked(commissionService.getCommissionReport).mockResolvedValueOnce(mockEmptyReport);

    render(<Commissions />);

    const startInput = screen.getByLabelText(/data inicial/i);
    const endInput = screen.getByLabelText(/data final/i);
    const submitBtn = screen.getByRole('button', { name: /consultar comissões/i });

    await user.type(startInput, '2026-01-01');
    await user.type(endInput, '2026-01-10');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/para visualizar o relatório, selecione um período nos campos acima/i)
      ).toBeInTheDocument();
    });
  });

  it('exibe alerta de validação quando a data inicial é maior que a data final', async () => {
    const user = userEvent.setup();

    render(<Commissions />);

    const startInput = screen.getByLabelText(/data inicial/i);
    const endInput = screen.getByLabelText(/data final/i);
    const submitBtn = screen.getByRole('button', { name: /consultar comissões/i });

    // Inverte as datas
    await user.type(startInput, '2026-09-25');
    await user.type(endInput, '2026-09-10');

    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/não pode ser posterior à data final/i)
      ).toBeInTheDocument();
    });
  });

  it('permite consultar período através do formulário de filtro', async () => {
    const user = userEvent.setup();
    vi.mocked(commissionService.getCommissionReport).mockResolvedValueOnce(mockReport);

    render(<Commissions />);

    const startInput = screen.getByLabelText(/data inicial/i);
    const endInput = screen.getByLabelText(/data final/i);
    const submitBtn = screen.getByRole('button', { name: /consultar comissões/i });

    await user.type(startInput, '2026-09-01');
    await user.type(endInput, '2026-09-15');

    await user.click(submitBtn);

    await waitFor(() => {
      expect(commissionService.getCommissionReport).toHaveBeenCalledWith({
        start_date: '2026-09-01',
        end_date: '2026-09-15',
      });
    });
  });

  it('desabilita no calendário de data final os dias anteriores à data inicial', async () => {
    const user = userEvent.setup();
    render(<Commissions />);

    const startInput = screen.getByLabelText(/data inicial/i);
    await user.type(startInput, '2026-10-15');

    // Abre o popover do calendário do campo de data final
    const calendarBtns = screen.getAllByRole('button', { name: /abrir seletor de calendário/i });
    await user.click(calendarBtns[1]);

    // O dia 10 de outubro de 2026 deve estar desabilitado (menor que 15)
    const day10Btn = screen.getByRole('button', { name: '10' });
    expect(day10Btn).toBeDisabled();

    // O dia 16 de outubro de 2026 deve estar habilitado (maior que 15)
    const day16Btn = screen.getByRole('button', { name: '16' });
    expect(day16Btn).not.toBeDisabled();
  });
});
