import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaleCreate } from '../../src/pages/SaleCreate';
import { saleService } from '../../src/services/saleService';

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

  it('renderiza os campos básicos do formulário de nova venda', async () => {
    render(<SaleCreate />);

    expect(screen.getByRole('heading', { name: /nova venda/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/número da nota fiscal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data e hora da venda/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vendedor/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adicionar produto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar venda/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/empresa alfa papéis/i)).toBeInTheDocument();
      expect(screen.getByText(/carlos eduardo lima/i)).toBeInTheDocument();
    });
  });

  it('calcula o subtotal dinamicamente ao selecionar produto e alterar quantidade', async () => {
    const user = userEvent.setup();
    render(<SaleCreate />);

    // Aguarda carregamento de dados
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /caderno universitário/i })).toBeInTheDocument();
    });

    const productSelect = screen.getByLabelText(/produto 1/i);
    await user.selectOptions(productSelect, '1'); // Caderno R$ 50.00

    // Verifica se o preço unitário e subtotal de 1 unidade foram exibidos
    expect(screen.getAllByText(/r\$\s*50,00/i).length).toBeGreaterThanOrEqual(1);

    // Altera a quantidade para 3 unidades (50 * 3 = 150,00)
    const quantityInput = screen.getByLabelText(/quantidade do item 1/i);
    await user.clear(quantityInput);
    await user.type(quantityInput, '3');

    await waitFor(() => {
      expect(screen.getAllByText(/r\$\s*150,00/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('adiciona nova linha de item ao clicar em Adicionar Produto', async () => {
    const user = userEvent.setup();
    render(<SaleCreate />);

    const addButton = screen.getByRole('button', { name: /adicionar produto/i });
    await user.click(addButton);

    expect(screen.getByLabelText(/produto 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantidade do item 2/i)).toBeInTheDocument();
  });

  it('exibe alerta de validação ao tentar submeter formulário com campos obrigatórios vazios', async () => {
    const user = userEvent.setup();
    render(<SaleCreate />);

    const submitButton = screen.getByRole('button', { name: /salvar venda/i });
    await user.click(submitButton);

    expect(
      screen.getByText(/informe o número da nota fiscal/i)
    ).toBeInTheDocument();
    expect(saleService.createSale).not.toHaveBeenCalled();
  });
});
