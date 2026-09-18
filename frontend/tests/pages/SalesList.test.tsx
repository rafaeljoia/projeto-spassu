import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SalesList } from '../../src/pages/SalesList';
import { saleService } from '../../src/services/saleService';
import { SaleListItem, SaleDetail } from '../../src/types';

// Mock do serviço de vendas
vi.mock('../../src/services/saleService', () => ({
  saleService: {
    getSales: vi.fn(),
    getSaleById: vi.fn(),
  },
}));

describe('SalesList Page Component', () => {
  const mockSales: SaleListItem[] = [
    {
      id: 1,
      invoice_number: 'NF-1001',
      sold_at: '2026-09-21T10:30:00Z',
      customer: { id: 1, name: 'Empresa Alfa Papéis' },
      salesperson: { id: 1, name: 'Carlos Eduardo Lima' },
      total_amount: '200.00',
      total_commission: '8.00',
    },
    {
      id: 2,
      invoice_number: 'NF-1002',
      sold_at: '2026-09-22T14:15:00Z',
      customer: { id: 2, name: 'Beta Embalagens' },
      salesperson: { id: 2, name: 'Mariana Souza' },
      total_amount: '350.50',
      total_commission: '17.52',
    },
  ];

  const mockSaleDetail: SaleDetail = {
    id: 1,
    invoice_number: 'NF-1001',
    sold_at: '2026-09-21T10:30:00Z',
    customer: { id: 1, name: 'Empresa Alfa Papéis' },
    salesperson: { id: 1, name: 'Carlos Eduardo Lima' },
    total_amount: '200.00',
    total_commission: '8.00',
    created_at: '2026-09-21T10:35:00Z',
    items: [
      {
        id: 1,
        product_id: 1,
        product_code: 'CAD-001',
        product_description: 'Caderno Universitário 200 Folhas',
        quantity: 2,
        unit_price: '50.00',
        applied_commission_percentage: '5.00',
        total_price: '100.00',
        commission_amount: '5.00',
      },
      {
        id: 2,
        product_id: 2,
        product_code: 'CAN-002',
        product_description: 'Caneta Esferográfica Azul',
        quantity: 1,
        unit_price: '100.00',
        applied_commission_percentage: '3.00',
        total_price: '100.00',
        commission_amount: '3.00',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe o estado vazio amigável quando não existem vendas cadastradas', async () => {
    vi.mocked(saleService.getSales).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    render(<SalesList />);

    await waitFor(() => {
      expect(screen.getByText(/nenhuma venda cadastrada/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /vendas realizadas/i })).toBeInTheDocument();
  });

  it('renderiza a tabela com colunas e valores monetários formatados em pt-BR', async () => {
    vi.mocked(saleService.getSales).mockResolvedValueOnce({
      count: 2,
      next: null,
      previous: null,
      results: mockSales,
    });

    render(<SalesList />);

    // Aguarda preenchimento da tabela
    await waitFor(() => {
      expect(screen.getByText('NF-1001')).toBeInTheDocument();
      expect(screen.getByText('NF-1002')).toBeInTheDocument();
    });

    // Valida nomes de clientes e vendedores
    expect(screen.getByText('Empresa Alfa Papéis')).toBeInTheDocument();
    expect(screen.getByText('Carlos Eduardo Lima')).toBeInTheDocument();
    expect(screen.getByText('Beta Embalagens')).toBeInTheDocument();
    expect(screen.getByText('Mariana Souza')).toBeInTheDocument();

    // Valida formatação de moeda R$ pt-BR
    expect(screen.getAllByText(/r\$\s*200,00/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/r\$\s*8,00/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/r\$\s*350,50/i).length).toBeGreaterThanOrEqual(1);
  });

  it('filtra as vendas ao digitar no campo de busca', async () => {
    const user = userEvent.setup();
    vi.mocked(saleService.getSales).mockResolvedValueOnce({
      count: 2,
      next: null,
      previous: null,
      results: mockSales,
    });

    render(<SalesList />);

    await waitFor(() => {
      expect(screen.getByText('NF-1001')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/filtrar vendas/i);
    await user.type(searchInput, 'Beta');

    await waitFor(() => {
      expect(screen.queryByText('NF-1001')).not.toBeInTheDocument();
      expect(screen.getByText('NF-1002')).toBeInTheDocument();
    });
  });

  it('abre o modal com detalhamento completo dos itens ao clicar em Detalhes', async () => {
    const user = userEvent.setup();
    vi.mocked(saleService.getSales).mockResolvedValueOnce({
      count: 2,
      next: null,
      previous: null,
      results: mockSales,
    });
    vi.mocked(saleService.getSaleById).mockResolvedValueOnce(mockSaleDetail);

    render(<SalesList />);

    await waitFor(() => {
      expect(screen.getByText('NF-1001')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByRole('button', { name: /detalhes/i });
    await user.click(detailButtons[0]);

    await waitFor(() => {
      expect(saleService.getSaleById).toHaveBeenCalledWith(1);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/detalhes da venda - nf-1001/i)).toBeInTheDocument();
    });

    // Valida itens dentro do modal
    expect(screen.getByText(/caderno universitário 200 folhas/i)).toBeInTheDocument();
    expect(screen.getByText(/caneta esferográfica azul/i)).toBeInTheDocument();

    // Fecha o modal
    const closeBtn = screen.getByRole('button', { name: /fechar detalhes/i });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
