import React, { useState, useEffect } from 'react';
import { Copy, Check, X } from 'lucide-react';

interface JsonExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export const JsonExportModal = ({ isOpen, onClose, data }: JsonExportModalProps) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
    } catch (err) {
      // Fallback for environments where Clipboard API is blocked
      try {
        const textArea = document.createElement("textarea");
        textArea.value = jsonString;
        
        // Ensure it's not visible but part of DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopied(true);
        }
      } catch (fallbackErr) {
        console.error('Copy failed:', fallbackErr);
      }
    }
    
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header - Matching App Header Style */}
        <div className="flex items-center justify-between p-4 bg-[#dce4fd] border-b border-[#cddbfd]">
          <h2 className="text-lg font-bold text-[#5277f7]">Flow JSON 내보내기</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-hidden flex flex-col min-h-0 bg-[#f6f7fa]">
          <div className="bg-slate-900 text-slate-50 rounded-lg border border-slate-800 p-4 overflow-auto font-mono text-xs flex-1 shadow-inner">
            <pre>{jsonString}</pre>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm"
          >
            닫기
          </button>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 h-[32px] px-4 rounded-[4px] text-white text-sm font-medium transition-colors shadow-sm ${
              copied ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#5277f7] hover:bg-[#4162d9]'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '복사됨!' : '클립보드에 복사'}
          </button>
        </div>
      </div>
    </div>
  );
};
