// 확장된 노드 데이터 인터페이스
export interface FlowNodeData {
  // 기존 공통 필드
  label?: string;
  description?: string;

  // 노드 타입 식별 필드
  isStart?: boolean;
  isEnd?: boolean;
  isInternalStart?: boolean;
  isInternalEnd?: boolean;

  // 컨테이너 관련 필드
  containerId?: string;

  // 콜백 함수
  onChange?: (key: string, value: any) => void;

  // 기타 필드는 any로 허용
  [key: string]: any;
}

// Export용 정제된 노드 데이터
export interface CleanFlowNodeData extends Omit<FlowNodeData, 'onChange'> {}

// Flow 데이터 전체 구조
export interface FlowData {
  nodes: any[];
  edges: any[];
  version: string;
  timestamp: number;
}

// 분기 노드 타입 목록
export const BRANCH_NODE_TYPES = ['condition', 'switch', 'do'] as const;
export type BranchNodeType = typeof BRANCH_NODE_TYPES[number];

// 자식이 없는 노드 타입 목록
export const NO_CHILDREN_NODE_TYPES = ['error'] as const;
