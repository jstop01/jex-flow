import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow@11.11.4';
import { Workflow } from 'lucide-react';

export const CustomNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div
      className={`rounded-xl bg-white border-2 shadow-lg min-w-[180px] transition-all overflow-hidden ${
        selected ? 'border-[#5277f7] shadow-xl' : 'border-slate-300'
      }`}
    >
      {!data.isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -top-6"
        >
             <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-[#5277f7] border-2 border-white rounded-full pointer-events-none" />
        </Handle>
      )}
      
      {/* Header */}
      <div className="bg-[#dce4fd] px-4 py-3 border-b border-[#cddbfd] flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-white/60 text-[#5277f7]">
          <Workflow size={18} />
        </div>
        <div>
          <div className="text-slate-900 font-bold text-sm leading-tight">{data.label}</div>
          {data.isStart && <span className="text-[10px] text-slate-500 font-medium">startNode</span>}
          {data.isEnd && <span className="text-[10px] text-slate-500 font-medium">endNode</span>}
        </div>
      </div>
      
      {/* Body */}
      <div className="p-4 bg-white">
        {data.description && (
          <div className="text-slate-500 text-xs mb-3">{data.description}</div>
        )}

        {data.ido && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[10px] text-slate-400 font-bold mb-1">
              linked {data.ido.type || 'component'}
            </div>
            <div className="text-xs bg-[#eff4ff] text-[#5277f7] px-2 py-1.5 rounded border border-[#dce4fd] font-medium flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#5277f7]"></div>
                <span className="truncate">{data.ido.name}</span>
              </div>
              <div className="text-[10px] text-slate-400 pl-3.5 truncate">
                {data.ido.componentId}
              </div>
            </div>
          </div>
        )}
      </div>

      {!data.isEnd && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -bottom-6"
        >
             <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-[#5277f7] border-2 border-white rounded-full pointer-events-none" />
        </Handle>
      )}
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
