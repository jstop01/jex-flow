import { useState, useCallback } from 'react';
import { ApprovalActionType, ApprovalRequest, ApprovalState } from '../types/approval';
import { requestApproval } from '../services/approvalService';

interface UseActionApprovalReturn {
  approvalState: ApprovalState;
  withApproval: <TArgs extends any[]>(
    actionType: ApprovalActionType,
    nodeId: string | null,
    originalFn: (...args: TArgs) => void,
    payloadBuilder: (...args: TArgs) => Record<string, any>,
    context?: { nodeType?: string; nodeLabel?: string }
  ) => (...args: TArgs) => void;
  resetApproval: () => void;
  isApproving: boolean;
}

export function useActionApproval(): UseActionApprovalReturn {
  const [approvalState, setApprovalState] = useState<ApprovalState>({
    status: 'idle',
    message: null,
    requestId: null,
  });

  const isApproving = approvalState.status === 'pending';

  const withApproval = useCallback(<TArgs extends any[]>(
    actionType: ApprovalActionType,
    nodeId: string | null,
    originalFn: (...args: TArgs) => void,
    payloadBuilder: (...args: TArgs) => Record<string, any>,
    context?: { nodeType?: string; nodeLabel?: string }
  ) => {
    return (...args: TArgs): void => {
      setApprovalState({ status: 'pending', message: null, requestId: null });

      const request: ApprovalRequest = {
        actionType,
        nodeId,
        timestamp: Date.now(),
        payload: payloadBuilder(...args),
        context,
      };

      requestApproval(request)
        .then((response) => {
          if (response.approved) {
            setApprovalState({
              status: 'approved',
              message: response.message || null,
              requestId: response.requestId,
            });
            originalFn(...args);
            setTimeout(() => {
              setApprovalState({ status: 'idle', message: null, requestId: null });
            }, 500);
          } else {
            setApprovalState({
              status: 'rejected',
              message: response.message || '서버에서 요청이 거부되었습니다.',
              requestId: response.requestId,
            });
          }
        })
        .catch((error) => {
          setApprovalState({
            status: 'error',
            message: error instanceof Error ? error.message : '승인 요청 중 오류 발생',
            requestId: null,
          });
        });
    };
  }, []);

  const resetApproval = useCallback(() => {
    setApprovalState({ status: 'idle', message: null, requestId: null });
  }, []);

  return { approvalState, withApproval, resetApproval, isApproving };
}
