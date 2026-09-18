/**
 * Hook customizado para consulta e gerenciamento do relatório de comissões por período.
 */

import { useState, useCallback } from 'react';
import axios from 'axios';
import { commissionService } from '../services/commissionService';
import { CommissionReport } from '../types';

export function useCommissions() {
  const getDefaultDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return {
      start: `${year}-${month}-01`,
      end: `${year}-${month}-${day}`,
    };
  };

  const initial = getDefaultDates();
  const [startDate, setStartDate] = useState<string>(initial.start);
  const [endDate, setEndDate] = useState<string>(initial.end);
  const [report, setReport] = useState<CommissionReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Executa a busca do relatório de comissões para o período especificado.
   */
  const fetchReport = useCallback(
    async (start?: string, end?: string): Promise<CommissionReport | null> => {
      const queryStart = start !== undefined ? start : startDate;
      const queryEnd = end !== undefined ? end : endDate;

      if (!queryStart || !queryEnd) {
        setError('Informe a data inicial e a data final para a consulta.');
        return null;
      }

      if (queryStart > queryEnd) {
        const msg = 'A data inicial (start_date) não pode ser posterior à data final (end_date).';
        setError(msg);
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await commissionService.getCommissionReport({
          start_date: queryStart,
          end_date: queryEnd,
        });
        setReport(data);
        return data;
      } catch (err: unknown) {
        let errorMessage = 'Erro ao consultar o relatório de comissões.';
        if (axios.isAxiosError(err) && err.response?.data) {
          const resData = err.response.data as Record<string, unknown>;
          if (resData.detail) {
            errorMessage = String(resData.detail);
          } else if (resData.non_field_errors) {
            errorMessage = Array.isArray(resData.non_field_errors)
              ? resData.non_field_errors[0]
              : String(resData.non_field_errors);
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        setError(errorMessage);
        setReport(null);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [startDate, endDate]
  );

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    report,
    isLoading,
    error,
    fetchReport,
  };
}

export default useCommissions;
