import { useState, useEffect, useMemo, useRef, FC, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { saleService } from '../../services/saleService';
import { Button, DateTimePicker } from '../../components';
import { formatCurrency } from '../../services/api';
import { Product, SaleCreatePayload } from '../../types';
import styles from './SaleEdit.module.css';

export interface FormItemRow {
  key: string;
  productId: number;
  quantity: number;
  initialProductCode?: string;
  initialProductDescription?: string;
  initialUnitPrice?: number;
}

export interface SaleEditProps {
  onSuccess?: (saleId: number) => void;
  onCancel?: () => void;
  onTitleChange?: (title: string) => void;
}

export const SaleEdit: FC<SaleEditProps> = ({ onSuccess, onCancel, onTitleChange }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formData, loadFormData, updateSale, isLoading, error: apiError } = useSales();

  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [soldAt, setSoldAt] = useState<string>('');
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [salespersonId, setSalespersonId] = useState<number | ''>('');

  // Itens confirmados na venda
  const [items, setItems] = useState<FormItemRow[]>([]);

  // Estados dos campos de seleção no topo (Mecânica de Produtos)
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [selectedQuantity, setSelectedQuantity] = useState<number | ''>(1);
  const [itemError, setItemError] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingSale, setIsLoadingSale] = useState<boolean>(true);

  const onTitleChangeRef = useRef(onTitleChange);
  useEffect(() => {
    onTitleChangeRef.current = onTitleChange;
  }, [onTitleChange]);

  // Carrega clientes, vendedores, produtos e regras do dia
  useEffect(() => {
    loadFormData().catch(() => {
      // Erro tratado internamente no hook useSales
    });
  }, [loadFormData]);

  // Busca os dados da venda pelo ID
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchSaleData = async () => {
      setIsLoadingSale(true);
      try {
        const sale = await saleService.getSaleById(Number(id));
        if (!isMounted) return;

        setInvoiceNumber(sale.invoice_number);
        if (onTitleChangeRef.current) {
          onTitleChangeRef.current(`Alterar Venda - Nº ${sale.invoice_number}`);
        }

        // Formata data ISO para o input datetime-local: YYYY-MM-DDTHH:mm
        try {
          const d = new Date(sale.sold_at);
          if (!isNaN(d.getTime())) {
            const pad = (n: number) => String(n).padStart(2, '0');
            const year = d.getFullYear();
            const month = pad(d.getMonth() + 1);
            const day = pad(d.getDate());
            const hours = pad(d.getHours());
            const minutes = pad(d.getMinutes());
            setSoldAt(`${year}-${month}-${day}T${hours}:${minutes}`);
          } else {
            setSoldAt(sale.sold_at.slice(0, 16));
          }
        } catch {
          setSoldAt(sale.sold_at.slice(0, 16));
        }

        setCustomerId(sale.customer.id);
        setSalespersonId(sale.salesperson.id);

        if (sale.items && sale.items.length > 0) {
          setItems(
            sale.items.map((it) => ({
              key: String(it.id || `${it.product_id}-${Math.random()}`),
              productId: it.product_id,
              quantity: it.quantity,
              initialProductCode: it.product_code,
              initialProductDescription: it.product_description,
              initialUnitPrice: parseFloat(it.unit_price) || 0,
            }))
          );
        }
      } catch (err) {
        console.error('Erro ao buscar dados da venda:', err);
        setFormError('Não foi possível carregar os dados desta venda para edição.');
      } finally {
        if (isMounted) {
          setIsLoadingSale(false);
        }
      }
    };

    fetchSaleData();

    return () => {
      isMounted = false;
      if (onTitleChangeRef.current) {
        onTitleChangeRef.current('');
      }
    };
  }, [id]);

  // Mapa de produtos para busca rápida
  const productMap = useMemo(() => {
    const map = new Map<number, Product>();
    formData.products.forEach((p) => map.set(p.id, p));
    return map;
  }, [formData.products]);

  // Regra do dia da semana vigente para a data da venda
  const activeDayRule = useMemo(() => {
    if (!soldAt) return null;
    try {
      const selectedDate = new Date(soldAt);
      if (isNaN(selectedDate.getTime())) return null;
      const jsDay = selectedDate.getDay();
      const pythonWeekday = jsDay === 0 ? 6 : jsDay - 1;
      return (
        formData.rules.find((r) => r.day_of_week === pythonWeekday) || null
      );
    } catch {
      return null;
    }
  }, [soldAt, formData.rules]);

  // Cálculos dinâmicos dos itens confirmados
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const product = productMap.get(item.productId);
      const unitPrice = product
        ? (parseFloat(product.unit_price) || 0)
        : (item.initialUnitPrice || 0);
      const baseRate = product ? (parseFloat(product.commission_percentage) || 0) : 0;
      let appliedRate = baseRate;

      if (activeDayRule) {
        const minRate = parseFloat(activeDayRule.min_percentage) || 0;
        const maxRate = parseFloat(activeDayRule.max_percentage) || 0;
        appliedRate = Math.min(Math.max(baseRate, minRate), maxRate);
      }

      const subtotal = Math.round(unitPrice * item.quantity * 100) / 100;
      const commissionAmount =
        Math.round(((subtotal * appliedRate) / 100) * 100) / 100;

      return {
        ...item,
        product,
        unitPrice,
        appliedRate,
        subtotal,
        commissionAmount,
      };
    });
  }, [items, productMap, activeDayRule]);

  // Valor Total Geral da Venda
  const totalSaleAmount = useMemo(() => {
    return calculatedItems.reduce((acc, item) => acc + item.subtotal, 0);
  }, [calculatedItems]);

  // Adiciona produto à listagem confirmada
  const handleAddItem = () => {
    setItemError(null);

    if (!selectedProductId) {
      setItemError('Selecione um produto.');
      return;
    }

    const qty = Number(selectedQuantity);
    if (!qty || qty < 1) {
      setItemError('A quantidade deve ser no mínimo 1.');
      return;
    }

    const existingIndex = items.findIndex((i) => i.productId === selectedProductId);
    if (existingIndex >= 0) {
      setItems((prev) => {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + qty,
        };
        return updated;
      });
    } else {
      const newItem: FormItemRow = {
        key: `${selectedProductId}-${Date.now()}`,
        productId: Number(selectedProductId),
        quantity: qty,
      };
      setItems((prev) => [...prev, newItem]);
    }

    setSelectedProductId('');
    setSelectedQuantity(1);
  };

  // Remove produto da tabela
  const handleRemoveItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  // Submissão de Edição (PUT)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!id) return;

    if (!soldAt) {
      setFormError('A data e hora da venda são obrigatórias.');
      return;
    }

    if (!customerId) {
      setFormError('Selecione um cliente para a venda.');
      return;
    }

    if (!salespersonId) {
      setFormError('Selecione um vendedor responsável.');
      return;
    }

    if (items.length === 0) {
      setFormError('Adicione pelo menos um produto na tabela da venda.');
      return;
    }

    const payload: SaleCreatePayload = {
      invoice_number: invoiceNumber,
      sold_at: new Date(soldAt).toISOString(),
      customer_id: Number(customerId),
      salesperson_id: Number(salespersonId),
      items: items.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
      })),
    };

    try {
      await updateSale(Number(id), payload);
      if (onSuccess) {
        onSuccess(Number(id));
      }
      navigate('/vendas', {
        state: { toastMessage: 'VENDA ALTERADA COM SUCESSO!' },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar a venda.';
      setFormError(msg);
    }
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/vendas');
    }
  };

  if (isLoadingSale) {
    return (
      <div className={`container ${styles.page}`}>
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Carregando dados da venda para edição...
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${styles.page}`}>
      {/* Barra de Ações Superior */}
      <div className={styles.topActionsBar}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancelClick}
          leftIcon={<ArrowLeft size={16} />}
        >
          Voltar para Vendas
        </Button>
      </div>

      {/* Alertas Globais */}
      {formError && (
        <div className={styles.alertError} role="alert">
          <AlertCircle size={18} />
          <span>{formError}</span>
        </div>
      )}

      {apiError && !formError && (
        <div className={styles.alertError} role="alert">
          <AlertCircle size={18} />
          <span>{apiError}</span>
        </div>
      )}

      {/* Formulário Principal em Duas Colunas (Figma #833:66) */}
      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.twoColumnLayout}>
          {/* ==========================================
              COLUNA DA ESQUERDA: PRODUTOS (#833:72)
              ========================================== */}
          <div className={styles.leftColumn}>
            <h2 className={styles.sectionTitle}>Produtos</h2>

            {/* Mecânica de Adição de Produtos */}
            <div className={styles.productFormRow}>
              <div className={styles.productSelectGroup}>
                <label htmlFor="product-select" className={styles.label}>
                  Buscar pelo código de barras ou descrição
                </label>
                <select
                  id="product-select"
                  className={styles.productSelect}
                  value={selectedProductId}
                  onChange={(e) =>
                    setSelectedProductId(e.target.value ? Number(e.target.value) : '')
                  }
                >
                  <option value="">Digite o código ou nome do produto</option>
                  {formData.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.description} ({formatCurrency(p.unit_price)})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.quantityGroup}>
                <label htmlFor="quantity-input" className={styles.label}>
                  Quantidade de itens
                </label>
                <input
                  id="quantity-input"
                  type="number"
                  min={1}
                  className={styles.quantityInput}
                  value={selectedQuantity}
                  onChange={(e) =>
                    setSelectedQuantity(e.target.value ? Number(e.target.value) : '')
                  }
                />
              </div>

              <div className={styles.addButtonWrapper}>
                <Button
                  type="button"
                  variant="primary"
                  className={styles.addProductButton}
                  onClick={handleAddItem}
                  leftIcon={<Plus size={16} />}
                >
                  Adicionar
                </Button>
              </div>
            </div>

            {itemError && <span className={styles.itemError}>{itemError}</span>}

            {/* Tabela de Produtos Confirmados */}
            <div className={styles.itemsTableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.tableHeaderRow}>
                    <th className={styles.thProduct}>Produtos/Serviço</th>
                    <th className={styles.thQty}>Quantidade</th>
                    <th className={styles.thUnitPrice}>Preço unitário</th>
                    <th className={styles.thTotal}>Total</th>
                    <th className={styles.thAction}></th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.emptyTableMessage}>
                        Nenhum produto adicionado. Utilize a seleção acima para incluir itens na venda.
                      </td>
                    </tr>
                  ) : (
                    calculatedItems.map((item) => (
                      <tr key={item.key} className={styles.tableRow}>
                        <td className={styles.tdProduct}>
                          {item.product
                            ? `${item.product.code} - ${item.product.description}`
                            : item.initialProductCode
                            ? `${item.initialProductCode} - ${item.initialProductDescription}`
                            : `Produto #${item.productId}`}
                        </td>
                        <td className={styles.tdQty}>{item.quantity}</td>
                        <td className={styles.tdUnitPrice}>
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className={styles.tdTotal}>
                          {formatCurrency(item.subtotal)}
                        </td>
                        <td className={styles.tdAction}>
                          <button
                            type="button"
                            className={styles.removeButton}
                            onClick={() => handleRemoveItem(item.key)}
                            aria-label={`Remover ${item.product?.description || 'produto'}`}
                            title="Remover produto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Divisor Vertical */}
          <div className={styles.verticalDivider} />

          {/* ==========================================
              COLUNA DA DIREITA: DADOS DA VENDA (#833:101)
              ========================================== */}
          <div className={styles.rightColumn}>
            <h2 className={styles.salesDataTitle}>Dados da venda</h2>

            {/* Campo 1: Data e Hora da Venda (DESABILITADO conforme Figma #853:235) */}
            <div className={styles.formField}>
              <label htmlFor="sold-at" className={styles.label}>
                Data e Hora da Venda
              </label>
              <DateTimePicker
                id="sold-at"
                label="Data e Hora da Venda"
                value={soldAt}
                onChange={setSoldAt}
                disabled={true}
                readOnly={true}
              />
              <span className={styles.helperText}>
                A data original da venda é mantida para preservação das regras de comissão.
              </span>
            </div>

            {/* Campo 2: Vendedor (#853:223) */}
            <div className={styles.formField}>
              <label htmlFor="salesperson-select" className={styles.label}>
                Escolha um vendedor <span className={styles.required}>*</span>
              </label>
              <select
                id="salesperson-select"
                className={styles.fieldSelect}
                value={salespersonId}
                onChange={(e) =>
                  setSalespersonId(e.target.value ? Number(e.target.value) : '')
                }
                required
              >
                <option value="">Selecione um vendedor</option>
                {formData.salespeople.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo 3: Cliente (#853:229) */}
            <div className={styles.formField}>
              <label htmlFor="customer-select" className={styles.label}>
                Escolha um cliente <span className={styles.required}>*</span>
              </label>
              <select
                id="customer-select"
                className={styles.fieldSelect}
                value={customerId}
                onChange={(e) =>
                  setCustomerId(e.target.value ? Number(e.target.value) : '')
                }
                required
              >
                <option value="">Selecione um cliente</option>
                {formData.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Seção de Totais e Ações no Rodapé da Coluna Direita */}
            <div className={styles.totalsSection}>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Valor total da venda:</span>
                <span className={styles.totalValue}>
                  {formatCurrency(totalSaleAmount)}
                </span>
              </div>

              {/* Botões de Ação */}
              <div className={styles.formActions}>
                <Button
                  type="button"
                  variant="outline"
                  className={styles.cancelButton}
                  onClick={handleCancelClick}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                  {isLoading ? 'Salvando...' : 'Finalizar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SaleEdit;
