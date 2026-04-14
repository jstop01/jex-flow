import { ApprovalRequest, ApprovalResponse } from '../types/approval';

// 거부 테스트용: 여기에 액션 타입을 추가하면 해당 액션이 거부됨
const rejectedActions = new Set<string>();

export const MOCK_APPROVAL_RESPONSES = {
  getResponse(request: ApprovalRequest): ApprovalResponse {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    if (rejectedActions.has(request.actionType)) {
      return {
        approved: false,
        requestId,
        message: `[Mock] 이 작업(${request.actionType})은 서버에서 거부되었습니다.`,
      };
    }

    return {
      approved: true,
      requestId,
      message: '승인됨',
    };
  },

  setRejected(actionType: string, rejected: boolean) {
    if (rejected) {
      rejectedActions.add(actionType);
    } else {
      rejectedActions.delete(actionType);
    }
  },
};
