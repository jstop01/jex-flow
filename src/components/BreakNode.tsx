import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow@11.11.4';
import { Ban } from 'lucide-react';

export const BreakNode = memo(({ id, data, selected }: NodeProps) => {
  const accentColor = '#f59e0b';      // amber-500
  const headerBgColor = '#fef3c7';    // amber-100
  const headerBorderColor = '#fde68a'; // amber-200

  return (
    <div
      className={`rounded-xl bg-white border-2 shadow-lg min-w-[180px] max-w-[240px] transition-all overflow-hidden ${
        selected ? 'shadow-xl' : 'border-amber-300'
      }`}
      style={{ borderColor: selected ? accentColor : undefined }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -top-6"
      >
        <div
          className="w-4 h-4 min-w-[16px] min-h-[16px] border-2 border-white rounded-full pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />
      </Handle>

      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center gap-2"
        style={{ backgroundColor: headerBgColor, borderColor: headerBorderColor }}
      >
        <div className="p-1.5 rounded-lg bg-white/60" style={{ color: accentColor }}>
          <Ban size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-800 text-sm truncate">{id}</div>
          <div className="text-slate-400 text-[10px] font-mono">type: Break</div>
        </div>
        <div
          className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: accentColor }}
        >
          BREAK
        </div>
      </div>

      {/* Body */}
      <div className="p-3 bg-white">
        {data.description ? (
          <div className="text-slate-500 text-xs italic break-words">
            {data.description}
          </div>
        ) : (
          <div className="text-slate-400 text-xs text-center">반복문 탈출</div>
        )}
      </div>
    </div>
  );
});

BreakNode.displayName = 'BreakNode';
