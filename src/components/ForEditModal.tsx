import React, { useState, useEffect } from 'react';
import { X, Save, RotateCw, ChevronDown } from 'lucide-react';

interface ForEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
  initialOption1?: string;
  initialOption2?: string;
  onSave: (option1: string, option2: string) => void;
}

const comboOptions = [
  { value: '1', text: '1' },
  { value: '2', text: '2' },
  { value: '3', text: '3' },
];

export const ForEditModal = ({
  isOpen,
  onClose,
  nodeId,
  initialOption1 = '',
  initialOption2 = '',
  onSave,
}: ForEditModalProps) => {
  const [option1, setOption1] = useState(initialOption1);
  const [option2, setOption2] = useState(initialOption2);
  const [showDropdown1, setShowDropdown1] = useState(false);
  const [showDropdown2, setShowDropdown2] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOption1(initialOption1 || '');
      setOption2(initialOption2 || '');
    }
  }, [isOpen, initialOption1, initialOption2]);

  const handleSave = () => {
    onSave(option1, option2);
    onClose();
  };

  const getOptionText = (value: string) => {
    if (!value) return '선택';
    const option = comboOptions.find(opt => opt.value === value);
    return option?.text || value;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col" style={{ width: '700px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#cddbfd] bg-[#dce4fd]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/60 rounded-xl">
              <RotateCw size={22} className="text-[#5277f7]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">For 반복문</h2>
              <p className="text-xs text-slate-500 mt-0.5">반복 expression을 설정하세요</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg p-2 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Option 1 */}
          <div>
            <label className="text-xs text-slate-500 font-bold mb-2 block">option1</label>
            <div className="relative">
              <button
                className={`w-full text-left bg-white px-4 py-2.5 rounded-lg border-2 transition-all duration-200 ${
                  showDropdown1
                    ? 'border-purple-500 shadow-[0_0_0_3px_rgba(168,85,247,0.15)]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => { setShowDropdown1(!showDropdown1); setShowDropdown2(false); }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">{getOptionText(option1)}</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${showDropdown1 ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {showDropdown1 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl z-10 border border-slate-200 py-1">
                  {comboOptions.map((opt) => (
                    <button
                      key={opt.value}
                      className={`w-full text-left px-4 py-2.5 transition-colors ${
                        option1 === opt.value ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => { setOption1(opt.value); setShowDropdown1(false); }}
                    >
                      <span className="text-slate-700">{opt.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Option 2 */}
          <div>
            <label className="text-xs text-slate-500 font-bold mb-2 block">option2</label>
            <div className="relative">
              <button
                className={`w-full text-left bg-white px-4 py-2.5 rounded-lg border-2 transition-all duration-200 ${
                  showDropdown2
                    ? 'border-purple-500 shadow-[0_0_0_3px_rgba(168,85,247,0.15)]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => { setShowDropdown2(!showDropdown2); setShowDropdown1(false); }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">{getOptionText(option2)}</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${showDropdown2 ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {showDropdown2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl z-10 border border-slate-200 py-1">
                  {comboOptions.map((opt) => (
                    <button
                      key={opt.value}
                      className={`w-full text-left px-4 py-2.5 transition-colors ${
                        option2 === opt.value ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => { setOption2(opt.value); setShowDropdown2(false); }}
                    >
                      <span className="text-slate-700">{opt.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/80">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors shadow-sm"
          >
            <Save size={16} />
            저장
          </button>
        </div>
      </div>
    </div>
  );
};
