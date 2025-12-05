export interface ProductDetail {
  id: number;
  sku: string;
  name: string;
  image?: string;
  variant?: string;
  location?: string;
  barcode?: string;
}

export interface Product {
  id: number;
  sku: string;
  product_name: string;
  variant: string;
  quantity: number; // Quantity needed
  product?: ProductDetail; // Nested product info with barcode
  picked_qty?: number; // Local state for picker
}

export interface Order {
  id: number;
  order_ginee_id: string;
  processing_status?: string;
  event_status: string;
  channel: string;
  store: string;
  courier: string;
  tracking: string;
  sent_before: string;
  assigned_by?: string;
  assigned_at?: string;
  picked_by?: string;
  picked_at?: string;
  products?: Product[]; // Optional because list view might not have products
  order_details?: Product[]; // Alternative field name from API
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
}
