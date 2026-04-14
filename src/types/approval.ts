// 액션별 서버 승인 시스템 타입 정의

// 저장 버튼이 있는 노드에만 적용
export type ApprovalActionType =
  | 'VARIABLE_SAVE';  // VariableNode 저장 버튼

export interface ApprovalRequest {
  actionType: ApprovalActionType;
  nodeId: string | null;
  timestamp: number;
  payload: Record<string, any>;
  context?: {
    nodeType?: string;
    nodeLabel?: string;
  };
}

export interface ApprovalResponse {
  approved: boolean;
  requestId: string;
  message?: string;
  modifiedPayload?: Record<string, any>;
}

export type ApprovalStatus = 'idle' | 'pending' | 'approved' | 'rejected' | 'error';

export interface ApprovalState {
  status: ApprovalStatus;
  message: string | null;
  requestId: string | null;
}
