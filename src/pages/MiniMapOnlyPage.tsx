import React, { useState, useEffect, useRef } from 'react';

interface NodeData {
  id: string;
  position: { x: number; y: number };
  type?: string;
  data?: any;
  parentId?: string;
  hidden?: boolean;
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

// 커스텀 SVG 미니맵 컴포넌트 — 실제 캔버스 축소판처럼 렌더 (노드 카드 + 연결선)
const TYPE_COLOR: Record<string, string> = {
  Start: '#818cf8', End: '#818cf8',
  CallDO: '#6366f1', Process: '#6366f1',
  For: '#a855f7', ForEach: '#a855f7', While: '#a855f7', Method: '#a855f7',
  IfElse: '#ef4444', Switch: '#ef4444', Error: '#ef4444',
  Mapping: '#10b981', Script: '#8b5cf6', Variable: '#f59e0b',
};

const CustomMiniMap: React.FC<{ nodes: NodeData[]; edges: any[] }> = ({ nodes, edges }) => {
  // 고정된 viewBox
  const VIEWBOX_WIDTH = 400;
  const VIEWBOX_HEIGHT = 300;
  // 실제 캔버스 좌표계 기준 노드 크기 (대략적인 카드 크기)
  const NODE_WIDTH = 250;
  const NODE_HEIGHT = 120;
  const PADDING = 30;

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

  const groupWidth = maxX - minX + NODE_WIDTH;
  const groupHeight = maxY - minY + NODE_HEIGHT;

  const availableWidth = VIEWBOX_WIDTH - PADDING * 2;
  const availableHeight = VIEWBOX_HEIGHT - PADDING * 2;
  const scale = Math.min(availableWidth / groupWidth, availableHeight / groupHeight, 1);

  const scaledWidth = groupWidth * scale;
  const scaledHeight = groupHeight * scale;
  const offsetX = (VIEWBOX_WIDTH - scaledWidth) / 2 - minX * scale;
  const offsetY = (VIEWBOX_HEIGHT - scaledHeight) / 2 - minY * scale;

  const w = NODE_WIDTH * scale;
  const h = NODE_HEIGHT * scale;
  const pos = (n: NodeData) => ({
    x: (n.position?.x ?? 0) * scale + offsetX,
    y: (n.position?.y ?? 0) * scale + offsetY,
  });
  const byId: Record<string, NodeData> = {};
  nodes.forEach(n => { byId[n.id] = n; });

  const fontSize = Math.max(4.5, Math.min(7.5, 10 * scale * 8));

  return (
    <svg className="custom-minimap" viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
      <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#f8fafc" />
      {/* 연결선: 아래 중앙 → 위 중앙 베지어 (실제 캔버스 흐름과 동일한 방향) */}
      {(edges || []).map((e: any, i: number) => {
        const s = byId[e.source];
        const t = byId[e.target];
        if (!s || !t) return null;
        const sp = pos(s), tp = pos(t);
        const x1 = sp.x + w / 2, y1 = sp.y + h;
        const x2 = tp.x + w / 2, y2 = tp.y;
        const dy = Math.max(14, Math.abs(y2 - y1) / 2);
        return (
          <path
            key={`e-${i}`}
            d={`M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`}
            fill="none"
            stroke="#c2c8d4"
            strokeWidth={1.2}
          />
        );
      })}
      {/* 노드 카드: 흰 배경 + 타입색 헤더/테두리 + 노드명 */}
      {nodes.map((node) => {
        const { x, y } = pos(node);
        const color = TYPE_COLOR[node.type || ''] || '#94a3b8';
        const headerH = Math.max(4, h * 0.32);
        return (
          <g key={node.id}>
            <rect x={x} y={y} width={w} height={h} fill="#ffffff" stroke={color} strokeWidth={1} rx={4} ry={4} />
            <path d={`M ${x} ${y + 4} a 4 4 0 0 1 4 -4 h ${w - 8} a 4 4 0 0 1 4 4 v ${headerH - 4} h ${-w} z`} fill={color} opacity={0.85} />
            <text
              x={x + w / 2}
              y={y + headerH + (h - headerH) / 2 + fontSize * 0.35}
              textAnchor="middle"
              fill="#64748b"
              fontSize={fontSize}
              fontFamily="'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', ui-sans-serif, system-ui, sans-serif"
              fontWeight={500}
              letterSpacing="0.2"
            >
              {node.id.length > 14 ? node.id.slice(0, 13) + '…' : node.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const MiniMapOnlyPage: React.FC = () => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const lastDataRef = useRef<string>('');

  useEffect(() => {
    // 메인 캔버스에 보이는 최상위 노드만 표시 (컨테이너 내부 hidden 노드는 제외 —
    // 포함하면 Flow Editor보다 노드가 많아 보이는 문제)
    const topLevelOnly = (list: NodeData[]) => (list || []).filter(n => !n.parentId && !n.hidden);

    // window 객체에서 데이터 읽기
    if (window.MINIMAP_DATA) {
      setNodes(topLevelOnly(window.MINIMAP_DATA.nodes || []));
      setEdges(window.MINIMAP_DATA.edges || []);
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

        setNodes(topLevelOnly(rawNodes));
        setEdges(event.data.payload.edges || []);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <>
      <style>{minimapOnlyStyles}</style>
      <div className="minimap-only-wrapper">
        <CustomMiniMap nodes={nodes} edges={edges} />
      </div>
    </>
  );
};

export default MiniMapOnlyPage;
