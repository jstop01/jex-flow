import { Node, Edge } from 'reactflow';

export interface ValidationError {
  type: 'NO_START' | 'NO_END' | 'NOT_CONNECTED' | 'EMPTY_CALLDO' | 'CONTAINER_NOT_CONNECTED' | 'DISCONNECTED_NODE' | 'UNCALLED_METHOD' | 'ORPHAN_NODE' | 'EMPTY_CONDITION' | 'EMPTY_SCRIPT' | 'IFELSE_BRANCH_MISSING' | 'EMPTY_VARIABLE' | 'EMPTY_FOR' | 'EMPTY_FOREACH' | 'BROKEN_CALLMETHOD' | 'EMPTY_ERROR' | 'DEAD_END';
  message: string;
  nodeIds?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Flow 저장 전 무결성 검증
 * 모든 검증 실패는 에러 (저장 차단)
 */
export const validateFlow = (nodes: Node[], edges: Edge[]): ValidationResult => {
  const errors: ValidationError[] = [];

  // 메인 플로우 노드만 (parentId 없는 것)
  const mainNodes = nodes.filter(n => !n.parentId);
  const mainNodeIds = new Set(mainNodes.map(n => n.id));
  const mainEdges = edges.filter(e => mainNodeIds.has(e.source) && mainNodeIds.has(e.target));

  // 1. Start 노드 검증
  const startNodes = mainNodes.filter(n => n.data?.isStart && !n.data?.isInternalStart);
  if (startNodes.length === 0) {
    errors.push({ type: 'NO_START', message: 'Start 노드가 없습니다.' });
  } else if (startNodes.length > 1) {
    errors.push({
      type: 'NO_START',
      message: `Start 노드가 ${startNodes.length}개 있습니다. 1개만 허용됩니다.`,
      nodeIds: startNodes.map(n => n.id),
    });
  }

  // 2. End 노드 검증
  const endNodes = mainNodes.filter(n => n.data?.isEnd && !n.data?.isInternalEnd);
  if (endNodes.length === 0) {
    errors.push({ type: 'NO_END', message: 'End 노드가 없습니다.' });
  }

  // 3. Start→End 연결성 (BFS)
  if (startNodes.length === 1 && endNodes.length >= 1) {
    const visited = new Set<string>();
    const queue = [startNodes[0].id];
    visited.add(startNodes[0].id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of mainEdges) {
        if (edge.source === current && !visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(edge.target);
        }
      }
    }

    const reachableEnd = endNodes.some(n => visited.has(n.id));
    if (!reachableEnd) {
      errors.push({
        type: 'NOT_CONNECTED',
        message: 'Start에서 End까지 연결되지 않았습니다. 노드를 연결해주세요.',
      });
    }

    // 고아 노드 (Variable, 컨테이너 제외)
    const orphanExcludeTypes = ['Variable', 'Method', 'While', 'For', 'ForEach'];
    const orphanNodes = mainNodes.filter(n =>
      !visited.has(n.id) &&
      !n.data?.isStart && !n.data?.isEnd &&
      !orphanExcludeTypes.includes(n.type || '')
    );
    if (orphanNodes.length > 0) {
      errors.push({
        type: 'ORPHAN_NODE',
        message: `Start에서 도달할 수 없는 노드가 ${orphanNodes.length}개 있습니다.`,
        nodeIds: orphanNodes.map(n => n.id),
      });
    }
  }

  // 4. CallDO/Process componentId 필수
  const emptyCallDOs = mainNodes.filter(n =>
    (n.type === 'CallDO' || n.type === 'Process') && !n.data?.ido?.componentId
  );
  if (emptyCallDOs.length > 0) {
    errors.push({
      type: 'EMPTY_CALLDO',
      message: `IDO/IMO가 선택되지 않은 노드가 ${emptyCallDOs.length}개 있습니다.`,
      nodeIds: emptyCallDOs.map(n => n.id),
    });
  }

  // 5. 빈 IfElse/Switch
  const emptyConditions = mainNodes.filter(n =>
    (n.type === 'IfElse' || n.type === 'Switch' || n.type === 'While') && !n.data?.expression
  );
  if (emptyConditions.length > 0) {
    errors.push({
      type: 'EMPTY_CONDITION',
      message: `조건식이 비어있는 노드가 ${emptyConditions.length}개 있습니다.`,
      nodeIds: emptyConditions.map(n => n.id),
    });
  }

  // 6. 빈 Script
  const emptyScripts = mainNodes.filter(n =>
    n.type === 'Script' && !n.data?.scriptContent
  );
  if (emptyScripts.length > 0) {
    errors.push({
      type: 'EMPTY_SCRIPT',
      message: `스크립트가 비어있는 노드가 ${emptyScripts.length}개 있습니다.`,
      nodeIds: emptyScripts.map(n => n.id),
    });
  }

  // 7. 컨테이너 내부 Start→End 연결 검증
  const containerTypes = ['Method', 'While', 'For', 'ForEach'];
  const containers = nodes.filter(n => containerTypes.includes(n.type || ''));
  for (const container of containers) {
    const internalNodes = nodes.filter(n => n.parentId === container.id);
    if (internalNodes.length === 0) continue;

    const internalNodeIds = new Set(internalNodes.map(n => n.id));
    const internalEdges = edges.filter(e => internalNodeIds.has(e.source) && internalNodeIds.has(e.target));
    const internalStart = internalNodes.find(n => n.data?.isInternalStart || n.id === `${container.id}-start`);
    const internalEnd = internalNodes.find(n => n.data?.isInternalEnd || n.id === `${container.id}-end`);

    if (internalStart && internalEnd) {
      const visited = new Set<string>();
      const queue = [internalStart.id];
      visited.add(internalStart.id);
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const edge of internalEdges) {
          if (edge.source === current && !visited.has(edge.target)) {
            visited.add(edge.target);
            queue.push(edge.target);
          }
        }
      }
      if (!visited.has(internalEnd.id)) {
        const label = container.data?.label || container.type || container.id;
        errors.push({
          type: 'CONTAINER_NOT_CONNECTED',
          message: `${label} (${container.id}) 내부: Start에서 End까지 연결되지 않았습니다.`,
          nodeIds: [container.id],
        });
      }
    }
  }

  // 8. 연결되지 않은 노드 검출
  const mainConnected = new Set<string>();
  for (const edge of mainEdges) {
    mainConnected.add(edge.source);
    mainConnected.add(edge.target);
  }
  const disconnectedMain = mainNodes.filter(n =>
    !mainConnected.has(n.id) &&
    !n.data?.isStart && !n.data?.isEnd &&
    n.type !== 'Variable' &&
    !containerTypes.includes(n.type || '')
  );
  if (disconnectedMain.length > 0) {
    errors.push({
      type: 'DISCONNECTED_NODE',
      message: `연결되지 않은 노드가 있습니다: ${disconnectedMain.map(n => n.data?.label || n.id).join(', ')}`,
      nodeIds: disconnectedMain.map(n => n.id),
    });
  }

  // 9. Method 선언 후 CallMethod 미호출
  const methodNodes = nodes.filter(n => n.type === 'Method');
  const callMethodNodes = nodes.filter(n => n.type === 'CallMethod');
  const calledMethodIds = new Set(callMethodNodes.map(n => n.data?.selectedGroup?.id).filter(Boolean));
  const uncalledMethods = methodNodes.filter(n => !calledMethodIds.has(n.id));
  if (uncalledMethods.length > 0) {
    for (const m of uncalledMethods) {
      const label = m.data?.label || m.id;
      errors.push({
        type: 'UNCALLED_METHOD',
        message: `메서드 "${label}" (${m.id})가 호출되지 않았습니다.`,
        nodeIds: [m.id],
      });
    }
  }

  // 11. IfElse TRUE/FALSE 양쪽 분기 연결 확인
  const ifElseNodes = mainNodes.filter(n => n.type === 'IfElse');
  for (const node of ifElseNodes) {
    const outEdges = mainEdges.filter(e => e.source === node.id);
    const hasTrueEdge = outEdges.some(e => e.sourceHandle === 'true' || e.sourceHandle === 'True');
    const hasFalseEdge = outEdges.some(e => e.sourceHandle === 'false' || e.sourceHandle === 'False');
    if (!hasTrueEdge || !hasFalseEdge) {
      const missing = !hasTrueEdge && !hasFalseEdge ? 'TRUE, FALSE' : !hasTrueEdge ? 'TRUE' : 'FALSE';
      errors.push({
        type: 'IFELSE_BRANCH_MISSING',
        message: `IfElse (${node.id}): ${missing} 분기가 연결되지 않았습니다.`,
        nodeIds: [node.id],
      });
    }
  }

  // 12. Variable 이름 비어있음
  const emptyVariables = nodes.filter(n => n.type === 'Variable' && !n.data?.variableName);
  if (emptyVariables.length > 0) {
    errors.push({
      type: 'EMPTY_VARIABLE',
      message: `변수명이 비어있는 Variable 노드가 ${emptyVariables.length}개 있습니다.`,
      nodeIds: emptyVariables.map(n => n.id),
    });
  }

  // 13. For 범위 미설정
  const emptyFors = nodes.filter(n =>
    n.type === 'For' && !n.data?.expression && !n.data?.startValue && !n.data?.endValue
  );
  if (emptyFors.length > 0) {
    errors.push({
      type: 'EMPTY_FOR',
      message: `반복 범위가 설정되지 않은 For 노드가 ${emptyFors.length}개 있습니다.`,
      nodeIds: emptyFors.map(n => n.id),
    });
  }

  // 14. ForEach 소스 미설정
  const emptyForEachs = nodes.filter(n =>
    n.type === 'ForEach' && !n.data?.expression && !n.data?.iteratorSource && !n.data?.selectedNode
  );
  if (emptyForEachs.length > 0) {
    errors.push({
      type: 'EMPTY_FOREACH',
      message: `순회 대상이 설정되지 않은 ForEach 노드가 ${emptyForEachs.length}개 있습니다.`,
      nodeIds: emptyForEachs.map(n => n.id),
    });
  }

  // 15. CallMethod 대상 Method 존재 확인
  const allNodeIds = new Set(nodes.map(n => n.id));
  const brokenCallMethods = nodes.filter(n =>
    n.type === 'CallMethod' && n.data?.selectedGroup?.id && !allNodeIds.has(n.data.selectedGroup.id)
  );
  if (brokenCallMethods.length > 0) {
    for (const cm of brokenCallMethods) {
      errors.push({
        type: 'BROKEN_CALLMETHOD',
        message: `CallMethod (${cm.id}): 참조하는 메서드 "${cm.data.selectedGroup.id}"가 존재하지 않습니다.`,
        nodeIds: [cm.id],
      });
    }
  }

  // 16. Error 코드 미설정
  const emptyErrors = nodes.filter(n => n.type === 'Error' && !n.data?.code);
  if (emptyErrors.length > 0) {
    errors.push({
      type: 'EMPTY_ERROR',
      message: `에러 코드가 설정되지 않은 Error 노드가 ${emptyErrors.length}개 있습니다.`,
      nodeIds: emptyErrors.map(n => n.id),
    });
  }

  // 17. 막다른 노드 (incoming 있는데 outgoing 없음, End/Error/Variable/컨테이너 제외)
  const deadEndExclude = new Set(['End', 'Error', 'Variable', 'Method', 'While', 'For', 'ForEach']);
  const deadEndNodes = mainNodes.filter(n => {
    if (deadEndExclude.has(n.type || '') || n.data?.isStart || n.data?.isEnd) return false;
    const hasIncoming = mainEdges.some(e => e.target === n.id);
    const hasOutgoing = mainEdges.some(e => e.source === n.id);
    return hasIncoming && !hasOutgoing;
  });
  if (deadEndNodes.length > 0) {
    errors.push({
      type: 'DEAD_END',
      message: `막다른 노드가 있습니다 (나가는 연결 없음): ${deadEndNodes.map(n => n.data?.label || n.id).join(', ')}`,
      nodeIds: deadEndNodes.map(n => n.id),
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
