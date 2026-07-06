import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, ScanLine } from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function ScannerModal({ isOpen, onClose, onScanSuccess, showToast }: ScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const startScanner = async () => {
      if (isStartingRef.current) return;
      isStartingRef.current = true;

      try {
        const scanner = new Html5Qrcode('reader');
        scannerRef.current = scanner;

        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 150 }, 
          aspectRatio: 1.0 
        };

        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            // Success callback
            onScanSuccess(decodedText);
            cleanupScanner();
            onClose();
          },
          () => {
            // Silent failure for intermediate frames
          }
        );
      } catch (err) {
        console.error('Failed to start camera scanner:', err);
        showToast('Gagal mengakses kamera. Pastikan Anda telah memberikan izin kamera pada browser.', 'error');
        onClose();
      } finally {
        isStartingRef.current = false;
      }
    };

    // Delay slightly to ensure DOM element is rendered
    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      clearTimeout(timer);
      cleanupScanner();
    };
  }, [isOpen]);

  const cleanupScanner = () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current = null;
          })
          .catch((err) => {
            console.error('Error stopping scanner during cleanup:', err);
          });
      } else {
        scannerRef.current = null;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] items-center justify-center bg-gray-900/80 p-4 backdrop-blur-sm flex">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform scale-100 transition-transform duration-300">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="bg-primary-100 text-primary-600 p-1.5 rounded-lg">
              <ScanLine className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Scan Barcode / SKU</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="bg-black w-full relative flex items-center justify-center min-h-[300px]">
          <div id="reader" className="w-full h-full text-center text-white flex items-center justify-center font-medium">
            Memuat kamera...
          </div>
        </div>
        
        <div className="p-4 bg-white text-center text-sm text-gray-500 font-medium border-t border-gray-100">
          Arahkan kamera HP Anda ke barcode produk
        </div>
      </div>
    </div>
  );
}
