import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Save, ArrowRightLeft, ChevronDown, ChevronRight, Trash2, Link, Wand2, Edit3, ArrowUp, ArrowDown, Sparkles, Settings } from 'lucide-react';
import { Edge } from 'reactflow';
import { fetchMapFunctions, fetchFunctionFields, MapFunction, FunctionField } from '../services/functionService';
import { fetchComponentIO } from '../services/componentService';

// 변환 함수 타입 정의
export type TransformType = 'none' | 'substring' | 'toUpperCase' | 'toLowerCase' | 'trim' | 'replace' | 'concat' | 'split' | 'function';

export interface TransformConfig {
  type: TransformType;
  params?: {
    start?: number;      // substring 시작 인덱스
    end?: number;        // substring 끝 인덱스
    from?: string;       // replace: 찾을 문자열
    to?: string;         // replace: 대체할 문자열
    delimiter?: string;  // split/concat: 구분자
    prefix?: string;     // concat: 앞에 붙일 문자열
    suffix?: string;     // concat: 뒤에 붙일 문자열
    funcId?: string;     // function: 함수 ID
    funcNm?: string;     // function: 함수 이름
    fieldValues?: Record<string, any>; // function: 함수 필드 입력값
  };
}

// 소스 필드 정보
export interface SourceField {
  nodeId: string;
  fieldName: string;
  transform?: TransformConfig; // 소스별 변환 함수
}

// 매핑 연결 정보
export interface MappingConnection {
  id: string;
  sources: SourceField[];
  targetNodeId: string;
  targetFieldName: string;
  separator?: string;       // 다중 소스 연결 시 구분자 (기본: "")
  transform?: TransformConfig; // 변환 함수 설정
}

// 필드 정보 (Record 타입의 children 지원)
interface FieldInfo {
  name: string;
  fieldType?: string;
  children?: FieldInfo[];
}

// 사용 가능한 노드 정보
interface AvailableNodeInfo {
  id: string;
  label: string;
  type: string;
  inputs: FieldInfo[];
  outputs: FieldInfo[];
  ido?: {
    componentId: string;
    type: string;
  };
}

interface MappingEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
  initialMappings: MappingConnection[];
  availableNodes: AvailableNodeInfo[];
  edges: Edge[]; // All edges to determine upstream connections
  onSave: (mappings: MappingConnection[]) => void;
  fixedTargetNodeId?: string | null; // 타겟 노드를 고정할 때 사용 (입력 매핑 시)
}

export const MappingEditorModal = ({
  isOpen,
  onClose,
  nodeId,
  initialMappings,
  availableNodes,
  edges,
  onSave,
  fixedTargetNodeId,
}: MappingEditorModalProps) => {
  const [mappings, setMappings] = useState<MappingConnection[]>([]);
  const [sourceNodeId, setSourceNodeId] = useState<string>('');
  const [targetNodeId, setTargetNodeId] = useState<string>('');
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);

  const [dragging, setDragging] = useState<{
    fieldName: string;
    sourceNodeId: string;
  } | null>(null);

  const sourceFieldRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const targetFieldRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const mappingAreaRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sourceScrollRef = useRef<HTMLDivElement>(null);
  const targetScrollRef = useRef<HTMLDivElement>(null);
  const [updateCounter, setUpdateCounter] = useState(0);
  const [refsReady, setRefsReady] = useState(false);

  // 매핑 클릭으로 인한 노드 변경인지 추적하는 플래그
  const isNodeChangeFromMappingClick = useRef(false);

  // 연결선 강제 업데이트
  const forceUpdate = useCallback(() => {
    setUpdateCounter(prev => prev + 1);
  }, []);

  // 스크롤 시 연결선 업데이트
  const handleScroll = useCallback(() => {
    forceUpdate();
  }, [forceUpdate]);

  // Record 펼침/접힘 상태 (source/target 별도 관리)
  const [expandedSourceRecords, setExpandedSourceRecords] = useState<Set<string>>(new Set());
  const [expandedTargetRecords, setExpandedTargetRecords] = useState<Set<string>>(new Set());

  // RECORD lazy-loading: children이 없을 때 API로 fetch한 children을 저장
  // key: `${nodeId}:${fieldName}` → children FieldInfo[]
  const [loadedSourceChildren, setLoadedSourceChildren] = useState<Record<string, FieldInfo[]>>({});
  const [loadedTargetChildren, setLoadedTargetChildren] = useState<Record<string, FieldInfo[]>>({});
  // 로딩 중인 RECORD 필드 key 집합
  const [loadingSourceRecords, setLoadingSourceRecords] = useState<Set<string>>(new Set());
  const [loadingTargetRecords, setLoadingTargetRecords] = useState<Set<string>>(new Set());

  // 최근 추가된 매핑 ID (하이라이트용)
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // 선택된 매핑 ID (연결선 강조용)
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null);

  // 선택된 타겟 필드 (매핑 목록 표시용)
  const [selectedTargetField, setSelectedTargetField] = useState<string | null>(null);

  // CallDO/Process 노드의 IO를 API로 동적 조회한 결과 캐시
  const [fetchedSourceIO, setFetchedSourceIO] = useState<{ inputs: FieldInfo[]; outputs: FieldInfo[] }>({ inputs: [], outputs: [] });
  const [fetchedTargetIO, setFetchedTargetIO] = useState<{ inputs: FieldInfo[]; outputs: FieldInfo[] }>({ inputs: [], outputs: [] });

  // 소스 노드 선택 시 IO 동적 조회
  useEffect(() => {
    if (!sourceNodeId || !isOpen) { setFetchedSourceIO({ inputs: [], outputs: [] }); return; }
    const node = availableNodes.find(n => n.id === sourceNodeId);
    if (!node) return;
    // 이미 outputs가 있으면 조회 불필요
    if (node.outputs && node.outputs.length > 0) { setFetchedSourceIO({ inputs: [], outputs: [] }); return; }
    // IDO가 있는 노드만 조회
    const componentId = node.ido?.componentId;
    if (!componentId) return;
    fetchComponentIO(componentId, node.ido?.type || 'IDO')
      .then(result => {
        const toFieldInfo = (f: any): FieldInfo => ({
          name: f.name || f.englishName || f.koreanName || '',
          fieldType: f.fieldType || f.type || 'FIELD',
          children: f.children?.map(toFieldInfo),
        });
        setFetchedSourceIO({
          inputs: result.inputs.map(toFieldInfo).filter(f => f.name),
          outputs: result.outputs.map(toFieldInfo).filter(f => f.name),
        });
      })
      .catch(() => setFetchedSourceIO({ inputs: [], outputs: [] }));
  }, [sourceNodeId, isOpen, availableNodes]);

  // 타겟 노드 선택 시 IO 동적 조회
  useEffect(() => {
    if (!targetNodeId || !isOpen) { setFetchedTargetIO({ inputs: [], outputs: [] }); return; }
    const node = availableNodes.find(n => n.id === targetNodeId);
    if (!node) return;
    if (node.inputs && node.inputs.length > 0) { setFetchedTargetIO({ inputs: [], outputs: [] }); return; }
    const componentId = node.ido?.componentId;
    if (!componentId) return;
    fetchComponentIO(componentId, node.ido?.type || 'IDO')
      .then(result => {
        const toFieldInfo = (f: any): FieldInfo => ({
          name: f.name || f.englishName || f.koreanName || '',
          fieldType: f.fieldType || f.type || 'FIELD',
          children: f.children?.map(toFieldInfo),
        });
        setFetchedTargetIO({
          inputs: result.inputs.map(toFieldInfo).filter(f => f.name),
          outputs: result.outputs.map(toFieldInfo).filter(f => f.name),
        });
      })
      .catch(() => setFetchedTargetIO({ inputs: [], outputs: [] }));
  }, [targetNodeId, isOpen, availableNodes]);

  // 자동매핑 모달 상태
  const [autoMapModalOpen, setAutoMapModalOpen] = useState(false);
  const [autoMapMode, setAutoMapMode] = useState<'depth' | 'order' | 'smart'>('depth');

  // Transform 모달 상태
  const [transformModalOpen, setTransformModalOpen] = useState(false);
  const [editingTransformId, setEditingTransformId] = useState<string | null>(null);
  const [editingSourceIndex, setEditingSourceIndex] = useState<number | null>(null);
  const [tempTransform, setTempTransform] = useState<TransformConfig | undefined>(undefined);

  // MAP 함수 목록 (변환 유형 버튼으로 사용)
  const [mapFunctions, setMapFunctions] = useState<MapFunction[]>([]);
  const [mapFunctionsLoaded, setMapFunctionsLoaded] = useState(false);

  // 함수 필드 팝업 상태
  const [funcFieldModalOpen, setFuncFieldModalOpen] = useState(false);
  const [funcFields, setFuncFields] = useState<FunctionField[]>([]);
  const [funcFieldValues, setFuncFieldValues] = useState<Record<string, any>>({});
  const [funcFieldsLoading, setFuncFieldsLoading] = useState(false);

  useEffect(() => {
    if (editingTransformId && !mapFunctionsLoaded) {
      fetchMapFunctions()
        .then(funcs => {
          setMapFunctions(funcs);
          setMapFunctionsLoaded(true);
        })
        .catch(err => console.error('MAP 함수 목록 로드 실패:', err));
    }
  }, [editingTransformId, mapFunctionsLoaded]);

  // Transform 함수 표시 이름
  const getTransformLabel = (type: TransformType, params?: TransformConfig['params']): string => {
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

  // Transform 업데이트 핸들러
  const updateMappingTransform = (mappingId: string, transform: TransformConfig | undefined) => {
    setMappings(prev => prev.map(m => {
      if (m.id === mappingId) {
        return { ...m, transform };
      }
      return m;
    }));
  };

  // Find all upstream (ancestor) nodes for the current node
  // Returns nodes that are connected via incoming edges (source -> target chain)
  const upstreamFilteredNodes = useMemo(() => {
    if (!nodeId || !edges || edges.length === 0) {
      return []; // Return empty if not connected
    }

    const upstreamIds = new Set<string>();
    const queue = [nodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Find all edges where current node is the target (incoming edges)
      edges.forEach(edge => {
        if (edge.target === currentId && !upstreamIds.has(edge.source)) {
          upstreamIds.add(edge.source);
          queue.push(edge.source);
        }
      });
    }

    // If no upstream nodes found, return empty array
    if (upstreamIds.size === 0) {
      return [];
    }

    // Filter available nodes to only include upstream nodes
    const filtered = availableNodes.filter(node => upstreamIds.has(node.id));
    return filtered;
  }, [nodeId, edges, availableNodes]);

  // Find all downstream (descendant) nodes for the current node
  // Returns nodes that are connected via outgoing edges (source -> target chain)
  const downstreamFilteredNodes = useMemo(() => {
    if (!nodeId || !edges || edges.length === 0) {
      return [];
    }

    const downstreamIds = new Set<string>();
    const queue = [nodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Find all edges where current node is the source (outgoing edges)
      edges.forEach(edge => {
        if (edge.source === currentId && !downstreamIds.has(edge.target)) {
          downstreamIds.add(edge.target);
          queue.push(edge.target);
        }
      });
    }

    // If no downstream nodes found, return empty array
    if (downstreamIds.size === 0) {
      return [];
    }

    // Filter available nodes to only include downstream nodes
    return availableNodes.filter(node => downstreamIds.has(node.id));
  }, [nodeId, edges, availableNodes]);

  useEffect(() => {
    if (isOpen) {
      // 기존 매핑 형식을 새로운 sources 배열 형식으로 마이그레이션
      const migratedMappings = (initialMappings || []).map((mapping: any) => {
        // 이미 sources 배열이 있으면 fieldIndex 제거하고 사용
        if (mapping.sources && Array.isArray(mapping.sources)) {
          return {
            ...mapping,
            sources: mapping.sources.map((s: any) => ({
              nodeId: s.nodeId,
              fieldName: s.fieldName,
            })),
          } as MappingConnection;
        }

        // 기존 형식 (sourceNodeId, sourceFieldName)을 새 형식으로 변환
        return {
          id: mapping.id,
          sources: [{
            nodeId: mapping.sourceNodeId,
            fieldName: mapping.sourceFieldName,
          }],
          targetNodeId: mapping.targetNodeId,
          targetFieldName: mapping.targetFieldName,
          separator: mapping.separator,
          transform: mapping.transform,
        } as MappingConnection;
      });

      setMappings(migratedMappings);

      // fixedTargetNodeId가 있으면 타겟 노드를 고정 (입력 매핑 시)
      if (fixedTargetNodeId) {
        setTargetNodeId(fixedTargetNodeId);
        if (migratedMappings && migratedMappings.length > 0) {
          const firstSource = migratedMappings[0].sources?.[0];
          setSourceNodeId(firstSource?.nodeId || '');
        } else {
          setSourceNodeId('');
        }
      } else if (migratedMappings && migratedMappings.length > 0) {
        // 첫 번째 매핑의 첫 번째 소스 노드를 선택
        const firstSource = migratedMappings[0].sources?.[0];
        setSourceNodeId(firstSource?.nodeId || '');
        setTargetNodeId(migratedMappings[0].targetNodeId || '');
      } else {
        setSourceNodeId('');
        setTargetNodeId('');
      }

      sourceFieldRefs.current.clear();
      targetFieldRefs.current.clear();
      setRefsReady(false);

      // lazy-loading 상태 초기화
      setLoadedSourceChildren({});
      setLoadedTargetChildren({});
      setLoadingSourceRecords(new Set());
      setLoadingTargetRecords(new Set());
      // 매핑에 사용된 필드의 부모 RECORD를 자동 펼침
      // 소스: "REC.ACCT_NO" 형태면 "REC"를 펼침
      const autoExpandSource = new Set<string>();
      const autoExpandTarget = new Set<string>();
      migratedMappings.forEach((m: MappingConnection) => {
        m.sources?.forEach(s => {
          if (s.fieldName && s.fieldName.includes('.')) {
            autoExpandSource.add(s.fieldName.split('.')[0]);
          }
        });
        if (m.targetFieldName && m.targetFieldName.includes('.')) {
          autoExpandTarget.add(m.targetFieldName.split('.')[0]);
        }
      });
      setExpandedSourceRecords(autoExpandSource);
      setExpandedTargetRecords(autoExpandTarget);

      // 추가 렌더링 트리거 (ref 설정 후)
      setTimeout(() => {
        forceUpdate();
        setRefsReady(true);
      }, 50);
      setTimeout(() => forceUpdate(), 150);
      setTimeout(() => forceUpdate(), 300);
    }
  }, [isOpen, initialMappings, availableNodes]);

  // 노드 선택이 변경될 때마다 선택 해제
  useEffect(() => {
    if (isOpen && (sourceNodeId || targetNodeId)) {
      // 매핑 클릭으로 인한 노드 변경이면 선택 해제하지 않음
      if (isNodeChangeFromMappingClick.current) {
        isNodeChangeFromMappingClick.current = false; // 플래그 리셋
      } else {
        // 드롭다운 등에서 직접 노드를 변경한 경우에만 선택 해제
        setSelectedMappingId(null);
        setSelectedTargetField(null); // 타겟 필드 선택도 해제
      }
    }
  }, [isOpen, sourceNodeId, targetNodeId]);

  // mappings 변경 시 연결선 강제 업데이트 (선택 상태는 유지)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => forceUpdate(), 150);
      const timer2 = setTimeout(() => forceUpdate(), 300);
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
      };
    }
  }, [isOpen, mappings]);

  const rawSourceNode = availableNodes.find(n => n.id === sourceNodeId);
  const rawTargetNode = availableNodes.find(n => n.id === targetNodeId);

  // API로 조회한 IO가 있으면 override
  const sourceNode = rawSourceNode ? {
    ...rawSourceNode,
    inputs: rawSourceNode.inputs.length > 0 ? rawSourceNode.inputs : fetchedSourceIO.inputs,
    outputs: rawSourceNode.outputs.length > 0 ? rawSourceNode.outputs : fetchedSourceIO.outputs,
  } : rawSourceNode;

  const targetNode = rawTargetNode ? {
    ...rawTargetNode,
    inputs: rawTargetNode.inputs.length > 0 ? rawTargetNode.inputs : fetchedTargetIO.inputs,
    outputs: rawTargetNode.outputs.length > 0 ? rawTargetNode.outputs : fetchedTargetIO.outputs,
  } : rawTargetNode;

  // fieldType이 Record/CMO 계열인지 판별 (대소문자 무관: 'RECORD' | 'Record' | 'COMMON' | 'Common')
  const isRecordFieldType = (ft?: string) => {
    const upper = ft?.toUpperCase();
    return upper === 'RECORD' || upper === 'COMMON';
  };

  // Record 타입의 children을 펼쳐서 flat한 배열로 만드는 함수
  // expandedSet을 받아서 펼쳐진 Record만 children을 보여줌
  // loadedChildrenMap: lazy-fetch된 children (key: fieldName)
  const flattenFields = useCallback((
    fields: FieldInfo[],
    expandedSet: Set<string>,
    parentPath: string = '',
    loadedChildrenMap: Record<string, FieldInfo[]> = {}
  ): Array<FieldInfo & { displayName: string; depth: number; isRecord: boolean; isLastChild: boolean; hasChildren: boolean }> => {
    const result: Array<FieldInfo & { displayName: string; depth: number; isRecord: boolean; isLastChild: boolean; hasChildren: boolean }> = [];
    fields.forEach((field, index) => {
      const fieldPath = parentPath ? `${parentPath}.${field.name}` : field.name;
      // lazy-loaded children이 있으면 우선 사용, 없으면 field.children 사용
      const effectiveChildren = (field.children && field.children.length > 0)
        ? field.children
        : (loadedChildrenMap[field.name] || []);
      const isRecord = isRecordFieldType(field.fieldType);
      // children이 있는지 여부 (아직 fetch 안 된 경우도 isRecord면 펼칠 수 있다고 표시)
      const hasChildren = isRecord && (effectiveChildren.length > 0 || !loadedChildrenMap.hasOwnProperty(field.name));
      const depth = parentPath ? parentPath.split('.').length : 0;
      const isLastChild = index === fields.length - 1;

      // 필드 자체 추가
      result.push({
        ...field,
        name: fieldPath,
        displayName: field.name,
        depth,
        isRecord: !!isRecord,
        hasChildren: !!hasChildren,
        isLastChild,
      });

      // Record 타입이고 펼쳐져 있으면 children 추가 (effectiveChildren 사용)
      if (isRecord && expandedSet.has(field.name) && effectiveChildren.length > 0) {
        result.push(...flattenFields(effectiveChildren, expandedSet, fieldPath, loadedChildrenMap));
      }
    });
    return result;
  }, []);

  // 자동매핑용: 모든 필드를 확장 상태에 관계없이 완전히 flat하게 변환
  const flattenAllFields = useCallback((
    fields: FieldInfo[],
    parentPath: string = ''
  ): Array<{ name: string; displayName: string; depth: number; isRecord: boolean }> => {
    const result: Array<{ name: string; displayName: string; depth: number; isRecord: boolean }> = [];
    fields.forEach(field => {
      const fieldPath = parentPath ? `${parentPath}.${field.name}` : field.name;
      const isRecord = !!(isRecordFieldType(field.fieldType) && field.children && field.children.length > 0);
      const depth = parentPath ? parentPath.split('.').length : 0;
      result.push({ name: fieldPath, displayName: field.name, depth, isRecord });
      if (isRecord && field.children) {
        result.push(...flattenAllFields(field.children, fieldPath));
      }
    });
    return result;
  }, []);

  // Record 토글 함수 (source 패널용) — children이 없으면 lazy fetch
  const toggleSourceRecord = useCallback(async (recordName: string, field: FieldInfo) => {
    // 이미 펼쳐진 경우: 닫기
    if (expandedSourceRecords.has(recordName)) {
      sourceFieldRefs.current.clear();
      setExpandedSourceRecords(prev => {
        const next = new Set(prev);
        next.delete(recordName);
        return next;
      });
      setTimeout(() => forceUpdate(), 50);
      setTimeout(() => forceUpdate(), 150);
      return;
    }

    // children이 이미 있거나 이미 fetch된 경우: 바로 열기
    const hasStaticChildren = field.children && field.children.length > 0;
    const hasLoadedChildren = loadedSourceChildren.hasOwnProperty(recordName);
    if (hasStaticChildren || hasLoadedChildren) {
      sourceFieldRefs.current.clear();
      setExpandedSourceRecords(prev => { const next = new Set(prev); next.add(recordName); return next; });
      setTimeout(() => forceUpdate(), 50);
      setTimeout(() => forceUpdate(), 150);
      return;
    }

    // children이 없으면 API fetch
    const componentId = sourceNode?.ido?.componentId || '';
    const comTp = sourceNode?.ido?.type || 'IMO';
    if (!componentId) {
      // componentId가 없으면 그냥 열기 (빈 children 허용)
      sourceFieldRefs.current.clear();
      setExpandedSourceRecords(prev => { const next = new Set(prev); next.add(recordName); return next; });
      setTimeout(() => forceUpdate(), 50);
      setTimeout(() => forceUpdate(), 150);
      return;
    }

    setLoadingSourceRecords(prev => { const next = new Set(prev); next.add(recordName); return next; });
    try {
      let children: FieldInfo[] = [];
      // 1차: 부모 컴포넌트에서 RECORD children 조회
      if (componentId) {
        const ioData = await fetchComponentIO(componentId, comTp);
        const recordField = ioData.outputs.find(
          (f: any) => (f.fieldType === 'RECORD' || f.type === 'RECORD') &&
            (f.englishName === recordName || f.name === recordName)
        );
        children = (recordField?.children || []).map((c: any) => ({
          name: c.englishName || c.name || '',
          fieldType: c.fieldType || c.type || 'FIELD',
          children: c.children,
        }));
      }
      // 2차: 부모에서 못 찾으면 CMO 자체를 직접 fetch
      if (children.length === 0) {
        const cmoData = await fetchComponentIO(recordName, 'CMO');
        const allCmoFields = [...(cmoData.outputs || []), ...(cmoData.inputs || [])];
        children = allCmoFields.map((c: any) => ({
          name: c.englishName || c.name || '',
          fieldType: c.fieldType || c.type || 'FIELD',
          children: c.children,
        }));
      }
      setLoadedSourceChildren(prev => ({ ...prev, [recordName]: children }));
    } catch (e) {
      console.error('[MappingEditorModal] Source RECORD children fetch failed:', e);
      setLoadedSourceChildren(prev => ({ ...prev, [recordName]: [] }));
    } finally {
      setLoadingSourceRecords(prev => { const next = new Set(prev); next.delete(recordName); return next; });
    }

    sourceFieldRefs.current.clear();
    setExpandedSourceRecords(prev => { const next = new Set(prev); next.add(recordName); return next; });
    setTimeout(() => forceUpdate(), 50);
    setTimeout(() => forceUpdate(), 150);
  }, [expandedSourceRecords, loadedSourceChildren, sourceNode, forceUpdate]);

  // Record 토글 함수 (target 패널용) — children이 없으면 lazy fetch
  const toggleTargetRecord = useCallback(async (recordName: string, field: FieldInfo) => {
    // 이미 펼쳐진 경우: 닫기
    if (expandedTargetRecords.has(recordName)) {
      targetFieldRefs.current.clear();
      setExpandedTargetRecords(prev => {
        const next = new Set(prev);
        next.delete(recordName);
        return next;
      });
      setTimeout(() => forceUpdate(), 50);
      setTimeout(() => forceUpdate(), 150);
      return;
    }

    // children이 이미 있거나 이미 fetch된 경우: 바로 열기
    const hasStaticChildren = field.children && field.children.length > 0;
    const hasLoadedChildren = loadedTargetChildren.hasOwnProperty(recordName);
    if (hasStaticChildren || hasLoadedChildren) {
      targetFieldRefs.current.clear();
      setExpandedTargetRecords(prev => { const next = new Set(prev); next.add(recordName); return next; });
      setTimeout(() => forceUpdate(), 50);
      setTimeout(() => forceUpdate(), 150);
      return;
    }

    // children이 없으면 API fetch (componentId 없어도 CMO 직접 조회 시도)
    const componentId = targetNode?.ido?.componentId || '';
    const comTp = targetNode?.ido?.type || 'IMO';

    setLoadingTargetRecords(prev => { const next = new Set(prev); next.add(recordName); return next; });
    try {
      let children: FieldInfo[] = [];
      // 1차: 부모 컴포넌트에서 RECORD children 조회
      if (componentId) {
        const ioData = await fetchComponentIO(componentId, comTp);
        const allFields = [...(ioData.outputs || []), ...(ioData.inputs || [])];
        const recordField = allFields.find(
          (f: any) => (f.fieldType === 'RECORD' || f.type === 'RECORD') &&
            (f.englishName === recordName || f.name === recordName)
        );
        children = (recordField?.children || []).map((c: any) => ({
          name: c.englishName || c.name || '',
          fieldType: c.fieldType || c.type || 'FIELD',
          children: c.children,
        }));
      }
      // 2차: 부모에서 못 찾으면 CMO 자체를 직접 fetch
      if (children.length === 0) {
        const cmoData = await fetchComponentIO(recordName, 'CMO');
        const allCmoFields = [...(cmoData.outputs || []), ...(cmoData.inputs || [])];
        children = allCmoFields.map((c: any) => ({
          name: c.englishName || c.name || '',
          fieldType: c.fieldType || c.type || 'FIELD',
          children: c.children,
        }));
      }
      setLoadedTargetChildren(prev => ({ ...prev, [recordName]: children }));
    } catch (e) {
      console.error('[MappingEditorModal] Target RECORD children fetch failed:', e);
      setLoadedTargetChildren(prev => ({ ...prev, [recordName]: [] }));
    } finally {
      setLoadingTargetRecords(prev => { const next = new Set(prev); next.delete(recordName); return next; });
    }

    targetFieldRefs.current.clear();
    setExpandedTargetRecords(prev => { const next = new Set(prev); next.add(recordName); return next; });
    setTimeout(() => forceUpdate(), 50);
    setTimeout(() => forceUpdate(), 150);
  }, [expandedTargetRecords, loadedTargetChildren, targetNode, forceUpdate]);

  // 펼쳐진 필드 목록
  const flattenedSourceOutputs = useMemo(() => {
    if (!sourceNode) return [];
    return flattenFields(sourceNode.outputs, expandedSourceRecords, '', loadedSourceChildren);
  }, [sourceNode, flattenFields, expandedSourceRecords, loadedSourceChildren]);

  const flattenedTargetInputs = useMemo(() => {
    if (!targetNode) return [];
    const result = flattenFields(targetNode.inputs, expandedTargetRecords, '', loadedTargetChildren);
    return result;
  }, [targetNode, flattenFields, expandedTargetRecords, loadedTargetChildren]);

  // Ref 콜백 - ref가 설정될 때마다 강제 업데이트
  const setSourceFieldRef = useCallback((fieldName: string, idx: number, el: HTMLDivElement | null) => {
    if (el) {
      const refKey = `${fieldName}-${idx}`;
      sourceFieldRefs.current.set(refKey, el);
      // ref 설정 후 즉시 forceUpdate (연결선 다시 그리기)
      setTimeout(() => forceUpdate(), 0);
    }
  }, []);

  const setTargetFieldRef = useCallback((fieldName: string, idx: number, el: HTMLDivElement | null) => {
    if (el) {
      const refKey = `${fieldName}-${idx}`;
      targetFieldRefs.current.set(refKey, el);
      // ref 설정 후 즉시 forceUpdate (연결선 다시 그리기)
      setTimeout(() => forceUpdate(), 0);
    }
  }, []);

  const handleDragStart = (fieldName: string, nodeId: string, isRecord: boolean, e: React.DragEvent) => {
    e.dataTransfer.setData('sourceField', fieldName);
    e.dataTransfer.setData('sourceNodeId', nodeId);
    e.dataTransfer.setData('sourceIsRecord', isRecord ? 'true' : 'false');
    e.dataTransfer.effectAllowed = 'link';

    // 투명한 드래그 이미지 생성 (고스트 이미지 숨기기)
    const emptyImg = document.createElement('div');
    emptyImg.style.width = '1px';
    emptyImg.style.height = '1px';
    emptyImg.style.opacity = '0';
    document.body.appendChild(emptyImg);
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
    setTimeout(() => document.body.removeChild(emptyImg), 0);

    setDragging({ fieldName, sourceNodeId: nodeId });
  };

  const handleDrag = (e: React.DragEvent) => {
    // Drag position tracking removed (no longer showing SVG lines)
  };

  const handleDragEnd = () => {
    setDragging(null);
  };

  const handleDrop = (targetFieldName: string, targetNodeIdParam: string, targetIsRecord: boolean, e: React.DragEvent) => {
    e.preventDefault();
    const sourceFieldName = e.dataTransfer.getData('sourceField');
    const sourceNodeIdParam = e.dataTransfer.getData('sourceNodeId');
    const sourceIsRecord = e.dataTransfer.getData('sourceIsRecord') === 'true';

    if (sourceFieldName && sourceNodeIdParam && targetNodeIdParam) {
      // 타입 검증: Record는 Record끼리, Field는 Field끼리만 매핑 가능
      if (sourceIsRecord !== targetIsRecord) {
        console.warn('[MappingEditorModal] Type mismatch: Record can only map to Record, Field can only map to Field');
        setDragging(null);
        return;
      }

      const newSource: SourceField = {
        nodeId: sourceNodeIdParam,
        fieldName: sourceFieldName,
      };

      // 같은 타겟에 이미 매핑이 있는지 확인
      const existingMapping = mappings.find(
        m => m.targetNodeId === targetNodeIdParam && m.targetFieldName === targetFieldName
      );

      if (existingMapping) {
        // 동일한 소스가 이미 있는지 확인 (중복 방지)
        const isDuplicate = existingMapping.sources?.some(
          s => s.nodeId === sourceNodeIdParam && s.fieldName === sourceFieldName
        );

        if (isDuplicate) {
          console.warn('[MappingEditorModal] Duplicate source ignored');
          setDragging(null);
          return;
        }

        // 기존 매핑의 sources 배열에 추가 (우선순위: 배열 끝에 추가)
        setMappings(prev => prev.map(m => {
          if (m.id === existingMapping.id) {
            return {
              ...m,
              sources: [...(m.sources || []), newSource],
            };
          }
          return m;
        }));

        // 하이라이트
        setRecentlyAddedId(existingMapping.id);
        setTimeout(() => setRecentlyAddedId(null), 2000);
      } else {
        // 새 매핑 생성
        const newMappingId = `mapping-${targetNodeIdParam}-${targetFieldName}-${Date.now()}`;
        const newMapping: MappingConnection = {
          id: newMappingId,
          sources: [newSource],
          targetNodeId: targetNodeIdParam,
          targetFieldName,
        };
        setMappings(prev => [...prev, newMapping]);

        // 새로 추가된 매핑 하이라이트 (2초 후 해제)
        setRecentlyAddedId(newMappingId);
        setTimeout(() => setRecentlyAddedId(null), 2000);
      }
    }
    setDragging(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
  };

  const removeMapping = (mappingId: string) => {
    setMappings(prev => prev.filter(m => m.id !== mappingId));
  };

  // 매핑 내 개별 소스 삭제
  const removeSourceFromMapping = (mappingId: string, sourceIndex: number) => {
    setMappings(prev => prev.map(m => {
      if (m.id === mappingId) {
        const newSources = [...(m.sources || [])];
        newSources.splice(sourceIndex, 1);
        // 소스가 없으면 매핑 자체를 삭제하지 않고 빈 배열로 유지
        return { ...m, sources: newSources };
      }
      return m;
    }).filter(m => (m.sources?.length || 0) > 0)); // 소스가 없는 매핑은 삭제
  };

  // 소스 순서 변경 (위로)
  const moveSourceUp = (mappingId: string, sourceIndex: number) => {
    if (sourceIndex <= 0) return;
    setMappings(prev => prev.map(m => {
      if (m.id === mappingId) {
        const newSources = [...(m.sources || [])];
        [newSources[sourceIndex - 1], newSources[sourceIndex]] = [newSources[sourceIndex], newSources[sourceIndex - 1]];
        return { ...m, sources: newSources };
      }
      return m;
    }));
  };

  // 소스 순서 변경 (아래로)
  const moveSourceDown = (mappingId: string, sourceIndex: number, totalSources: number) => {
    if (sourceIndex >= totalSources - 1) return;
    setMappings(prev => prev.map(m => {
      if (m.id === mappingId) {
        const newSources = [...(m.sources || [])];
        [newSources[sourceIndex], newSources[sourceIndex + 1]] = [newSources[sourceIndex + 1], newSources[sourceIndex]];
        return { ...m, sources: newSources };
      }
      return m;
    }));
  };

  // 매핑 순서 변경 함수 (위로) - 필터된 목록 내에서 순서 변경
  const moveMappingUp = (mappingId: string, filteredMappings: MappingConnection[]) => {
    const filteredIndex = filteredMappings.findIndex(m => m.id === mappingId);
    if (filteredIndex <= 0) return; // 이미 맨 위

    const prevMappingId = filteredMappings[filteredIndex - 1].id;

    setMappings(prev => {
      const newMappings = [...prev];
      const currentIndex = newMappings.findIndex(m => m.id === mappingId);
      const prevIndex = newMappings.findIndex(m => m.id === prevMappingId);

      if (currentIndex !== -1 && prevIndex !== -1) {
        [newMappings[prevIndex], newMappings[currentIndex]] = [newMappings[currentIndex], newMappings[prevIndex]];
      }
      return newMappings;
    });
  };

  // 매핑 순서 변경 함수 (아래로) - 필터된 목록 내에서 순서 변경
  const moveMappingDown = (mappingId: string, filteredMappings: MappingConnection[]) => {
    const filteredIndex = filteredMappings.findIndex(m => m.id === mappingId);
    if (filteredIndex >= filteredMappings.length - 1) return; // 이미 맨 아래

    const nextMappingId = filteredMappings[filteredIndex + 1].id;

    setMappings(prev => {
      const newMappings = [...prev];
      const currentIndex = newMappings.findIndex(m => m.id === mappingId);
      const nextIndex = newMappings.findIndex(m => m.id === nextMappingId);

      if (currentIndex !== -1 && nextIndex !== -1) {
        [newMappings[currentIndex], newMappings[nextIndex]] = [newMappings[nextIndex], newMappings[currentIndex]];
      }
      return newMappings;
    });
  };

  // 연결선 좌표 계산
  const getConnectionLines = useCallback(() => {
    if (!mappingAreaRef.current || !refsReady) return [];

    const lines: Array<{
      id: string;
      mappingId: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      sourceField: string;
      targetField: string;
      sourceIndex: number;
      totalSources: number;
    }> = [];

    const areaRect = mappingAreaRef.current.getBoundingClientRect();

    // 현재 선택된 노드의 매핑만 표시 (sources 배열 내 해당 노드가 있는 매핑)
    const currentMappings = mappings.filter(
      m => m.sources?.some(s => s.nodeId === sourceNodeId) && m.targetNodeId === targetNodeId
    );

    currentMappings.forEach(mapping => {
      // 타겟 필드명으로 ref 찾기
      let targetEl: HTMLDivElement | undefined;
      targetFieldRefs.current.forEach((el, key) => {
        if (key.startsWith(mapping.targetFieldName + '-')) {
          targetEl = el;
        }
      });

      if (!targetEl) return;

      const targetRect = targetEl.getBoundingClientRect();
      if (targetRect.width === 0) return;

      // 각 소스에 대해 연결선 생성 (sources가 없으면 빈 배열)
      (mapping.sources || []).forEach((source, sourceIndex) => {
        // 현재 선택된 소스 노드의 필드만 표시
        if (source.nodeId !== sourceNodeId) return;

        // 소스 필드명으로 ref 찾기
        let sourceEl: HTMLDivElement | undefined;
        sourceFieldRefs.current.forEach((el, key) => {
          if (key.startsWith(source.fieldName + '-')) {
            sourceEl = el;
          }
        });

        if (sourceEl) {
          const sourceRect = sourceEl.getBoundingClientRect();
          if (sourceRect.width === 0) return;

          // 매핑 영역 기준으로 상대 좌표 계산
          const x1 = sourceRect.right - areaRect.left;
          const y1 = sourceRect.top + sourceRect.height / 2 - areaRect.top;
          const x2 = targetRect.left - areaRect.left;
          const y2 = targetRect.top + targetRect.height / 2 - areaRect.top;

          lines.push({
            id: `${mapping.id}-${sourceIndex}`,
            mappingId: mapping.id,
            x1,
            y1,
            x2,
            y2,
            sourceField: source.fieldName,
            targetField: mapping.targetFieldName,
            sourceIndex,
            totalSources: (mapping.sources || []).length,
          });
        }
      });
    });

    return lines;
  }, [mappings, refsReady, sourceNodeId, targetNodeId, updateCounter]);

  // 연결선 데이터
  const connectionLines = useMemo(() => getConnectionLines(), [getConnectionLines, mappings, refsReady, sourceNodeId, targetNodeId, updateCounter]);

  const handleSave = () => {
    onSave(mappings);
    onClose();
  };

  // Transform 모달 관련 함수들
  const openTransformModal = (mappingId: string, sourceIndex?: number) => {
    const mapping = mappings.find(m => m.id === mappingId);
    setEditingTransformId(mappingId);
    setEditingSourceIndex(sourceIndex ?? null);
    if (sourceIndex !== undefined) {
      setTempTransform(mapping?.sources[sourceIndex]?.transform);
    } else {
      setTempTransform(mapping?.transform);
    }
    setTransformModalOpen(true);
  };

  const closeTransformModal = () => {
    setTransformModalOpen(false);
    setEditingTransformId(null);
    setEditingSourceIndex(null);
    setTempTransform(undefined);
  };

  const saveTransformModal = () => {
    if (editingTransformId) {
      setMappings(prev => prev.map(m => {
        if (m.id === editingTransformId) {
          if (editingSourceIndex !== null) {
            const newSources = m.sources.map((s, i) =>
              i === editingSourceIndex ? { ...s, transform: tempTransform } : s
            );
            return { ...m, sources: newSources };
          }
          return { ...m, transform: tempTransform };
        }
        return m;
      }));
    }
    closeTransformModal();
  };

  // 스마트 매핑용: 필드명을 소문자 토큰 배열로 정규화
  const normalizeTokens = (name: string): string[] => {
    const leaf = name.split('.').pop() || name;
    return leaf
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/[\s_\-]+/)
      .map(t => t.toLowerCase())
      .filter(t => t.length > 0);
  };

  // 두 필드명 사이의 유사도 점수 (0.0 ~ 1.0)
  const calcNameSimilarity = (a: string, b: string): number => {
    const tokA = normalizeTokens(a);
    const tokB = normalizeTokens(b);
    if (tokA.length === 0 || tokB.length === 0) return 0;
    if (tokA.join(' ') === tokB.join(' ')) return 1.0;
    const setA = new Set(tokA);
    const setB = new Set(tokB);
    const intersection = [...setA].filter(t => setB.has(t)).length;
    const union = new Set([...setA, ...setB]).size;
    const jaccard = intersection / union;
    // 짧은 쪽의 토큰이 모두 긴 쪽에 포함되면 포함 점수 부여
    const minLen = Math.min(setA.size, setB.size);
    const containment = intersection === minLen && minLen > 0 ? 0.6 : 0;
    return Math.max(jaccard, containment);
  };

  // 자동매핑 실행
  const performAutoMapping = () => {
    if (!sourceNode || !targetNode || !sourceNodeId || !targetNodeId) return;

    const allSources = flattenAllFields(sourceNode.outputs);
    const allTargets = flattenAllFields(targetNode.inputs);

    const now = Date.now();
    let idx = 0;
    const newMappings: MappingConnection[] = [];

    const makeMappingEntry = (
      src: { name: string },
      tgt: { name: string }
    ): MappingConnection => ({
      id: `mapping-${targetNodeId}-${tgt.name}-${now}-${idx++}`,
      sources: [{ nodeId: sourceNodeId, fieldName: src.name }],
      targetNodeId,
      targetFieldName: tgt.name,
    });

    if (autoMapMode === 'smart') {
      // 스마트 매핑: 이름 유사도로 최적 쌍 연결
      const THRESHOLD = 0.3;
      const srcFields = allSources.filter(f => !f.isRecord);
      const srcTables = allSources.filter(f => f.isRecord);
      const tgtFields = allTargets.filter(f => !f.isRecord);
      const tgtTables = allTargets.filter(f => f.isRecord);

      const matchGroup = (
        srcs: typeof allSources,
        tgts: typeof allTargets,
      ) => {
        const usedSrc = new Set<string>();
        for (const tgt of tgts) {
          let bestSrc: typeof srcs[0] | null = null;
          let bestScore = THRESHOLD;
          for (const src of srcs) {
            if (usedSrc.has(src.name)) continue;
            const score = calcNameSimilarity(src.name, tgt.name);
            if (score > bestScore) {
              bestScore = score;
              bestSrc = src;
            }
          }
          if (bestSrc) {
            usedSrc.add(bestSrc.name);
            newMappings.push(makeMappingEntry(bestSrc, tgt));
          }
        }
      };

      matchGroup(srcFields, tgtFields);
      matchGroup(srcTables, tgtTables);
    } else if (autoMapMode === 'order') {
      // 순서별: flattened 전체 순서 기준으로 field↔field, table↔table
      const srcFields = allSources.filter(f => !f.isRecord);
      const srcTables = allSources.filter(f => f.isRecord);
      const tgtFields = allTargets.filter(f => !f.isRecord);
      const tgtTables = allTargets.filter(f => f.isRecord);

      const fieldCount = Math.min(srcFields.length, tgtFields.length);
      for (let i = 0; i < fieldCount; i++) {
        newMappings.push(makeMappingEntry(srcFields[i], tgtFields[i]));
      }
      const tableCount = Math.min(srcTables.length, tgtTables.length);
      for (let i = 0; i < tableCount; i++) {
        newMappings.push(makeMappingEntry(srcTables[i], tgtTables[i]));
      }
    } else {
      // 뎁스별: 같은 depth 내에서 field↔field, table↔table
      const maxDepth = Math.max(
        ...allSources.map(f => f.depth),
        ...allTargets.map(f => f.depth),
        0
      );
      for (let depth = 0; depth <= maxDepth; depth++) {
        const srcAtDepth = allSources.filter(f => f.depth === depth);
        const tgtAtDepth = allTargets.filter(f => f.depth === depth);

        const srcFields = srcAtDepth.filter(f => !f.isRecord);
        const srcTables = srcAtDepth.filter(f => f.isRecord);
        const tgtFields = tgtAtDepth.filter(f => !f.isRecord);
        const tgtTables = tgtAtDepth.filter(f => f.isRecord);

        const fieldCount = Math.min(srcFields.length, tgtFields.length);
        for (let i = 0; i < fieldCount; i++) {
          newMappings.push(makeMappingEntry(srcFields[i], tgtFields[i]));
        }
        const tableCount = Math.min(srcTables.length, tgtTables.length);
        for (let i = 0; i < tableCount; i++) {
          newMappings.push(makeMappingEntry(srcTables[i], tgtTables[i]));
        }
      }
    }

    // 이미 매핑된 타겟 필드는 제외
    const existingTargets = new Set(
      mappings.map(m => `${m.targetNodeId}::${m.targetFieldName}`)
    );
    const toAdd = newMappings.filter(
      nm => !existingTargets.has(`${nm.targetNodeId}::${nm.targetFieldName}`)
    );

    if (toAdd.length > 0) {
      setMappings(prev => [...prev, ...toAdd]);
    }
    setAutoMapModalOpen(false);
  };

  if (!isOpen) return null;

  // Start 노드 찾기 (소스 노드 목록에 포함)
  const startNode = availableNodes.find(n => n.type === 'Start');
  // End 노드 찾기 (타겟 노드 목록에 포함)
  const endNode = availableNodes.find(n => n.type === 'End');

  // 소스 노드 목록: upstream 노드 + Start 노드 + Variable 노드
  const sourceNodeCandidates = [...upstreamFilteredNodes];
  if (startNode && !sourceNodeCandidates.find(n => n.id === startNode.id)) {
    sourceNodeCandidates.push(startNode);
  }
  // Variable 노드: 엣지 연결 여부와 무관하게 항상 소스 목록에 포함
  availableNodes
    .filter(n => n.type === 'Variable')
    .forEach(varNode => {
      if (!sourceNodeCandidates.find(n => n.id === varNode.id)) {
        sourceNodeCandidates.push(varNode);
      }
    });
  // outputs가 없는 노드도 표시 (IDO/IMO 필드가 아직 로드되지 않은 경우)
  const nodesWithOutputs = sourceNodeCandidates
    .sort((a, b) => {
      // Start 노드는 항상 첫 번째에 표시
      if (a.type === 'Start') return -1;
      if (b.type === 'Start') return 1;
      // Variable 노드는 Start 다음에 표시
      if (a.type === 'Variable' && b.type !== 'Variable') return -1;
      if (b.type === 'Variable' && a.type !== 'Variable') return 1;
      const aCount = a.outputs?.length || 0;
      const bCount = b.outputs?.length || 0;
      return bCount - aCount;
    });

  // 타겟 노드 목록: downstream 노드 + End 노드 (INPUT이 있는 노드만, 없는 노드 제외)
  const targetNodeCandidates = [...downstreamFilteredNodes];
  if (endNode && !targetNodeCandidates.find(n => n.id === endNode.id)) {
    targetNodeCandidates.push(endNode);
  }
  // inputs가 없는 노드도 표시
  const nodesWithInputs = targetNodeCandidates
    .sort((a, b) => {
      // End 노드는 항상 첫 번째에 표시
      if (a.type === 'End') return -1;
      if (b.type === 'End') return 1;
      const aCount = a.inputs?.length || 0;
      const bCount = b.inputs?.length || 0;
      return bCount - aCount;
    });

  // 중복 필드명 감지 및 번호 추가 함수
  const getDisplayName = (fieldName: string, fields: Array<{ name: string }>, currentIndex: number) => {
    const sameNameFields = fields.filter(f => f.name === fieldName);
    if (sameNameFields.length > 1) {
      // 같은 이름이 여러 개 있으면 현재 인덱스가 몇 번째인지 찾기
      let occurrence = 0;
      for (let i = 0; i <= currentIndex; i++) {
        if (fields[i].name === fieldName) {
          occurrence++;
        }
      }
      return `${fieldName} (${occurrence})`;
    }
    return fieldName;
  };

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
        zIndex: 99999,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: 'white',
          borderRadius: '0',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            backgroundColor: '#dce4fd',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ArrowRightLeft size={24} style={{ color: '#5277f7' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>Mapping 설정</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                소스 노드의 output을 타겟 노드의 input에 드래그하여 연결
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setAutoMapModalOpen(true)}
              disabled={!sourceNodeId || !targetNodeId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: sourceNodeId && targetNodeId ? '#5277f7' : '#e2e8f0',
                color: sourceNodeId && targetNodeId ? 'white' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                cursor: sourceNodeId && targetNodeId ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: '600',
              }}
              onMouseOver={(e) => { if (sourceNodeId && targetNodeId) e.currentTarget.style.backgroundColor = '#4166d9'; }}
              onMouseOut={(e) => { if (sourceNodeId && targetNodeId) e.currentTarget.style.backgroundColor = '#5277f7'; }}
              title="Source/Target 필드를 자동으로 매핑합니다"
            >
              <Sparkles size={15} />
              자동매핑
            </button>
            <button
              onClick={() => setMappings([])}
              disabled={mappings.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: mappings.length > 0 ? '#fee2e2' : '#f1f5f9',
                color: mappings.length > 0 ? '#ef4444' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                cursor: mappings.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: '600',
              }}
              onMouseOver={(e) => { if (mappings.length > 0) e.currentTarget.style.backgroundColor = '#fecaca'; }}
              onMouseOut={(e) => { if (mappings.length > 0) e.currentTarget.style.backgroundColor = '#fee2e2'; }}
              title="모든 매핑 연결을 초기화합니다"
            >
              <Trash2 size={15} />
              초기화
            </button>
          </div>
        </div>

        {/* Node Selection */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            padding: '8px 16px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
          }}
        >
          {/* Source Node */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
              소스 노드
            </label>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setSourceDropdownOpen(!sourceDropdownOpen);
                  setTargetDropdownOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  textAlign: 'left',
                  backgroundColor: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  color: sourceNodeId ? '#1e293b' : '#94a3b8',
                }}
              >
                <span>
                  {sourceNode
                    ? `${sourceNode.label || sourceNode.id} (${sourceNode.type})`
                    : '선택'}
                </span>
                <ChevronDown size={14} style={{ color: '#94a3b8', transform: sourceDropdownOpen ? 'rotate(180deg)' : 'none' }} />
              </button>
              {sourceDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    zIndex: 100,
                  }}
                >
                  {nodesWithOutputs.length > 0 ? (
                    nodesWithOutputs.map(node => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => {
                          setSourceNodeId(node.id);
                          setSourceDropdownOpen(false);
                          sourceFieldRefs.current.clear();
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          textAlign: 'left',
                          backgroundColor: sourceNodeId === node.id ? '#eff6ff' : 'white',
                          border: 'none',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        <span style={{ fontWeight: '500', color: '#1e293b' }}>
                          {node.label || node.id}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          marginLeft: '6px',
                          color: node.type === 'Variable' ? '#059669' : '#94a3b8',
                          fontWeight: node.type === 'Variable' ? '500' : 'normal',
                        }}>
                          ({node.type})
                        </span>
                      </button>
                    ))
                  ) : (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                      선택 가능한 노드 없음
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Target Node */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
              타겟 노드
            </label>
            <div style={{ position: 'relative' }}>
              {fixedTargetNodeId ? (
                // 타겟 노드 고정 시 읽기 전용 표시
                <div
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    textAlign: 'left',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    color: '#1e293b',
                    cursor: 'not-allowed',
                  }}
                >
                  <span>{targetNode ? `${targetNode.label || targetNode.id} (${targetNode.type})` : fixedTargetNodeId}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', backgroundColor: '#e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>고정</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetDropdownOpen(!targetDropdownOpen);
                      setSourceDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      textAlign: 'left',
                      backgroundColor: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      color: targetNodeId ? '#1e293b' : '#94a3b8',
                    }}
                  >
                    <span>{targetNode ? `${targetNode.label || targetNode.id} (${targetNode.type})` : '선택'}</span>
                    <ChevronDown size={14} style={{ color: '#94a3b8', transform: targetDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                  </button>
                  {targetDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        zIndex: 100,
                      }}
                    >
                      {nodesWithInputs.length > 0 ? (
                        nodesWithInputs.map(node => (
                          <button
                            key={node.id}
                            type="button"
                            onClick={() => {
                              setTargetNodeId(node.id);
                              setTargetDropdownOpen(false);
                              targetFieldRefs.current.clear();
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              textAlign: 'left',
                              backgroundColor: targetNodeId === node.id ? '#eff6ff' : 'white',
                              border: 'none',
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            <span style={{ fontWeight: '500', color: '#1e293b' }}>{node.label || node.id}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>({node.type})</span>
                          </button>
                        ))
                      ) : (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                          선택 가능한 노드 없음
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mapping Area */}
        <div
          ref={mappingAreaRef}
          style={{
            flex: 1,
            display: 'flex',
            minHeight: 0,
            position: 'relative',
          }}
        >
          {/* Connection Lines SVG Overlay */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            {connectionLines.map((line) => {
              // 베지어 곡선 계산
              const controlPointOffset = Math.min(80, Math.abs(line.x2 - line.x1) * 0.4);
              const path = `M ${line.x1} ${line.y1} C ${line.x1 + controlPointOffset} ${line.y1}, ${line.x2 - controlPointOffset} ${line.y2}, ${line.x2} ${line.y2}`;
              const isSelected = selectedMappingId === line.mappingId;
              const isMultiSource = line.totalSources > 1;

              return (
                <g key={line.id} style={{ opacity: selectedMappingId && !isSelected ? 0.3 : 1 }}>
                  {/* 배경 선 (더 두껍고 반투명) */}
                  <path
                    d={path}
                    fill="none"
                    stroke={isSelected ? "rgba(245, 158, 11, 0.3)" : "rgba(82, 119, 247, 0.15)"}
                    strokeWidth={isSelected ? 14 : 8}
                    strokeLinecap="round"
                  />
                  {/* 메인 연결선 */}
                  <path
                    d={path}
                    fill="none"
                    stroke={isSelected ? "#f59e0b" : "#5277f7"}
                    strokeWidth={isSelected ? 4 : 2}
                    strokeLinecap="round"
                  />
                  {/* 소스 끝 원 */}
                  <circle
                    cx={line.x1}
                    cy={line.y1}
                    r={isSelected ? 6 : 4}
                    fill="#10b981"
                    stroke="white"
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  {/* 타겟 끝 원 */}
                  <circle
                    cx={line.x2}
                    cy={line.y2}
                    r={isSelected ? 6 : 4}
                    fill="#f59e0b"
                    stroke="white"
                    strokeWidth={isSelected ? 3 : 2}
                  />
                </g>
              );
            })}
          </svg>

          {/* Source Fields (LEFT) */}
          <div
            style={{
              width: '24%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '6px 12px',
                backgroundColor: '#ecfdf5',
                borderBottom: '1px solid #a7f3d0',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span style={{ fontWeight: '600', fontSize: '12px', color: '#065f46' }}>Source</span>
            </div>
            <div ref={sourceScrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {sourceNode && flattenedSourceOutputs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {flattenedSourceOutputs.map((field, idx) => {
                    const isMapped = mappings.some(
                      m => m.sources?.some(s => s.nodeId === sourceNodeId && s.fieldName === field.name)
                    );
                    const isChild = field.depth > 0;
                    const isExpanded = expandedSourceRecords.has(field.displayName);
                    // 선택된 매핑의 소스 필드인지 확인
                    const isSelectedSource = selectedMappingId && mappings.some(
                      m => m.id === selectedMappingId && m.sources?.some(s => s.nodeId === sourceNodeId && s.fieldName === field.name)
                    );

                    return (
                      <div
                        key={`src-${field.name}-${idx}`}
                        style={{ display: 'flex', alignItems: 'stretch' }}
                      >
                        {/* 세로선 영역 */}
                        {isChild && (
                          <div style={{
                            width: `${field.depth * 24}px`,
                            display: 'flex',
                            justifyContent: 'flex-end',
                            paddingRight: '8px',
                          }}>
                            <div style={{
                              width: '2px',
                              backgroundColor: '#e2e8f0',
                              marginLeft: 'auto',
                            }} />
                          </div>
                        )}

                        {/* 필드 항목 */}
                        <div
                          ref={el => { if (el) setSourceFieldRef(field.name, idx, el); }}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(field.name, sourceNodeId, field.isRecord, e)}
                          onDrag={handleDrag}
                          onDragEnd={handleDragEnd}
                          onClick={() => field.isRecord && toggleSourceRecord(field.displayName, field)}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: field.isRecord ? '4px 10px' : '6px 12px',
                            cursor: 'grab',
                            userSelect: 'none',
                            backgroundColor: isSelectedSource ? '#fef3c7' : field.isRecord ? '#f5f3ff' : '#ffffff',
                            borderRadius: field.isRecord ? '6px' : '8px',
                            marginBottom: field.isRecord ? '2px' : '3px',
                            border: isSelectedSource ? '2px solid #f59e0b' : field.isRecord ? '1px solid #ddd6fe' : '1px solid #e2e8f0',
                            boxShadow: isSelectedSource ? '0 0 8px rgba(245, 158, 11, 0.3)' : field.isRecord ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.04)',
                            transition: 'all 0.2s ease-in-out',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Record 화살표 아이콘 */}
                            {field.isRecord && (
                              <div style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
                                {loadingSourceRecords.has(field.displayName)
                                  ? <span style={{ fontSize: '12px', animation: 'spin 1s linear infinite' }}>⟳</span>
                                  : isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                                }
                              </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: field.isRecord ? 600 : 500,
                                color: '#1e293b',
                              }}>
                                {field.displayName}
                              </span>
                            </div>
                          </div>

                          {/* 연결 포인트 */}
                          <div
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              backgroundColor: isMapped ? '#10b981' : '#10b981',
                              opacity: isMapped ? 1 : 0.6,
                              flexShrink: 0,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                  <Link size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <span style={{ fontSize: '14px' }}>
                    {sourceNodeId ? 'output 필드가 없습니다' : '소스 노드를 선택하세요'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Middle Gap Area - 연결선 표시 영역 */}
          <div
            style={{
              width: '52%',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#f8fafc',
              borderLeft: '1px solid #e2e8f0',
              borderRight: '1px solid #e2e8f0',
            }}
          >
            {/* 가운데 헤더 */}
            <div
              style={{
                padding: '6px 8px',
                backgroundColor: '#f1f5f9',
                borderBottom: '1px solid #e2e8f0',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>→</span>
            </div>
            {/* 연결선이 그려지는 빈 영역 */}
            <div style={{ flex: 1 }} />
          </div>

          {/* Target Fields (RIGHT) */}
          <div
            style={{
              width: '24%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '6px 12px',
                backgroundColor: '#fffbeb',
                borderBottom: '1px solid #fde68a',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '6px',
              }}
            >
              <span style={{ fontWeight: '600', fontSize: '12px', color: '#92400e' }}>Target</span>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            </div>
            <div ref={targetScrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {targetNode && flattenedTargetInputs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {flattenedTargetInputs.map((field, idx) => {
                    const isMapped = mappings.some(
                      m => m.targetNodeId === targetNodeId && m.targetFieldName === field.name
                    );
                    const isChild = field.depth > 0;
                    const isExpanded = expandedTargetRecords.has(field.displayName);
                    // 선택된 타겟 필드인지 확인 (매핑 목록 표시용)
                    const isSelectedTarget = selectedTargetField === field.name;

                    // 타겟 필드 클릭 핸들러
                    const handleTargetFieldClick = () => {
                      if (field.isRecord) {
                        toggleTargetRecord(field.displayName, field);
                      } else {
                        // 이미 선택된 필드면 해제, 아니면 선택
                        if (selectedTargetField === field.name) {
                          setSelectedTargetField(null);
                        } else {
                          setSelectedTargetField(field.name);
                        }
                      }
                    };

                    return (
                      <div
                        key={`tgt-${field.name}-${idx}`}
                        style={{ display: 'flex', alignItems: 'stretch' }}
                      >
                        {/* 세로선 영역 */}
                        {isChild && (
                          <div style={{
                            width: `${field.depth * 24}px`,
                            display: 'flex',
                            justifyContent: 'flex-end',
                            paddingRight: '8px',
                          }}>
                            <div style={{
                              width: '2px',
                              backgroundColor: '#e2e8f0',
                              marginLeft: 'auto',
                            }} />
                          </div>
                        )}

                        {/* 필드 항목 */}
                        <div
                          ref={el => { if (el) setTargetFieldRef(field.name, idx, el); }}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(field.name, targetNodeId, field.isRecord, e)}
                          onClick={handleTargetFieldClick}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: field.isRecord ? '4px 10px' : '6px 12px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            backgroundColor: isSelectedTarget
                              ? '#fef3c7'
                              : field.isRecord
                                ? '#fffbeb'
                                : dragging && !field.isRecord
                                  ? '#fefce8'
                                  : '#ffffff',
                            borderRadius: field.isRecord ? '6px' : '8px',
                            marginBottom: field.isRecord ? '2px' : '3px',
                            border: isSelectedTarget ? '2px solid #f59e0b' : field.isRecord ? '1px solid #fde68a' : '1px solid #e2e8f0',
                            boxShadow: isSelectedTarget ? '0 0 8px rgba(245, 158, 11, 0.3)' : field.isRecord ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.04)',
                            transition: 'all 0.2s ease-in-out',
                          }}
                        >
                          {/* 연결 포인트 */}
                          <div
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              backgroundColor: isMapped ? '#f59e0b' : '#f59e0b',
                              opacity: isMapped ? 1 : 0.6,
                              flexShrink: 0,
                            }}
                          />

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: field.isRecord ? 600 : 500,
                                color: '#1e293b',
                              }}>
                                {field.displayName}
                              </span>
                            </div>

                            {/* Record 화살표 아이콘 */}
                            {field.isRecord && (
                              <div style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
                                {loadingTargetRecords.has(field.displayName)
                                  ? <span style={{ fontSize: '12px', animation: 'spin 1s linear infinite' }}>⟳</span>
                                  : isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                  <Link size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <span style={{ fontSize: '14px' }}>
                    {targetNodeId ? 'input 필드가 없습니다' : '타겟 노드를 선택하세요'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mappings Summary - 타겟 필드 클릭 시에만 해당 필드에 연결된 매핑 표시 */}
        {(() => {
          // 선택된 타겟 필드가 없으면 표시하지 않음
          if (!selectedTargetField || !targetNodeId) return null;

          // 선택된 타겟 필드에 연결된 매핑만 필터링
          const filteredMappings = mappings.filter(
            m => m.targetNodeId === targetNodeId && m.targetFieldName === selectedTargetField
          );

          if (filteredMappings.length === 0) return null;

          return (
            <div
              style={{
                padding: '12px 24px',
                backgroundColor: '#eff6ff',
                borderTop: '1px solid #bfdbfe',
                maxHeight: '300px',
                overflowY: 'auto',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <Link size={16} style={{ color: '#60a5fa' }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', marginLeft: '8px' }}>
                  {selectedTargetField} 매핑 목록 ({filteredMappings.length}개)
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredMappings.map((m, mappingIndex) => {
                  const isRecent = m.id === recentlyAddedId;
                  const hasTransform = m.transform && m.transform.type !== 'none';
                  const sources = m.sources || [];
                  const firstSource = sources[0];

                  // Record 타입인지 확인
                  const sourceNodeInfo = firstSource ? availableNodes.find(n => n.id === firstSource.nodeId) : undefined;
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
                  const sourceField = sourceNodeInfo && firstSource ? findFieldRecursive(sourceNodeInfo.outputs, firstSource.fieldName) : undefined;
                  const isRecordMapping = sourceField?.fieldType === 'Record';

                  const isSelectedMapping = selectedMappingId === m.id;
                  const isFirst = mappingIndex === 0;
                  const isLast = mappingIndex === filteredMappings.length - 1;

                  // 매핑 클릭 시 소스 노드 변경 핸들러
                  const handleMappingClick = () => {
                    if (isSelectedMapping) {
                      setSelectedMappingId(null);
                    } else {
                      setSelectedMappingId(m.id);

                      // 소스 노드 변경
                      if (firstSource && firstSource.nodeId !== sourceNodeId) {
                        isNodeChangeFromMappingClick.current = true;
                        setSourceNodeId(firstSource.nodeId);
                        sourceFieldRefs.current.clear();
                      }
                    }
                  };

                  return (
                    <div
                      key={m.id}
                      onClick={handleMappingClick}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        backgroundColor: isSelectedMapping ? '#fef3c7' : isRecent ? '#fef3c7' : 'white',
                        borderRadius: '6px',
                        border: isSelectedMapping ? '2px solid #f59e0b' : isRecent ? '2px solid #f59e0b' : '1px solid #bfdbfe',
                        boxShadow: isSelectedMapping || isRecent ? '0 0 8px rgba(245, 158, 11, 0.4)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {/* 순서 변경 버튼 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveMappingUp(m.id, filteredMappings); }}
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
                          onMouseOver={(e) => { if (!isFirst) e.currentTarget.style.color = '#3b82f6'; }}
                          onMouseOut={(e) => { if (!isFirst) e.currentTarget.style.color = '#64748b'; }}
                          title="위로 이동"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveMappingDown(m.id, filteredMappings); }}
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
                          onMouseOver={(e) => { if (!isLast) e.currentTarget.style.color = '#3b82f6'; }}
                          onMouseOut={(e) => { if (!isLast) e.currentTarget.style.color = '#64748b'; }}
                          title="아래로 이동"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>

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
                          // 단일 소스: 기존 스타일
                          <span style={{ color: '#059669', fontFamily: 'monospace', fontWeight: '500', fontSize: '14px' }}>
                            {firstSource.nodeId}.<span style={{ fontWeight: '700' }}>{firstSource.fieldName}</span>
                          </span>
                        ) : (
                          // 다중 소스: 각 소스별로 표시 + 순서 관리
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
                              {/* 우선순위 표시 */}
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

                              {/* 소스 필드명 */}
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
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openTransformModal(m.id, srcIdx); }}
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

                              {/* 순서 변경 버튼 */}
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

                              {/* 개별 소스 삭제 */}
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
                      {sources.length <= 1 && !isRecordMapping && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openTransformModal(m.id); }}
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
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#fae8ff';
                            e.currentTarget.style.borderColor = '#e879f9';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = hasTransform ? '#fae8ff' : 'transparent';
                            e.currentTarget.style.borderColor = hasTransform ? '#e879f9' : '#e2e8f0';
                          }}
                        >
                          <Wand2 size={14} />
                          변환
                        </button>
                      )}

                      {/* 삭제 버튼 */}
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
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: 'white',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#475569',
              backgroundColor: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 14px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'white',
              backgroundColor: '#5277f7',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4166d9'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#5277f7'}
          >
            <Save size={14} />
            저장
          </button>
        </div>

        {/* Transform Modal */}
        {transformModalOpen && (
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
              zIndex: 100001,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeTransformModal();
            }}
          >
            <div
              style={{
                width: '450px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  backgroundColor: '#dce4fd',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Wand2 size={20} style={{ color: '#5277f7' }} />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>변환 함수 설정</h3>
                </div>
                <button
                  onClick={closeTransformModal}
                  style={{
                    padding: '6px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px' }}>
                {/* Transform Type Selection */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '8px' }}>
                    변환 유형
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {/* 없음 버튼 */}
                    <button
                      type="button"
                      onClick={() => setTempTransform({ type: 'none', params: {} })}
                      style={{
                        padding: '8px 14px',
                        fontSize: '12px',
                        backgroundColor: tempTransform?.type === 'none' ? '#5277f7' : '#f1f5f9',
                        color: tempTransform?.type === 'none' ? 'white' : '#475569',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                      onMouseOver={(e) => {
                        if (tempTransform?.type !== 'none') e.currentTarget.style.backgroundColor = '#e2e8f0';
                      }}
                      onMouseOut={(e) => {
                        if (tempTransform?.type !== 'none') e.currentTarget.style.backgroundColor = '#f1f5f9';
                      }}
                    >
                      없음
                    </button>
                    {/* MAP 함수 버튼들 */}
                    {!mapFunctionsLoaded ? (
                      <span style={{ padding: '8px 14px', fontSize: '12px', color: '#94a3b8' }}>함수 목록 로딩 중...</span>
                    ) : mapFunctions.length === 0 ? (
                      <span style={{ padding: '8px 14px', fontSize: '12px', color: '#ef4444' }}>등록된 MAP 함수가 없습니다.</span>
                    ) : (
                      mapFunctions.map(func => {
                        const isSelected = tempTransform?.type === 'function' && tempTransform?.params?.funcId === func.code;
                        return (
                          <button
                            key={func.code}
                            type="button"
                            onClick={async () => {
                              setTempTransform({ type: 'function', params: { funcId: func.code, funcNm: func.name, fieldValues: tempTransform?.params?.funcId === func.code ? tempTransform?.params?.fieldValues : {} } });
                              // 함수 필드 로드 후 팝업 열기
                              setFuncFieldsLoading(true);
                              try {
                                const detail = await fetchFunctionFields(func.code);
                                setFuncFields(detail.fields);
                                // 기존 입력값 복원 또는 기본값 초기화
                                const existingValues = (tempTransform?.params?.funcId === func.code && tempTransform?.params?.fieldValues) || {};
                                const initValues: Record<string, any> = {};
                                detail.fields.forEach(f => {
                                  initValues[f.id] = existingValues[f.id] ?? f.defaultValue ?? '';
                                });
                                setFuncFieldValues(initValues);
                                setFuncFieldModalOpen(true);
                              } catch (err) {
                                console.error('함수 필드 로드 실패:', err);
                              } finally {
                                setFuncFieldsLoading(false);
                              }
                            }}
                            style={{
                              padding: '8px 14px',
                              fontSize: '12px',
                              backgroundColor: isSelected ? '#5277f7' : '#f1f5f9',
                              color: isSelected ? 'white' : '#475569',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '500',
                            }}
                            onMouseOver={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#e2e8f0';
                            }}
                            onMouseOut={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9';
                            }}
                          >
                            {func.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  padding: '16px 20px',
                  borderTop: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                }}
              >
                <button
                  type="button"
                  onClick={closeTransformModal}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={saveTransformModal}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#5277f7',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4166d9'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#5277f7'}
                >
                  적용
                </button>
              </div>
            </div>
          </div>
        )}

      {/* 함수 필드 입력 팝업 */}
      {funcFieldModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100003,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setFuncFieldModalOpen(false); }}
        >
          <div
            style={{
              width: '500px',
              maxHeight: '80vh',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: '#ede9fe', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={20} style={{ color: '#8b5cf6' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>
                  {tempTransform?.params?.funcNm || '함수'} 필드 설정
                </h3>
              </div>
              <button onClick={() => setFuncFieldModalOpen(false)} style={{ padding: '6px', backgroundColor: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body - Scrollable */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {funcFieldsLoading ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>로딩 중...</div>
              ) : funcFields.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>등록된 필드가 없습니다.</div>
              ) : (
                funcFields.map((field, idx) => {
                  // 신타입 VALUE: 입력 UI 미노출 (함수 내부에서 처리)
                  if (field.type === 'VALUE') {
                    return null;
                  }
                  // 신타입 Object/Double/Float/Integer: 단순 input 텍스트 (TEXT 분기와 동일 동작)
                  if (field.type === 'Object' || field.type === 'Double' || field.type === 'Float' || field.type === 'Integer') {
                    return (
                      <div key={field.id || idx} style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>{field.text}</label>
                        <input
                          type="text"
                          value={funcFieldValues[field.id] || ''}
                          onChange={(e) => setFuncFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                        />
                      </div>
                    );
                  }
                  if (field.type === 'SPLIT') {
                    return (
                      <div key={idx} style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }}>
                        {field.defaultValue && <p style={{ fontSize: '13px', color: '#64748b', margin: '8px 0 0', padding: '4px 12px', backgroundColor: '#f8fafc', borderRadius: '4px' }}>{field.defaultValue}</p>}
                      </div>
                    );
                  }
                  if (field.type === 'FIELD') {
                    // 읽기전용 텍스트 (DB TEXT → React FIELD)
                    return (
                      <div key={field.id || idx} style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>{field.text}</label>
                        <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#64748b' }}>
                          {funcFieldValues[field.id] || field.defaultValue || '-'}
                        </div>
                      </div>
                    );
                  }
                  if (field.type === 'LIST') {
                    // 목록 선택
                    const options = (field.listValue || '').split(',').map(v => v.trim()).filter(Boolean);
                    return (
                      <div key={field.id || idx} style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>{field.text}</label>
                        <select
                          value={funcFieldValues[field.id] || ''}
                          onChange={(e) => setFuncFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                        >
                          <option value="">선택</option>
                          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    );
                  }
                  // TEXT (입력 필드), PASSWORD, RADIO, CHECK, DESCRIPTION
                  return (
                    <div key={field.id || idx} style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>{field.text}</label>
                      {field.type === 'DESCRIPTION' ? (
                        <textarea
                          value={funcFieldValues[field.id] || ''}
                          onChange={(e) => setFuncFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          rows={3}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                        />
                      ) : (
                        <input
                          type={field.type === 'PASSWORD' ? 'password' : 'text'}
                          value={funcFieldValues[field.id] || ''}
                          onChange={(e) => setFuncFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', flexShrink: 0 }}>
              <button
                onClick={() => setFuncFieldModalOpen(false)}
                style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  // 필드 값을 transform에 저장
                  setTempTransform(prev => ({
                    type: 'function',
                    params: {
                      ...prev?.params,
                      fieldValues: { ...funcFieldValues },
                    },
                  }));
                  setFuncFieldModalOpen(false);
                }}
                style={{ padding: '8px 16px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 자동매핑 모달 */}
      {autoMapModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100002,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setAutoMapModalOpen(false); }}
        >
          <div
            style={{
              width: '380px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: '#dce4fd',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={20} style={{ color: '#5277f7' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>자동매핑</h3>
              </div>
              <button
                onClick={() => setAutoMapModalOpen(false)}
                style={{
                  padding: '6px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* 모달 바디 */}
            <div style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                매핑 방식을 선택하세요. Field→Field, Table→Table 규칙에 따라 자동으로 연결됩니다.
              </p>

              {/* 뎁스별 선택 */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: autoMapMode === 'depth' ? '2px solid #5277f7' : '1px solid #e2e8f0',
                  backgroundColor: autoMapMode === 'depth' ? '#eff3ff' : 'white',
                  cursor: 'pointer',
                  marginBottom: '10px',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="autoMapMode"
                  value="depth"
                  checked={autoMapMode === 'depth'}
                  onChange={() => setAutoMapMode('depth')}
                  style={{ marginTop: '2px', accentColor: '#5277f7' }}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                    뎁스별 매핑
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                    같은 깊이(Depth) 레벨에 있는 필드끼리 순서대로 매핑합니다.
                  </div>
                </div>
              </label>

              {/* 순서별 선택 */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: autoMapMode === 'order' ? '2px solid #5277f7' : '1px solid #e2e8f0',
                  backgroundColor: autoMapMode === 'order' ? '#eff3ff' : 'white',
                  cursor: 'pointer',
                  marginBottom: '10px',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="autoMapMode"
                  value="order"
                  checked={autoMapMode === 'order'}
                  onChange={() => setAutoMapMode('order')}
                  style={{ marginTop: '2px', accentColor: '#5277f7' }}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                    순서별 매핑
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                    깊이와 관계없이 전체 필드 목록의 순서대로 매핑합니다.
                  </div>
                </div>
              </label>

              {/* 스마트 매핑 선택 */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: autoMapMode === 'smart' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                  backgroundColor: autoMapMode === 'smart' ? '#f5f3ff' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="autoMapMode"
                  value="smart"
                  checked={autoMapMode === 'smart'}
                  onChange={() => setAutoMapMode('smart')}
                  style={{ marginTop: '2px', accentColor: '#7c3aed' }}
                />
                <div>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>스마트 매핑</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                    필드명을 분석하여 이름이 유사하고 타입이 같은 필드를 자동으로 연결합니다.
                  </div>
                </div>
              </label>

              <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#fef9ec', borderRadius: '6px', border: '1px solid #fde68a' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#92400e', lineHeight: '1.5' }}>
                  ⚠ 이미 매핑된 타겟 필드는 건너뜁니다. Field는 Field끼리, Table은 Table끼리만 매핑됩니다.
                  {autoMapMode === 'smart' && ' 스마트 매핑은 유사도 30% 이상인 쌍만 연결합니다.'}
                </p>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                padding: '14px 20px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <button
                type="button"
                onClick={() => setAutoMapModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={performAutoMapping}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  backgroundColor: '#5277f7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4166d9'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#5277f7'}
              >
                <Sparkles size={14} />
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};