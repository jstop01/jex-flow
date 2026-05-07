import React, { memo, useState, useEffect } from 'react';
import { NodeProps, Handle, Position } from 'reactflow@11.11.4';
import { Database, Save } from 'lucide-react';

export const VariableNode = memo(({ id, data, selected }: NodeProps) => {
  const [localName, setLocalName] = useState(data.variableName || '');

  useEffect(() => {
    if (data.variableName !== undefined) {
      setLocalName(data.variableName);
    }
  }, [data.variableName]);

  const JAVA_PART_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  const isValidName = (name: string) => {
    if (!name) return true;
    return name.split('.').every(part => part.length > 0 && JAVA_PART_REGEX.test(part));
  };
  const validationError = localName && !isValidName(localName)
    ? '각 파트는 영문/숫자/_/$ (숫자 시작 불가)'
    : '';

  const detectedSource = localName.includes('.')
    ? localName.split('.')[0]
    : null;

  const hasUnsavedChanges = localName !== (data.variableName || '');

  const handleSave = () => {
    if (!localName.trim() || validationError) return;
    data.onChange?.('variableName', localName.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
  };

  return (
    <div
      className={`rounded-xl bg-white border-2 shadow-lg min-w-[140px] transition-all overflow-hidden ${
        selected ? 'border-emerald-500 shadow-lg' : 'border-slate-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -top-6"
      >
        <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-emerald-500 border-2 border-white rounded-full pointer-events-none" />
      </Handle>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -bottom-6"
      >
        <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-emerald-500 border-2 border-white rounded-full pointer-events-none" />
      </Handle>

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-100 to-teal-100 px-3 py-2 border-b border-emerald-200 flex items-center gap-2">
        <div className="p-1 rounded-md bg-white shadow-sm text-emerald-600">
          <Database size={14} />
        </div>
        <div>
          <span className="font-bold text-emerald-900 text-xs">Variable</span>
          <div className="text-slate-400 text-[10px] font-mono">nodeId: {id}</div>
        </div>
      </div>

      <div className="p-3 bg-white">
        {/* 변수명 입력 */}
        <div>
          <label className="text-[9px] text-slate-500 font-bold mb-1 block">name</label>
          <input
            className={`nodrag w-full px-2 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 bg-slate-50 focus:bg-white transition-all font-mono ${
              validationError
                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
            }`}
            placeholder="myVar"
            value={localName}
            onChange={(evt) => {
              const val = evt.target.value;
              if (!val || /^[a-zA-Z0-9_.$]*$/.test(val)) {
                setLocalName(val);
              }
            }}
            onKeyDown={handleKeyDown}
          />
          {validationError && (
            <p className="mt-1 text-[9px] text-red-500">{validationError}</p>
          )}
          {!validationError && detectedSource && (
            <p className="mt-1 text-[9px] text-emerald-600">
              📌 {detectedSource} → {localName.split('.').slice(1).join('.')}
            </p>
          )}
          {!validationError && !detectedSource && localName && (
            <p className="mt-1 text-[9px] text-slate-400">📌 전역 변수</p>
          )}
        </div>

        {/* 저장 버튼 — 변경 시에만 */}
        {hasUnsavedChanges && (
          <button
            type="button"
            onClick={handleSave}
            disabled={!localName.trim() || !!validationError}
            className={`nodrag mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
              localName.trim() && !validationError
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save size={12} />
            <span>저장</span>
          </button>
        )}

        {/* Expression 미리보기 */}
        {data.expression && (
          <div className="mt-2 border-t border-slate-100 pt-2">
            <label className="text-[9px] text-slate-500 font-bold mb-1 block">expression</label>
            <div className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5 truncate">
              {data.expression}
            </div>
          </div>
        )}

        {/* 더블클릭 안내 */}
        {!hasUnsavedChanges && data.variableName && (
          <p className="mt-2 text-[10px] text-slate-400 text-center border-t border-slate-100 pt-2">
            {data.expression ? '' : '더블클릭하여 expression 편집'}
          </p>
        )}
      </div>
    </div>
  );
});

VariableNode.displayName = 'VariableNode';
