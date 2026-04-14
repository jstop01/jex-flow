import React, { useState, useEffect, useRef } from 'react';

interface NodeData {
  id: string;
  position: { x: number; y: number };
  type?: string;
  data?: any;
}

interface MiniMapData {
  nodes: NodeData[];
  edges: any[];
}

declare global {
  interface Window {
    MINIMAP_DATA?: MiniMapData;
  }
}

// 미니맵 전용 스타일
const minimapOnlyStyles = `
  html, body, #root {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }

  .minimap-only-wrapper {
    width: 100%;
    height: 100%;
    position: fixed;
    top: 0;
    left: 0;
    overflow: hidden;
    background-color: #f8fafc;
  }

  .custom-minimap {
    width: 100%;
    height: 100%;
    display: block;
  }
`;

// 커스텀 SVG 미니맵 컴포넌트
const CustomMiniMap: React.FC<{ nodes: NodeData[] }> = ({ nodes }) => {
  // 고정된 viewBox
  const VIEWBOX_WIDTH = 400;
  const VIEWBOX_HEIGHT = 300;
  const NODE_WIDTH = 60;
  const NODE_HEIGHT = 25;
  const PADDING = 40;

  // 노드가 없으면 빈 화면
  if (nodes.length === 0) {
    return (
      <svg className="custom-minimap" viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
        <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#f8fafc" />
        <text x={VIEWBOX_WIDTH / 2} y={VIEWBOX_HEIGHT / 2} textAnchor="middle" fill="#94a3b8" fontSize="12">
          플로우 데이터를 기다리는 중...
        </text>
      </svg>
    );
  }

  // 노드 bounds 계산
  const xValues = nodes.map(n => n.position?.x ?? 0);
  const yValues = nodes.map(n => n.position?.y ?? 0);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  // 노드 그룹 크기
  const groupWidth = maxX - minX + NODE_WIDTH;
  const groupHeight = maxY - minY + NODE_HEIGHT;

  // 스케일 계산 (여백 포함)
  const availableWidth = VIEWBOX_WIDTH - PADDING * 2;
  const availableHeight = VIEWBOX_HEIGHT - PADDING * 2;
  const scale = Math.min(availableWidth / groupWidth, availableHeight / groupHeight, 1);

  // 중앙 배치 오프셋
  const scaledWidth = groupWidth * scale;
  const scaledHeight = groupHeight * scale;
  const offsetX = (VIEWBOX_WIDTH - scaledWidth) / 2 - minX * scale;
  const offsetY = (VIEWBOX_HEIGHT - scaledHeight) / 2 - minY * scale;

  return (
    <svg className="custom-minimap" viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
      <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#f8fafc" />
      {nodes.map((node) => {
        const x = (node.position?.x ?? 0) * scale + offsetX;
        const y = (node.position?.y ?? 0) * scale + offsetY;
        const w = NODE_WIDTH * scale;
        const h = NODE_HEIGHT * scale;
        return (
          <rect
            key={node.id}
            x={x}
            y={y}
            width={w}
            height={h}
            fill="#9ca3af"
            rx={3}
            ry={3}
          />
        );
      })}
    </svg>
  );
};

export const MiniMapOnlyPage: React.FC = () => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const lastDataRef = useRef<string>('');

  useEffect(() => {
    // window 객체에서 데이터 읽기
    if (window.MINIMAP_DATA) {
      setNodes(window.MINIMAP_DATA.nodes || []);
    }

    // postMessage 리스너
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SET_MINIMAP_DATA') {
        const rawNodes = event.data.payload.nodes || [];

        // 데이터 해시 생성 (간단히 JSON 문자열 비교)
        const dataHash = JSON.stringify(rawNodes);

        // 동일한 데이터면 무시 (불필요한 리렌더링 방지)
        if (dataHash === lastDataRef.current) {
          return;
        }
        lastDataRef.current = dataHash;

        setNodes(rawNodes);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <>
      <style>{minimapOnlyStyles}</style>
      <div className="minimap-only-wrapper">
        <CustomMiniMap nodes={nodes} />
      </div>
    </>
  );
};

export default MiniMapOnlyPage;
