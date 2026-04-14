import React from 'react';
import { X, Link, Trash2, Wand2, ArrowUp, ArrowDown } from 'lucide-react';
import { MappingConnection, SourceField, TransformType } from './MappingEditorModal';

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

export interface MappingListPanelProps {
  // 필수 props
  mappings: MappingConnection[];
  targetFieldName: string;
  targetNodeId: string;
  availableNodes: AvailableNodeInfo[];

  // 선택적 props (읽기 전용 모드일 경우 필요 없음)
  onMappingsChange?: (mappings: MappingConnection[]) => void;
  onOpenTransformModal?: (mappingId: string, sourceIndex?: number) => void;

  // UI 관련 props
  selectedMappingId?: string | null;
  onSelectMapping?: (mappingId: string | null) => void;
  recentlyAddedId?: string | null;

  // 스타일 관련
  isPopup?: boolean;
  onClose?: () => void;
  title?: string;
}

// Transform 함수 표시 이름
const getTransformLabel = (type: TransformType, params?: { funcId?: string; funcNm?: string; [key: string]: any }): string => {
  if (type === 'function' && params?.funcNm) {
    return params.funcNm;
  }
  const labels: Record<TransformType, string> = {
    none: '없음',
    substring: 'Substring',
    toUpperCase: '대문자',
    toLowerCase: '소문자',
    trim: 'Trim',
    replace: '치환',
    concat: '연결',
    split: '분할',
    function: '함수',
  };
  return labels[type] || type;
};

// 필드 재귀 검색 함수
const findFieldRecursive = (fields: FieldInfo[], fieldPath: string): FieldInfo | undefined => {
  const parts = fieldPath.split('.');
  for (const field of fields) {
    if (field.name === parts[0]) {
      if (parts.length === 1) return field;
      if (field.children) {
        return findFieldRecursive(field.children, parts.slice(1).join('.'));
      }
    }
  }
  return undefined;
};

export const MappingListPanel: React.FC<MappingListPanelProps> = ({
  mappings,
  targetFieldName,
  targetNodeId,
  availableNodes,
  onMappingsChange,
  onOpenTransformModal,
  selectedMappingId,
  onSelectMapping,
  recentlyAddedId,
  isPopup = false,
  onClose,
  title,
}) => {
  // 해당 타겟 필드에 연결된 매핑만 필터링
  const filteredMappings = mappings.filter(
    m => m.targetNodeId === targetNodeId && m.targetFieldName === targetFieldName
  );

  if (filteredMappings.length === 0) {
    return isPopup ? (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#94a3b8',
      }}>
        매핑이 없습니다.
      </div>
    ) : null;
  }

  // 매핑 삭제
  const removeMapping = (mappingId: string) => {
    if (!onMappingsChange) return;
    onMappingsChange(mappings.filter(m => m.id !== mappingId));
  };

  // 개별 소스 삭제
  const removeSourceFromMapping = (mappingId: string, sourceIndex: number) => {
    if (!onMappingsChange) return;
    const newMappings = mappings.map(m => {
      if (m.id === mappingId) {
        const newSources = [...(m.sources || [])];
        newSources.splice(sourceIndex, 1);
        return { ...m, sources: newSources };
      }
      return m;
    }).filter(m => (m.sources?.length || 0) > 0);
    onMappingsChange(newMappings);
  };

  // 소스 순서 변경 (위로)
  const moveSourceUp = (mappingId: string, sourceIndex: number) => {
    if (!onMappingsChange || sourceIndex <= 0) return;
    const newMappings = mappings.map(m => {
      if (m.id === mappingId) {
        const newSources = [...(m.sources || [])];
        [newSources[sourceIndex - 1], newSources[sourceIndex]] = [newSources[sourceIndex], newSources[sourceIndex - 1]];
        return { ...m, sources: newSources };
      }
      return m;
    });
    onMappingsChange(newMappings);
  };

  // 소스 순서 변경 (아래로)
  const moveSourceDown = (mappingId: string, sourceIndex: number, totalSources: number) => {
    if (!onMappingsChange || sourceIndex >= totalSources - 1) return;
    const newMappings = mappings.map(m => {
      if (m.id === mappingId) {
        const newSources = [...(m.sources || [])];
        [newSources[sourceIndex], newSources[sourceIndex + 1]] = [newSources[sourceIndex + 1], newSources[sourceIndex]];
        return { ...m, sources: newSources };
      }
      return m;
    });
    onMappingsChange(newMappings);
  };

  // 매핑 순서 변경 (위로)
  const moveMappingUp = (mappingId: string) => {
    if (!onMappingsChange) return;
    const filteredIndex = filteredMappings.findIndex(m => m.id === mappingId);
    if (filteredIndex <= 0) return;

    const prevMappingId = filteredMappings[filteredIndex - 1].id;
    const newMappings = [...mappings];
    const currentIndex = newMappings.findIndex(m => m.id === mappingId);
    const prevIndex = newMappings.findIndex(m => m.id === prevMappingId);

    if (currentIndex !== -1 && prevIndex !== -1) {
      [newMappings[prevIndex], newMappings[currentIndex]] = [newMappings[currentIndex], newMappings[prevIndex]];
    }
    onMappingsChange(newMappings);
  };

  // 매핑 순서 변경 (아래로)
  const moveMappingDown = (mappingId: string) => {
    if (!onMappingsChange) return;
    const filteredIndex = filteredMappings.findIndex(m => m.id === mappingId);
    if (filteredIndex >= filteredMappings.length - 1) return;

    const nextMappingId = filteredMappings[filteredIndex + 1].id;
    const newMappings = [...mappings];
    const currentIndex = newMappings.findIndex(m => m.id === mappingId);
    const nextIndex = newMappings.findIndex(m => m.id === nextMappingId);

    if (currentIndex !== -1 && nextIndex !== -1) {
      [newMappings[currentIndex], newMappings[nextIndex]] = [newMappings[nextIndex], newMappings[currentIndex]];
    }
    onMappingsChange(newMappings);
  };

  const isReadOnly = !onMappingsChange;

  return (
    <div
      style={{
        padding: isPopup ? '0' : '12px 24px',
        backgroundColor: isPopup ? 'white' : '#eff6ff',
        borderTop: isPopup ? 'none' : '1px solid #bfdbfe',
        maxHeight: isPopup ? 'none' : '300px',
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
        padding: isPopup ? '12px 16px' : '0',
        backgroundColor: isPopup ? '#dce4fd' : 'transparent',
        borderRadius: isPopup ? '8px 8px 0 0' : '0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link size={16} style={{ color: '#5277f7' }} />
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', marginLeft: '8px' }}>
            {title || `${targetFieldName} 매핑 목록`} ({filteredMappings.length}개)
          </span>
        </div>
        {isPopup && onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 매핑 목록 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: isPopup ? '0 16px 16px' : '0',
      }}>
        {filteredMappings.map((m, mappingIndex) => {
          const isRecent = m.id === recentlyAddedId;
          const hasTransform = m.transform && m.transform.type !== 'none';
          const sources = m.sources || [];
          const firstSource = sources[0];

          // Record 타입인지 확인
          const sourceNodeInfo = firstSource ? availableNodes.find(n => n.id === firstSource.nodeId) : undefined;
          const sourceField = sourceNodeInfo && firstSource ? findFieldRecursive(sourceNodeInfo.outputs, firstSource.fieldName) : undefined;
          const isRecordMapping = sourceField?.fieldType === 'Record';

          const isSelectedMapping = selectedMappingId === m.id;
          const isFirst = mappingIndex === 0;
          const isLast = mappingIndex === filteredMappings.length - 1;

          return (
            <div
              key={m.id}
              onClick={() => onSelectMapping?.(isSelectedMapping ? null : m.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                backgroundColor: isSelectedMapping ? '#fef3c7' : isRecent ? '#fef3c7' : 'white',
                borderRadius: '6px',
                border: isSelectedMapping ? '2px solid #f59e0b' : isRecent ? '2px solid #f59e0b' : '1px solid #bfdbfe',
                boxShadow: isSelectedMapping || isRecent ? '0 0 8px rgba(245, 158, 11, 0.4)' : 'none',
                cursor: onSelectMapping ? 'pointer' : 'default',
              }}
            >
              {/* 순서 변경 버튼 */}
              {!isReadOnly && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveMappingUp(m.id); }}
                    disabled={isFirst}
                    style={{
                      padding: '2px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: isFirst ? 'not-allowed' : 'pointer',
                      color: isFirst ? '#d1d5db' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="위로 이동"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveMappingDown(m.id); }}
                    disabled={isLast}
                    style={{
                      padding: '2px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: isLast ? 'not-allowed' : 'pointer',
                      color: isLast ? '#d1d5db' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="아래로 이동"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              )}

              {/* NEW 표시 */}
              {isRecent && (
                <span style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}>
                  NEW
                </span>
              )}

              {/* 소스 필드 목록 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                {sources.length === 0 ? (
                  <span style={{ color: '#94a3b8', fontSize: '14px' }}>소스 없음</span>
                ) : sources.length === 1 ? (
                  <span style={{ color: '#059669', fontFamily: 'monospace', fontWeight: '500', fontSize: '14px' }}>
                    {firstSource.nodeId}.<span style={{ fontWeight: '700' }}>{firstSource.fieldName}</span>
                  </span>
                ) : (
                  sources.map((source, srcIdx) => (
                    <div
                      key={`${m.id}-src-${srcIdx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '4px',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: '#16a34a',
                        backgroundColor: '#dcfce7',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        minWidth: '20px',
                        textAlign: 'center',
                      }}>
                        {srcIdx + 1}
                      </span>

                      <span style={{ color: '#059669', fontFamily: 'monospace', fontWeight: '500', fontSize: '13px', flex: 1 }}>
                        {source.nodeId}.<span style={{ fontWeight: '700' }}>{source.fieldName}</span>
                      </span>

                      {/* 소스별 변환 배지 */}
                      {source.transform && source.transform.type !== 'none' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          backgroundColor: '#f0abfc',
                          color: '#86198f',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                        }}>
                          <Wand2 size={10} />
                          {getTransformLabel(source.transform.type, source.transform.params)}
                        </span>
                      )}

                      {/* 소스별 변환 버튼 */}
                      {!isReadOnly && onOpenTransformModal && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onOpenTransformModal(m.id, srcIdx); }}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: source.transform && source.transform.type !== 'none' ? '#fae8ff' : 'transparent',
                            border: source.transform && source.transform.type !== 'none' ? '1px solid #e879f9' : '1px solid #e2e8f0',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: source.transform && source.transform.type !== 'none' ? '#a21caf' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '11px',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                          }}
                          title="변환 설정"
                        >
                          <Wand2 size={11} />
                          변환
                        </button>
                      )}

                      {!isReadOnly && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveSourceUp(m.id, srcIdx); }}
                            disabled={srcIdx === 0}
                            style={{
                              padding: '2px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: srcIdx === 0 ? 'not-allowed' : 'pointer',
                              color: srcIdx === 0 ? '#d1d5db' : '#64748b',
                              display: 'flex',
                            }}
                            title="우선순위 높이기"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveSourceDown(m.id, srcIdx, sources.length); }}
                            disabled={srcIdx === sources.length - 1}
                            style={{
                              padding: '2px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: srcIdx === sources.length - 1 ? 'not-allowed' : 'pointer',
                              color: srcIdx === sources.length - 1 ? '#d1d5db' : '#64748b',
                              display: 'flex',
                            }}
                            title="우선순위 낮추기"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeSourceFromMapping(m.id, srcIdx); }}
                            style={{
                              padding: '2px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#94a3b8',
                              display: 'flex',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                            onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                            title="소스 삭제"
                          >
                            <X size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Transform 표시 (단일 소스일 때만) */}
              {sources.length <= 1 && hasTransform && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: '#f0abfc',
                  color: '#86198f',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '3px 8px',
                  borderRadius: '4px',
                }}>
                  <Wand2 size={12} />
                  {getTransformLabel(m.transform!.type, m.transform!.params)}
                </span>
              )}

              {/* Record 표시 */}
              {isRecordMapping && (
                <span style={{
                  fontSize: '11px',
                  color: '#7c3aed',
                  backgroundColor: '#f5f3ff',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontWeight: '600',
                }}>
                  Record
                </span>
              )}

              {/* Transform 버튼 (단일 소스일 때만) */}
              {sources.length <= 1 && !isReadOnly && !isRecordMapping && onOpenTransformModal && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpenTransformModal(m.id); }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: hasTransform ? '#fae8ff' : 'transparent',
                    border: hasTransform ? '1px solid #e879f9' : '1px solid #e2e8f0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: hasTransform ? '#a21caf' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}
                >
                  <Wand2 size={14} />
                  변환
                </button>
              )}

              {/* 삭제 버튼 */}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeMapping(m.id); }}
                  style={{
                    padding: '6px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 팝업 모달 형태
export interface MappingListPopupProps extends Omit<MappingListPanelProps, 'isPopup'> {
  isOpen: boolean;
}

export const MappingListPopup: React.FC<MappingListPopupProps> = ({
  isOpen,
  onClose,
  ...panelProps
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          minWidth: '400px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <MappingListPanel
          {...panelProps}
          isPopup={true}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default MappingListPanel;
