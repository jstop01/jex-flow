import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow@11.11.4';
import { Code } from 'lucide-react';

export const ScriptNode = memo(({ id, data, selected }: NodeProps) => {
  const scriptTypeLabels: Record<string, string> = {
    standard: 'Standard',
    function: 'Function',
    expression: 'Expression',
  };

  return (
    <div
      className={`rounded-xl bg-white border-2 shadow-lg min-w-[200px] transition-all overflow-hidden ${
        selected ? 'border-[#5277f7] shadow-xl' : 'border-slate-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -top-6"
      >
        <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-[#5277f7] border-2 border-white rounded-full pointer-events-none" />
      </Handle>

      {/* Header */}
      <div className="bg-[#dce4fd] px-4 py-3 border-b border-[#cddbfd] flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-white/60 text-violet-600">
          <Code size={16} />
        </div>
        <div>
          <div className="font-bold text-slate-800 text-sm">{data.label || 'Script'}</div>
          <div className="text-slate-400 text-[10px] font-mono">nodeId: {id}</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 bg-white rounded-b-xl" style={{ minHeight: '54px' }}>
        {/* Show configured info if exists */}
        {(data.scriptType || data.variableName) ? (
          <div className="space-y-2">
            {data.scriptType && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold">type:</span>
                <span className="text-xs text-slate-600 bg-violet-50 px-2 py-0.5 rounded">
                  {scriptTypeLabels[data.scriptType] || data.scriptType}
                </span>
              </div>
            )}
            {data.variableName && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold">var:</span>
                <span className="text-xs text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded">
                  {data.variableName}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-400">더블클릭하여 스크립트 편집</div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -bottom-6"
      >
        <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-[#5277f7] border-2 border-white rounded-full pointer-events-none" />
      </Handle>
    </div>
  );
});

ScriptNode.displayName = 'ScriptNode';
