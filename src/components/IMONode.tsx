import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow@11.11.4';
import { Box } from 'lucide-react';

export const IMONode = memo(({ data, selected }: NodeProps) => {
  // Define node dimensions (Wide diamond like ConditionNode)
  const width = 260;
  const height = 140;

  return (
    <div 
      className="relative flex items-center justify-center group"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* SVG Based Diamond Shape */}
      <svg 
        className="absolute top-0 left-0 w-full h-full overflow-visible drop-shadow-md"
        style={{ zIndex: 0 }}
      >
        <polygon 
          points={`${width/2},0 ${width},${height/2} ${width/2},${height} 0,${height/2}`}
          fill="white"
          className={`stroke-2 transition-all ${
            selected ? 'stroke-[#5277f7]' : 'stroke-slate-300'
          }`}
          strokeLinejoin="round"
        />
      </svg>

      {/* Target Handle (Top Vertex) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-12 h-12 !bg-transparent border-none z-50 absolute flex items-center justify-center"
        style={{ top: '0', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
          <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-[#5277f7] border-2 border-white rounded-full pointer-events-none" />
      </Handle>

      {/* Content Container (Centered) */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center gap-1 w-[140px]">
        {/* Header Icon & Title */}
        <div className="flex items-center gap-1.5 mb-1 px-2 py-0.5">
            <div className={`p-0.5 rounded-full ${selected ? 'text-[#5277f7]' : 'text-slate-600'}`}>
                <Box size={14} />
            </div>
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">IMO</span>
        </div>

        {/* Input Field (Optional, similar to ConditionNode or just label) */}
        <div className="w-full px-1">
             <input 
              className="nodrag w-full px-1.5 py-0.5 text-[11px] text-center border border-slate-200 rounded focus:outline-none focus:border-[#5277f7] bg-white transition-colors shadow-sm placeholder:text-slate-400" 
              placeholder="Condition..."
              defaultValue={data.label || ''}
              onChange={(evt) => data.onChange?.('label', evt.target.value)}
            />
        </div>
      </div>

      {/* TRUE Handle (Bottom Vertex) */}
      <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          className="w-12 h-12 !bg-transparent border-none z-50 absolute flex items-center justify-center"
          style={{ bottom: '0', left: '50%', transform: 'translate(-50%, 50%)' }}
      >
          <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-emerald-500 border-2 border-white rounded-full pointer-events-none" />
      </Handle>

      {/* FALSE Handle (Right Vertex) */}
      <Handle
          type="source"
          position={Position.Right}
          id="false"
          className="w-12 h-12 !bg-transparent border-none z-50 absolute flex items-center justify-center"
          style={{ right: '0', top: '50%', transform: 'translate(50%, -50%)' }}
      >
          <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-red-500 border-2 border-white rounded-full pointer-events-none" />
      </Handle>

    </div>
  );
});

IMONode.displayName = 'IMONode';
