import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface TextEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  title?: string;
  label?: string;
  initialValue?: string;
  placeholder?: string;
}

export const TextEditModal = ({
  isOpen,
  onClose,
  onSave,
  title = '값 편집',
  label = '값',
  initialValue = '',
  placeholder = '값 입력...'
}: TextEditModalProps) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(value);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
      <div className="bg-white rounded-lg shadow-xl w-[600px] overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-700">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded p-1 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="p-4">
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              {label}
            </label>
            <textarea
              className="w-full h-32 px-3 py-2 text-sm border border-slate-300 rounded focus:border-[#5277f7] focus:ring-1 focus:ring-[#5277f7] outline-none resize-none"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#5277f7] hover:bg-[#4162d9] rounded flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Check size={14} /> 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
