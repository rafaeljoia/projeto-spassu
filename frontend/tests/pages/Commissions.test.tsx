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

  it('renderiza o relatório com dados de vendedores e total geral formatado em pt-BR', async () => {
    vi.mocked(commissionService.getCommissionReport).mockResolvedValueOnce(mockReport);

    render(<Commissions />);

    await waitFor(() => {
      expect(screen.getByText('Carlos Eduardo Lima')).toBeInTheDocument();
      expect(screen.getByText('Mariana Souza')).toBeInTheDocument();
    });

    // Valida total geral em destaque
    expect(screen.getByText(/r\$\s*958,20/i)).toBeInTheDocument();

    // Valida comissões individuais
    expect(screen.getByText(/r\$\s*345,80/i)).toBeInTheDocument();
    expect(screen.getByText(/r\$\s*612,40/i)).toBeInTheDocument();

    // Valida contagem de vendas
    expect(screen.getByText(/3 vendas/i)).toBeInTheDocument();
    expect(screen.getByText(/5 vendas/i)).toBeInTheDocument();
  });

  it('exibe mensagem amigável de estado vazio quando o período não possui vendas', async () => {
    vi.mocked(commissionService.getCommissionReport).mockResolvedValueOnce(mockEmptyReport);

    render(<Commissions />);

    await waitFor(() => {
      expect(screen.getByText(/nenhuma venda no período/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/r\$\s*0,00/i)).toBeInTheDocument();
  });

  it('exibe alerta de validação quando a data inicial é maior que a data final', async () => {
    const user = userEvent.setup();
    vi.mocked(commissionService.getCommissionReport).mockResolvedValueOnce(mockReport);

    render(<Commissions />);

    await waitFor(() => {
      expect(screen.getByLabelText(/data inicial/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/data inicial/i);
    const endInput = screen.getByLabelText(/data final/i);
    const submitBtn = screen.getByRole('button', { name: /consultar comissões/i });

    // Inverte as datas
    await user.clear(startInput);
    await user.type(startInput, '2026-09-25');
    await user.clear(endInput);
    await user.type(endInput, '2026-09-10');

    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/não pode ser posterior à data final/i)
      ).toBeInTheDocument();
    });
  });

  it('permite consultar novo período através do formulário de filtro', async () => {
    const user = userEvent.setup();
    vi.mocked(commissionService.getCommissionReport)
      .mockResolvedValueOnce(mockReport)
      .mockResolvedValueOnce(mockReport);

    render(<Commissions />);

    await waitFor(() => {
      expect(screen.getByLabelText(/data inicial/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/data inicial/i);
    const endInput = screen.getByLabelText(/data final/i);
    const submitBtn = screen.getByRole('button', { name: /consultar comissões/i });

    await user.clear(startInput);
    await user.type(startInput, '2026-09-01');
    await user.clear(endInput);
    await user.type(endInput, '2026-09-15');

    await user.click(submitBtn);

    await waitFor(() => {
      expect(commissionService.getCommissionReport).toHaveBeenCalledWith({
        start_date: '2026-09-01',
        end_date: '2026-09-15',
      });
    });
  });
});
