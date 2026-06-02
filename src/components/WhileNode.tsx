import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow@11.11.4';
import { Repeat } from 'lucide-react';

interface NodePreview {
  id: string;
  type?: string;
  label: string;
  position: { x: number; y: number };
}

export const WhileNode = memo(({ id, data, selected }: NodeProps) => {
  // 내부 노드 미리보기 계산
  const internalNodesPreview: NodePreview[] = data.internalNodesPreview || [];

  // Y 위치 기준으로 정렬된 노드 목록
  const sortedPreviews = useMemo(() => {
    if (internalNodesPreview.length === 0) return [];
    return [...internalNodesPreview].sort((a, b) => a.position.y - b.position.y);
  }, [internalNodesPreview]);

  return (
    <>
      <style>{`
        /*
         * [CRITICAL FIX] React Flow Wrapper Style Override
         */
        .react-flow__node.react-flow__node-While {
          border: none !important;
          outline: none !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        .react-flow__node.react-flow__node-While.selected,
        .react-flow__node.react-flow__node-While:focus,
        .react-flow__node.react-flow__node-While:focus-visible {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }

      `}</style>
      
      <div 
        className="w-full h-full relative group flex flex-col rounded-[30px] bg-white shadow-xl"
        style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: selected ? '#f59e0b' : '#e2e8f0', 
            outline: 'none',
        }}
      >
        
        {/* Header Section - Orange Theme for Loop */}
        <div className="h-[70px] w-full bg-[#fffbeb] flex items-center px-6 gap-4 shrink-0 rounded-t-[30px] border-b border-[#fff7ed]">
          <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-amber-500 shadow-sm shrink-0">
            <Repeat size={24} />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-lg font-bold text-slate-800 tracking-tight truncate">{id}</span>
            <span className="text-slate-400 text-[10px] font-mono">type: While</span>
          </div>
        </div>

        {/* Body Section */}
        <div className="flex-1 bg-white relative rounded-b-[30px] overflow-hidden" style={{ minHeight: '80px' }}>
            <div className="absolute inset-4" style={{ pointerEvents: 'none' }}>
                <div className="w-full h-full border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center relative">
                    {/* 내부 노드 실루엣 미리보기 - 축소 상태일 때만 표시 */}
                    {!data.isExpanded && (
                      <div className="flex flex-col items-center justify-center gap-1">
                        {sortedPreviews.length > 0 ? (
                          sortedPreviews.map((node) => (
                            <div
                              key={node.id}
                              style={{ width: '32px', height: '12px', backgroundColor: '#94a3b8', borderRadius: '2px' }}
                              title={node.label || node.type}
                            />
                          ))
                        ) : (
                          <>
                            <div style={{ width: '32px', height: '12px', backgroundColor: '#94a3b8', borderRadius: '2px' }} title="Start" />
                            <div style={{ width: '32px', height: '12px', backgroundColor: '#94a3b8', borderRadius: '2px' }} title="End" />
                          </>
                        )}
                      </div>
                    )}
                    {!data.hasChildren && data.isExpanded && (
                        <div className="text-center">
                            <span className="text-slate-300 text-lg font-medium block">Drag loop body nodes here</span>
                            <span className="text-slate-200 text-xs">(Executed when true)</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Target Handle (Input) */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center"
          style={{ top: '0', left: '50%', transform: 'translate(-50%, -50%)' }}
        >
            <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-amber-500 border-2 border-white rounded-full pointer-events-none" />
        </Handle>

        {/* Source Handle (Output) */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center"
          style={{ bottom: '0', left: '50%', transform: 'translate(-50%, 50%)' }}
        >
            <div className="w-4 h-4 min-w-[16px] min-h-[16px] bg-amber-500 border-2 border-white rounded-full pointer-events-none" />
        </Handle>
      </div>
    </>
  );
});

WhileNode.displayName = 'WhileNode';
