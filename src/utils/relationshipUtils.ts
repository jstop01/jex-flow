import { Node, Edge } from 'reactflow';

/**
 * 저장 시 필요한 data 필드 화이트리스트 (블로트 방지)
 * 60만줄 블로트 문제로 화이트리스트 방식 유지
 * 새 필드 추가 시 반드시 여기에도 추가할 것!
 */
const SAVE_DATA_FIELDS: Record<string, string[]> = {
  Start:     ['label', 'isStart', 'inputMessage', 'outputMessage'],
  End:       ['label', 'isEnd', 'mappings'],
  Variable:  ['label', 'variableName', 'expression', 'mappings'],
  CallDO:    ['label', 'ido', 'returnType', 'code', 'codeName', 'description', 'returnTypeOptions', 'mappings'],
  Process:   ['label', 'serviceType', 'serviceTypeInput', 'ido', 'returnType', 'code', 'codeName', 'description', 'mappings'],
  Mapping:   ['label', 'mappings', 'inputMappings'],
  IfElse:    ['label', 'expression', 'mappings'],
  Switch:    ['label', 'expression', 'cases', 'mappings'],
  Error:     ['label', 'code', 'codeName', 'description', 'mappings'],
  Script:    ['label', 'scriptType', 'scriptContent', 'variableName', 'mappings'],
  Method:    ['label', 'isExpanded', 'hasChildren', 'internalNodesPreview'],
  While:     ['label', 'expression', 'isExpanded', 'hasChildren', 'internalNodesPreview'],
  For:       ['label', 'expression', 'isExpanded', 'hasChildren', 'internalNodesPreview', 'startValue', 'endValue', 'stepValue'],
  ForEach:   ['label', 'expression', 'isExpanded', 'hasChildren', 'internalNodesPreview'],
  CallMethod:  ['label', 'selectedGroup'],
};

export const cleanNodeForExport = (node: Node): any => {
  const data = node.data || {};
  const type = node.type || '';
  const allowedFields = SAVE_DATA_FIELDS[type] || [];

  let cleanData: any = {};

  // CallDO/Process: 이전 형식 유지 — label → ido 필드(flat) → returnType → inputs → outputs 순서
  if ((type === 'CallDO' || type === 'Process') && data.ido) {
    // 백엔드 필요 필드만 export: label, type, componentId, returnType
    cleanData.label = data.label;
    const ido = data.ido;
    if (ido.type) cleanData.type = ido.type;
    if (ido.componentId) cleanData.componentId = ido.componentId;
    // returnType: 객체 → 문자열 변환
    if (data.returnType && typeof data.returnType === 'object') {
      cleanData.returnType = data.returnType.name || data.returnType.id || 'JexData';
    } else if (data.returnType) {
      cleanData.returnType = data.returnType;
    }
    // 매핑 데이터 보존 (입력 매핑 설정)
    if (data.mappings) cleanData.mappings = data.mappings;
  } else {
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        cleanData[field] = data[field];
      }
    }
  }

  // Script 노드: scriptType이 비어있어도 export JSON에 type 키 누락되지 않도록 'java' fallback
  // (default 강제가 아니라 export 시점의 안전망 — 사용자가 모달에서 'groovy' 선택했으면 그 값 그대로)
  if (type === 'Script' && (cleanData.scriptType === undefined || cleanData.scriptType === '')) {
    cleanData.scriptType = 'java';
  }

  // 백엔드 호환: 내부 필드명 → 이사님 기존 태그로 변환 (S010)
  const EXPORT_RENAME: Record<string, Record<string, string>> = {
    For:     { startValue: 'start', endValue: 'end' },
    Script:  { scriptType: 'type' },
    Process: { serviceTypeInputs: 'serviceTypeInput' },
  };
  const renameMap = EXPORT_RENAME[type];
  if (renameMap) {
    Object.entries(renameMap).forEach(([from, to]) => {
      if (cleanData[from] !== undefined) {
        cleanData[to] = cleanData[from];
        delete cleanData[from];
      }
    });
  }

  // 내부 노드 플래그는 타입에 관계없이 보존
  if (data.isInternalStart) cleanData.isInternalStart = true;
  if (data.isInternalEnd) cleanData.isInternalEnd = true;

  const cleanNode: any = {
    id: node.id,
    type: node.type,
    position: node.position,
    data: cleanData,
  };

  if (node.style) cleanNode.style = node.style;
  if (node.parentId) cleanNode.parentId = node.parentId;
  if (node.extent) cleanNode.extent = node.extent;
  if (node.zIndex !== undefined) cleanNode.zIndex = node.zIndex;
  if (node.hidden !== undefined) cleanNode.hidden = node.hidden;

  return cleanNode;
};

/**
 * Export용 노드 데이터 정제 (콜백 함수 제거)
 */
export const cleanNodesForExport = (nodes: Node[]): Node[] => {
  return nodes.map(node => cleanNodeForExport(node));
};

/**
 * Group/While/For 컨테이너와 내부 노드를 분리하여 export용 구조 생성
 * groups는 flat 배열: [컨테이너노드, 내부노드1, 내부노드2, ...]
 */
export const separateNodesAndGroups = (nodes: Node[], edges: Edge[]): {
  nodes: any[];
  groups: any[];
} => {
  const containerTypes = ['Method', 'While', 'For', 'ForEach'];

  // 최상위 컨테이너 노드들만 찾기 (parentId가 없는 컨테이너만)
  const containerNodes = nodes.filter(n => containerTypes.includes(n.type || '') && !n.parentId);
  const containerIds = new Set(containerNodes.map(n => n.id));

  // 내부 노드들 (parentId가 있는 모든 노드 — 중첩 컨테이너 내부 포함)
  const allContainerIds = new Set(nodes.filter(n => containerTypes.includes(n.type || '')).map(n => n.id));
  const childNodes = nodes.filter(n => n.parentId && allContainerIds.has(n.parentId));
  const childNodeIds = new Set(childNodes.map(n => n.id));

  // 메인 노드들 (컨테이너도 아니고, 컨테이너의 자식도 아닌 노드)
  const mainNodes = nodes.filter(n =>
    !containerTypes.includes(n.type || '') && !n.parentId
  );

  // 컨테이너 내부 노드들을 정렬하는 헬퍼 함수
  const sortContainerChildren = (containerId: string): any[] => {
    const children = childNodes.filter(n => n.parentId === containerId);
    if (children.length === 0) return [];

    // 내부 Start 노드 찾기
    const internalStart = children.find(n => n.data?.isInternalStart);
    if (!internalStart) return children.map(c => cleanNodeForExport(c));

    // 내부 edges만 필터링
    const internalEdges = edges.filter(e =>
      children.some(c => c.id === e.source) && children.some(c => c.id === e.target)
    );

    // 내부 노드용 childrenMap 생성
    const internalChildrenMap = new Map<string, string[]>();
    internalEdges.forEach(edge => {
      const edgeChildren = internalChildrenMap.get(edge.source) || [];
      edgeChildren.push(edge.target);
      internalChildrenMap.set(edge.source, edgeChildren);
    });

    // BFS로 내부 노드 정렬
    const sortedChildren: any[] = [];
    const visitedChildren = new Set<string>();
    const childQueue: string[] = [internalStart.id];

    while (childQueue.length > 0) {
      const currentId = childQueue.shift()!;
      if (visitedChildren.has(currentId)) continue;
      visitedChildren.add(currentId);

      const currentNode = children.find(n => n.id === currentId);
      if (currentNode) {
        sortedChildren.push(cleanNodeForExport(currentNode));
      }

      const nextChildren = internalChildrenMap.get(currentId) || [];
      nextChildren.forEach(cId => {
        if (!visitedChildren.has(cId)) {
          childQueue.push(cId);
        }
      });
    }

    // 연결되지 않은 내부 노드 추가
    children.forEach(child => {
      if (!visitedChildren.has(child.id)) {
        sortedChildren.push(cleanNodeForExport(child));
      }
    });

    return sortedChildren;
  };

  // Groups 배열 생성 (flat 구조: 컨테이너 + 내부 노드들)
  const groups: any[] = [];
  containerNodes.forEach(container => {
    // 컨테이너 노드 추가
    groups.push(cleanNodeForExport(container));
    // 내부 노드들 추가
    const sortedChildren = sortContainerChildren(container.id);
    groups.push(...sortedChildren);
  });

  // 메인 노드들 정렬 (BFS)
  const startNode = mainNodes.find(n => n.data?.isStart || n.type === 'Start');
  if (!startNode) {
    return {
      nodes: mainNodes.map(n => cleanNodeForExport(n)),
      groups,
    };
  }

  // edge 기반 자식 맵 (컨테이너 포함)
  const childrenMap = new Map<string, string[]>();
  edges.forEach(edge => {
    // 내부 노드 간의 edge는 제외
    if (childNodeIds.has(edge.source) || childNodeIds.has(edge.target)) return;

    const children = childrenMap.get(edge.source) || [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
  });

  // 메인 노드 + 컨테이너 노드 합쳐서 정렬
  const allMainFlowNodes = [...mainNodes, ...containerNodes];
  const sortedMainNodes: any[] = [];
  const visited = new Set<string>();
  const queue: string[] = [startNode.id];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentNode = allMainFlowNodes.find(n => n.id === currentId);
    if (currentNode) {
      // 컨테이너 노드는 groups에 이미 있으므로 nodes에 추가하지 않음
      if (!containerTypes.includes(currentNode.type || '')) {
        sortedMainNodes.push(cleanNodeForExport(currentNode));
      }
    }

    const children = childrenMap.get(currentId) || [];
    children.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    });
  }

  // 연결되지 않은 메인 노드 추가
  mainNodes.forEach(node => {
    if (!visited.has(node.id)) {
      sortedMainNodes.push(cleanNodeForExport(node));
    }
  });

  return {
    nodes: sortedMainNodes,
    groups,
  };
};

/**
 * 노드를 부모-자식 순서로 정렬 (BFS)
 * Start 노드부터 시작하여 계층 순서대로 정렬
 * 컨테이너 노드(Method, While, For) 내부의 자식 노드들은 컨테이너 바로 다음에 배치
 */
export const sortNodesByHierarchy = (nodes: Node[], edges: Edge[]): Node[] => {
  // Start 노드 찾기
  const startNode = nodes.find(n => n.data?.isStart || n.type === 'Start');
  if (!startNode) return nodes;

  // 부모 ID -> 자식 ID[] 맵 (edge 기반)
  const childrenMap = new Map<string, string[]>();
  edges.forEach(edge => {
    const children = childrenMap.get(edge.source) || [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
  });

  // 컨테이너 ID -> 내부 노드[] 맵 (parentId 기반)
  const containerChildrenMap = new Map<string, Node[]>();
  nodes.forEach(node => {
    if (node.parentId) {
      const children = containerChildrenMap.get(node.parentId) || [];
      children.push(node);
      containerChildrenMap.set(node.parentId, children);
    }
  });

  const containerTypes = ['Method', 'While', 'For', 'ForEach'];

  // 컨테이너 내부 노드들을 정렬하는 헬퍼 함수
  const sortContainerChildren = (containerId: string): Node[] => {
    const children = containerChildrenMap.get(containerId) || [];
    if (children.length === 0) return [];

    // 내부 Start 노드 찾기
    const internalStart = children.find(n => n.data?.isInternalStart);
    if (!internalStart) return children;

    // 내부 edges만 필터링
    const internalEdges = edges.filter(e =>
      children.some(c => c.id === e.source) && children.some(c => c.id === e.target)
    );

    // 내부 노드용 childrenMap 생성
    const internalChildrenMap = new Map<string, string[]>();
    internalEdges.forEach(edge => {
      const edgeChildren = internalChildrenMap.get(edge.source) || [];
      edgeChildren.push(edge.target);
      internalChildrenMap.set(edge.source, edgeChildren);
    });

    // BFS로 내부 노드 정렬
    const sortedChildren: Node[] = [];
    const visitedChildren = new Set<string>();
    const childQueue: string[] = [internalStart.id];

    while (childQueue.length > 0) {
      const currentId = childQueue.shift()!;
      if (visitedChildren.has(currentId)) continue;
      visitedChildren.add(currentId);

      const currentNode = children.find(n => n.id === currentId);
      if (currentNode) {
        sortedChildren.push(currentNode);
      }

      const nextChildren = internalChildrenMap.get(currentId) || [];
      nextChildren.forEach(childId => {
        if (!visitedChildren.has(childId)) {
          childQueue.push(childId);
        }
      });
    }

    // 연결되지 않은 내부 노드 추가
    children.forEach(child => {
      if (!visitedChildren.has(child.id)) {
        sortedChildren.push(child);
      }
    });

    return sortedChildren;
  };

  // 메인 BFS 정렬
  const sortedNodes: Node[] = [];
  const visited = new Set<string>();
  const queue: string[] = [startNode.id];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentNode = nodes.find(n => n.id === currentId);
    if (currentNode) {
      sortedNodes.push(currentNode);

      // 컨테이너 노드인 경우 내부 노드들을 바로 다음에 추가
      if (containerTypes.includes(currentNode.type || '')) {
        const containerChildren = sortContainerChildren(currentNode.id);
        containerChildren.forEach(child => {
          if (!visited.has(child.id)) {
            visited.add(child.id);
            sortedNodes.push(child);
          }
        });
      }
    }

    // edge로 연결된 자식들을 큐에 추가
    const children = childrenMap.get(currentId) || [];
    children.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    });
  }

  // 연결되지 않은 노드들 (고아 노드) 추가
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      sortedNodes.push(node);
    }
  });

  return sortedNodes;
};
