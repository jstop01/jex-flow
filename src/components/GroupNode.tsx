import React, { memo, useRef, useCallback, useState, useMemo } from 'react';
import { NodeProps } from 'reactflow@11.11.4';
import { FolderOpen } from 'lucide-react';

interface NodePreview {
  id: string;
  type?: string;
  label: string;
  position: { x: number; y: number };
}

export const GroupNode = memo(({ data, selected, id }: NodeProps) => {
  const [isPanning, setIsPanning] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!data.isExpanded) return; // Only allow panning when expanded
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

    // Call the pan callback if provided
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
        .react-flow__node.react-flow__node-Method {
          border: none !important;
          outline: none !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        .react-flow__node.react-flow__node-Method.selected,
        .react-flow__node.react-flow__node-Method:focus,
        .react-flow__node.react-flow__node-Method:focus-visible {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }
      `}</style>

      <div
        className="w-full h-full relative group flex flex-col rounded-[30px] bg-white shadow-xl pointer-events-none"
        style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: selected ? '#5277f7' : '#e2e8f0',
            outline: 'none',
        }}
      >

        {/* Header Section */}
        <div className="h-[70px] w-full bg-[#f0f4ff] flex items-center px-6 gap-4 shrink-0 rounded-t-[30px] border-b border-[#e2e8f0] pointer-events-auto">
          <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-[#5277f7] shadow-sm">
            <FolderOpen size={24} />
          </div>
          <div className="flex flex-col">
             <span className="text-lg font-bold text-slate-800 tracking-tight">{id}</span>
             <span className="text-slate-400 text-[10px] font-mono">type: Method</span>
          </div>
        </div>

        {/* Body Section */}
        <div
          className={`flex-1 bg-white relative rounded-b-[30px] overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ pointerEvents: 'auto', minHeight: '80px' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <div className="absolute inset-4" style={{ pointerEvents: 'none' }}>
            <div className="w-full h-full border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center relative">
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
                <span className="text-slate-300 text-lg font-medium">Drag nodes here</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

GroupNode.displayName = 'GroupNode';
