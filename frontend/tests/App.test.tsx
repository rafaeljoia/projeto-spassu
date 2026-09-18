import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import { saleService } from '../src/services/saleService';

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

describe('App Client-Side Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it('renderiza por padrão a lista de vendas e a Navbar', async () => {
    render(<App />);

    expect(screen.getByText('SPASSU')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /vendas realizadas/i })).toBeInTheDocument();
    });
  });

  it('navega para o formulário de Nova Venda ao clicar no link da Navbar', async () => {
    const user = userEvent.setup();
    render(<App />);

    const newSaleLink = screen.getByRole('link', { name: /nova venda/i });
    await user.click(newSaleLink);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /nova venda/i })).toBeInTheDocument();
    });
  });

  it('retorna para a lista de vendas ao clicar em Voltar ou no link Vendas da Navbar', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Navega para nova venda
    const newSaleLink = screen.getByRole('link', { name: /nova venda/i });
    await user.click(newSaleLink);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /nova venda/i })).toBeInTheDocument();
    });

    // Clica em Voltar
    const backBtn = screen.getByRole('button', { name: /voltar/i });
    await user.click(backBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /vendas realizadas/i })).toBeInTheDocument();
    });
  });
});
