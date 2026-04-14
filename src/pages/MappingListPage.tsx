import React, { useState, useEffect } from 'react';
import { MappingListPanel } from '../components/MappingListPanel';
import { MappingConnection } from '../components/MappingEditorModal';

// 필드 정보 인터페이스
interface FieldInfo {
  name: string;
  fieldType?: string;
  children?: FieldInfo[];
}

// 노드 정보 인터페이스
interface AvailableNodeInfo {
  id: string;
  label: string;
  type: string;
  inputs: FieldInfo[];
  outputs: FieldInfo[];
}

// 외부에서 전달받을 데이터 인터페이스
interface MappingListData {
  mappings: MappingConnection[];
  targetFieldName: string;
  targetNodeId: string;
  availableNodes: AvailableNodeInfo[];
  title?: string;
  readOnly?: boolean;
}

// window 객체에 데이터 전달 인터페이스 선언
declare global {
  interface Window {
    MAPPING_LIST_DATA?: MappingListData;
    onMappingListChange?: (mappings: MappingConnection[]) => void;
  }
}

export const MappingListPage: React.FC = () => {
  const [data, setData] = useState<MappingListData | null>(null);
  const [mappings, setMappings] = useState<MappingConnection[]>([]);

  useEffect(() => {
    // window 객체에서 데이터 읽기
    if (window.MAPPING_LIST_DATA) {
      setData(window.MAPPING_LIST_DATA);
      setMappings(window.MAPPING_LIST_DATA.mappings || []);
    } else {
      // 테스트용 샘플 데이터
      const sampleData: MappingListData = {
        mappings: [
          {
            id: 'mapping-1',
            sources: [
              { nodeId: 'node1', fieldName: 'USER_ID' },
              { nodeId: 'node1', fieldName: 'USER_NAME' },
            ],
            targetNodeId: 'target1',
            targetFieldName: 'ACCT_TP',
          },
          {
            id: 'mapping-2',
            sources: [
              { nodeId: 'node2', fieldName: 'BIRTH_DT' },
            ],
            targetNodeId: 'target1',
            targetFieldName: 'ACCT_TP',
            transform: { type: 'substring', params: { start: 0, end: 8 } },
          },
        ],
        targetFieldName: 'ACCT_TP',
        targetNodeId: 'target1',
        availableNodes: [
          {
            id: 'node1',
            label: 'Node 1',
            type: 'Process',
            inputs: [],
            outputs: [
              { name: 'USER_ID', fieldType: 'String' },
              { name: 'USER_NAME', fieldType: 'String' },
            ],
          },
          {
            id: 'node2',
            label: 'Node 2',
            type: 'Process',
            inputs: [],
            outputs: [
              { name: 'BIRTH_DT', fieldType: 'String' },
            ],
          },
        ],
        title: '매핑 목록 테스트',
        readOnly: false,
      };
      setData(sampleData);
      setMappings(sampleData.mappings);
    }

    // postMessage 리스너 (iframe 통신용)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SET_MAPPING_DATA') {
        setData(event.data.payload);
        setMappings(event.data.payload.mappings || []);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleMappingsChange = (newMappings: MappingConnection[]) => {
    setMappings(newMappings);

    // 외부 콜백 호출
    if (window.onMappingListChange) {
      window.onMappingListChange(newMappings);
    }

    // postMessage로 부모에게 알림
    window.parent?.postMessage({
      type: 'MAPPING_LIST_CHANGED',
      payload: newMappings,
    }, '*');
  };

  if (!data) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: '#64748b',
      }}>
        데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: 'white',
      borderRadius: '8px',
      overflow: 'auto',
    }}>
      <MappingListPanel
        mappings={mappings}
        targetFieldName={data.targetFieldName}
        targetNodeId={data.targetNodeId}
        availableNodes={data.availableNodes}
        onMappingsChange={data.readOnly ? undefined : handleMappingsChange}
        title={data.title}
        isPopup={true}
      />
    </div>
  );
};

export default MappingListPage;
