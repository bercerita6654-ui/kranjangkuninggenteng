import { CartItem, Product } from '../types';

export const parseCSV = (text: string): string[][] => {
  let p = '', row: string[] = [''], ret: string[][] = [row], i = 0, r = 0, s = true;
  for (const l of text) {
    if ('"' === l) {
      if (s && l === p) row[i] += l;
      s = !s;
    } else if (',' === l && s) {
      row[++i] = '';
    } else if ('\n' === l && s) {
      if ('\r' === p) row[i] = row[i].slice(0, -1);
      row = ret[++r] = ['']; 
      i = 0;
    } else {
      row[i] += l;
    }
    p = l;
  }
  return ret.filter(row => row.length > 1 || row[0] !== '');
};

export const formatRupiah = (num: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('id-ID').format(num);
};

export const parsePrice = (priceStr: string | null | undefined): number => {
  if (!priceStr) return 0;
  let str = priceStr.toString().trim();
  // Remove trailing decimals (.00 or ,00) to avoid scaling issues
  str = str.replace(/[,.]\d{1,2}$/, '');
  const cleaned = str.replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
};

export const getFormattedDate = (): string => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  const d = new Date();
  const dayName = days[d.getDay()];
  const date = d.getDate().toString().padStart(2, '0');
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();

  return `${dayName}, ${date} ${monthName} ${year}`;
};

export const getItemPrice = (item: CartItem): number => {
  if (item.priceTier === 'custom') {
    return parseInt(item.customPrice as any) || 0;
  }
  return item.product.harga[item.priceTier] || 0;
};

export const getProductImageUrl = (product: Product | null): string => {
  if (product && product.imageId && product.imageId.trim() !== '' && product.imageId.trim() !== '-') {
    return `https://lh3.googleusercontent.com/d/${product.imageId.trim()}`;
  }
  return `https://placehold.co/600x600/f8fafc/94a3b8?text=${product ? encodeURIComponent(product.sku) : 'No+Image'}`;
};
