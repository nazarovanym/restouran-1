import React, { useRef } from 'react';
import { Printer, X, Download } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptText: string;
  orderNumber?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, receiptText, orderNumber }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Qəbz - ${orderNumber || 'Sifariş'}</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 13px;
                line-height: 1.3;
                padding: 15px;
                white-space: pre-wrap;
                margin: 0;
              }
              @media print {
                @page { margin: 0; size: 80mm auto; }
                body { padding: 10px; }
              }
            </style>
          </head>
          <body>${receiptText}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Başlığı */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary-500" />
            <h3 className="font-bold text-slate-800 dark:text-white">Kassa Qəbzi (Termo Çap)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Qəbz Mətni */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950/70">
          <div
            ref={printRef}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-4 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre shadow-inner leading-relaxed"
          >
            {receiptText}
          </div>
        </div>

        {/* Düymələr */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-white dark:bg-slate-900">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition"
          >
            Bağla
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-sm shadow-md flex items-center gap-2 transition"
          >
            <Printer className="w-4 h-4" /> Çap Et
          </button>
        </div>
      </div>
    </div>
  );
};
