/** Tipos de dominio MI PYME (espejo del esquema Supabase). */

export type Role = 'admin' | 'vendedor';

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  industry: 'ropa' | 'carniceria' | 'abarrotes' | string;
  address?: string;
  currency_default: string;        // 'NIO'
  exchange_rate_nio_usd: number;   // tasa C$/USD
  low_stock_threshold: number;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  business_id: string;             // SIEMPRE presente: aislamiento multi-tenant
  name: string;
  color: string;
}

export interface Product {
  id: string;
  business_id: string;
  category_id?: string | null;
  name: string;
  barcode?: string | null;
  sku?: string | null;
  price_nio: number;               // precio venta (Córdobas)
  cost_nio: number;                // precio costo
  stock: number;                   // fracciones para kg/lt
  unit: 'u' | 'kg' | 'lt';
  is_active: boolean;
  image_url?: string | null;
}

export interface CashRegister {
  id: string;
  business_id: string;
  status: 'open' | 'closed';
  opening_fund: number;
  closing_count?: number | null;
  expected_amount?: number | null;
  opened_at: string;
  closed_at?: string | null;
  notes?: string | null;
}

export type PaymentMethod = 'efectivo_cordobas' | 'efectivo_usd' | 'transferencia' | 'tarjeta' | 'fiado';

export interface PaymentLine {
  method: PaymentMethod;
  currency: 'NIO' | 'USD';
  amount: number;                  // en la moneda indicada
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface SalePayload {
  business_id: string;
  register_id?: string | null;
  folio: string;
  total_nio: number;
  total_usd: number;
  payment_breakdown: PaymentLine[];
  change_nio: number;
  status: 'completed' | 'void' | 'fiado';
  customer_name?: string | null;
  exchange_rate: number;
  items: {
    product_id: string;
    name_snapshot: string;
    qty: number;
    unit_price_nio: number;
    line_total_nio: number;
  }[];
}

export interface CreditAccount {
  id: string;
  business_id: string;
  sale_id?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  amount_nio: number;
  paid_nio: number;
  due_date?: string | null;
  status: 'pending' | 'paid' | 'overdue';
}
