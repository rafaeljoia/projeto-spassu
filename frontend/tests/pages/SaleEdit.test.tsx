import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SaleEdit } from '../../src/pages/SaleEdit';
import { saleService } from '../../src/services/saleService';

vi.mock('../../src/services/saleService', () => ({
  saleService: {
    getProducts: vi.fn(),
    getCustomers: vi.fn(),
    getSalespeople: vi.fn(),
    getDayCommissionRules: vi.fn(),
    getSaleById: vi.fn(),
    updateSale: vi.fn(),
  },
}));

describe('Página SaleEdit (Alterar Venda)', () => {
  const mockProducts = [
    {
      id: 1,
      code: 'CAD-001',
      description: 'Caderno Universitário 200 Folhas',
      unit_price: '50.00',
      commission_percentage: '10.00',
      is_active: true,
    },
    {
      id: 2,
      code: 'CAN-002',
      description: 'Caneta Azul 1.0mm',
      unit_price: '10.00',
      commission_percentage: '2.00',
      is_active: true,
    },
  ];

  const mockCustomers = [
    { id: 1, name: 'Empresa Alfa Papéis', email: 'alfa@test.com', phone: '119999' },
    { id: 2, name: 'Livraria Central', email: 'central@test.com', phone: '118888' },
  ];

  const mockSalespeople = [
    { id: 1, name: 'Carlos Eduardo Lima', email: 'carlos@test.com', phone: '117777' },
    { id: 2, name: 'Mariana Souza', email: 'mariana@test.com', phone: '116666' },
  ];

  const mockRules = [
    {
      id: 1,
      day_of_week: 0, // Segunda-feira
      day_name: 'Segunda-feira',
      min_percentage: '3.00',
      max_percentage: '5.00',
    },
  ];

  const mockSale = {
    id: 10,
    invoice_number: '00001005',
    sold_at: '2026-09-14T14:30:00Z',
    customer: { id: 1, name: 'Empresa Alfa Papéis' },
    salesperson: { id: 1, name: 'Carlos Eduardo Lima' },
    total_amount: '100.00',
    total_commission: '10.00',
    items: [
      {
        id: 101,
        product_id: 1,
        product_code: 'CAD-001',
        product_description: 'Caderno Universitário 200 Folhas',
        quantity: 2,
        unit_price: '50.00',
        total_price: '100.00',
        commission_percentage: '10.00',
        commission_amount: '10.00',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saleService.getProducts).mockResolvedValue(mockProducts);
    vi.mocked(saleService.getCustomers).mockResolvedValue(mockCustomers);
    vi.mocked(saleService.getSalespeople).mockResolvedValue(mockSalespeople);
    vi.mocked(saleService.getDayCommissionRules).mockResolvedValue(mockRules);
    vi.mocked(saleService.getSaleById).mockResolvedValue(mockSale as any);
    vi.mocked(saleService.updateSale).mockResolvedValue({
      ...mockSale,
      items: mockSale.items,
    } as any);
  });

  const renderComponent = (props: { onSuccess?: (id: number) => void; onCancel?: () => void; onTitleChange?: (title: string) => void } = {}) => {
    return render(
      <MemoryRouter initialEntries={['/vendas/10/editar']}>
        <Routes>
          <Route path="/vendas/:id/editar" element={<SaleEdit {...props} />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('busca a venda pelo ID e pré-preenche os campos e tabela com dados existentes', async () => {
    const onTitleChange = vi.fn();
    renderComponent({ onTitleChange });

    // Mensagem de carregamento inicial
    expect(screen.getByText(/carregando dados da venda/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(saleService.getSaleById).toHaveBeenCalledWith(10);
    });

    // Verifica chamada do título dinâmico com o número da nota fiscal
    await waitFor(() => {
      expect(onTitleChange).toHaveBeenCalledWith('Alterar Venda - Nº 00001005');
    });

    // Verifica campos pré-preenchidos
    const customerSelect = screen.getByLabelText(/cliente/i) as HTMLSelectElement;
    expect(customerSelect.value).toBe('1');

    const salespersonSelect = screen.getByLabelText(/vendedor/i) as HTMLSelectElement;
    expect(salespersonSelect.value).toBe('1');

    // Tabela contém o item original da venda (2x Caderno = R$ 100,00)
    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(within(table).getByText(/CAD-001 - Caderno Universitário 200 Folhas/i)).toBeInTheDocument();
      expect(within(table).getByText(/100,00/)).toBeInTheDocument();
    });

    // REGRA DE NEGÓCIO: Não deve exibir Comissão Prevista nem Regra do dia
    expect(screen.queryByText(/comissão prevista/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/regra do dia/i)).not.toBeInTheDocument();
  });

  it('REGRA DE NEGÓCIO: o input de Data e Hora da Venda deve estar desabilitado (disabled/readOnly)', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/data e hora da venda/i)).toBeInTheDocument();
    });

    const dateInput = screen.getByLabelText(/data e hora da venda/i) as HTMLInputElement;
    expect(dateInput).toBeDisabled();
    expect(dateInput).toHaveAttribute('readonly');
  });

  it('permite adicionar novos itens e recalcula os totais da venda', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adicionar/i })).toBeInTheDocument();
    });

    // Seleciona o segundo produto (Caneta R$ 10.00)
    const productSelect = screen.getByLabelText(/código de barras ou descrição/i);
    await user.selectOptions(productSelect, '2');

    const qtyInput = screen.getByLabelText(/quantidade/i);
    await user.clear(qtyInput);
    await user.type(qtyInput, '5');

    // Clica em Adicionar
    const addBtn = screen.getByRole('button', { name: /adicionar/i });
    await user.click(addBtn);

    // O novo item deve constar na tabela (5x Caneta = R$ 50,00)
    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(within(table).getByText(/CAN-002 - Caneta Azul 1.0mm/i)).toBeInTheDocument();
    });

    // Total agora deve ser 100 (cadernos) + 50 (canetas) = 150,00
    expect(screen.getByText(/150,00/i)).toBeInTheDocument();
  });

  it('permite remover item existente e recalcula o total', async () => {
    const user = userEvent.setup();
    renderComponent();

    const table = await screen.findByRole('table');
    await waitFor(() => {
      expect(within(table).getByText(/CAD-001 - Caderno Universitário/i)).toBeInTheDocument();
    });

    // Clica no botão de remover (ícone lixeira)
    const removeBtn = within(table).getByRole('button', { name: /remover/i });
    await user.click(removeBtn);

    // Tabela fica vazia e exibe mensagem de tabela vazia
    expect(within(table).getByText(/nenhum produto adicionado/i)).toBeInTheDocument();
    // Valor total vai a zero
    expect(screen.getAllByText(/0,00/i).length).toBeGreaterThanOrEqual(1);
  });

  it('dispara PUT/PATCH com o payload correto ao submeter o formulário de alteração', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderComponent({ onSuccess });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /finalizar/i })).toBeInTheDocument();
    });

    // Altera o vendedor
    const salespersonSelect = screen.getByLabelText(/vendedor/i);
    await user.selectOptions(salespersonSelect, '2'); // Mariana Souza

    // Submete formulário
    const submitBtn = screen.getByRole('button', { name: /finalizar/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(saleService.updateSale).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          invoice_number: '00001005',
          customer_id: 1,
          salesperson_id: 2,
          items: [
            {
              product_id: 1,
              quantity: 2,
            },
          ],
        })
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(10);
    });
  });
});
