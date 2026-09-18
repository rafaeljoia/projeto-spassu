/**
 * Cliente HTTP Axios configurado para consumo da API REST da Papelaria.
 */

import axios, { AxiosError, AxiosResponse } from 'axios';

const baseURL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Interceptor de resposta para tratamento padronizado de erros da API
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Tratamento de mensagens de validação e erros de rede
    if (error.response) {
      // O servidor respondeu com um status code fora do range 2xx
      return Promise.reject(error);
    }
    if (error.request) {
      // A requisição foi feita mas nenhuma resposta foi recebida
      console.error(
        'Erro de conexão com o servidor. Verifique se o backend está em execução.'
      );
      return Promise.reject(
        new Error(
          'Não foi possível conectar ao servidor. Verifique sua conexão ou se a API está online.'
        )
      );
    }
    return Promise.reject(error);
  }
);

/**
 * Utilitário de formatação de valores monetários no padrão Real Brasileiro (pt-BR).
 * Exemplo: "24.90" ou 24.9 -> "R$ 24,90"
 */
export const formatCurrency = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return 'R$ 0,00';
  }
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericValue)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
};

/**
 * Utilitário de formatação de percentuais no padrão pt-BR.
 * Exemplo: "5.00" -> "5,00%"
 */
export const formatPercentage = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return '0,00%';
  }
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericValue)) {
    return '0,00%';
  }
  return `${numericValue.toFixed(2).replace('.', ',')}%`;
};

/**
 * Utilitário de formatação de data e hora no padrão pt-BR.
 * Exemplo: "2026-09-17T15:30:00Z" -> "17/09/2026 12:30"
 */
export const formatDateTime = (isoString: string | null | undefined): string => {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
};

/**
 * Utilitário de formatação de data apenas (sem horário).
 * Exemplo: "2026-09-17" -> "17/09/2026"
 */
export const formatDate = (isoString: string | null | undefined): string => {
  if (!isoString) return '-';
  try {
    const parts = isoString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
};

export default api;
