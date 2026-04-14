import React, { memo, useRef, useCallback, useState, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow@11.11.4';
import { Repeat2 } from 'lucide-react';

interface NodePreview {
  id: string;
  type?: string;
  label: string;
  position: { x: number; y: number };
}

export const ForEachNode = memo(({ data, selected, id }: NodeProps) => {
  const [isPanning, setIsPanning] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!data.isExpanded) return;
    e.stopPropagation();
    setIsPanning(true);
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, [data.isExpanded]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    e.stopPropagation();
    const deltaX = e.clientX - lastPosRef.current.x;
    const deltaY = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    if (data.onInternalPan) {
      data.onInternalPan(id, deltaX, deltaY);
    }
  }, [isPanning, data, id]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

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
        /* React Flow Wrapper Style Override */
        .react-flow__node.react-flow__node-ForEach {
          border: none !important;
          outline: none !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          overflow: visible !important;
        }

        .react-flow__node.react-flow__node-ForEach.selected,
        .react-flow__node.react-flow__node-ForEach:focus,
        .react-flow__node.react-flow__node-ForEach:focus-visible {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: transparent !important;
          overflow: visible !important;
        }

        /* 내부 콘텐츠 스타일 강제 적용 */
        .react-flow__node.react-flow__node-ForEach > div {
          background-color: #ffffff !important;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important;
        }

        /* Body 영역 직접 스타일 강제 적용 */
        .foreach-node-body {
          background-color: #ffffff !important;
        }
      `}</style>

      <div
        className="w-full h-full relative group flex flex-col rounded-[30px] pointer-events-none"
        style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: selected ? '#84cc16' : '#e2e8f0',
            outline: 'none',
            overflow: 'visible',
            backgroundColor: '#ffffff',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        }}
      >

        {/* Header Section - Light Green Theme for ForEach Loop */}
        <div
          className="h-[70px] w-full flex items-center px-6 gap-4 shrink-0 rounded-t-[30px] pointer-events-auto"
          style={{ backgroundColor: '#d9f99d', borderBottom: '1px solid #bef264' }}
        >
          <div
            className="w-10 h-10 flex items-center justify-center rounded-xl text-lime-600 shrink-0"
            style={{ backgroundColor: '#ffffff', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
          >
            <Repeat2 size={24} />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
             <span className="text-sm font-bold text-lime-700 uppercase tracking-wider">ForEach</span>
             <span className="text-slate-400 text-[10px] font-mono">nodeId: {id}</span>
             {(data.selectedNode || data.fieldName) && (
               <span className="text-xs text-lime-600 mt-1 truncate">
                 {data.selectedNode || '-'}.{data.fieldType || 'input'}.{data.fieldName || '-'}
               </span>
             )}
          </div>
        </div>

        {/* Body Section - pointer-events enabled when expanded for panning */}
        <div
          className={`foreach-node-body flex-1 relative rounded-b-[30px] ${data.isExpanded ? 'cursor-grab' : 'pointer-events-none'} ${isPanning ? 'cursor-grabbing' : ''}`}
          style={{
            pointerEvents: data.isExpanded ? 'auto' : 'none',
            backgroundColor: '#ffffff',
            minHeight: '80px',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
            <div
              className="absolute inset-4"
              style={{ backgroundColor: '#ffffff', pointerEvents: 'none' }}
            >
                <div
                  className="w-full h-full rounded-2xl flex items-center justify-center relative"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '2px dashed #f1f5f9',
                  }}
                >
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
                            <span style={{ color: '#cbd5e1', fontSize: '18px', fontWeight: 500, display: 'block' }}>Drag loop body nodes here</span>
                            <span style={{ color: '#e2e8f0', fontSize: '12px' }}>(Executed for each item)</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Target Handle (Input) */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -top-6"
        >
          <div
            className="w-4 h-4 min-w-[16px] min-h-[16px] rounded-full pointer-events-none"
            style={{ backgroundColor: '#84cc16', border: '2px solid white' }}
          />
        </Handle>

        {/* Source Handle (Output) */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-12 h-12 !bg-transparent border-none z-50 flex items-center justify-center -bottom-6"
        >
          <div
            className="w-4 h-4 min-w-[16px] min-h-[16px] rounded-full pointer-events-none"
            style={{ backgroundColor: '#84cc16', border: '2px solid white' }}
          />
        </Handle>
      </div>
    </>
  );
});

ForEachNode.displayName = 'ForEachNode';
