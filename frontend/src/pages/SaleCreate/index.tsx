import { useState, useEffect, useMemo, useRef, FC, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, AlertCircle, ChevronDown, X } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { Button, DateTimePicker } from '../../components';
import { formatCurrency, formatPercentage } from '../../services/api';
import { Product } from '../../types';
import styles from './SaleCreate.module.css';

export interface FormItemRow {
  key: string;
  productId: number;
  quantity: number;
}

export interface SaleCreateProps {
  onSuccess?: (saleId: number) => void;
  onCancel?: () => void;
}

/**
 * Função utilitária para gerar o número da nota fiscal dinamicamente
 * simulando auto-incremento de 8 dígitos (iniciando em 00000001).
 * Usa timestamp formatado para garantir unicidade na validação do backend.
 */
export const generateInvoiceNumber = (): string => {
  const sequence = (Date.now() % 100000000).toString().padStart(8, '0');
  return sequence;
};

export const SaleCreate: FC<SaleCreateProps> = ({ onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const { formData, loadFormData, createSale, isLoading, error: apiError } = useSales();

  // Data e hora atual no formato YYYY-MM-DDTHH:mm
  const getInitialDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [soldAt, setSoldAt] = useState<string>(getInitialDateTime());
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [salespersonId, setSalespersonId] = useState<number | ''>('');

  // Itens confirmados na venda
  const [items, setItems] = useState<FormItemRow[]>([]);

  // Estados dos campos de seleção no topo (Mecânica de Produtos com busca por código ou descrição)
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedQuantity, setSelectedQuantity] = useState<number | ''>(1);
  const [itemError, setItemError] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);

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
      const jsDay = selectedDate.getDay();
      const pythonWeekday = jsDay === 0 ? 6 : jsDay - 1;
      return (
        formData.rules.find((r) => r.day_of_week === pythonWeekday) || null
      );
    } catch {
      return null;
    }
  }, [soldAt, formData.rules]);

  // Produtos filtrados por código ou descrição
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) {
      return formData.products;
    }
    const term = searchTerm.toLowerCase().trim();

    // Se o termo atual corresponder exatamente ao produto já selecionado, exibe todos os produtos para facilitar nova escolha
    const isExactSelected =
      selectedProductId !== '' &&
      formData.products.some(
        (p) =>
          p.id === selectedProductId &&
          `${p.code} - ${p.description}`.toLowerCase() === term
      );

    if (isExactSelected) {
      return formData.products;
    }

    return formData.products.filter(
      (p) =>
        p.code.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
    );
  }, [formData.products, searchTerm, selectedProductId]);

  // Fecha o dropdown quando o foco sai do combobox
  const handleComboboxBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Se o elemento ativo atual estiver dentro do combobox (ex: no input durante digitação), não fecha
    if (
      comboboxRef.current &&
      typeof document !== 'undefined' &&
      document.activeElement &&
      comboboxRef.current.contains(document.activeElement)
    ) {
      return;
    }

    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }

    setIsDropdownOpen(false);
    if (selectedProductId !== '') {
      const currentProd = formData.products.find((p) => p.id === selectedProductId);
      if (currentProd) {
        setSearchTerm(`${currentProd.code} - ${currentProd.description}`);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsDropdownOpen(true);
    setHighlightedIndex(0);
    setItemError(null);

    if (!val.trim()) {
      setSelectedProductId('');
      return;
    }

    // Auto-seleciona se coincidir exatamente com código ou rótulo formatado
    const exact = formData.products.find(
      (p) =>
        p.code.toLowerCase() === val.trim().toLowerCase() ||
        `${p.code} - ${p.description}`.toLowerCase() === val.trim().toLowerCase()
    );
    if (exact) {
      setSelectedProductId(exact.id);
    } else if (selectedProductId !== '') {
      setSelectedProductId('');
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setSearchTerm(`${product.code} - ${product.description}`);
    setIsDropdownOpen(false);
    setItemError(null);
  };

  const handleClearSearch = () => {
    setSelectedProductId('');
    setSearchTerm('');
    setIsDropdownOpen(false);
    setItemError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsDropdownOpen(true);
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredProducts.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredProducts.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isDropdownOpen && filteredProducts.length > 0) {
        const targetIndex = highlightedIndex >= 0 ? highlightedIndex : 0;
        handleSelectProduct(filteredProducts[targetIndex]);
      } else if (!isDropdownOpen && selectedProductId) {
        handleAddItem();
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  // Cálculos dinâmicos dos itens confirmados
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const product = productMap.get(item.productId);
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
      const effectiveQty = item.quantity > 0 ? item.quantity : 0;
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

  // Adição de produto à listagem confirmada
  const handleAddItem = () => {
    let prodId = selectedProductId;
    if (prodId === '' && searchTerm.trim() !== '') {
      const match =
        formData.products.find(
          (p) =>
            p.code.toLowerCase() === searchTerm.trim().toLowerCase() ||
            p.description.toLowerCase() === searchTerm.trim().toLowerCase() ||
            `${p.code} - ${p.description}`.toLowerCase() === searchTerm.trim().toLowerCase()
        ) || (filteredProducts.length === 1 ? filteredProducts[0] : null);
      if (match) {
        prodId = match.id;
        setSelectedProductId(match.id);
      }
    }

    if (prodId === '') {
      setItemError('Selecione um produto para adicionar à venda.');
      return;
    }

    const qty = typeof selectedQuantity === 'number' && selectedQuantity > 0 ? selectedQuantity : 1;

    setItems((prev) => {
      const existingIndex = prev.findIndex((it) => it.productId === prodId);
      if (existingIndex >= 0) {
        // Incrementa a quantidade caso o item já tenha sido adicionado
        return prev.map((it, idx) =>
          idx === existingIndex ? { ...it, quantity: it.quantity + qty } : it
        );
      }
      return [
        ...prev,
        {
          key: `item-${Date.now()}-${prev.length + 1}`,
          productId: prodId as number,
          quantity: qty,
        },
      ];
    });

    // Reseta os campos de seleção do topo
    setSelectedProductId('');
    setSearchTerm('');
    setIsDropdownOpen(false);
    setSelectedQuantity(1);
    setItemError(null);
    setFormError(null);
  };

  // Remoção de item da listagem confirmada
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    setFormError(null);
  };

  // Submissão do formulário
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validações no cliente (sem o campo da Nota Fiscal, que é gerada automaticamente)
    if (!soldAt) {
      setFormError('Informe a data e horário da venda.');
      return;
    }
    if (salespersonId === '') {
      setFormError('Selecione o vendedor responsável.');
      return;
    }
    if (customerId === '') {
      setFormError('Selecione o cliente associado à venda.');
      return;
    }
    if (items.length === 0) {
      setFormError('Adicione pelo menos um produto à venda.');
      return;
    }

    try {
      // Converte a data local para ISO 8601 UTC
      const isoSoldAt = new Date(soldAt).toISOString();

      // Geração dinâmica do número da nota fiscal (auto-incremental / identificador único provisório)
      const invoiceNumber = generateInvoiceNumber();

      const payload = {
        invoice_number: invoiceNumber,
        sold_at: isoSoldAt,
        customer_id: customerId as number,
        salesperson_id: salespersonId as number,
        items: items.map((it) => ({
          product_id: it.productId,
          quantity: it.quantity,
        })),
      };

      const created = await createSale(payload);

      if (onSuccess) {
        onSuccess(created.id);
      }
      navigate('/vendas', {
        state: { toastMessage: 'VENDA REALIZADA COM SUCESSO!' },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar venda.';
      setFormError(message);
    }
  };

  return (
    <div className={`container ${styles.page}`}>
      {onCancel && (
        <div className={styles.topActionsBar}>
          <Button variant="outline" size="sm" onClick={onCancel} leftIcon={<ArrowLeft size={16} />}>
            Voltar
          </Button>
        </div>
      )}

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

      <form onSubmit={handleSubmit} noValidate>
        {/* Layout Master em Duas Colunas sem Card global (Figma #833:2) */}
        <div className={styles.twoColumnLayout}>
          {/* Coluna da Esquerda: Produtos (#833:8) */}
          <div className={styles.leftColumn}>
            <h2 className={styles.sectionTitle}>Produtos</h2>

            {/* Mecânica de Produtos: Campos de seleção e quantidade + botão Adicionar acima da tabela */}
            <div className={styles.productFormRow}>
              <div
                className={styles.productSelectGroup}
                ref={comboboxRef}
                onBlur={handleComboboxBlur}
              >
                <label htmlFor="product-search-input" className={styles.label}>
                  Buscar pelo código de barras ou descrição
                </label>

                <div className={styles.comboboxWrapper}>
                  <div className={styles.searchInputWrapper}>
                    <input
                      ref={searchInputRef}
                      id="product-search-input"
                      type="text"
                      className={styles.searchInput}
                      placeholder="Digite o código ou nome do produto"
                      value={searchTerm}
                      autoComplete="off"
                      onChange={handleSearchChange}
                      onFocus={() => setIsDropdownOpen(true)}
                      onKeyDown={handleKeyDown}
                    />

                    <div className={styles.inputControls}>
                      {searchTerm && (
                        <button
                          type="button"
                          className={styles.clearSearchBtn}
                          onClick={handleClearSearch}
                          aria-label="Limpar busca"
                          title="Limpar busca"
                        >
                          <X size={16} />
                        </button>
                      )}

                      <button
                        type="button"
                        className={styles.chevronButton}
                        onClick={() => setIsDropdownOpen((prev) => !prev)}
                        tabIndex={-1}
                        aria-label="Alternar lista"
                        title="Abrir/fechar lista"
                      >
                        <ChevronDown
                          size={18}
                          style={{
                            transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform var(--transition-fast)',
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Dropdown de sugestões com filtragem por código ou descrição */}
                  {isDropdownOpen && (
                    <ul className={styles.dropdownList} role="listbox">
                      {filteredProducts.length === 0 ? (
                        <li className={styles.dropdownItemEmpty}>
                          Nenhum produto encontrado com o código ou descrição informados.
                        </li>
                      ) : (
                        filteredProducts.map((p, index) => (
                          <li
                            key={p.id}
                            role="option"
                            aria-selected={selectedProductId === p.id}
                            className={`${styles.dropdownItem} ${
                              selectedProductId === p.id || highlightedIndex === index
                                ? styles.dropdownItemHighlighted
                                : ''
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectProduct(p);
                            }}
                            onClick={() => handleSelectProduct(p)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                          >
                            {p.code} - {p.description}
                          </li>
                        ))
                      )}
                    </ul>
                  )}

                  {/* Elemento select acessível/sincronizado para leitores de tela e testes */}
                  <select
                    id="product-search-select"
                    aria-label="Produto"
                    className={styles.srOnlySelect}
                    value={selectedProductId}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                      setSelectedProductId(val);
                      if (val !== '') {
                        const p = formData.products.find((prod) => prod.id === val);
                        if (p) {
                          setSearchTerm(`${p.code} - ${p.description}`);
                        }
                      } else {
                        setSearchTerm('');
                      }
                      setItemError(null);
                    }}
                    tabIndex={-1}
                  >
                    <option value="">Digite o código ou nome do produto</option>
                    {formData.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.quantityGroup}>
                <label htmlFor="product-quantity-input" className={styles.label}>
                  Quantidade de itens
                </label>
                <input
                  id="product-quantity-input"
                  aria-label="Quantidade"
                  type="number"
                  min="1"
                  className={styles.quantityInput}
                  value={selectedQuantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setSelectedQuantity('');
                      return;
                    }
                    const parsed = parseInt(val, 10);
                    setSelectedQuantity(isNaN(parsed) ? '' : Math.max(1, parsed));
                    setItemError(null);
                  }}
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

            {/* Tabela de Listagem de Itens Confirmados (#833:9 a #833:14) */}
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
                      <td colSpan={5} className={styles.emptyTable}>
                        Nenhum produto adicionado à venda.
                      </td>
                    </tr>
                  ) : (
                    calculatedItems.map((item, index) => (
                      <tr key={item.key} className={styles.tableRow}>
                        <td className={styles.tdProduct}>
                          {item.product
                            ? `[${item.product.code}] ${item.product.description}`
                            : 'Produto não identificado'}
                        </td>
                        <td className={styles.tdQty}>{item.quantity}</td>
                        <td className={styles.tdUnitPrice}>{formatCurrency(item.unitPrice)}</td>
                        <td className={styles.tdTotal}>{formatCurrency(item.subtotal)}</td>
                        <td className={styles.tdAction}>
                          <button
                            type="button"
                            className={styles.deleteItemButton}
                            onClick={() => handleRemoveItem(index)}
                            aria-label={`Remover item ${index + 1}`}
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

          {/* Divisória Vertical Central (#833:51) */}
          <div className={styles.verticalDivider} />

          {/* Coluna da Direita: Dados da Venda (#833:37) sem campo de Nota Fiscal */}
          <div className={styles.rightColumn}>
            <h2 className={styles.salesDataTitle}>Dados da venda</h2>

            <div className={styles.formField}>
              <label htmlFor="sold-at-input" className={styles.label}>
                Data e Hora da Venda <span className={styles.required}>*</span>
              </label>
              <DateTimePicker
                id="sold-at-input"
                label="Data e Hora da Venda"
                value={soldAt}
                onChange={setSoldAt}
                required
              />
              {activeDayRule && (
                <span className={styles.helperText}>
                  Regra do dia ({activeDayRule.day_name || 'Dia'}): Mínimo{' '}
                  {formatPercentage(activeDayRule.min_percentage)} / Máximo{' '}
                  {formatPercentage(activeDayRule.max_percentage)}
                </span>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor="salesperson-select" className={styles.label}>
                Escolha um vendedor <span className={styles.required}>*</span>
              </label>
              <select
                id="salesperson-select"
                aria-label="Vendedor"
                className={styles.fieldSelect}
                value={salespersonId}
                onChange={(e) =>
                  setSalespersonId(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
                required
              >
                <option value="">Selecione o nome</option>
                {formData.salespeople.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formField}>
              <label htmlFor="customer-select" className={styles.label}>
                Escolha um cliente <span className={styles.required}>*</span>
              </label>
              <select
                id="customer-select"
                aria-label="Cliente"
                className={styles.fieldSelect}
                value={customerId}
                onChange={(e) =>
                  setCustomerId(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
                required
              >
                <option value="">Selecione o nome</option>
                {formData.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Seção de Totais da Venda (#833:10, #833:11) */}
            <div className={styles.totalsSection}>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Valor total da venda:</span>
                <span className={styles.totalValue}>{formatCurrency(totalSaleAmount)}</span>
              </div>
              <div className={styles.commissionRow}>
                <span className={styles.commissionLabel}>Total de comissões:</span>
                <span className={styles.commissionValue}>{formatCurrency(totalSaleCommission)}</span>
              </div>
            </div>

            {/* Barra de Ações (#833:45 & #833:48) */}
            <div className={styles.actionsBar}>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  className={styles.cancelButton}
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                className={styles.submitButton}
                isLoading={isLoading}
                aria-label="Salvar Venda"
              >
                Salvar Venda
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SaleCreate;
