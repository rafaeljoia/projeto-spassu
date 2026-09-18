/**
 * Hook customizado para gerenciamento do estado de vendas e operações da API.
 */

import { useState, useCallback } from 'react';
import axios from 'axios';
import { saleService } from '../services/saleService';
import {
  Customer,
  DayCommissionRule,
  Product,
  SaleCreatePayload,
  SaleDetail,
  SaleListItem,
  Salesperson,
} from '../types';

export interface FormDataState {
  products: Product[];
  customers: Customer[];
  salespeople: Salesperson[];
  rules: DayCommissionRule[];
}

export function useSales() {
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormDataState>({
    products: [],
    customers: [],
    salespeople: [],
    rules: [],
  });
  const [isLoadingFormData, setIsLoadingFormData] = useState<boolean>(false);

  /**
   * Carrega os dados auxiliares para formulários (clientes, vendedores, catálogo de produtos e regras).
   */
  const loadFormData = useCallback(async () => {
    setIsLoadingFormData(true);
    setError(null);
    try {
      const [products, customers, salespeople, rules] = await Promise.all([
        saleService.getProducts(),
        saleService.getCustomers(),
        saleService.getSalespeople(),
        saleService.getDayCommissionRules(),
      ]);
      setFormData({ products, customers, salespeople, rules });
      return { products, customers, salespeople, rules };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Falha ao carregar dados de apoio para o formulário.';
      setError(message);
      throw err;
    } finally {
      setIsLoadingFormData(false);
    }
  }, []);

  /**
   * Registra uma nova venda.
   */
  const createSale = useCallback(async (payload: SaleCreatePayload): Promise<SaleDetail> => {
    setIsLoading(true);
    setError(null);
    try {
      const created = await saleService.createSale(payload);
      return created;
    } catch (err: unknown) {
      let errorMessage = 'Erro ao registrar a venda.';
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data as Record<string, unknown>;
        if (data.invoice_number && Array.isArray(data.invoice_number)) {
          errorMessage = data.invoice_number[0];
        } else if (data.items) {
          errorMessage = Array.isArray(data.items)
            ? data.items[0]
            : String(data.items);
        } else if (data.detail) {
          errorMessage = String(data.detail);
        }
      }
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Busca a lista de vendas realizadas.
   */
  const loadSales = useCallback(async (page: number = 1, search?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await saleService.getSales({ page, search });
      setSales(response.results);
      setTotalCount(response.count);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao buscar listagem de vendas.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sales,
    totalCount,
    isLoading,
    isLoadingFormData,
    error,
    formData,
    loadFormData,
    createSale,
    loadSales,
  };
}

export default useSales;
