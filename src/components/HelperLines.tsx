import React from 'react';
import { useStore } from 'reactflow';

interface HelperLinesProps {
  horizontal?: number; // y (flow 좌표)
  vertical?: number;   // x (flow 좌표)
}

// 드래그 중 정렬 가이드선 오버레이. flow 좌표를 현재 viewport(transform)로 화면 좌표로 바꿔 그린다.
export const HelperLines: React.FC<HelperLinesProps> = ({ horizontal, vertical }) => {
  const [tx, ty, zoom] = useStore((s) => s.transform);
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  if (horizontal === undefined && vertical === undefined) return null;
  return (
    <svg
      className="react-flow__helper-lines"
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 5 }}
    >
      {vertical !== undefined && (
        <line x1={vertical * zoom + tx} x2={vertical * zoom + tx} y1={0} y2={height}
          stroke="#5277f7" strokeWidth={1} strokeDasharray="4 4" />
      )}
      {horizontal !== undefined && (
        <line x1={0} x2={width} y1={horizontal * zoom + ty} y2={horizontal * zoom + ty}
          stroke="#5277f7" strokeWidth={1} strokeDasharray="4 4" />
      )}
    </svg>
  );
};
