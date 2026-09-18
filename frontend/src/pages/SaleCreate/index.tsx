import { useState, useEffect, useMemo, FC, ChangeEvent, FormEvent } from 'react';
import { Plus, Trash2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { Button, Card, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components';
import { formatCurrency, formatPercentage } from '../../services/api';
import { Product } from '../../types';
import styles from './SaleCreate.module.css';

export interface FormItemRow {
  key: string;
  productId: number | '';
  quantity: number | '';
}

export interface SaleCreateProps {
  onSuccess?: (saleId: number) => void;
  onCancel?: () => void;
}

export const SaleCreate: FC<SaleCreateProps> = ({ onSuccess, onCancel }) => {
  const { formData, loadFormData, createSale, isLoading, error: apiError } = useSales();

  // Data e hora atual no formato YYYY-MM-DDTHH:mm
  const getInitialDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [soldAt, setSoldAt] = useState<string>(getInitialDateTime());
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [salespersonId, setSalespersonId] = useState<number | ''>('');
  const [items, setItems] = useState<FormItemRow[]>([
    { key: 'item-1', productId: '', quantity: 1 },
  ]);

  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Carrega clientes, vendedores, produtos e regras do dia na montagem do componente
  useEffect(() => {
    loadFormData().catch(() => {
      // Erro tratado internamente no hook
    });
  }, [loadFormData]);

  // Mapa de produtos para busca rápida
  const productMap = useMemo(() => {
    const map = new Map<number, Product>();
    formData.products.forEach((p) => map.set(p.id, p));
    return map;
  }, [formData.products]);

  // Regra do dia da semana vigente para a data selecionada
  const activeDayRule = useMemo(() => {
    if (!soldAt) return null;
    try {
      const selectedDate = new Date(soldAt);
      if (isNaN(selectedDate.getTime())) return null;
      // getDay() retorna 0 para Domingo, 1 para Segunda...
      // Python weekday: 0=Segunda ... 6=Domingo
      const jsDay = selectedDate.getDay();
      const pythonWeekday = jsDay === 0 ? 6 : jsDay - 1;
      return (
        formData.rules.find((r) => r.day_of_week === pythonWeekday) || null
      );
    } catch {
      return null;
    }
  }, [soldAt, formData.rules]);

  // Cálculos dinâmicos dos itens
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const product = typeof item.productId === 'number' ? productMap.get(item.productId) : undefined;
      if (!product) {
        return {
          ...item,
          product: undefined,
          unitPrice: 0,
          appliedRate: 0,
          subtotal: 0,
          commissionAmount: 0,
        };
      }

      const unitPrice = parseFloat(product.unit_price) || 0;
      const nominal = parseFloat(product.commission_percentage) || 0;
      const minRate = activeDayRule ? parseFloat(activeDayRule.min_percentage) : 0;
      const maxRate = activeDayRule ? parseFloat(activeDayRule.max_percentage) : 10;
      const appliedRate = Math.min(Math.max(nominal, minRate), maxRate);
      const effectiveQty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 0;
      const subtotal = effectiveQty * unitPrice;
      const commissionAmount = subtotal * (appliedRate / 100);

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

  // Totais consolidados da venda
  const totalSaleAmount = useMemo(() => {
    return calculatedItems.reduce((acc, item) => acc + item.subtotal, 0);
  }, [calculatedItems]);

  const totalSaleCommission = useMemo(() => {
    return calculatedItems.reduce((acc, item) => acc + item.commissionAmount, 0);
  }, [calculatedItems]);

  // Manipuladores de itens
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { key: `item-${Date.now()}-${prev.length + 1}`, productId: '', quantity: 1 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setFormError('A venda deve conter pelo menos um item.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    setFormError(null);
  };

  const handleItemProductChange = (index: number, e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const prodId = val === '' ? '' : parseInt(val, 10);
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, productId: prodId } : item))
    );
    setFormError(null);
  };

  const handleItemQuantityChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setItems((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, quantity: '' } : item))
      );
      return;
    }
    const qty = parseInt(val, 10);
    const validQty = isNaN(qty) ? '' : Math.max(1, qty);
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: validQty } : item))
    );
  };

  // Submissão do formulário
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Validações no cliente
    if (!invoiceNumber.trim()) {
      setFormError('Informe o número da nota fiscal.');
      return;
    }
    if (!soldAt) {
      setFormError('Informe a data e horário da venda.');
      return;
    }
    if (customerId === '') {
      setFormError('Selecione o cliente associado à venda.');
      return;
    }
    if (salespersonId === '') {
      setFormError('Selecione o vendedor responsável.');
      return;
    }

    const invalidItems = items.filter(
      (it) => it.productId === '' || typeof it.quantity !== 'number' || it.quantity < 1
    );
    if (invalidItems.length > 0 || items.length === 0) {
      setFormError('Selecione um produto e uma quantidade válida (mínimo 1) para todos os itens.');
      return;
    }

    try {
      // Converte a data local para ISO 8601 UTC
      const isoSoldAt = new Date(soldAt).toISOString();

      const payload = {
        invoice_number: invoiceNumber.trim(),
        sold_at: isoSoldAt,
        customer_id: customerId as number,
        salesperson_id: salespersonId as number,
        items: items.map((it) => ({
          product_id: it.productId as number,
          quantity: it.quantity as number,
        })),
      };

      const created = await createSale(payload);
      setSuccessMessage(`Venda NF ${created.invoice_number} registrada com sucesso!`);

      if (onSuccess) {
        setTimeout(() => onSuccess(created.id), 1200);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar venda.';
      setFormError(message);
    }
  };

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.pageHeader}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.pageTitle}>Nova Venda</h1>
          <p className={styles.pageSubtitle}>
            Preencha os dados da transação. As comissões serão calculadas dinamicamente com base nas regras do dia.
          </p>
        </div>
        {onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel} leftIcon={<ArrowLeft size={16} />}>
            Voltar
          </Button>
        )}
      </div>

      {formError && (
        <div className="alert alert-danger" role="alert">
          <AlertCircle size={20} />
          <span>{formError}</span>
        </div>
      )}

      {apiError && !formError && (
        <div className="alert alert-danger" role="alert">
          <AlertCircle size={20} />
          <span>{apiError}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" role="alert">
          <CheckCircle2 size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Card>
          <Card.Body>
            <div className={styles.formGrid}>
              <Input
                id="invoice-number-input"
                label="Número da Nota Fiscal"
                required
                placeholder="Ex: NF-10520"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />

              <Input
                id="sold-at-input"
                label="Data e Hora da Venda"
                type="datetime-local"
                required
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
                helperText={
                  activeDayRule
                    ? `Regra do dia (${activeDayRule.day_name || 'Dia'}): Mínimo ${formatPercentage(activeDayRule.min_percentage)} / Máximo ${formatPercentage(activeDayRule.max_percentage)}`
                    : undefined
                }
              />

              <div className={styles.selectGroup}>
                <label htmlFor="customer-select" className={styles.label}>
                  Cliente <span className={styles.required}>*</span>
                </label>
                <select
                  id="customer-select"
                  className={styles.select}
                  value={customerId}
                  onChange={(e) =>
                    setCustomerId(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                  }
                  required
                >
                  <option value="">Selecione um cliente...</option>
                  {formData.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.selectGroup}>
                <label htmlFor="salesperson-select" className={styles.label}>
                  Vendedor <span className={styles.required}>*</span>
                </label>
                <select
                  id="salesperson-select"
                  className={styles.select}
                  value={salespersonId}
                  onChange={(e) =>
                    setSalespersonId(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                  }
                  required
                >
                  <option value="">Selecione um vendedor...</option>
                  {formData.salespeople.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Seção de Itens da Venda */}
            <div className={styles.itemsSection}>
              <div className={styles.itemsHeader}>
                <h2 className={styles.itemsTitle}>Produtos da Venda</h2>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddItem}
                  leftIcon={<Plus size={16} />}
                >
                  Adicionar Produto
                </Button>
              </div>

              <Table className={styles.itemsTable}>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: '40%' }}>Produto</TableHead>
                    <TableHead style={{ width: '12%' }}>Qtd</TableHead>
                    <TableHead style={{ width: '16%' }}>Preço Unitário</TableHead>
                    <TableHead style={{ width: '14%' }}>% Comissão</TableHead>
                    <TableHead style={{ width: '14%' }}>Subtotal</TableHead>
                    <TableHead style={{ width: '4%' }}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculatedItems.map((item, index) => (
                    <TableRow key={item.key}>
                      <TableCell>
                        <select
                          id={`product-select-${index}`}
                          aria-label={`Produto ${index + 1}`}
                          className={styles.select}
                          value={item.productId}
                          onChange={(e) => handleItemProductChange(index, e)}
                        >
                          <option value="">Selecione um produto...</option>
                          {formData.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.code}] {p.description} - R$ {p.unit_price} ({p.commission_percentage}%)
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <input
                          id={`quantity-input-${index}`}
                          aria-label={`Quantidade do item ${index + 1}`}
                          type="number"
                          min="1"
                          className={`${styles.select} ${styles.quantityInput}`}
                          value={item.quantity}
                          onChange={(e) => handleItemQuantityChange(index, e)}
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell>
                        <span className="badge badge-primary">
                          {formatPercentage(item.appliedRate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={styles.subtotalText}>{formatCurrency(item.subtotal)}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          aria-label={`Remover item ${index + 1}`}
                          disabled={items.length <= 1}
                        >
                          <Trash2 size={16} color="var(--color-danger)" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totais da Venda */}
            <div className={styles.totalsCard}>
              <div className={styles.totalsGrid}>
                <div className={styles.totalMetric}>
                  <span className={styles.metricLabel}>Valor Total da Venda</span>
                  <span className={styles.metricValue}>{formatCurrency(totalSaleAmount)}</span>
                </div>
                <div className={styles.totalMetric}>
                  <span className={styles.metricLabel}>Total de Comissões</span>
                  <span className={styles.metricValueCommission}>
                    {formatCurrency(totalSaleCommission)}
                  </span>
                </div>
              </div>
            </div>

            {/* Barra de Ações */}
            <div className={styles.actionsBar}>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
                Salvar Venda
              </Button>
            </div>
          </Card.Body>
        </Card>
      </form>
    </div>
  );
};

export default SaleCreate;
