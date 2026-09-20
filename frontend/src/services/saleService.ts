/**
 * Serviço de comunicação com os endpoints da API REST de vendas e cadastros.
 */

import { api } from './api';
import {
  Customer,
  DayCommissionRule,
  PaginatedResponse,
  Product,
  SaleCreatePayload,
  SaleDetail,
  SaleListItem,
  Salesperson,
} from '../types';

export const saleService = {
  /**
   * Registra uma nova venda com itens.
   */
  async createSale(payload: SaleCreatePayload): Promise<SaleDetail> {
    const response = await api.post<SaleDetail>('/sales/', payload);
    return response.data;
  },

  /**
   * Atualiza uma venda existente com itens via PUT.
   */
  async updateSale(id: number, payload: SaleCreatePayload): Promise<SaleDetail> {
    const response = await api.put<SaleDetail>(`/sales/${id}/`, payload);
    return response.data;
  },

  /**
   * Lista vendas com suporte a paginação e busca.
   */
  async getSales(params?: {
    page?: number;
    search?: string;
  }): Promise<PaginatedResponse<SaleListItem>> {
    const response = await api.get<PaginatedResponse<SaleListItem>>('/sales/', {
      params,
    });
    return response.data;
  },

  /**
   * Obtém os detalhes completos de uma venda por ID.
   */
  async getSaleById(id: number): Promise<SaleDetail> {
    const response = await api.get<SaleDetail>(`/sales/${id}/`);
    return response.data;
  },

  /**
   * Lista produtos disponíveis no catálogo.
   */
  async getProducts(): Promise<Product[]> {
    const response = await api.get<Product[]>('/products/');
    return response.data;
  },

  /**
   * Lista clientes cadastrados.
   */
  async getCustomers(): Promise<Customer[]> {
    const response = await api.get<Customer[]>('/customers/');
    return response.data;
  },

  /**
   * Lista vendedores cadastrados.
   */
  async getSalespeople(): Promise<Salesperson[]> {
    const response = await api.get<Salesperson[]>('/salespeople/');
    return response.data;
  },

  /**
   * Lista regras de comissão por dia da semana.
   */
  async getDayCommissionRules(): Promise<DayCommissionRule[]> {
    const response = await api.get<DayCommissionRule[]>('/day-commission-rules/');
    return response.data;
  },

  /**
   * Remove uma venda registrada pelo ID.
   */
  async deleteSale(id: number): Promise<void> {
    await api.delete(`/sales/${id}/`);
  },
};

export default saleService;
