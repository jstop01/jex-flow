import React from 'react';
import ReactDOM from 'react-dom';
import { Loader2, XCircle, AlertCircle } from 'lucide-react';
import { ApprovalState } from '../types/approval';

interface ApprovalOverlayProps {
  state: ApprovalState;
  onDismiss: () => void;
}

export const ApprovalOverlay: React.FC<ApprovalOverlayProps> = ({ state, onDismiss }) => {
  if (state.status === 'idle' || state.status === 'approved') return null;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(1px)',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '24px',
          maxWidth: '360px',
          width: '100%',
          margin: '0 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {state.status === 'pending' && (
          <>
            <Loader2 size={32} color="#5277f7" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#475569', margin: 0 }}>
              서버 승인 대기중...
            </p>
          </>
        )}

        {state.status === 'rejected' && (
          <>
            <XCircle size={32} color="#ef4444" />
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              요청이 거부되었습니다
            </p>
            {state.message && (
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, textAlign: 'center' }}>
                {state.message}
              </p>
            )}
            <button
              onClick={onDismiss}
              style={{
                marginTop: '8px',
                padding: '8px 16px',
                backgroundColor: '#5277f7',
                color: 'white',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              확인
            </button>
          </>
        )}

        {state.status === 'error' && (
          <>
            <AlertCircle size={32} color="#f59e0b" />
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              오류가 발생했습니다
            </p>
            {state.message && (
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, textAlign: 'center' }}>
                {state.message}
              </p>
            )}
            <button
              onClick={onDismiss}
              style={{
                marginTop: '8px',
                padding: '8px 16px',
                backgroundColor: '#5277f7',
                color: 'white',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              확인
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body
  );
};
