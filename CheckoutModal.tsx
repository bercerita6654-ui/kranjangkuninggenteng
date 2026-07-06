import { useState } from 'react';
import { CheckCircle, Check, User, Phone, StickyNote, FileSpreadsheet, Copy, X } from 'lucide-react';
import { CartItem } from '../types';
import { formatRupiah, formatNumber, getFormattedDate, getItemPrice } from '../utils/helpers';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone: string;
  customerNote: string;
  cart: CartItem[];
  onSaveCompleted: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  customerNote,
  cart,
  onSaveCompleted,
  showToast,
}: CheckoutModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const cartTotal = cart.reduce((sum, item) => sum + getItemPrice(item) * item.qty, 0);
  const totalSKU = cart.length;

  const handleDownloadExcel = () => {
    let csvContent = 'SKU,Nama Produk,Unit,Qty,Harga,Total,Catatan\n';

    cart.forEach((item) => {
      const price = getItemPrice(item);
      const total = price * item.qty;
      const safeName = `"${item.product.nama.replace(/"/g, '""')}"`;
      const safeNote = item.note ? `"${item.note.replace(/"/g, '""')}"` : '""';
      csvContent += `"${item.product.sku}",${safeName},"${item.product.unit}",${item.qty},${price},${total},${safeNote}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Pesanan_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File CSV pesanan berhasil diunduh!', 'success');
  };

  const handleCopyAndSave = async () => {
    let orderText = `${getFormattedDate()}\n\n`;
    orderText += `Nama Customer : ${customerName}\n\n`;
    orderText += `List Orderan :\n`;

    cart.forEach((item, index) => {
      const price = getItemPrice(item);
      const subtotal = price * item.qty;
      orderText += `${index + 1}. (${item.product.sku}) ${item.product.nama} = ${item.qty} ${item.product.unit} (${formatNumber(price)}) = ${formatNumber(subtotal)}\n`;
      if (item.note) {
        orderText += `    *Catatan: ${item.note}*\n`;
      }
    });

    orderText += `\nTotal SKU : ${totalSKU}\n`;
    orderText += `Total Transaksi : ${formatNumber(cartTotal)}\n`;

    if (customerNote) {
      orderText += `\nCatatan Umum Pesanan : ${customerNote}`;
    }

    // Save as completed in local storage
    onSaveCompleted();

    // Copy formatted text to clipboard
    try {
      await navigator.clipboard.writeText(orderText);
      setIsCopied(true);
      showToast('Teks pesanan disalin dan disimpan!', 'success');
      setTimeout(() => {
        setIsCopied(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      // Fallback copy using textarea
      try {
        const textArea = document.createElement('textarea');
        textArea.value = orderText;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setIsCopied(true);
        showToast('Teks pesanan disalin dan disimpan! (Fallback)', 'success');
        setTimeout(() => {
          setIsCopied(false);
          onClose();
        }, 2000);
      } catch (fallbackErr) {
        showToast('Gagal menyalin teks pesanan.', 'error');
      }
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh] transform scale-100 transition-transform duration-300">
        <div className="bg-gradient-to-br from-primary-300 to-primary-500 p-6 text-center relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-primary-200/50">
            <CheckCircle className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
              <Check className="text-primary-500 w-8 h-8 font-bold" />
            </div>
            <h2 className="text-2xl font-black text-primary-900">Pesanan Siap!</h2>
            <p className="text-primary-800 text-sm font-medium mt-1">Satu langkah lagi untuk menyelesaikan</p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="mb-5 bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <User className="w-4 h-4 text-primary-500" />
              <span className="text-gray-500 font-medium">Pemesan:</span>
              <strong className="text-gray-800 ml-auto">{customerName}</strong>
            </div>
            {customerPhone && (
              <div className="flex items-center gap-2 mb-1.5">
                <Phone className="w-4 h-4 text-primary-500" />
                <span className="text-gray-500 font-medium">No. HP:</span>
                <strong className="text-gray-800 ml-auto">{customerPhone}</strong>
              </div>
            )}
            {customerNote && (
              <div className="flex items-start gap-2">
                <StickyNote className="w-4 h-4 text-primary-500 mt-0.5" />
                <span className="text-gray-500 font-medium whitespace-nowrap">Catatan:</span>
                <strong className="text-gray-800 ml-auto text-right">{customerNote}</strong>
              </div>
            )}
          </div>

          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Ringkasan Barang</h3>
          <div className="space-y-3 mb-6 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
            {cart.map((item, idx) => (
              <div
                key={item.product.id}
                className={`flex justify-between items-start text-sm ${
                  idx !== cart.length - 1 ? 'border-b border-gray-200/60 pb-2 mb-2' : ''
                }`}
              >
                <div className="pr-3 flex-1">
                  <p className="font-bold text-gray-800 leading-tight">
                    {item.qty}x {item.product.nama}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.priceTier.toUpperCase()} @ {formatNumber(getItemPrice(item))}
                  </p>
                  {item.note && (
                    <p className="text-xs text-orange-600 font-medium mt-1">
                      <span className="italic">Catatan:</span> {item.note}
                    </p>
                  )}
                </div>
                <div className="font-black text-gray-800 whitespace-nowrap mt-0.5">
                  {formatNumber(item.qty * getItemPrice(item))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-lg font-black border-t-2 border-dashed border-gray-200 pt-5 mt-2 px-1">
            <span className="text-gray-600">Grand Total</span>
            <span className="text-2xl text-primary-600">{formatRupiah(cartTotal)}</span>
          </div>
        </div>

        <div className="p-5 bg-white flex flex-col gap-3 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadExcel}
              className="active-tap py-3 bg-primary-50 text-primary-600 border border-primary-200 rounded-xl font-bold hover:bg-primary-100 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span className="text-xs">Download Excel</span>
            </button>
            <button
              onClick={handleCopyAndSave}
              className={`active-tap py-3 text-white rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                isCopied 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20' 
                  : 'bg-[#25D366] hover:bg-[#1DA851] shadow-md shadow-[#25D366]/20'
              }`}
            >
              {isCopied ? (
                <>
                  <CheckCircle className="w-5 h-5 animate-bounce" />
                  <span className="text-xs">Tersalin & Tersimpan</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span className="text-xs">Salin & Save</span>
                </>
              )}
            </button>
          </div>
          <button
            onClick={onClose}
            className="active-tap w-full py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors mt-2 cursor-pointer"
          >
            Tutup Kembali
          </button>
        </div>
      </div>
    </div>
  );
}
