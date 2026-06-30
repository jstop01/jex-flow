import React, { useState, useEffect, useRef } from 'react';
import { X, Split, Save } from 'lucide-react';

interface ConditionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
  initialExpression: string;
  onSave: (expression: string) => void;
  title?: string;
  subtitle?: string;
  fieldLabel?: string;
  placeholder?: string;
}

export const ConditionEditModal = ({
  isOpen,
  onClose,
  nodeId,
  initialExpression,
  onSave,
  title,
  subtitle,
  fieldLabel,
  placeholder,
}: ConditionEditModalProps) => {
  const [expression, setExpression] = useState(initialExpression);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setExpression(initialExpression);
      // Focus input after modal opens
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, initialExpression]);

  const handleSave = () => {
    onSave(expression);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-[900px] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#cddbfd] bg-[#dce4fd]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/60 rounded-xl">
              <Split size={22} className="text-[#5277f7]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{title ?? 'if expression 수정'}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{subtitle ?? 'expression을 입력하세요'}</p>
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
          {/* Node ID Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
            <span className="text-xs text-slate-500">nodeId:</span>
            <span className="text-xs font-mono font-medium text-slate-700">{nodeId}</span>
          </div>

          {/* Expression Input */}
          <div>
            <label className="text-xs text-slate-500 font-bold mb-2 block">
              {fieldLabel ?? 'expression'}
            </label>
            <textarea
              ref={inputRef}
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-32 px-4 py-3 rounded-lg border-2 border-slate-200 focus:outline-none focus:border-[#5277f7] focus:shadow-[0_0_0_3px_rgba(82,119,247,0.15)] bg-slate-50 focus:bg-white transition-all font-mono text-sm resize-none placeholder:text-slate-400"
              placeholder={placeholder ?? '예: x > 10 && y < 20'}
            />
            <p className="mt-2 text-xs text-slate-400">
              Shift + Enter로 줄바꿈, Enter로 저장
            </p>
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
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[#5277f7] rounded-lg hover:bg-[#4162d9] transition-colors shadow-sm"
          >
            <Save size={16} />
            저장
          </button>
        </div>
      </div>
    </div>
  );
};
