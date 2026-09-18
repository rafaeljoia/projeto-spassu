/**
 * Serviço de comunicação com o endpoint de relatório de comissões por período.
 */

import { api } from './api';
import { CommissionReport } from '../types';

export interface CommissionReportParams {
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
}

export const commissionService = {
  /**
   * Obtém o relatório consolidado de comissões auferidas por vendedores no intervalo informado.
   */
  async getCommissionReport(params: CommissionReportParams): Promise<CommissionReport> {
    const response = await api.get<CommissionReport>('/commissions/', {
      params,
    });
    return response.data;
  },
};

export default commissionService;
