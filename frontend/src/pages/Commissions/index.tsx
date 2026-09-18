import { FC, useEffect, FormEvent, ChangeEvent } from 'react';
import { Search, AlertCircle, Users, Calendar } from 'lucide-react';
import { useCommissions } from '../../hooks/useCommissions';
import {
  Button,
  Card,
  CardBody,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components';
import { formatCurrency } from '../../services/api';
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

  // Carrega o relatório com o período padrão (mês atual) na montagem do componente
  useEffect(() => {
    fetchReport().catch(() => {
      // Erro tratado internamente no hook
    });
  }, [fetchReport]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await fetchReport(startDate, endDate);
  };

  const handleStartDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  };

  const handleEndDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  // Formata data ISO YYYY-MM-DD para DD/MM/AAAA
  const formatDateBR = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className={`container ${styles.page}`}>
      {/* Cabeçalho */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Relatório de Comissões</h1>
        <p className={styles.pageSubtitle}>
          Apuração financeira de comissões por vendedor no período selecionado.
        </p>
      </div>

      {/* Formulário de Filtro por Período */}
      <div className={styles.filterCard}>
        <form onSubmit={handleSubmit} className={styles.filterForm}>
          <div className={styles.filterGroup}>
            <label htmlFor="start-date-input" className={styles.label}>
              Data Inicial
            </label>
            <input
              id="start-date-input"
              type="date"
              className={styles.dateInput}
              value={startDate}
              onChange={handleStartDateChange}
              required
              aria-label="Data inicial"
            />
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="end-date-input" className={styles.label}>
              Data Final
            </label>
            <input
              id="end-date-input"
              type="date"
              className={styles.dateInput}
              value={endDate}
              onChange={handleEndDateChange}
              required
              aria-label="Data final"
            />
          </div>

          <div className={styles.filterAction}>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              leftIcon={<Search size={16} />}
            >
              Consultar Comissões
            </Button>
          </div>
        </form>
      </div>

      {/* Alerta de Erro de Validação */}
      {error && (
        <div className={styles.alertError} role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Card Destaque - Total Geral Consolidado */}
      {report && (
        <div className={styles.grandTotalCard}>
          <div className={styles.grandTotalContent}>
            <span className={styles.grandTotalLabel}>Total Geral de Comissões</span>
            <span className={styles.grandTotalValue}>
              {formatCurrency(report.grand_total_commission)}
            </span>
            <span className={styles.grandTotalPeriod}>
              Período de {formatDateBR(report.start_date)} até {formatDateBR(report.end_date)}
            </span>
          </div>

          <div className={styles.grandTotalBadge}>
            <span className={styles.grandTotalBadgeLabel}>Vendedores no Período</span>
            <span className={styles.grandTotalBadgeValue}>
              {report.salespeople.length} {report.salespeople.length === 1 ? 'vendedor' : 'vendedores'}
            </span>
          </div>
        </div>
      )}

      {/* Tabela de Vendedores e Comissões */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {isLoading && !report ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyDescription}>Calculando apuração de comissões...</p>
            </div>
          ) : report && report.salespeople.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Calendar size={32} />
              </div>
              <h3 className={styles.emptyTitle}>Nenhuma venda no período</h3>
              <p className={styles.emptyDescription}>
                Não foram encontradas vendas registradas entre {formatDateBR(report.start_date)} e{' '}
                {formatDateBR(report.end_date)}. Nenhuma comissão a ser paga neste intervalo.
              </p>
            </div>
          ) : report && report.salespeople.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ width: '45%' }}>Vendedor</TableHead>
                  <TableHead style={{ width: '25%', textAlign: 'center' }}>
                    Vendas Realizadas
                  </TableHead>
                  <TableHead style={{ width: '30%', textAlign: 'right' }}>
                    Comissão Acumulada
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.salespeople.map((item) => (
                  <TableRow key={item.salesperson_id}>
                    <TableCell>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Users size={16} color="var(--color-primary)" />
                        <strong>{item.salesperson_name}</strong>
                      </div>
                    </TableCell>
                    <TableCell style={{ textAlign: 'center' }}>
                      <span className={styles.salesCountBadge}>
                        {item.sales_count} {item.sales_count === 1 ? 'venda' : 'vendas'}
                      </span>
                    </TableCell>
                    <TableCell style={{ textAlign: 'right' }}>
                      <span className={styles.commissionCell}>
                        {formatCurrency(item.total_commission)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
};

export default Commissions;
