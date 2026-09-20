import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SalesList } from '../../src/pages/SalesList';
import { saleService } from '../../src/services/saleService';
import { SaleListItem, SaleDetail } from '../../src/types';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

// Mock do serviço de vendas
vi.mock('../../src/services/saleService', () => ({
  saleService: {
    getSales: vi.fn(),
    getSaleById: vi.fn(),
    deleteSale: vi.fn(),
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

    renderWithRouter(<SalesList />);

    await waitFor(() => {
      expect(screen.getByText(/nenhuma venda cadastrada/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /nenhuma venda cadastrada/i })).toBeInTheDocument();
  });

  it('renderiza o cabeçalho com título à esquerda e botão Inserir nova Venda na direita', async () => {
    const handleNavigate = vi.fn();
    vi.mocked(saleService.getSales).mockResolvedValueOnce({
      count: 2,
      next: null,
      previous: null,
      results: mockSales,
    });

    renderWithRouter(<SalesList onNavigateNewSale={handleNavigate} />);

    expect(screen.getByRole('heading', { name: /vendas realizadas/i })).toBeInTheDocument();

    const insertBtn = screen.getByRole('button', { name: /inserir nova venda/i });
    expect(insertBtn).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(insertBtn);
    expect(handleNavigate).toHaveBeenCalledTimes(1);
  });

  it('renderiza a tabela com colunas estritas sem a coluna de comissão no nível principal', async () => {
    vi.mocked(saleService.getSales).mockResolvedValueOnce({
      count: 2,
      next: null,
      previous: null,
      results: mockSales,
    });

    renderWithRouter(<SalesList />);

    // Aguarda preenchimento da tabela
    await waitFor(() => {
      expect(screen.getByText('NF-1001')).toBeInTheDocument();
      expect(screen.getByText('NF-1002')).toBeInTheDocument();
    });

    // Colunas estritas da tabela principal
    expect(screen.getByRole('columnheader', { name: /nota fiscal/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /cliente/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /vendedor/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /data da venda/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /valor total/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /opções/i })).toBeInTheDocument();

    // REGRA ESTRITA: A coluna de Comissão não deve estar no cabeçalho principal
    expect(screen.queryByRole('columnheader', { name: /^comissão$/i })).not.toBeInTheDocument();

    // Valida dados dos clientes e vendedores
    expect(screen.getByText('Empresa Alfa Papéis')).toBeInTheDocument();
    expect(screen.getByText('Carlos Eduardo Lima')).toBeInTheDocument();
    expect(screen.getByText('Beta Embalagens')).toBeInTheDocument();
    expect(screen.getByText('Mariana Souza')).toBeInTheDocument();

    // Valida formatação monetária pt-BR
    expect(screen.getByText(/r\$\s*200,00/i)).toBeInTheDocument();
    expect(screen.getByText(/r\$\s*350,50/i)).toBeInTheDocument();
  });

  it('expande e fecha a sub-tabela com produtos e totalizador ao clicar em Ver itens / Fechar', async () => {
    const user = userEvent.setup();
    vi.mocked(saleService.getSales).mockResolvedValueOnce({
      count: 2,
      next: null,
      previous: null,
      results: mockSales,
    });
    vi.mocked(saleService.getSaleById).mockResolvedValue(mockSaleDetail);

    renderWithRouter(<SalesList />);

    await waitFor(() => {
      expect(screen.getByText('NF-1001')).toBeInTheDocument();
    });

    // Botões de Opções da linha
    const toggleButtons = screen.getAllByRole('button', { name: /ver itens/i });
    expect(toggleButtons.length).toBe(2);

    // Botões de ação (Edição e Exclusão)
    expect(screen.getByRole('button', { name: /editar venda nf-1001/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /excluir venda nf-1001/i })).toBeInTheDocument();

    // Expande a primeira venda
    await user.click(toggleButtons[0]);

    await waitFor(() => {
      expect(saleService.getSaleById).toHaveBeenCalledWith(1);
      // O botão muda para "Fechar"
      expect(screen.getByRole('button', { name: /fechar/i })).toBeInTheDocument();
    });

    // Colunas da sub-tabela
    expect(screen.getByRole('columnheader', { name: /produtos\/serviço/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /quantidade/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /preço unitário/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /total do produto/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /% de comissão/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^comissão$/i })).toBeInTheDocument();

    // Itens da sub-tabela
    expect(screen.getByText(/caderno universitário 200 folhas/i)).toBeInTheDocument();
    expect(screen.getByText(/caneta esferográfica azul/i)).toBeInTheDocument();

    // Rodapé de Total da Venda
    expect(screen.getByText(/total da venda/i)).toBeInTheDocument();

    // Fecha a sub-tabela
    const fecharBtn = screen.getByRole('button', { name: /fechar/i });
    await user.click(fecharBtn);

    await waitFor(() => {
      expect(screen.queryByText(/caderno universitário 200 folhas/i)).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /ver itens/i }).length).toBe(2);
    });
  });

  it('exibe Toast flutuante com mensagem vinda de location.state e limpa o history', async () => {
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    vi.mocked(saleService.getSales).mockResolvedValueOnce({
      count: 2,
      next: null,
      previous: null,
      results: mockSales,
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/vendas',
            state: { toastMessage: 'VENDA REALIZADA COM SUCESSO!' },
          },
        ]}
      >
        <SalesList />
      </MemoryRouter>
    );

    // Toast deve estar visível com a mensagem em uppercase
    expect(screen.getByText('VENDA REALIZADA COM SUCESSO!')).toBeInTheDocument();
    expect(replaceStateSpy).toHaveBeenCalledWith({}, document.title);

    // Fecha o toast ao clicar no botão X
    const user = userEvent.setup();
    const closeBtn = screen.getByRole('button', { name: /fechar notificação/i });
    await user.click(closeBtn);

    expect(screen.queryByText('VENDA REALIZADA COM SUCESSO!')).not.toBeInTheDocument();
    replaceStateSpy.mockRestore();
  });

  it('abre modal de confirmação ao clicar no ícone de lixeira e fecha ao clicar em Não', async () => {
    const user = userEvent.setup();
    vi.mocked(saleService.getSales).mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: mockSales,
    });

    renderWithRouter(<SalesList />);

    await waitFor(() => {
      expect(screen.getByText('NF-1001')).toBeInTheDocument();
    });

    // Clica no botão de excluir venda
    const deleteBtn = screen.getByRole('button', { name: /excluir venda nf-1001/i });
    await user.click(deleteBtn);

    // Modal deve abrir com título e mensagem
    expect(screen.getByRole('heading', { name: /remover venda/i })).toBeInTheDocument();
    expect(screen.getByText(/deseja remover esta venda\?/i)).toBeInTheDocument();
    expect(saleService.deleteSale).not.toHaveBeenCalled();

    // Clica em "Não" para cancelar
    const cancelBtn = screen.getByRole('button', { name: /^não$/i });
    await user.click(cancelBtn);

    // Modal fechado e API não foi chamada
    expect(screen.queryByRole('heading', { name: /remover venda/i })).not.toBeInTheDocument();
    expect(saleService.deleteSale).not.toHaveBeenCalled();
  });

  it('exclui venda ao confirmar no modal com botão Sim e exibe Toast de sucesso', async () => {
    const user = userEvent.setup();
    vi.mocked(saleService.getSales).mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: mockSales,
    });
    vi.mocked(saleService.deleteSale).mockResolvedValue(undefined as any);

    renderWithRouter(<SalesList />);

    await waitFor(() => {
      expect(screen.getByText('NF-1001')).toBeInTheDocument();
    });

    // Clica no botão de excluir venda
    const deleteBtn = screen.getByRole('button', { name: /excluir venda nf-1001/i });
    await user.click(deleteBtn);

    // Modal aberto
    expect(screen.getByRole('heading', { name: /remover venda/i })).toBeInTheDocument();

    // Clica em "Sim" para confirmar exclusão
    const confirmBtn = screen.getByRole('button', { name: /^sim$/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(saleService.deleteSale).toHaveBeenCalledWith(1);
      expect(screen.getByText('VENDA REMOVIDA COM SUCESSO!')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /remover venda/i })).not.toBeInTheDocument();
    });
  });
});

