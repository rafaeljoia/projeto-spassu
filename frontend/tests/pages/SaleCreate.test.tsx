import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SaleCreate } from '../../src/pages/SaleCreate';
import { saleService } from '../../src/services/saleService';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

vi.mock('../../src/services/saleService', () => ({
  saleService: {
    getProducts: vi.fn(),
    getCustomers: vi.fn(),
    getSalespeople: vi.fn(),
    getDayCommissionRules: vi.fn(),
    createSale: vi.fn(),
  },
}));

describe('Página SaleCreate (Nova Venda)', () => {
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
  ];

  const mockSalespeople = [
    { id: 1, name: 'Carlos Eduardo Lima', email: 'carlos@test.com', phone: '118888' },
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saleService.getProducts).mockResolvedValue(mockProducts);
    vi.mocked(saleService.getCustomers).mockResolvedValue(mockCustomers);
    vi.mocked(saleService.getSalespeople).mockResolvedValue(mockSalespeople);
    vi.mocked(saleService.getDayCommissionRules).mockResolvedValue(mockRules);
  });

  it('renderiza os campos básicos do formulário de nova venda sem o campo de nota fiscal', async () => {
    renderWithRouter(<SaleCreate />);

    expect(screen.getByRole('heading', { name: /produtos/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /dados da venda/i })).toBeInTheDocument();
    // Nota Fiscal NÃO deve estar presente no DOM (regra de negócio atualizada)
    expect(screen.queryByLabelText(/número da nota fiscal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nota fiscal/i)).not.toBeInTheDocument();

    expect(screen.getByLabelText(/data e hora da venda/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vendedor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/produto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantidade/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adicionar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar venda/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/empresa alfa papéis/i)).toBeInTheDocument();
      expect(screen.getByText(/carlos eduardo lima/i)).toBeInTheDocument();
    });
  });

  it('adiciona produto pela mecânica superior e calcula o subtotal dinamicamente na listagem', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SaleCreate />);

    // Aguarda carregamento de dados
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /caderno universitário/i })).toBeInTheDocument();
    });

    // Seleciona produto no campo acima da tabela
    const productSelect = screen.getByLabelText(/produto/i);
    await user.selectOptions(productSelect, '1'); // Caderno R$ 50.00

    // Altera a quantidade para 3 unidades (50 * 3 = 150,00)
    const quantityInput = screen.getByLabelText(/quantidade/i);
    await user.clear(quantityInput);
    await user.type(quantityInput, '3');

    // Clica no botão Adicionar acima da tabela
    const addButton = screen.getByRole('button', { name: /adicionar/i });
    await user.click(addButton);

    // O item agora aparece na tabela como texto plano com o subtotal calculado
    await waitFor(() => {
      expect(screen.getAllByText(/caderno universitário/i).length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText(/r\$\s*150,00/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('permite adicionar múltiplos produtos acumulando o total da venda', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SaleCreate />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /caderno universitário/i })).toBeInTheDocument();
    });

    const productSelect = screen.getByLabelText(/produto/i);
    const quantityInput = screen.getByLabelText(/quantidade/i);
    const addButton = screen.getByRole('button', { name: /adicionar/i });

    // Adiciona 1 Caderno (R$ 50,00)
    await user.selectOptions(productSelect, '1');
    await user.click(addButton);

    // Adiciona 2 Canetas (R$ 10,00 * 2 = R$ 20,00)
    await user.selectOptions(productSelect, '2');
    await user.clear(quantityInput);
    await user.type(quantityInput, '2');
    await user.click(addButton);

    // Total da venda: 50 + 20 = 70,00
    await waitFor(() => {
      expect(screen.getAllByText(/caderno universitário/i).length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText(/caneta azul/i).length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText(/r\$\s*70,00/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('exibe alerta de validação ao tentar submeter formulário sem vendedor selecionado', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SaleCreate />);

    const submitButton = screen.getByRole('button', { name: /salvar venda/i });
    await user.click(submitButton);

    expect(screen.getByText(/selecione o vendedor responsável/i)).toBeInTheDocument();
    expect(saleService.createSale).not.toHaveBeenCalled();
  });

  it('submete com sucesso gerando dinamicamente o número da nota fiscal', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(saleService.createSale).mockResolvedValue({
      id: 99,
      invoice_number: '00000001',
      sold_at: '2026-09-19T18:00:00Z',
      customer: { id: 1, name: 'Empresa Alfa Papéis' },
      salesperson: { id: 1, name: 'Carlos Eduardo Lima' },
      total_amount: '50.00',
      total_commission: '5.00',
      created_at: '2026-09-19T18:00:00Z',
      items: [],
    });

    renderWithRouter(<SaleCreate onSuccess={onSuccess} />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /carlos eduardo lima/i })).toBeInTheDocument();
    });

    // Preenche vendedor e cliente
    const salespersonSelect = screen.getByLabelText(/vendedor/i);
    await user.selectOptions(salespersonSelect, '1');

    const customerSelect = screen.getByLabelText(/cliente/i);
    await user.selectOptions(customerSelect, '1');

    // Adiciona um produto
    const productSelect = screen.getByLabelText(/produto/i);
    await user.selectOptions(productSelect, '1');
    const addButton = screen.getByRole('button', { name: /adicionar/i });
    await user.click(addButton);

    // Submete
    const submitButton = screen.getByRole('button', { name: /salvar venda/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(saleService.createSale).toHaveBeenCalledWith(
        expect.objectContaining({
          invoice_number: expect.stringMatching(/^\d{8}$/),
          customer_id: 1,
          salesperson_id: 1,
          items: [{ product_id: 1, quantity: 1 }],
        })
      );
      expect(onSuccess).toHaveBeenCalledWith(99);
    });
  });
});
