import { FC, FormEvent } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { useCommissions } from '../../hooks/useCommissions';
import { formatCurrency } from '../../services/api';
import { DatePicker } from './DatePicker';
import styles from './Commissions.module.css';

export const Commissions: FC = () => {
  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    report,
    isLoading,
    error,
    fetchReport,
  } = useCommissions();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await fetchReport(startDate, endDate);
  };

  const hasSalespeople = report && report.salespeople.length > 0;

  return (
    <div className={styles.page}>
      {/* 1. CABEÇALHO E FILTROS (Tudo na mesma linha - Figma #839:464) */}
      <div className={styles.headerBar}>
        <h3 className={styles.pageTitle}>Relatório de Comissões</h3>

        <form onSubmit={handleSubmit} className={styles.filterGroup}>
          <DatePicker
            id="start-date-input"
            label="Data inicial"
            placeholder="Período de Início"
            value={startDate}
            onChange={setStartDate}
            maxDate={endDate || undefined}
            required
          />

          <DatePicker
            id="end-date-input"
            label="Data final"
            placeholder="Período de Fim"
            value={endDate}
            onChange={setEndDate}
            minDate={startDate || undefined}
            required
          />

          <button
            type="submit"
            className={styles.searchButton}
            aria-label="Consultar Comissões"
            title="Consultar Comissões"
            disabled={isLoading}
          >
            <Search size={18} />
          </button>
        </form>
      </div>

      {/* Alerta de Erro de Validação se houver */}
      {error && (
        <div className={styles.alertError} role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 3. ESTADO VAZIO / CARREGAMENTO (Figma #839:464) */}
      {isLoading && !report ? (
        <div className={styles.emptyStateContainer}>
          <p className={styles.emptyStateText}>Carregando relatório de comissões...</p>
        </div>
      ) : !hasSalespeople ? (
        <div className={styles.emptyStateContainer}>
          <p className={styles.emptyStateText}>
            Para visualizar o relatório, selecione um período nos campos acima.
          </p>
        </div>
      ) : (
        /* 4. TABELA DE RESULTADOS (Figma #839:957) */
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeaderRow}>
                <th className={styles.thCode}>Cód.</th>
                <th className={styles.thSalesperson}>Vendedor</th>
                <th className={styles.thSalesCount}>Total de Vendas</th>
                <th className={styles.thCommission}>Total de Comissões</th>
              </tr>
            </thead>
            <tbody>
              {report.salespeople.map((item) => (
                <tr key={item.salesperson_id} className={styles.tableRow}>
                  <td className={styles.tdCode}>
                    {String(item.salesperson_id).padStart(3, '0')}
                  </td>
                  <td className={styles.tdSalesperson}>{item.salesperson_name}</td>
                  <td className={styles.tdSalesCount}>{item.sales_count}</td>
                  <td className={styles.tdCommission}>
                    {formatCurrency(item.total_commission)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.tableFooterRow}>
                <td colSpan={3} className={styles.footerLabel}>
                  Total de Comissões do Período
                </td>
                <td className={styles.footerValue}>
                  {formatCurrency(report.grand_total_commission)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default Commissions;
