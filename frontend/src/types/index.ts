/**
 * Tipos e interfaces TypeScript para o sistema de vendas e comissões da Papelaria.
 */

export interface Product {
  id: number;
  code: string;
  description: string;
  unit_price: string; // Formato Decimal como string: "24.90"
  commission_percentage: string; // Formato Decimal como string: "8.00"
  is_active?: boolean;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface Salesperson {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface DayCommissionRule {
  id: number;
  day_of_week: number; // 0=Segunda ... 6=Domingo
  day_name?: string;
  min_percentage: string;
  max_percentage: string;
}

export interface SaleItemPayload {
  product_id: number;
  quantity: number;
}

export interface SaleCreatePayload {
  invoice_number: string;
  sold_at: string; // ISO 8601 UTC
  customer_id: number;
  salesperson_id: number;
  items: SaleItemPayload[];
}

export interface SaleItemResponse {
  id: number;
  product_id: number;
  product_code: string;
  product_description: string;
  quantity: number;
  unit_price: string;
  applied_commission_percentage: string;
  total_price: string;
  commission_amount: string;
}

export interface CustomerSummary {
  id: number;
  name: string;
}

export interface SalespersonSummary {
  id: number;
  name: string;
}

export interface SaleListItem {
  id: number;
  invoice_number: string;
  sold_at: string;
  customer: CustomerSummary;
  salesperson: SalespersonSummary;
  total_amount: string;
  total_commission: string;
}

export interface SaleDetail extends SaleListItem {
  items: SaleItemResponse[];
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface SalespersonCommission {
  salesperson_id: number;
  salesperson_name: string;
  sales_count: number;
  total_commission: string;
}

export interface CommissionReport {
  start_date: string;
  end_date: string;
  salespeople: SalespersonCommission[];
  grand_total_commission: string;
}

export interface ApiFieldError {
  [key: string]: string[] | string | undefined;
}

export interface ApiErrorResponse {
  detail?: string;
  [key: string]: unknown;
}
