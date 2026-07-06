import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingCart, 
  Search, 
  ScanLine, 
  Store, 
  PlusCircle, 
  Trash2, 
  Minus, 
  Plus, 
  PenLine, 
  User, 
  Phone, 
  StickyNote, 
  Save, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle,
  ShoppingBag,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { Product, CartItem, HistoryItem, PriceTier } from './types';
import { parseCSV, formatRupiah, formatNumber, parsePrice, getItemPrice, getProductImageUrl } from './utils/helpers';
import ScannerModal from './components/ScannerModal';
import ThemeDropdown from './components/ThemeDropdown';
import ProductDetailModal from './components/ProductDetailModal';
import CheckoutModal from './components/CheckoutModal';
import HistoryModal from './components/HistoryModal';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRZ3rrdP_F55HFfBMy4huj46G1T_mjoY_LceVAfOBq2PDDDkYe_Dk8XnYBhx0PVkvFHUgTGGvjgOOmn/pub?gid=1878916653&single=true&output=csv';
const IMG_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCxz1GPm7QU9IS1yBiSjvIdNTLUsvvplOCyT_R3XH4O-LuVbHoY_bXn1LTH5lpnlolJ29BhUgEdnFm/pub?gid=1564332470&single=true&output=csv';

const STORAGE_HISTORY_KEY = 'keranjangKuning_history';
const STORAGE_THEME_KEY = 'keranjangKuning_theme';
const STORAGE_CUSTOM_THEME_KEY = 'keranjangKuning_customTheme';

export default function App() {
  // Products and Cart State
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [onlyAvailableStock, setOnlyAvailableStock] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Catalog individual overrides
  const [catalogTiers, setCatalogTiers] = useState<Record<string, PriceTier>>({});
  const [catalogCustomPrices, setCatalogCustomPrices] = useState<Record<string, number>>({});
  const [globalPriceTier, setGlobalPriceTier] = useState<PriceTier>('eceran');

  // Customer Data
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  // Dropdown options
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

  // Themes
  const [activeTheme, setActiveTheme] = useState('yellow');
  const [customThemeColor, setCustomThemeColor] = useState('#facc15');

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeDetailProduct, setActiveDetailProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [pendingStockConfirmProduct, setPendingStockConfirmProduct] = useState<Product | null>(null);

  // App feedback
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Memuat Produk Utama...');
  const [errorText, setErrorText] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // History / Draft state
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);

  // Show Toast Helper
  const showToast = (msg: string, type: 'success' | 'error' = 'error') => {
    setToast({ msg, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // 1. Initial themes & history loading
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
    const savedCustomTheme = localStorage.getItem(STORAGE_CUSTOM_THEME_KEY);
    if (savedCustomTheme) {
      setActiveTheme('custom');
      setCustomThemeColor(savedCustomTheme);
    } else if (savedTheme) {
      setActiveTheme(savedTheme);
    }

    const savedHistory = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (savedHistory) {
      try {
        setHistoryData(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error parsing history data', e);
      }
    }
  }, []);

  // 2. Custom theme applying
  useEffect(() => {
    const root = document.documentElement;
    if (activeTheme === 'custom') {
      root.removeAttribute('data-theme');
      
      let r = parseInt(customThemeColor.slice(1, 3), 16) / 255;
      let g = parseInt(customThemeColor.slice(3, 5), 16) / 255;
      let b = parseInt(customThemeColor.slice(5, 7), 16) / 255;
      let max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      const hslToRgb = (hue: number, sat: number, lit: number) => {
        let rVal, gVal, bVal;
        if (sat === 0) {
          rVal = gVal = bVal = lit;
        } else {
          const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };
          let q = lit < 0.5 ? lit * (1 + sat) : lit + sat - lit * sat;
          let p = 2 * lit - q;
          rVal = hue2rgb(p, q, hue + 1 / 3);
          gVal = hue2rgb(p, q, hue);
          bVal = hue2rgb(p, q, hue - 1 / 3);
        }
        return `${Math.round(rVal * 255)} ${Math.round(gVal * 255)} ${Math.round(bVal * 255)}`;
      };

      const shadesMap: Record<number, number> = {
        50: 0.96,
        100: 0.90,
        200: 0.80,
        300: 0.70,
        400: 0.60,
        500: l,
        600: Math.max(0, l - 0.1),
        700: Math.max(0, l - 0.2),
        800: Math.max(0, l - 0.3),
        900: Math.max(0, l - 0.4),
      };

      Object.keys(shadesMap).forEach((shade) => {
        root.style.setProperty(`--theme-${shade}`, hslToRgb(h, s, shadesMap[Number(shade)]));
      });
    } else {
      root.removeAttribute('style');
      root.setAttribute('data-theme', activeTheme);
    }
  }, [activeTheme, customThemeColor]);

  // Load / Refresh Products Data
  const loadProductData = async (isRefresh = false) => {
    setIsLoading(true);
    setLoadingText(isRefresh ? 'Memperbarui Data...' : 'Memuat Produk Utama...');
    setErrorText(null);

    try {
      // 1. Fetch main "Stock List" CSV sheet first
      const mainRes = await fetch(`${CSV_URL}&t=${new Date().getTime()}`);
      if (!mainRes.ok) throw new Error('Gagal mengambil data produk utama.');
      const mainText = await mainRes.text();
      const parsed = parseCSV(mainText);

      if (parsed.length > 0) {
        const categoriesSet = new Set<string>();
        const brandsSet = new Set<string>();

        const mappedProducts: Product[] = parsed.slice(1).map((row, idx) => {
          const skuValue = row[0] ? row[0].toString().trim() : '-';
          const barcodeValue = row[1] ? row[1].toString().trim() : '-';
          const namaValue = row[2] ? row[2].toString().trim() : '-';
          const unitValue = row[3] ? row[3].toString().trim() : '-';
          const kategoriValue = row[4] ? row[4].toString().trim() : '-';
          const merkValue = row[6] ? row[6].toString().trim() : '-';
          const eceranPrice = parsePrice(row[10]);
          const stokValue = parseInt(row[12]) || 0;

          if (kategoriValue && kategoriValue !== '-') {
            categoriesSet.add(kategoriValue);
          }
          if (merkValue && merkValue !== '-') {
            brandsSet.add(merkValue);
          }

          return {
            id: skuValue !== '-' ? skuValue : `PROD-${idx}`,
            nama: namaValue,
            sku: skuValue,
            barcode: barcodeValue,
            kategori: kategoriValue,
            merk: merkValue,
            imageId: null,
            unit: unitValue,
            stok: { toko: stokValue },
            harga: {
              hpp: 0,
              eceran: eceranPrice,
              grosir: eceranPrice, // default to eceran as fallback
              partai: eceranPrice, // default to eceran as fallback
            },
          };
        }).filter(p => p.nama !== '-');

        setProducts(mappedProducts);
        setAvailableCategories(Array.from(categoriesSet).sort());
        setAvailableBrands(Array.from(brandsSet).sort());
        setIsLoading(false);

        if (isRefresh) {
          showToast('Data produk berhasil diperbarui!', 'success');
        }

        // 2. Fetch images in the background based on CSV "STOCK LIST" Column 22
        fetch(`${IMG_CSV_URL}&t=${new Date().getTime()}`)
          .then(async (imgRes) => {
            if (!imgRes.ok) throw new Error('Gagal mengambil data gambar.');
            const imgText = await imgRes.text();
            const imgParsed = parseCSV(imgText);

            const imgMap: Record<string, string> = {};
            if (imgParsed.length > 0) {
              for (let i = 1; i < imgParsed.length; i++) {
                const row = imgParsed[i];
                const sku = row[0] ? row[0].toString().trim().toUpperCase() : null;
                if (sku) {
                  let imageVal = row[21] ? row[21].toString().trim() : '';
                  if (!imageVal || imageVal === '-') {
                    const match = row.join(' ').match(/[-\w]{25,}/);
                    if (match) imageVal = match[0];
                  } else {
                    const match = imageVal.match(/[-\w]{25,}/);
                    if (match) imageVal = match[0];
                  }
                  if (imageVal) imgMap[sku] = imageVal;
                }
              }
            }

            // Enrich products state
            setProducts((prev) =>
              prev.map((p) => {
                const skuKey = p.sku.toUpperCase();
                const imageId = imgMap[skuKey] || null;
                return {
                  ...p,
                  imageId,
                };
              })
            );
          })
          .catch((err) => console.error('Gagal memuat data gambar di background:', err));
      }
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Terjadi kesalahan saat memproses data.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProductData();
  }, []);

  // Filter & Search Logic
  const filteredProducts = useMemo(() => {
    const queryWords = searchTerm.toLowerCase().trim().split(/\s+/).filter((w) => w.length > 0);
    return products.filter((p) => {
      let matchSearch = true;
      if (queryWords.length > 0) {
        matchSearch = queryWords.every(
          (word) =>
            p.nama.toLowerCase().includes(word) ||
            p.sku.toLowerCase().includes(word) ||
            p.barcode.toLowerCase().includes(word)
        );
      }
      const matchCategory = selectedCategory === '' || p.kategori === selectedCategory;
      const matchBrand = selectedBrand === '' || p.merk === selectedBrand;
      const matchStock = !onlyAvailableStock || (p.stok && p.stok.toko > 0);
      return matchSearch && matchCategory && matchBrand && matchStock;
    });
  }, [products, searchTerm, selectedCategory, selectedBrand, onlyAvailableStock]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedBrand, onlyAvailableStock, itemsPerPage]);

  // Cart Management
  const addToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const existing = cart.find((item) => item.product.id === productId);
    const activeTier = catalogTiers[productId] || globalPriceTier;
    let customPrice = catalogCustomPrices[productId];

    if (customPrice === undefined) {
      customPrice = product.harga[activeTier] || product.harga.eceran || 0;
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === productId ? { ...item, qty: item.qty + 1 } : item
        )
      );
    } else {
      setCart([...cart, { product, qty: 1, priceTier: activeTier, customPrice, note: '' }]);
    }
  };

  const handleAddToCartAttempt = (product: Product) => {
    if (product.stok.toko <= 0) {
      setPendingStockConfirmProduct(product);
    } else {
      addToCart(product.id);
      showToast(`Ditambahkan ke keranjang: ${product.nama}`, 'success');
    }
  };

  const updateCartQty = (productId: string, delta: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    const newQty = item.qty + delta;
    if (newQty > 0) {
      setCart(cart.map((i) => (i.product.id === productId ? { ...i, qty: newQty } : i)));
    } else {
      setCart(cart.filter((i) => i.product.id !== productId));
    }
  };

  const updateCartQtyManual = (productId: string, value: string) => {
    const qty = parseInt(value, 10);
    if (isNaN(qty) || qty <= 0) {
      setCart(cart.filter((i) => i.product.id !== productId));
    } else {
      setCart(cart.map((i) => (i.product.id === productId ? { ...i, qty } : i)));
    }
  };

  const updateCartPriceTier = (productId: string, newTier: PriceTier) => {
    setCart(
      cart.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            priceTier: newTier,
            customPrice: newTier === 'custom' && !item.customPrice ? item.product.harga.eceran : item.customPrice,
          };
        }
        return item;
      })
    );
  };

  const updateCustomPrice = (productId: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setCart(cart.map((item) => (item.product.id === productId ? { ...item, customPrice: num } : item)));
  };

  const updateCartItemNote = (productId: string, note: string) => {
    setCart(cart.map((item) => (item.product.id === productId ? { ...item, note } : item)));
  };

  // Catalog Individual Price Dropdowns
  const updateCatalogPriceTier = (productId: string, newTier: PriceTier) => {
    const inCart = cart.some((i) => i.product.id === productId);
    if (inCart) {
      updateCartPriceTier(productId, newTier);
    } else {
      setCatalogTiers((prev) => ({ ...prev, [productId]: newTier }));
      if (newTier === 'custom' && !catalogCustomPrices[productId]) {
        const prod = products.find((p) => p.id === productId);
        if (prod) {
          setCatalogCustomPrices((prev) => ({ ...prev, [productId]: prod.harga.eceran || 0 }));
        }
      }
    }
  };

  const updateCatalogCustomPrice = (productId: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    const inCart = cart.some((i) => i.product.id === productId);
    if (inCart) {
      updateCustomPrice(productId, val);
    } else {
      setCatalogCustomPrices((prev) => ({ ...prev, [productId]: num }));
    }
  };

  // Load history item back to cart
  const handleLoadHistoryItem = (id: string) => {
    const item = historyData.find((h) => h.id === id);
    if (item) {
      setCustomerName(item.customerName !== 'Tanpa Nama' ? item.customerName : '');
      setCustomerPhone(item.customerPhone || '');
      setCustomerNote(item.customerNote || '');
      setCart(item.cart);
      setIsHistoryOpen(false);
      showToast('Data berhasil dimuat kembali ke keranjang!', 'success');
    }
  };

  // Delete History Item
  const handleDeleteHistoryItem = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      const updated = historyData.filter((h) => h.id !== id);
      setHistoryData(updated);
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));
    }
  };

  // Save draft / completion helper
  const handleSaveToHistory = (isDraft = false) => {
    if (cart.length === 0) return;
    const name = customerName.trim() || 'Tanpa Nama';
    const total = cart.reduce((sum, item) => sum + getItemPrice(item) * item.qty, 0);

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      isDraft,
      customerName: name,
      customerPhone,
      customerNote,
      cart,
      total,
    };

    const updated = [newItem, ...historyData];
    setHistoryData(updated);
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));

    if (isDraft) {
      showToast('Berhasil menyimpan keranjang sebagai Draft!', 'success');
    }
  };

  // Totals
  const totalQty = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + getItemPrice(item) * item.qty, 0), [cart]);

  return (
    <div className="bg-[#f8fafc] text-gray-800 font-sans min-h-screen pb-32 lg:pb-8 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 animate-fade-in">
          <div
            className={`px-5 py-3.5 rounded-full shadow-xl flex items-center gap-2.5 font-bold text-sm ${
              toast.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-red-500 text-white shadow-red-500/20'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-xs z-[9999] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 border-t-primary-500"></div>
            <p className="text-primary-700 font-semibold animate-pulse">{loadingText}</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {errorText && (
        <div className="fixed inset-0 bg-gray-50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl shadow-lg max-w-md w-full text-center">
            <AlertTriangle className="mx-auto w-12 h-12 mb-3 text-red-500" />
            <h2 className="font-bold text-lg mb-2">Terjadi Kesalahan</h2>
            <p className="text-sm">{errorText}</p>
            <button
              onClick={() => loadProductData()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-xs sticky top-0 z-[9000] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary-400 p-2 rounded-xl">
              <ShoppingCart className="text-primary-900 w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold text-gray-800 tracking-tight hidden sm:block">
              Keranjang Kuning
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeDropdown
              currentTheme={activeTheme}
              customColor={customThemeColor}
              onThemeChange={(theme) => {
                setActiveTheme(theme);
                localStorage.setItem(STORAGE_THEME_KEY, theme);
                localStorage.removeItem(STORAGE_CUSTOM_THEME_KEY);
              }}
              onCustomColorChange={(color) => {
                setActiveTheme('custom');
                setCustomThemeColor(color);
                localStorage.setItem(STORAGE_CUSTOM_THEME_KEY, color);
                localStorage.removeItem(STORAGE_THEME_KEY);
              }}
            />

            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1.5 font-bold bg-white text-gray-700 px-3 py-1.5 rounded-full shadow-xs border border-gray-200 hover:bg-gray-50 transition-colors active-tap cursor-pointer"
            >
              <HistoryModalPropsIcon className="w-4 h-4 text-primary-500" />
              <span className="hidden sm:inline text-sm">Riwayat</span>
            </button>

            <div className="flex items-center gap-1.5 font-bold bg-primary-100 px-3 sm:px-4 py-1.5 rounded-full text-primary-800">
              <span>{totalQty}</span> <span className="text-sm font-medium">Items</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 relative">
        {/* Left Col: Products, Filters & Customer Info */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          
          {/* Customer Info Card */}
          <div className="bg-white p-5 lg:p-6 rounded-2xl shadow-xs border border-gray-100">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-gray-800">
              <div className="bg-primary-100 text-primary-600 p-1.5 rounded-lg">
                <User className="w-5 h-5" />
              </div>
              Data Pelanggan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                  Nama Customer <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-primary-500 transition-colors">
                    <User className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium"
                    placeholder="Nama Lengkap Pemesan"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                  No. WhatsApp <span className="text-gray-400 font-normal">(Opsional)</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-primary-500 transition-colors">
                    <Phone className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium"
                    placeholder="Contoh: 08123456789"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Search, Filter and Product List */}
          <div className="bg-white p-5 lg:p-6 rounded-2xl shadow-xs border border-gray-100 flex-1">
            <div className="flex flex-col mb-6 gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <div className="bg-primary-100 text-primary-600 p-1.5 rounded-lg">
                    <Store className="w-5 h-5" />
                  </div>
                  Daftar Produk
                </h2>
                <button
                  onClick={() => loadProductData(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors border border-primary-200 shadow-xs active-tap cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Refresh Data</span>
                </button>
              </div>

              <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-gray-50/50 text-sm transition-all"
                      placeholder="Cari nama produk / SKU / Barcode..."
                    />
                  </div>
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="active-tap p-2.5 bg-primary-100 text-primary-600 hover:bg-primary-200 rounded-xl transition-colors flex-shrink-0 shadow-xs border border-primary-200 h-full aspect-square flex items-center justify-center cursor-pointer"
                    title="Scan Barcode"
                  >
                    <ScanLine className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-2 flex-col sm:flex-row w-full xl:w-auto">
                  {/* Global Price Dropdown */}
                  <select
                    value={globalPriceTier}
                    onChange={(e) => {
                      const tier = e.target.value as PriceTier;
                      setGlobalPriceTier(tier);
                      setCatalogTiers({}); // Clear overrides when global changes
                    }}
                    className="w-full sm:w-auto text-sm border border-gray-200 rounded-xl py-2.5 px-3 bg-white text-primary-700 font-bold focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors cursor-pointer outline-none shadow-xs"
                  >
                    <option value="eceran">Semua: Eceran</option>
                    <option value="grosir">Semua: Grosir</option>
                    <option value="partai">Semua: Partai</option>
                  </select>

                  {availableCategories.length > 0 && (
                    <div className="relative w-full sm:w-36 flex-shrink-0">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-xl py-2.5 px-3 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors cursor-pointer outline-none shadow-xs"
                      >
                        <option value="">Semua Kategori</option>
                        {availableCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {availableBrands.length > 0 && (
                    <div className="relative w-full sm:w-36 flex-shrink-0">
                      <select
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-xl py-2.5 px-3 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors cursor-pointer outline-none shadow-xs"
                      >
                        <option value="">Semua Merk</option>
                        {availableBrands.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Stock Filter Checklist & Product Count */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500 font-medium">
                  Menampilkan <span className="font-bold text-gray-800">{filteredProducts.length}</span> produk
                </div>
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-800 cursor-pointer select-none transition-colors group">
                    <input
                      type="radio"
                      name="stockFilter"
                      checked={!onlyAvailableStock}
                      onChange={() => setOnlyAvailableStock(false)}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 cursor-pointer accent-primary-500"
                    />
                    <span className="group-hover:text-primary-600 transition-colors">Semua Produk</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-800 cursor-pointer select-none transition-colors group">
                    <input
                      type="radio"
                      name="stockFilter"
                      checked={onlyAvailableStock}
                      onChange={() => setOnlyAvailableStock(true)}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 cursor-pointer accent-primary-500"
                    />
                    <span className="flex items-center gap-1.5 group-hover:text-primary-600 transition-colors">
                      <span>Stok Tersedia Saja</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                        Ready
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Product List */}
            <div className="flex flex-col gap-4">
              {paginatedProducts.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <Store className="w-16 h-16 mb-3 text-gray-300" />
                  <p className="font-medium">Produk tidak ditemukan.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5">
                  {paginatedProducts.map((product) => {
                    const cartItem = cart.find((item) => item.product.id === product.id);
                    const isInCart = !!cartItem;
                    const activeTier = isInCart ? cartItem.priceTier : (catalogTiers[product.id] || globalPriceTier);
                    const activeCustomPrice = isInCart ? cartItem.customPrice : (catalogCustomPrices[product.id] || 0);

                    const isOutOfStock = product.stok.toko <= 0;
                    const stockClass = isOutOfStock
                      ? 'text-rose-600 bg-rose-50 border-rose-100'
                      : 'text-emerald-600 bg-emerald-50 border-emerald-100';

                    return (
                      <div
                        key={product.id}
                        className="border border-gray-100 bg-white rounded-2xl flex flex-col justify-between overflow-hidden hover:shadow-xl transition-all duration-300 group relative focus-within:ring-2 focus-within:ring-primary-400/50"
                      >
                        {/* Image Container with Badges */}
                        <div 
                          onClick={() => {
                            setActiveDetailProduct(product);
                            setIsDetailOpen(true);
                          }}
                          className="bg-gray-50/80 aspect-square w-full relative flex items-center justify-center border-b border-gray-100 cursor-pointer overflow-hidden group-hover:bg-gray-50 transition-colors p-3"
                          title="Klik untuk lihat rincian & foto produk"
                        >
                          <img
                            src={getProductImageUrl(product)}
                            alt={product.nama}
                            loading="lazy"
                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/300x300/f8fafc/94a3b8?text=${encodeURIComponent(product.sku)}`;
                            }}
                          />
                          
                          {/* Stock Floating Badge */}
                          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                            <span className={`text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg shadow-xs border ${stockClass} flex items-center gap-1`}>
                              {isOutOfStock ? 'Habis' : `Stok: ${product.stok.toko}`}
                            </span>
                          </div>

                          {/* Zoom Icon on Hover */}
                          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-white/90 p-2 rounded-full shadow-md text-gray-700">
                              <ImageIcon className="w-4.5 h-4.5" />
                            </div>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-2.5">
                          <div>
                            {/* SKU & Brand */}
                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                              <span className="text-[9px] font-extrabold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-md tracking-wider border border-primary-100/50">
                                {product.sku}
                              </span>
                              {product.merk && product.merk !== '-' && (
                                <span className="text-[9px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100 max-w-[80px] truncate" title={product.merk}>
                                  {product.merk}
                                </span>
                              )}
                            </div>

                            {/* Product Name (Fully Visible, not cut off!) */}
                            <h3
                              onClick={() => {
                                setActiveDetailProduct(product);
                                setIsDetailOpen(true);
                              }}
                              className="font-bold text-gray-800 text-xs sm:text-sm leading-snug hover:text-primary-600 cursor-pointer hover:underline transition-colors break-words"
                            >
                              {product.nama}
                            </h3>
                          </div>

                          {/* Price selector & Cart Button Area */}
                          <div className="mt-auto pt-2 border-t border-gray-50 flex flex-col gap-2">
                            {/* Compact Select Dropdown */}
                            <div className="relative">
                              <select
                                value={activeTier}
                                onChange={(e) => updateCatalogPriceTier(product.id, e.target.value as PriceTier)}
                                className="w-full text-[11px] font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg py-1.5 pl-2 pr-6 cursor-pointer outline-none focus:ring-2 focus:ring-primary-400 transition-colors appearance-none"
                              >
                                <option value="eceran">Eceran: {formatRupiah(product.harga.eceran)}</option>
                                <option value="grosir">Grosir: {formatRupiah(product.harga.grosir)}</option>
                                <option value="partai">Partai: {formatRupiah(product.harga.partai)}</option>
                                <option value="custom">Custom</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                              </div>
                            </div>

                            {/* Custom Price Field if activeTier is custom */}
                            {activeTier === 'custom' && (
                              <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-400 shadow-xs">
                                <span className="bg-gray-100 text-gray-500 px-1.5 py-1 text-[10px] font-bold border-r border-gray-300">
                                  Rp
                                </span>
                                <input
                                  type="number"
                                  value={activeCustomPrice || ''}
                                  onChange={(e) => updateCatalogCustomPrice(product.id, e.target.value)}
                                  className="w-full px-1.5 py-1 text-[11px] font-bold text-gray-800 outline-none"
                                  placeholder="0"
                                />
                              </div>
                            )}

                            {/* Active price display to make it clear */}
                            <div className="mt-0.5 flex flex-wrap items-baseline gap-0.5">
                              <span className="text-[13px] sm:text-sm font-black text-primary-700 whitespace-nowrap">
                                {activeTier === 'custom' 
                                  ? formatRupiah(activeCustomPrice) 
                                  : formatRupiah(product.harga[activeTier])}
                                <span className="text-[10px] sm:text-[11px] text-gray-500 font-bold">/{product.unit}</span>
                              </span>
                            </div>

                            {/* Cart Action Buttons */}
                            <div className="mt-1">
                              {isInCart ? (
                                <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-xl p-0.5 shadow-xs">
                                  <button
                                    onClick={() => updateCartQty(product.id, -1)}
                                    className={`active-tap w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-lg shadow-xs border ${
                                      cartItem.qty === 1
                                        ? 'text-red-500 hover:bg-red-50 border-red-100'
                                        : 'text-primary-600 hover:bg-primary-100 border-primary-100'
                                    } cursor-pointer`}
                                  >
                                    {cartItem.qty === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                  </button>
                                  <div className="flex flex-col items-center justify-center">
                                    <input
                                      type="number"
                                      value={cartItem.qty}
                                      onChange={(e) => updateCartQtyManual(product.id, e.target.value)}
                                      className="text-xs font-black w-8 text-center bg-transparent outline-none text-primary-800 focus:bg-white focus:ring-1 focus:ring-primary-400 rounded-md transition-all"
                                      min="0"
                                    />
                                  </div>
                                  <button
                                    onClick={() => updateCartQty(product.id, 1)}
                                    className="active-tap w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-lg text-primary-600 hover:bg-primary-100 shadow-xs border border-primary-100 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleAddToCartAttempt(product)}
                                  className={`active-tap w-full py-2 ${
                                    isOutOfStock 
                                      ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200' 
                                      : 'bg-primary-400 hover:bg-primary-500 text-primary-900 font-extrabold shadow-xs shadow-primary-200'
                                  } rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer`}
                                >
                                  <PlusCircle className="w-3.5 h-3.5" /> <span>{isOutOfStock ? 'Beli (Stok Kosong)' : 'Beli'}</span>
                                </button>
                              )}
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 0 && (
              <div className="mt-8 border-t border-gray-100 pt-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">Tampilkan:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="border border-gray-200 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white font-medium shadow-xs"
                  >
                    <option value="20">20 / Hal</option>
                    <option value="50">50 / Hal</option>
                    <option value="100">100 / Hal</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage((prev) => Math.max(1, prev - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-2 rounded-lg text-gray-600 disabled:opacity-30 hover:bg-white hover:shadow-xs transition-all active-tap cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-bold text-gray-700 px-3">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-2 rounded-lg text-gray-600 disabled:opacity-30 hover:bg-white hover:shadow-xs transition-all active-tap cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Desktop Cart */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs sticky top-24 max-h-[calc(100vh-6.5rem)] flex flex-col">
            <div className="p-4 lg:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <div className="bg-primary-100 text-primary-600 p-1.5 rounded-lg">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                Rincian Pesanan
              </h2>
              {totalQty > 0 && (
                <span className="bg-primary-400 text-primary-900 text-xs font-bold px-2 py-1 rounded-md">
                  {totalQty} Barang
                </span>
              )}
            </div>

            <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-gray-400 flex flex-col items-center justify-center h-full">
                  <div className="bg-gray-50 p-4 rounded-full mb-3">
                    <ShoppingCart className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium">Keranjang masih kosong</p>
                  <p className="text-xs mt-1 text-gray-400">Silakan tambah produk dulu</p>
                </div>
              ) : (
                cart.map((item) => {
                  const price = getItemPrice(item);
                  const subtotal = price * item.qty;
                  return (
                    <div
                      key={item.product.id}
                      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] relative animate-fade-in"
                    >
                      <button
                        onClick={() => setCart(cart.filter((i) => i.product.id !== item.product.id))}
                        className="absolute top-3 right-3 text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors active-tap cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <h4 className="font-bold text-sm text-gray-800 pr-8 leading-snug mb-1">
                        {item.product.nama}
                      </h4>
                      {item.product.stok.toko <= 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md mb-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          Stok Kosong
                        </span>
                      )}

                      <div className="flex flex-col gap-3 mt-2">
                        <div className="flex-1 w-full space-y-2">
                          <select
                            value={item.priceTier}
                            onChange={(e) => updateCartPriceTier(item.product.id, e.target.value as PriceTier)}
                            className="w-full text-xs font-semibold border border-gray-200 rounded-lg py-2 px-2.5 bg-gray-50 text-gray-700 cursor-pointer focus:ring-2 focus:ring-primary-400 outline-none"
                          >
                            <option value="eceran">Harga Eceran ({formatRupiah(item.product.harga.eceran)})</option>
                            <option value="grosir">Harga Grosir ({formatRupiah(item.product.harga.grosir)})</option>
                            <option value="partai">Harga Partai ({formatRupiah(item.product.harga.partai)})</option>
                            <option value="custom">Harga Custom</option>
                          </select>

                          {item.priceTier === 'custom' && (
                            <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-400 shadow-xs">
                              <span className="bg-gray-100 text-gray-500 px-3 py-1.5 text-xs font-bold border-r border-gray-300">
                                Rp
                              </span>
                              <input
                                type="number"
                                value={item.customPrice || ''}
                                onChange={(e) => updateCustomPrice(item.product.id, e.target.value)}
                                className="w-full px-2 py-1.5 text-sm font-bold text-gray-800 outline-none"
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="text-sm font-black text-primary-600">{formatRupiah(subtotal)}</div>
                          <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200 shadow-inner">
                            <button
                              onClick={() => updateCartQty(item.product.id, -1)}
                              className={`active-tap w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-xs border ${
                                item.qty === 1
                                  ? 'text-red-500 hover:bg-red-50 border-red-100'
                                  : 'text-gray-600 hover:text-gray-900 border-gray-200/50'
                              } cursor-pointer`}
                            >
                              {item.qty === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                            </button>
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => updateCartQtyManual(item.product.id, e.target.value)}
                              className="text-sm font-bold w-12 text-center bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-primary-400 rounded-md py-1 transition-all"
                              min="0"
                            />
                            <button
                              onClick={() => updateCartQty(item.product.id, 1)}
                              className="active-tap w-8 h-8 flex items-center justify-center bg-white rounded-lg text-gray-600 hover:text-gray-900 shadow-xs border border-gray-200/50 cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 bg-primary-50/50 border border-primary-100 rounded-lg p-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-primary-400 focus-within:border-primary-400 transition-all">
                        <PenLine className="w-4 h-4 text-primary-500" />
                        <input
                          type="text"
                          value={item.note || ''}
                          onChange={(e) => updateCartItemNote(item.product.id, e.target.value)}
                          className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder-gray-400"
                          placeholder="Catatan khusus item ini (opsional)..."
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50/80 rounded-b-2xl">
              <div className="flex flex-col gap-1 mb-4">
                <span className="text-sm font-semibold text-gray-500">Total Pembayaran</span>
                <span className="text-2xl font-black text-gray-800 tracking-tight">{formatRupiah(cartTotal)}</span>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Catatan Umum Pesanan <span className="font-normal normal-case">(Opsional)</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-primary-500 transition-colors">
                    <StickyNote className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium bg-white"
                    placeholder="Contoh: Kirim sebelum jam 4 sore"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  disabled={cart.length === 0}
                  onClick={() => handleSaveToHistory(true)}
                  className={`active-tap w-1/3 py-3.5 rounded-xl font-bold text-sm flex justify-center items-center gap-1.5 transition-all border ${
                    cart.length === 0
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-primary-50 hover:bg-primary-100 text-primary-700 border-primary-200 cursor-pointer'
                  }`}
                >
                  <Save className="w-4 h-4" /> Draft
                </button>
                <button
                  disabled={cart.length === 0}
                  onClick={() => {
                    if (!customerName.trim()) {
                      showToast('Mohon isi Nama Customer terlebih dahulu!', 'error');
                      return;
                    }
                    setIsCheckoutOpen(true);
                  }}
                  className={`active-tap w-2/3 py-3.5 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all ${
                    cart.length === 0
                      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      : 'bg-primary-400 hover:bg-primary-500 text-primary-900 shadow-lg shadow-primary-400/30 cursor-pointer'
                  }`}
                >
                  Checkout Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Mobile Cart Bar (Hidden on Desktop) */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] p-4 lg:hidden z-30 transform transition-transform duration-300 ease-in-out ${
          totalQty > 0 ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-between items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-500">Total Belanja</span>
            <span className="text-lg font-black text-gray-800">{formatRupiah(cartTotal)}</span>
          </div>
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="active-tap bg-primary-400 text-primary-900 px-6 py-3 rounded-xl font-bold shadow-xs flex items-center gap-2.5 cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5" />
            Lihat Keranjang
            <span className="bg-white text-primary-900 rounded-md px-2 py-0.5 text-xs">{totalQty}</span>
          </button>
        </div>
      </div>

      {/* Mobile Cart Modal Overlay */}
      {isMobileCartOpen && (
        <div
          onClick={(e) => e.target === e.currentTarget && setIsMobileCartOpen(false)}
          className="fixed inset-0 z-[120] bg-gray-900/60 p-4 flex items-center justify-center animate-fade-in lg:hidden"
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col transform scale-100 transition-transform duration-300">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <div className="bg-primary-100 text-primary-600 p-1.5 rounded-lg">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                Rincian Pesanan
              </h2>
              <div className="flex items-center gap-3">
                <span className="bg-primary-400 text-primary-900 text-xs font-bold px-2 py-1 rounded-md">
                  {totalQty} Barang
                </span>
                <button
                  onClick={() => setIsMobileCartOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 bg-white rounded-full border border-gray-200 shadow-xs active-tap cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-white custom-scrollbar space-y-4">
              {cart.map((item) => {
                const price = getItemPrice(item);
                const subtotal = price * item.qty;
                return (
                  <div
                    key={item.product.id}
                    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] relative animate-fade-in"
                  >
                    <button
                      onClick={() => setCart(cart.filter((i) => i.product.id !== item.product.id))}
                      className="absolute top-3 right-3 text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors active-tap cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <h4 className="font-bold text-sm text-gray-800 pr-8 leading-snug mb-1">
                      {item.product.nama}
                    </h4>
                    {item.product.stok.toko <= 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        Stok Kosong
                      </span>
                    )}

                    <div className="flex flex-col gap-3 mt-2">
                      <div className="flex-1 w-full space-y-2">
                        <select
                          value={item.priceTier}
                          onChange={(e) => updateCartPriceTier(item.product.id, e.target.value as PriceTier)}
                          className="w-full text-xs font-semibold border border-gray-200 rounded-lg py-2 px-2.5 bg-gray-50 text-gray-700 cursor-pointer focus:ring-2 focus:ring-primary-400 outline-none"
                        >
                          <option value="eceran">Harga Eceran ({formatRupiah(item.product.harga.eceran)})</option>
                          <option value="grosir">Harga Grosir ({formatRupiah(item.product.harga.grosir)})</option>
                          <option value="partai">Harga Partai ({formatRupiah(item.product.harga.partai)})</option>
                          <option value="custom">Harga Custom</option>
                        </select>

                        {item.priceTier === 'custom' && (
                          <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-400 shadow-xs">
                            <span className="bg-gray-100 text-gray-500 px-3 py-1.5 text-xs font-bold border-r border-gray-300">
                              Rp
                            </span>
                            <input
                              type="number"
                              value={item.customPrice || ''}
                              onChange={(e) => updateCustomPrice(item.product.id, e.target.value)}
                              className="w-full px-2 py-1.5 text-sm font-bold text-gray-800 outline-none"
                              placeholder="0"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm font-black text-primary-600">{formatRupiah(subtotal)}</div>
                        <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200 shadow-inner">
                          <button
                            onClick={() => updateCartQty(item.product.id, -1)}
                            className="active-tap w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-xs border text-gray-600 hover:text-gray-900 cursor-pointer"
                          >
                            {item.qty === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                          </button>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateCartQtyManual(item.product.id, e.target.value)}
                            className="text-sm font-bold w-12 text-center bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-primary-400 rounded-md py-1 transition-all"
                            min="0"
                          />
                          <button
                            onClick={() => updateCartQty(item.product.id, 1)}
                            className="active-tap w-8 h-8 flex items-center justify-center bg-white rounded-lg text-gray-600 hover:text-gray-900 shadow-xs border border-gray-200/50 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 bg-primary-50/50 border border-primary-100 rounded-lg p-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-primary-400 focus-within:border-primary-400 transition-all">
                      <PenLine className="w-4 h-4 text-primary-500" />
                      <input
                        type="text"
                        value={item.note || ''}
                        onChange={(e) => updateCartItemNote(item.product.id, e.target.value)}
                        className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder-gray-400"
                        placeholder="Catatan khusus item ini (opsional)..."
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50/80 rounded-b-3xl">
              <div className="flex flex-col gap-1 mb-4">
                <span className="text-sm font-semibold text-gray-500">Total Pembayaran</span>
                <span className="text-2xl font-black text-gray-800 tracking-tight">{formatRupiah(cartTotal)}</span>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Catatan Umum Pesanan <span className="font-normal normal-case">(Opsional)</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-primary-500 transition-colors">
                    <StickyNote className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all text-sm font-medium bg-white"
                    placeholder="Contoh: Kirim sebelum jam 4 sore"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleSaveToHistory(true);
                    setIsMobileCartOpen(false);
                  }}
                  className="active-tap w-1/3 py-3.5 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 rounded-xl font-bold text-sm flex justify-center items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Draft
                </button>
                <button
                  onClick={() => {
                    if (!customerName.trim()) {
                      showToast('Mohon isi Nama Customer terlebih dahulu!', 'error');
                      return;
                    }
                    setIsMobileCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="active-tap w-2/3 py-3.5 bg-primary-400 hover:bg-primary-500 text-primary-900 font-bold rounded-xl flex justify-center items-center gap-2 cursor-pointer"
                >
                  Checkout Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(decodedText) => {
          setSearchTerm(decodedText);
          showToast('Barcode berhasil dipindai!', 'success');
        }}
        showToast={showToast}
      />

      <ProductDetailModal
        product={activeDetailProduct}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setActiveDetailProduct(null);
        }}
        onAddToCart={(id) => {
          const prod = products.find((p) => p.id === id);
          if (prod) {
            handleAddToCartAttempt(prod);
          }
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        customerName={customerName}
        customerPhone={customerPhone}
        customerNote={customerNote}
        cart={cart}
        onSaveCompleted={() => {
          handleSaveToHistory(false);
          setCart([]); // Reset cart after completion
        }}
        showToast={showToast}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyData={historyData}
        onLoadItem={handleLoadHistoryItem}
        onDeleteItem={handleDeleteHistoryItem}
      />

      {/* Stock Warning Confirmation Modal */}
      {pendingStockConfirmProduct && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 p-4 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-gray-100 transform scale-100 transition-all">
            <div className="flex flex-col items-center text-center">
              {/* Alert Icon */}
              <div className="bg-amber-100 text-amber-600 p-4 rounded-full mb-4 animate-pulse">
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <h3 className="text-lg font-black text-gray-800 leading-snug">
                Stok Sedang Kosong!
              </h3>
              
              <p className="text-sm text-gray-500 mt-2 font-medium">
                Produk <span className="font-extrabold text-gray-800">"{pendingStockConfirmProduct.nama}"</span> saat ini memiliki <span className="text-rose-600 font-bold">stok toko 0</span>.
              </p>
              
              <p className="text-xs text-gray-400 mt-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100 w-full">
                Apakah Anda ingin tetap menambahkan produk ini ke dalam keranjang belanja?
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setPendingStockConfirmProduct(null)}
                className="active-tap flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-sm transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  addToCart(pendingStockConfirmProduct.id);
                  showToast(`Ditambahkan ke keranjang: ${pendingStockConfirmProduct.nama}`, 'success');
                  setPendingStockConfirmProduct(null);
                }}
                className="active-tap flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                Tetap Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline fallback for the icon because Lucide changes
function HistoryModalPropsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
