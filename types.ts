export interface Product {
  id: string;
  nama: string;
  sku: string;
  barcode: string;
  kategori: string;
  merk: string;
  imageId: string | null;
  unit: string;
  stok: {
    toko: number;
  };
  harga: {
    hpp: number;
    eceran: number;
    grosir: number;
    partai: number;
  };
}

export type PriceTier = 'eceran' | 'grosir' | 'partai' | 'custom';

export interface CartItem {
  product: Product;
  qty: number;
  priceTier: PriceTier;
  customPrice: number;
  note: string;
}

export interface HistoryItem {
  id: string;
  date: string; // ISO String
  isDraft: boolean;
  customerName: string;
  customerPhone: string;
  customerNote: string;
  cart: CartItem[];
  total: number;
}
