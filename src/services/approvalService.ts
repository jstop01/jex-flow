import { ApprovalRequest, ApprovalResponse } from '../types/approval';
import { MOCK_APPROVAL_RESPONSES } from '../data/approval-mock';

// API 설정
const USE_MOCK = true;
const API_BASE_URL = 'http://10.254.241.251:3001/mock/api/approval';

/**
 * 서버에 액션 승인 요청
 */
export async function requestApproval(request: ApprovalRequest): Promise<ApprovalResponse> {
  if (USE_MOCK) {
    // Mock 모드: 네트워크 지연 시뮬레이션 후 Mock 응답 반환
    await new Promise(resolve => setTimeout(resolve, 800));
    return MOCK_APPROVAL_RESPONSES.getResponse(request);
  }

  const response = await fetch(`${API_BASE_URL}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('승인 요청 실패');
  }

  return response.json();
}
