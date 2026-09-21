import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { saleService } from '../src/services/saleService';
import { commissionService } from '../src/services/commissionService';

vi.mock('../src/services/saleService', () => ({
  saleService: {
    getSales: vi.fn(),
    getSaleById: vi.fn(),
    getProducts: vi.fn(),
    getCustomers: vi.fn(),
    getSalespeople: vi.fn(),
    getDayCommissionRules: vi.fn(),
    createSale: vi.fn(),
  },
}));

vi.mock('../src/services/commissionService', () => ({
  commissionService: {
    getCommissionReport: vi.fn(),
  },
}));

describe('App Client-Side Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/vendas');
    vi.mocked(saleService.getSales).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    vi.mocked(saleService.getProducts).mockResolvedValue([]);
    vi.mocked(saleService.getCustomers).mockResolvedValue([]);
    vi.mocked(saleService.getSalespeople).mockResolvedValue([]);
    vi.mocked(saleService.getDayCommissionRules).mockResolvedValue([]);
    vi.mocked(commissionService.getCommissionReport).mockResolvedValue({
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      salespeople: [],
      grand_total_commission: '0.00',
    });
  });

  it('renderiza por padrão a lista de vendas e a Navbar', async () => {
    render(<App />);

    expect(screen.getByText('SPASSU')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Vendas' })).toBeInTheDocument();
    });
  });

  it('menu lateral exibe apenas Vendas e Comissões, sem link direto para Nova Venda', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Vendas' })).toBeInTheDocument();
    });

    // Botão de menu sanduíche com o ícone fiel do Figma
    const menuBtn = screen.getByRole('button', { name: /abrir menu de navegação/i });
    expect(menuBtn).toBeInTheDocument();

    const vendasLink = screen.getByRole('link', { name: /vendas/i });
    const comissoesLink = screen.getByRole('link', { name: /comissões/i });
    expect(vendasLink).toBeInTheDocument();
    expect(comissoesLink).toBeInTheDocument();

    // REGRA ESTRITA: Nova Venda não deve existir como link de navegação do menu lateral
    const novaVendaLink = screen.queryByRole('link', { name: /nova venda/i });
    expect(novaVendaLink).not.toBeInTheDocument();
  });

  it('navega para o formulário de Nova Venda através do botão de ação na listagem de vendas', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Vendas' })).toBeInTheDocument();
    });

    // O acesso a nova venda é feito pelo botão de ação na própria tela de listagem de vendas ("Inserir nova Venda")
    const newSaleBtn = screen.getByRole('button', { name: /inserir nova venda/i });
    await user.click(newSaleBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /nova venda/i })).toBeInTheDocument();
    });
  });

  it('retorna para a lista de vendas ao clicar em Voltar ou no link Vendas da Navbar', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Vendas' })).toBeInTheDocument();
    });

    // Navega para nova venda pelo botão de ação
    const newSaleBtn = screen.getByRole('button', { name: /inserir nova venda/i });
    await user.click(newSaleBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /nova venda/i })).toBeInTheDocument();
    });

    // Clica em Voltar
    const backBtn = screen.getByRole('button', { name: /voltar/i });
    await user.click(backBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Vendas' })).toBeInTheDocument();
    });
  });

  it('navega para o Relatório de Comissões ao clicar no link Comissões da Navbar', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Vendas' })).toBeInTheDocument();
    });

    const commissionsLink = screen.getByRole('link', { name: /comissões/i });
    await user.click(commissionsLink);

    await waitFor(() => {
      expect(
        screen.getAllByRole('heading', { name: /comissões/i })[0]
      ).toBeInTheDocument();
    });
  });

  it('navega para a rota de edição ao clicar no ícone de editar e exibe o título dinâmico com o número da nota', async () => {
    vi.mocked(saleService.getSales).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 42,
          invoice_number: '00001005',
          sold_at: '2026-09-14T14:30:00Z',
          customer: { id: 1, name: 'Empresa Alfa Papéis' },
          salesperson: { id: 1, name: 'Carlos Eduardo Lima' },
          total_amount: '150.00',
          total_commission: '15.00',
        },
      ],
    });
    vi.mocked(saleService.getSaleById).mockResolvedValue({
      id: 42,
      invoice_number: '00001005',
      sold_at: '2026-09-14T14:30:00Z',
      customer: { id: 1, name: 'Empresa Alfa Papéis' },
      salesperson: { id: 1, name: 'Carlos Eduardo Lima' },
      total_amount: '150.00',
      total_commission: '15.00',
      items: [],
    } as any);

    const user = userEvent.setup();
    render(<App />);

    // Aguarda a lista com a venda renderizada
    await waitFor(() => {
      expect(screen.getByText('00001005')).toBeInTheDocument();
    });

    // Clica no botão de editar da linha
    const editBtn = screen.getByRole('button', { name: /editar venda 00001005/i });
    await user.click(editBtn);

    // Navbar centralizado deve exibir "Alterar Venda - Nº 00001005"
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Alterar Venda - Nº 00001005' })
      ).toBeInTheDocument();
    });
  });
});

