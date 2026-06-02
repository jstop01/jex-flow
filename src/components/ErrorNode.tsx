import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow@11.11.4';
import { AlertCircle } from 'lucide-react';

export const ErrorNode = memo(({ id, data, selected }: NodeProps) => {
  return (
    <div
      className={`relative min-w-[150px] bg-white border-2 border-double border-red-400 rounded-sm p-3 shadow-sm transition-all
      ${selected ? 'ring-2 ring-red-300 shadow-md' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -top-6"
      >
           <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-[#5277f7] border-2 border-white rounded-full pointer-events-none" />
      </Handle>

      <div className="flex flex-col items-center justify-center gap-1">
        {/* Optional Icon */}
        {/* <AlertCircle className="w-5 h-5 text-red-500 mb-1" /> */}

        <div className="text-sm font-medium text-red-600 text-center break-words px-1">
            {id}
        </div>
        <div className="text-red-300 text-[10px] font-mono">type: Error</div>
        {data.code && (
            <div className="text-[10px] text-red-400 font-mono">
                {data.code}
            </div>
        )}
      </div>
    </div>
  );
});

ErrorNode.displayName = 'ErrorNode';
