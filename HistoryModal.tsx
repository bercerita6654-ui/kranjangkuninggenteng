import { History, X, Trash2, Upload, Inbox } from 'lucide-react';
import { HistoryItem } from '../types';
import { formatRupiah } from '../utils/helpers';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyData: HistoryItem[];
  onLoadItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
}

export default function HistoryModal({
  isOpen,
  onClose,
  historyData,
  onLoadItem,
  onDeleteItem,
}: HistoryModalProps) {
  if (!isOpen) return null;

  const formatDateStr = (dateIso: string) => {
    try {
      const dateObj = new Date(dateIso);
      return dateObj.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return '-';
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] transform scale-100 transition-transform duration-300">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="bg-primary-100 text-primary-600 p-1.5 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Riwayat & Draft</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors active-tap"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-3 bg-gray-50/30">
          {historyData.length === 0 ? (
            <div className="text-center py-10 text-gray-400 flex flex-col items-center justify-center">
              <Inbox className="w-12 h-12 mb-3 text-gray-300" />
              <p className="font-medium">Belum ada riwayat pesanan atau draft.</p>
            </div>
          ) : (
            historyData.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-800">{item.customerName}</span>
                      {item.isDraft ? (
                        <span className="bg-primary-100 text-primary-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Draft
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Selesai
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{formatDateStr(item.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-primary-600">{formatRupiah(item.total)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.cart.length} SKU</p>
                  </div>
                </div>
                {item.customerNote ? (
                  <p className="text-xs text-gray-600 italic mb-3 line-clamp-1">
                    &ldquo; {item.customerNote} &rdquo;
                  </p>
                ) : (
                  <div className="mb-3"></div>
                )}
                <div className="flex gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => onLoadItem(item.id)}
                    className="flex-1 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 font-bold text-xs rounded-lg flex justify-center items-center gap-1.5 transition-colors active-tap cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Muat Data
                  </button>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="px-3 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors active-tap cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
