import { FC, useState, useEffect, useMemo, ChangeEvent } from 'react';
import { Plus, Search, Eye, X, Receipt, DollarSign, ShoppingBag } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
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
import { formatCurrency, formatPercentage } from '../../services/api';
import styles from './SalesList.module.css';

export interface SalesListProps {
  onNavigateNewSale?: () => void;
}

export const SalesList: FC<SalesListProps> = ({ onNavigateNewSale }) => {
  const {
    sales,
    totalCount,
    isLoading,
    selectedSale,
    error,
    loadSales,
    loadSaleDetail,
    clearSelectedSale,
  } = useSales();

  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    loadSales().catch(() => {
      // Erro gerenciado no hook useSales
    });
  }, [loadSales]);

  // Filtro no cliente para resposta instantânea ao digitar
  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return sales;
    const term = searchTerm.toLowerCase().trim();
    return sales.filter((s) => {
      return (
        s.invoice_number.toLowerCase().includes(term) ||
        s.customer.name.toLowerCase().includes(term) ||
        s.salesperson.name.toLowerCase().includes(term)
      );
    });
  }, [sales, searchTerm]);

  // Cálculos consolidados para os cards de métricas
  const totalAmountSum = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (parseFloat(s.total_amount) || 0), 0);
  }, [filteredSales]);

  const totalCommissionSum = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (parseFloat(s.total_commission) || 0), 0);
  }, [filteredSales]);

  // Formatação amigável de data e hora no padrão pt-BR
  const formatDateTime = (isoDate: string): string => {
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoDate;
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleViewDetail = async (saleId: number) => {
    try {
      await loadSaleDetail(saleId);
    } catch {
      // Erro tratado internamente
    }
  };

  return (
    <div className={`container ${styles.page}`}>
      {/* Cabeçalho da Página */}
      <div className={styles.pageHeader}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.pageTitle}>Vendas Realizadas</h1>
          <p className={styles.pageSubtitle}>
            Histórico completo das operações comerciais e apuração de comissões.
          </p>
        </div>
        {onNavigateNewSale && (
          <Button
            variant="primary"
            onClick={onNavigateNewSale}
            leftIcon={<Plus size={18} />}
          >
            Nova Venda
          </Button>
        )}
      </div>

      {/* Métricas Rápidas */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <Receipt size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Total de Vendas</span>
            <span className={styles.metricValue}>
              {isLoading ? '...' : totalCount || filteredSales.length}
            </span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <ShoppingBag size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Total Comercializado</span>
            <span className={styles.metricValue}>
              {isLoading ? '...' : formatCurrency(totalAmountSum)}
            </span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.metricIconGreen}`}>
            <DollarSign size={22} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Total de Comissões</span>
            <span className={`${styles.metricValue} ${styles.metricValueGreen}`}>
              {isLoading ? '...' : formatCurrency(totalCommissionSum)}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtro */}
      <div className={styles.filterBar}>
        <div className={styles.searchInputWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Filtrar por NF, cliente ou vendedor..."
            value={searchTerm}
            onChange={handleSearchChange}
            aria-label="Filtrar vendas"
          />
        </div>
      </div>

      {/* Tabela de Vendas */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {isLoading && sales.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyDescription}>Carregando registros de vendas...</p>
            </div>
          ) : error && sales.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyDescription} style={{ color: 'var(--color-danger)' }}>
                {error}
              </p>
              <Button variant="outline" size="sm" onClick={() => loadSales()}>
                Tentar novamente
              </Button>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Receipt size={32} />
              </div>
              <h3 className={styles.emptyTitle}>
                {searchTerm ? 'Nenhuma venda encontrada' : 'Nenhuma venda cadastrada'}
              </h3>
              <p className={styles.emptyDescription}>
                {searchTerm
                  ? `Nenhum resultado corresponde à busca por "${searchTerm}".`
                  : 'Comece registrando a primeira venda no sistema para acompanhar as comissões.'}
              </p>
              {!searchTerm && onNavigateNewSale && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onNavigateNewSale}
                  leftIcon={<Plus size={16} />}
                >
                  Cadastrar Primeira Venda
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ width: '18%' }}>Nota Fiscal</TableHead>
                  <TableHead style={{ width: '20%' }}>Data / Hora</TableHead>
                  <TableHead style={{ width: '22%' }}>Cliente</TableHead>
                  <TableHead style={{ width: '20%' }}>Vendedor</TableHead>
                  <TableHead style={{ width: '10%' }}>Valor Total</TableHead>
                  <TableHead style={{ width: '10%' }}>Comissão</TableHead>
                  <TableHead style={{ width: '10%', textAlign: 'center' }}>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <span className={styles.invoiceBadge}>{sale.invoice_number}</span>
                    </TableCell>
                    <TableCell>{formatDateTime(sale.sold_at)}</TableCell>
                    <TableCell>{sale.customer.name}</TableCell>
                    <TableCell>{sale.salesperson.name}</TableCell>
                    <TableCell>
                      <span className={styles.totalAmount}>
                        {formatCurrency(sale.total_amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={styles.commissionAmount}>
                        {formatCurrency(sale.total_commission)}
                      </span>
                    </TableCell>
                    <TableCell style={{ textAlign: 'center' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(sale.id)}
                        aria-label={`Ver detalhes da venda ${sale.invoice_number}`}
                        leftIcon={<Eye size={16} />}
                      >
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Modal de Detalhes da Venda Selecionada */}
      {selectedSale && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={clearSelectedSale}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="modal-title" className={styles.modalTitle}>
                Detalhes da Venda - {selectedSale.invoice_number}
              </h2>
              <button
                type="button"
                className={styles.closeButton}
                onClick={clearSelectedSale}
                aria-label="Fechar detalhes"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Metadados da Venda */}
              <div className={styles.detailsMetaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Nota Fiscal</span>
                  <span className={styles.metaValue}>{selectedSale.invoice_number}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Data da Venda</span>
                  <span className={styles.metaValue}>{formatDateTime(selectedSale.sold_at)}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Cliente</span>
                  <span className={styles.metaValue}>{selectedSale.customer.name}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Vendedor</span>
                  <span className={styles.metaValue}>{selectedSale.salesperson.name}</span>
                </div>
              </div>

              {/* Tabela de Itens da Venda */}
              <div>
                <h3
                  style={{
                    fontSize: 'var(--font-size-md)',
                    fontWeight: 'var(--font-semibold)',
                    marginBottom: 'var(--space-3)',
                    color: 'var(--color-text-main)',
                  }}
                >
                  Itens da Venda ({selectedSale.items?.length || 0})
                </h3>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead style={{ width: '10%' }}>Qtd</TableHead>
                      <TableHead style={{ width: '18%' }}>Preço Unitário</TableHead>
                      <TableHead style={{ width: '16%' }}>% Comissão</TableHead>
                      <TableHead style={{ width: '18%' }}>Subtotal</TableHead>
                      <TableHead style={{ width: '18%' }}>Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <strong>[{item.product_code}]</strong> {item.product_description}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell>
                          <span className="badge badge-primary">
                            {formatPercentage(item.applied_commission_percentage)}
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(item.total_price)}</TableCell>
                        <TableCell>
                          <span className={styles.commissionAmount}>
                            {formatCurrency(item.commission_amount)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totais do Modal */}
              <div className={styles.modalTotals}>
                <div className={styles.modalTotalItem}>
                  <span className={styles.modalTotalLabel}>Valor Total da Venda</span>
                  <span className={styles.modalTotalValue}>
                    {formatCurrency(selectedSale.total_amount)}
                  </span>
                </div>
                <div className={styles.modalTotalItem}>
                  <span className={styles.modalTotalLabel}>Total de Comissões</span>
                  <span
                    className={`${styles.modalTotalValue} ${styles.modalTotalCommission}`}
                  >
                    {formatCurrency(selectedSale.total_commission)}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button variant="outline" onClick={clearSelectedSale}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesList;
