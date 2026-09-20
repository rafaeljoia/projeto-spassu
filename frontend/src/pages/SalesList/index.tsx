import { FC, useState, useEffect, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, X } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { saleService } from '../../services/saleService';
import { Toast } from '../../components';
import { formatCurrency, formatPercentage } from '../../services/api';
import { SaleDetail, SaleListItem } from '../../types';
import { EditIcon, TrashIcon } from './SalesListIcons';
import styles from './SalesList.module.css';

export interface SalesListProps {
  onNavigateNewSale?: () => void;
  onNavigateEditSale?: (saleId: number, invoiceNumber: string) => void;
}

export const SalesList: FC<SalesListProps> = ({ onNavigateNewSale, onNavigateEditSale }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    sales,
    isLoading,
    error,
    loadSales,
    loadSaleDetail,
  } = useSales();

  // Estado para controlar qual linha de venda está expandida
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  // Cache dos detalhes completos das vendas para evitar requisições repetidas
  const [saleDetailsCache, setSaleDetailsCache] = useState<Record<number, SaleDetail>>({});
  const [loadingSaleId, setLoadingSaleId] = useState<number | null>(null);

  // Estado local para mensagem de Toast flutuante
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estado para controle do modal de exclusão de venda (Figma #838:287)
  const [saleToDelete, setSaleToDelete] = useState<number | null>(null);

  // Captura toastMessage transmitido via state do React Router (ex: após criação ou edição)
  useEffect(() => {
    const stateToast = (location.state as { toastMessage?: string } | null)?.toastMessage;
    if (stateToast) {
      setToastMessage(stateToast);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    loadSales().catch(() => {
      // Tratado internamente no hook useSales
    });
  }, [loadSales]);

  // Formatação de data/hora no padrão do Figma: 19/10/2022 - 14:25
  const formatDateTime = (isoDate: string): string => {
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} - ${hours}:${minutes}`;
    } catch {
      return isoDate;
    }
  };

  const handleToggleExpand = async (sale: SaleListItem) => {
    if (expandedSaleId === sale.id) {
      setExpandedSaleId(null);
      return;
    }

    setExpandedSaleId(sale.id);

    // Se já estiver no cache ou se a venda já possuir os itens embutidos, não precisa buscar novamente
    if (!saleDetailsCache[sale.id] && !(sale as unknown as SaleDetail).items) {
      setLoadingSaleId(sale.id);
      try {
        const detail = await loadSaleDetail(sale.id);
        setSaleDetailsCache((prev) => ({ ...prev, [sale.id]: detail }));
      } catch (err) {
        console.error('Erro ao carregar itens da venda:', err);
      } finally {
        setLoadingSaleId(null);
      }
    }
  };

  const handleEditSale = (sale: SaleListItem) => {
    if (onNavigateEditSale) {
      onNavigateEditSale(sale.id, sale.invoice_number);
    } else {
      navigate(`/vendas/${sale.id}/editar`, {
        state: { invoiceNumber: sale.invoice_number },
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (saleToDelete === null) return;
    const idToDelete = saleToDelete;
    setSaleToDelete(null);
    try {
      await saleService.deleteSale(idToDelete);
      await loadSales();
      setToastMessage('VENDA REMOVIDA COM SUCESSO!');
    } catch (err) {
      console.error('Erro ao excluir venda:', err);
    }
  };

  return (
    <div className={styles.page}>
      {/* Toast Flutuante no Canto Superior Direito (Figma Aligned) */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Mensagem de Erro se houver */}
      {error && <div className={styles.errorAlert}>{error}</div>}

      {/* CABEÇALHO DA TABELA (Figma #830:372 & #830:504):
          Título à esquerda ("Vendas Realizadas") e Botão na extrema direita ("Inserir nova Venda") */}
      <div className={styles.tableHeaderBar}>
        <h2 className={styles.tableTitle}>Vendas Realizadas</h2>
        {onNavigateNewSale && (
          <button
            type="button"
            className={styles.insertSaleBtn}
            onClick={onNavigateNewSale}
          >
            Inserir nova Venda
          </button>
        )}
      </div>

      {/* Caso não existam vendas cadastradas e não esteja carregando */}
      {!isLoading && sales.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <ShoppingBag size={32} />
          </div>
          <h3 className={styles.emptyTitle}>Nenhuma venda cadastrada</h3>
          <p className={styles.emptyText}>
            Não existem vendas registradas no momento. Clique no botão acima para registrar a primeira venda.
          </p>
        </div>
      )}

      {/* TABELA PRINCIPAL DE VENDAS (Figma #830:2) */}
      {(isLoading || sales.length > 0) && (
        <div className={styles.tableWrapper}>
          <table className={styles.mainTable}>
            <thead>
              <tr>
                <th>Nota Fiscal</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Data da Venda</th>
                <th>Valor Total</th>
                <th>Opções</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const isExpanded = expandedSaleId === sale.id;
                const saleDetail = saleDetailsCache[sale.id] || (sale as unknown as SaleDetail);
                const items = saleDetail?.items || [];

                // Cálculos dos totais da sub-tabela
                const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
                const calculatedTotalAmount = items.reduce(
                  (acc, item) => acc + (parseFloat(item.total_price) || 0),
                  0
                );
                const calculatedTotalCommission = items.reduce(
                  (acc, item) => acc + (parseFloat(item.commission_amount) || 0),
                  0
                );

                const displayTotalAmount =
                  items.length > 0 ? calculatedTotalAmount : parseFloat(sale.total_amount) || 0;
                const displayTotalCommission =
                  items.length > 0 ? calculatedTotalCommission : parseFloat(sale.total_commission) || 0;

                return (
                  <Fragment key={sale.id}>
                    {/* Linha Principal da Venda */}
                    <tr
                      className={`${styles.dataRow} ${isExpanded ? styles.dataRowExpanded : ''}`}
                    >
                      <td>{sale.invoice_number}</td>
                      <td>{sale.customer?.name || (sale as any).customer_name || '—'}</td>
                      <td>{sale.salesperson?.name || (sale as any).salesperson_name || '—'}</td>
                      <td>{formatDateTime(sale.sold_at)}</td>
                      <td>{formatCurrency(sale.total_amount)}</td>
                      <td>
                        <div className={styles.optionsCell}>
                          {/* Botão "Ver itens" / "Fechar" */}
                          <button
                            type="button"
                            className={styles.toggleItemsBtn}
                            onClick={() => handleToggleExpand(sale)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? 'Fechar' : 'Ver itens'}
                          </button>

                          {/* Ícone Editar (Figma #830:393) */}
                          <button
                            type="button"
                            className={styles.actionIconBtn}
                            onClick={() => handleEditSale(sale)}
                            aria-label={`Editar venda ${sale.invoice_number}`}
                            title="Editar venda"
                          >
                            <EditIcon size={19} />
                          </button>

                          {/* Ícone Lixeira (Figma #830:391) */}
                          <button
                            type="button"
                            className={styles.actionIconBtn}
                            onClick={() => setSaleToDelete(sale.id)}
                            aria-label={`Excluir venda ${sale.invoice_number}`}
                            title="Excluir venda"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* SUB-TABELA / LINHA EXPANDIDA (Figma #830:366) */}
                    {isExpanded && (
                      <tr className={styles.expandedRow}>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <div className={styles.subTableContainer}>
                            {loadingSaleId === sale.id ? (
                              <div className={styles.subTableLoading}>
                                Carregando produtos da venda...
                              </div>
                            ) : items.length === 0 ? (
                              <div className={styles.subTableLoading}>
                                Nenhum item registrado para esta venda.
                              </div>
                            ) : (
                              <table className={styles.subTable}>
                                <thead>
                                  <tr>
                                    <th>Produtos/Serviço</th>
                                    <th className={styles.alignCenter}>Quantidade</th>
                                    <th className={styles.alignRight}>Preço unitário</th>
                                    <th className={styles.alignRight}>Total do Produto</th>
                                    <th className={styles.alignCenter}>% de Comissão</th>
                                    <th className={styles.alignRight}>Comissão</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((item) => (
                                    <tr key={item.id} className={styles.subTableDataRow}>
                                      <td>
                                        {item.product_code
                                          ? `${item.product_code} - ${item.product_description}`
                                          : item.product_description}
                                      </td>
                                      <td className={styles.alignCenter}>{item.quantity}</td>
                                      <td className={styles.alignRight}>
                                        {formatCurrency(item.unit_price)}
                                      </td>
                                      <td className={styles.alignRight}>
                                        {formatCurrency(item.total_price)}
                                      </td>
                                      <td className={styles.alignCenter}>
                                        {formatPercentage(item.applied_commission_percentage)}
                                      </td>
                                      <td className={styles.alignRight}>
                                        {formatCurrency(item.commission_amount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  {/* Linha Final de "Total da Venda" (Figma #830:549) */}
                                  <tr className={styles.subTableFooter}>
                                    <td>Total da Venda</td>
                                    <td className={styles.alignCenter}>{totalQuantity}</td>
                                    <td />
                                    <td className={styles.alignRight}>
                                      {formatCurrency(displayTotalAmount)}
                                    </td>
                                    <td />
                                    <td className={styles.alignRight}>
                                      {formatCurrency(displayTotalCommission)}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (Figma #838:287) */}
      {saleToDelete !== null && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={() => setSaleToDelete(null)}
        >
          <div
            className={styles.modalBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 id="modal-title" className={styles.modalTitle}>
                Remover Venda
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setSaleToDelete(null)}
                aria-label="Fechar"
                title="Fechar"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalMessage}>
                Deseja remover esta venda?
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setSaleToDelete(null)}
              >
                Não
              </button>
              <button
                type="button"
                className={styles.modalConfirmBtn}
                onClick={handleConfirmDelete}
              >
                Sim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesList;
