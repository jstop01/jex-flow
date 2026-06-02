import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow@11.11.4';
import { Split } from 'lucide-react';

export const ConditionNode = memo(({ id, data, selected }: NodeProps) => {
  // Define node dimensions (Wide diamond)
  const width = 300;
  const height = 160;

  return (
    <div
      className="relative flex items-center justify-center group cursor-pointer"
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
      <div className="relative z-10 flex flex-col items-center justify-center text-center gap-2 w-[180px]">
        {/* Header Icon & Title */}
        <div className="flex items-center gap-2 px-3 py-1">
            <div className={`p-1 rounded-full ${selected ? 'text-[#5277f7]' : 'text-slate-600'}`}>
                <Split size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-700">{id}</div>
              <div className="text-slate-400 text-[10px] font-mono">type: IfElse</div>
            </div>
        </div>

        {/* Expression Display */}
        {data.expression && (
          <div
            className="w-full px-3 py-1.5 text-xs text-center border border-slate-200 rounded-lg bg-slate-50 font-mono truncate"
            title={data.expression}
          >
            {data.expression}
          </div>
        )}
      </div>

      {/* TRUE Label (Inside, near bottom) */}
      <span className="absolute text-sm font-semibold" style={{ bottom: '16px', left: '50%', transform: 'translateX(-50%)', color: '#10b981' }}>TRUE</span>

      {/* TRUE Handle (Bottom Vertex) */}
      <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          className="w-12 h-12 !bg-transparent border-none z-50 absolute flex items-center justify-center"
          style={{ bottom: '0', left: '50%', transform: 'translate(-50%, 50%)' }}
      >
          <div className="w-4 h-4 min-w-[16px] min-h-[16px] border-2 border-white rounded-full pointer-events-none" style={{ backgroundColor: '#10b981' }} />
      </Handle>

      {/* FALSE Label (Inside, near right) */}
      <span className="absolute text-sm font-semibold" style={{ right: '24px', top: '50%', transform: 'translateY(-50%)', color: '#ef4444' }}>FALSE</span>

      {/* FALSE Handle (Right Vertex) */}
      <Handle
          type="source"
          position={Position.Right}
          id="false"
          className="w-12 h-12 !bg-transparent border-none z-50 absolute flex items-center justify-center"
          style={{ right: '0', top: '50%', transform: 'translate(50%, -50%)' }}
      >
          <div className="w-4 h-4 min-w-[16px] min-h-[16px] border-2 border-white rounded-full pointer-events-none" style={{ backgroundColor: '#ef4444' }} />
      </Handle>

    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
