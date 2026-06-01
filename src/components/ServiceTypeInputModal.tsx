import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Settings } from 'lucide-react';

export interface InputField {
  id: string;
  text?: string;
  type:
    | 'FIELD' | 'TEXT' | 'PASSWORD' | 'RADIO' | 'CHECK' | 'LIST' | 'SPLIT' | 'DESCRIPTION'
    | 'String' | 'Double' | 'Boolean' | 'Float' | 'Integer' | 'Object' | 'VALUE';
  dataType?: string;
  defaultValue?: string;
  listValue?: { value: string; text: string }[];
  parentId?: string;
  parentValue?: string;
}

interface ServiceTypeInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: Record<string, any>) => void;
  serviceType: { value: string; text: string };
  inputs: InputField[];
  // 이전에 저장된 값(없으면 inputs의 defaultValue 사용) — 톱니바퀴 재진입 시 기존 값 표시
  initialValues?: Record<string, any>;
}

export const ServiceTypeInputModal = ({
  isOpen,
  onClose,
  onSave,
  serviceType,
  inputs,
  initialValues,
}: ServiceTypeInputModalProps) => {
  const [values, setValues] = useState<Record<string, any>>({});

  // Initialize values: initialValues(이전 저장값) 우선, 없으면 inputs의 defaultValue
  useEffect(() => {
    const merged: Record<string, any> = {};
    inputs.forEach((input) => {
      if (!input.id) return;
      if (initialValues && initialValues[input.id] !== undefined) {
        merged[input.id] = initialValues[input.id];
      } else if (input.defaultValue !== undefined) {
        if (input.type === 'CHECK') {
          merged[input.id] = input.defaultValue.split(',').filter(Boolean);
        } else {
          merged[input.id] = input.defaultValue;
        }
      }
    });
    setValues(merged);
  }, [inputs, initialValues]);

  if (!isOpen) return null;

  const handleChange = (id: string, value: any) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleCheckboxChange = (id: string, checkValue: string, checked: boolean) => {
    setValues((prev) => {
      const currentValues = prev[id] || [];
      if (checked) {
        return { ...prev, [id]: [...currentValues, checkValue] };
      } else {
        return { ...prev, [id]: currentValues.filter((v: string) => v !== checkValue) };
      }
    });
  };

  // Check if field has parent dependency
  const hasParentDependency = (input: InputField): boolean => {
    return !!(input.parentId && input.parentValue);
  };

  // Check if field is editable (not read-only)
  const isFieldEditable = (input: InputField): boolean => {
    if (!input.parentId || !input.parentValue) return true;
    return values[input.parentId] === input.parentValue;
  };

  const handleSave = () => {
    onSave(values);
    onClose();
  };

  const renderInput = (input: InputField, index: number) => {
    const isEditable = isFieldEditable(input);
    const isReadOnly = hasParentDependency(input) && !isEditable;

    switch (input.type) {
      case 'SPLIT':
        return (
          <div key={index} className="my-4">
            <div className="border-t border-slate-200" />
            {input.defaultValue && (
              <p
                style={{ fontSize: '14px' }}
                className="text-slate-600 mt-2 px-3 py-0.5 bg-slate-100 rounded"
              >
                {input.defaultValue}
              </p>
            )}
          </div>
        );

      case 'DESCRIPTION':
        return (
          <div key={input.id || index} className={`mb-4 ${isReadOnly ? 'opacity-50' : ''}`}>
            {input.text && (
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {input.text}
                {isReadOnly && <span className="ml-2 text-xs text-slate-400">(읽기 전용)</span>}
              </label>
            )}
            <textarea
              value={values[input.id] || ''}
              onChange={(e) => handleChange(input.id, e.target.value)}
              readOnly={isReadOnly}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg transition-all resize-none ${
                isReadOnly
                  ? 'border-slate-200 bg-slate-100 cursor-not-allowed'
                  : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5277f7] focus:border-transparent'
              }`}
              placeholder="내용을 입력하세요..."
            />
          </div>
        );

      case 'FIELD':
        return (
          <div key={input.id} className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {input.text}
            </label>
            <span className="text-sm text-slate-500">
              {values[input.id] || input.defaultValue || ''}
            </span>
          </div>
        );

      case 'TEXT':
      case 'String':
      case 'Object':
      case 'Double':
      case 'Boolean':
      case 'Float':
      case 'Integer':
        return (
          <div key={input.id} className={`mb-4 ${isReadOnly ? 'opacity-50' : ''}`}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {input.text}
              {isReadOnly && <span className="ml-2 text-xs text-slate-400">(읽기 전용)</span>}
            </label>
            <input
              type="text"
              value={values[input.id] || ''}
              onChange={(e) => handleChange(input.id, e.target.value)}
              readOnly={isReadOnly}
              className={`w-full px-3 py-2 border rounded-lg transition-all ${
                isReadOnly
                  ? 'border-slate-200 bg-slate-100 cursor-not-allowed'
                  : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5277f7] focus:border-transparent'
              }`}
              placeholder={`${input.text} 입력...`}
            />
          </div>
        );

      case 'VALUE':
        // 신타입 VALUE: 입력 UI 미노출 (함수 내부에서 처리)
        return null;

      case 'PASSWORD':
        return (
          <div key={input.id} className={`mb-4 ${isReadOnly ? 'opacity-50' : ''}`}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {input.text}
              {isReadOnly && <span className="ml-2 text-xs text-slate-400">(읽기 전용)</span>}
            </label>
            <input
              type="password"
              value={values[input.id] || ''}
              onChange={(e) => handleChange(input.id, e.target.value)}
              readOnly={isReadOnly}
              className={`w-full px-3 py-2 border rounded-lg transition-all ${
                isReadOnly
                  ? 'border-slate-200 bg-slate-100 cursor-not-allowed'
                  : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5277f7] focus:border-transparent'
              }`}
              placeholder={`${input.text} 입력...`}
            />
          </div>
        );

      case 'RADIO':
        return (
          <div key={input.id} className={`mb-4 ${isReadOnly ? 'opacity-50' : ''}`}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {input.text}
              {isReadOnly && <span className="ml-2 text-xs text-slate-400">(읽기 전용)</span>}
            </label>
            <div className="flex flex-wrap gap-3">
              {input.listValue?.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    values[input.id] === option.value
                      ? 'border-[#5277f7] bg-[#eff4ff] text-[#5277f7]'
                      : isReadOnly ? 'border-slate-200 bg-slate-50' : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name={input.id}
                    value={option.value}
                    checked={values[input.id] === option.value}
                    onChange={(e) => !isReadOnly && handleChange(input.id, e.target.value)}
                    disabled={isReadOnly}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      values[input.id] === option.value
                        ? 'border-[#5277f7]'
                        : 'border-slate-400'
                    }`}
                  >
                    {values[input.id] === option.value && (
                      <div className="w-2 h-2 rounded-full bg-[#5277f7]" />
                    )}
                  </div>
                  <span className="text-sm">{option.text}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'CHECK':
        return (
          <div key={input.id} className={`mb-4 ${isReadOnly ? 'opacity-50' : ''}`}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {input.text}
              {isReadOnly && <span className="ml-2 text-xs text-slate-400">(읽기 전용)</span>}
            </label>
            <div className="flex flex-wrap gap-3">
              {input.listValue?.map((option) => {
                const isChecked = (values[input.id] || []).includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => !isReadOnly && handleCheckboxChange(input.id, option.value, !isChecked)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                      isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      isChecked
                        ? 'border-[#5277f7] bg-[#eff4ff] text-[#5277f7]'
                        : isReadOnly ? 'border-slate-200 bg-slate-50' : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isChecked ? 'border-[#5277f7] bg-[#5277f7]' : 'border-slate-400'
                      }`}
                    >
                      {isChecked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm">{option.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'LIST':
        return (
          <div key={input.id} className={`mb-4 ${isReadOnly ? 'opacity-50' : ''}`}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {input.text}
              {isReadOnly && <span className="ml-2 text-xs text-slate-400">(읽기 전용)</span>}
            </label>
            <select
              value={values[input.id] || ''}
              onChange={(e) => handleChange(input.id, e.target.value)}
              disabled={isReadOnly}
              className={`w-full px-3 py-2 border rounded-lg transition-all bg-white ${
                isReadOnly
                  ? 'border-slate-200 bg-slate-100 cursor-not-allowed'
                  : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5277f7] focus:border-transparent'
              }`}
            >
              <option value="">선택하세요...</option>
              {input.listValue?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.text}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return null;
    }
  };

  return ReactDOM.createPortal(
    <>
      {/* Global style override for modal */}
      <style>{`
        .service-type-modal-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          z-index: 2147483647 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        .service-type-modal-backdrop {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background: rgba(0, 0, 0, 0.5) !important;
          backdrop-filter: blur(4px) !important;
          pointer-events: auto !important;
        }
        .service-type-modal-content {
          position: relative !important;
          background: #ffffff !important;
          border-radius: 16px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
          max-height: calc(100vh - 64px) !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
          z-index: 2147483647 !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
      `}</style>
      <div className="service-type-modal-overlay">
        {/* Backdrop */}
        <div
          className="service-type-modal-backdrop"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className="service-type-modal-content"
          style={{ width: '810px', maxWidth: '810px' }}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#cddbfd] bg-[#dce4fd] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#eff4ff] rounded-lg">
              <Settings size={20} className="text-[#5277f7]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">serviceType 설정</h2>
              <p className="text-sm text-slate-500">{serviceType.text}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {inputs.map((input, index) => renderInput(input, index))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 text-sm font-medium text-white bg-[#5277f7] hover:bg-[#4166e0] rounded-lg transition-colors"
          >
            저장
          </button>
        </div>
      </div>
      </div>
    </>,
    document.body
  );
};
