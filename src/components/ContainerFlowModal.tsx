import React, { useState, useCallback, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { X, Save, FolderOpen, Repeat, Repeat2, RotateCw, Workflow, Database, Split, GitMerge, AlertCircle, Layers, Phone, Code, ChevronDown, Settings, Trash2, Edit3, Undo2, Redo2, ArrowDownToLine } from 'lucide-react';
import { IOSettingModal } from './IOSettingModal';
import { IDOSearchModal, ComponentItem } from './IDOSearchModal';
import { fetchComponentIO } from '../services/componentService';
import { ConditionEditModal } from './ConditionEditModal';
import { ScriptEditModal } from './ScriptEditModal';
import { CodeSelectionModal } from './CodeSelectionModal';
import { MappingEditorModal, MappingConnection } from './MappingEditorModal';
import { ProcessNode } from './ProcessNode';
import { VariableNode } from './VariableNode';
import { ConditionNode } from './ConditionNode';
import { SwitchNode } from './SwitchNode';
import { ErrorNode } from './ErrorNode';
import { DONode } from './DONode';
import { MappingNode } from './MappingNode';
import { GroupNode } from './GroupNode';
import { WhileNode } from './WhileNode';
import { ForNode } from './ForNode';
import { ForEachNode } from './ForEachNode';
import { CallGroupNode } from './CallGroupNode';
import { ScriptNode } from './ScriptNode';

interface AvailableNodeInfo {
  id: string;
  label: string;
  type: string;
  inputs: Array<{ name: string }>;
  outputs: Array<{ name: string }>;
}

interface ContainerFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerId: string | null;
  containerType: 'Method' | 'While' | 'For' | 'ForEach' | null;
  containerLabel: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  onSave: (nodes: Node[], edges: Edge[], loopData?: LoopData) => void;
  // For node options (시작값, 종료값)
  initialStartValue?: string;
  initialEndValue?: string;
  // ForEach node options (노드 선택, 구분, 필드명)
  initialSelectedNode?: string;
  initialFieldType?: 'input' | 'output';
  initialFieldName?: string;
  // While node options (expression)
  initialExpression?: string;
  // Available nodes for ForEach combo (with inputs/outputs)
  availableNodes?: AvailableNodeInfo[];
}

export interface LoopData {
  // For node
  startValue?: string;
  endValue?: string;
  // ForEach node
  selectedNode?: string;
  fieldType?: 'input' | 'output';
  fieldName?: string;
  // While node
  expression?: string;
}

const nodeMenuItems = [
  { type: 'Process', label: 'Process', icon: Workflow, color: 'text-blue-500' },
  { type: 'Variable', label: 'Variable', icon: Database, color: 'text-emerald-500' },
  { type: 'Script', label: 'Script', icon: Code, color: 'text-violet-500' },
  { type: 'IfElse', label: 'IfElse', icon: Split, color: 'text-amber-500' },
  { type: 'Switch', label: 'Switch', icon: GitMerge, color: 'text-indigo-500' },
  { type: 'CallDO', label: 'CallDO', icon: Layers, color: 'text-orange-500' },
  { type: 'CallMethod', label: 'CallMethod', icon: Phone, color: 'text-teal-500' },
  { type: 'Error', label: 'Error', icon: AlertCircle, color: 'text-red-500' },
];

const nodeTypes = {
  Process: ProcessNode,
  Start: ProcessNode,  // Start node uses ProcessNode
  End: ProcessNode,    // End node uses ProcessNode
  Variable: VariableNode,
  IfElse: ConditionNode,
  Switch: SwitchNode,
  Error: ErrorNode,
  CallDO: DONode,
  Mapping: MappingNode,
  Method: GroupNode,
  While: WhileNode,
  For: ForNode,
  ForEach: ForEachNode,
  CallMethod: CallGroupNode,
  Script: ScriptNode,
};

// Helper function to get all descendant nodes (children, grandchildren, etc.)
const getAllDescendantNodes = (containerId: string, allNodes: Node[]): Node[] => {
  const descendants: Node[] = [];
  const visited = new Set<string>();
  const queue = [containerId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Find direct children of current container
    const children = allNodes.filter(n => n.parentId === currentId);
    descendants.push(...children);

    // Add container-type children to queue for further traversal
    children.forEach(child => {
      if (['For', 'ForEach', 'While', 'Method'].includes(child.type || '')) {
        queue.push(child.id);
      }
    });
  }

  return descendants;
};

// Helper function to get initial nodes
const getInitialNodes = (containerId: string, initialNodes: Node[]): Node[] => {
  // 직접 자식 + 모든 후손 노드 (중첩 컨테이너의 자식들)
  const directChildren = initialNodes.filter(n => n.parentId === containerId);
  const allDescendants = getAllDescendantNodes(containerId, initialNodes);
  const containerNodes = directChildren;
  const startId = `${containerId}-start`;
  const endId = `${containerId}-end`;

  // Always create Start/End nodes with same style as main canvas
  // Position start at top and end at bottom with good separation
  const startNode: Node = {
    id: startId,
    type: 'Start',
    position: { x: 400, y: 100 },
    data: {
      label: 'Start Node',
      description: 'Entry point',
      isStart: true,
    },
    // Force visibility
    style: {
      opacity: 1,
      visibility: 'visible' as const,
      display: 'block',
      pointerEvents: 'all' as const,
    },
    hidden: false,
    selectable: true,
    draggable: true,
  };

  const endNode: Node = {
    id: endId,
    type: 'End',
    position: { x: 400, y: 500 },
    data: {
      label: 'End Node',
      description: 'Final output',
      isEnd: true,
    },
    // Force visibility
    style: {
      opacity: 1,
      visibility: 'visible' as const,
      display: 'block',
      pointerEvents: 'all' as const,
    },
    hidden: false,
    selectable: true,
    draggable: true,
  };

  if (containerNodes.length === 0) {
    return [startNode, endNode];
  }

  // Filter out existing start/end nodes to avoid duplicates.
  // Also filter out inner container start/end nodes that got corrupted (wrong parentId).
  // e.g. node3-start should have parentId='node3', not parentId=containerId.
  // Any *-start/*-end node other than the current container's own is a corruption artifact.
  const existingNodes = containerNodes.filter(n => {
    if (n.id === startId || n.id === endId) return false;
    if ((n.id.endsWith('-start') || n.id.endsWith('-end')) && n.id !== startId && n.id !== endId) return false;
    return true;
  });

  // Check if start/end nodes exist in container nodes
  const existingStart = containerNodes.find(n => n.id === startId);
  const existingEnd = containerNodes.find(n => n.id === endId);

  // Check if this is first time opening (positions are close together from collapsed state)
  const isFirstOpen = existingStart && existingEnd &&
    Math.abs(existingStart.position.y - existingEnd.position.y) < 100;

  // Use existing positions only if not first open and positions are spread out
  if (existingStart && !isFirstOpen) {
    startNode.position = { ...existingStart.position };
  }
  if (existingEnd && !isFirstOpen) {
    endNode.position = { ...existingEnd.position };
  }

  // If there are other nodes (not start/end), calculate positions based on them
  if (existingNodes.length > 0 && !isFirstOpen) {
    if (!existingStart) {
      const minY = Math.min(...existingNodes.map(n => n.position.y));
      startNode.position = { x: 400, y: minY - 150 };
    }
    if (!existingEnd) {
      const maxY = Math.max(...existingNodes.map(n => n.position.y));
      endNode.position = { x: 400, y: maxY + 200 };
    }
  }

  // 직접 자식 노드는 parentId 제거 (현재 컨테이너에 표시)
  const processedNodes = existingNodes.map(n => ({
    ...n,
    parentId: undefined,
    extent: undefined,
    position: { ...n.position },
    hidden: false,  // 모달에서는 항상 표시
    style: {
      ...n.style,
      opacity: 1,
      visibility: 'visible' as const,
      display: 'block',
    },
  }));

  // 중첩 자식 노드는 parentId 유지 (visibleNodes에서 숨겨짐)
  // 직접 자식이 아닌 모든 후손 노드
  const nestedDescendants = allDescendants.filter(n => n.parentId !== containerId);

  // Always include start and end nodes at the beginning
  // 직접 자식 + 중첩 후손 모두 포함
  return [startNode, endNode, ...processedNodes, ...nestedDescendants];
};

// Helper function to get initial edges
const getInitialEdges = (containerId: string, initialNodes: Node[], initialEdges: Edge[]): Edge[] => {
  const directChildren = initialNodes.filter(n => n.parentId === containerId);
  const allDescendants = getAllDescendantNodes(containerId, initialNodes);
  const startId = `${containerId}-start`;
  const endId = `${containerId}-end`;

  // 자식 노드가 없으면 빈 배열 반환 (자동 연결선 생성하지 않음)
  if (directChildren.length === 0) {
    return [];
  }

  // 직접 자식 노드 ID + start/end
  const directNodeIds = new Set([...directChildren.map(n => n.id), startId, endId]);

  // 모든 후손 노드 ID (중첩 컨테이너의 start/end 포함)
  const allDescendantIds = new Set(allDescendants.map(n => n.id));

  // 중첩 컨테이너들의 start/end 노드 ID 추가
  allDescendants.forEach(n => {
    if (['For', 'ForEach', 'While', 'Method'].includes(n.type || '')) {
      allDescendantIds.add(`${n.id}-start`);
      allDescendantIds.add(`${n.id}-end`);
    }
  });

  // 직접 자식 엣지 + 중첩 컨테이너 내부 엣지 모두 포함
  const filteredEdges = initialEdges.filter(e => {
    const sourceIsDirect = directNodeIds.has(e.source);
    const targetIsDirect = directNodeIds.has(e.target);
    const sourceIsDescendant = allDescendantIds.has(e.source);
    const targetIsDescendant = allDescendantIds.has(e.target);

    // 직접 자식 간의 연결 또는 중첩 후손 간의 연결
    return (sourceIsDirect && targetIsDirect) || (sourceIsDescendant && targetIsDescendant);
  });

  return filteredEdges;
};

// Inner component that uses ReactFlow hooks
interface FlowCanvasProps {
  containerId: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodesUpdate: (nodes: Node[]) => void;
  onEdgesUpdate: (edges: Edge[]) => void;
  availableNodes?: AvailableNodeInfo[];
}

// FlowCanvas에서 노출하는 메서드들
export interface FlowCanvasHandle {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getNodes: () => Node[];
  getEdges: () => Edge[];
}

const FlowCanvas = forwardRef<FlowCanvasHandle, FlowCanvasProps>(({ containerId, initialNodes: propsInitialNodes, initialEdges: propsInitialEdges, onNodesUpdate, onEdgesUpdate, availableNodes = [] }, ref) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [contextMenu, setContextMenu] = useState<{ top: number; left: number; flowPosition: { x: number; y: number } } | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<{ top: number; left: number; nodeId: string } | null>(null);
  const [ioModal, setIoModal] = useState<{ isOpen: boolean; nodeId: string | null; readOnly?: boolean }>({ isOpen: false, nodeId: null, readOnly: false });
  const [idChangeModal, setIdChangeModal] = useState<{ nodeId: string; currentId: string } | null>(null);
  const [newIdValue, setNewIdValue] = useState('');
  const [idoModal, setIdoModal] = useState<{ isOpen: boolean; nodeId: string | null }>({ isOpen: false, nodeId: null });
  // Condition, Script, Code, Mapping 모달 상태 추가
  const [conditionModal, setConditionModal] = useState<{ isOpen: boolean; nodeId: string | null; expression: string }>({ isOpen: false, nodeId: null, expression: '' });
  const [scriptModal, setScriptModal] = useState<{ isOpen: boolean; nodeId: string | null; scriptType: string; variableName: string; scriptContent: string }>({ isOpen: false, nodeId: null, scriptType: '', variableName: '', scriptContent: '' });
  const [codeModal, setCodeModal] = useState<{ isOpen: boolean; nodeId: string | null }>({ isOpen: false, nodeId: null });
  const [mappingEditorModal, setMappingEditorModal] = useState<{ isOpen: boolean; nodeId: string | null; mappings: MappingConnection[]; fixedTargetNodeId?: string | null }>({ isOpen: false, nodeId: null, mappings: [] });

  // Undo/Redo 상태
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false); // undo/redo 중인지 추적

  // 스냅샷 저장
  const takeSnapshot = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    if (isUndoRedoRef.current) return; // undo/redo 중에는 스냅샷 안 찍음
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({
        nodes: JSON.parse(JSON.stringify(currentNodes)),
        edges: JSON.parse(JSON.stringify(currentEdges))
      });
      // 최대 50개 유지
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true;
      const prevState = history[historyIndex - 1];
      setNodes(JSON.parse(JSON.stringify(prevState.nodes)));
      setEdges(JSON.parse(JSON.stringify(prevState.edges)));
      setHistoryIndex(prev => prev - 1);
      setTimeout(() => { isUndoRedoRef.current = false; }, 100);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true;
      const nextState = history[historyIndex + 1];
      setNodes(JSON.parse(JSON.stringify(nextState.nodes)));
      setEdges(JSON.parse(JSON.stringify(nextState.edges)));
      setHistoryIndex(prev => prev + 1);
      setTimeout(() => { isUndoRedoRef.current = false; }, 100);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // 부모 컴포넌트에 undo/redo 함수 노출
  useImperativeHandle(ref, () => ({
    undo,
    redo,
    canUndo: () => historyIndex > 0,
    canRedo: () => historyIndex < history.length - 1,
    getNodes: () => nodesRef.current,
    getEdges: () => edges,
  }), [undo, redo, historyIndex, history.length, edges]);

  // 중첩 ContainerFlowModal 상태 (for, forEach, while 노드용)
  const [nestedContainerModal, setNestedContainerModal] = useState<{
    isOpen: boolean;
    containerId: string | null;
    containerType: 'Method' | 'While' | 'For' | 'ForEach' | null;
    containerLabel: string;
    startValue: string;
    endValue: string;
    selectedNode: string;
    fieldType: 'input' | 'output';
    fieldName: string;
    expression: string;
  }>({
    isOpen: false,
    containerId: null,
    containerType: null,
    containerLabel: '',
    startValue: '',
    endValue: '',
    selectedNode: '',
    fieldType: 'input',
    fieldName: '',
    expression: '',
  });

  const reactFlowInstance = useReactFlow();

  // 초기화 완료 여부 추적
  const isInitializedRef = useRef(false);

  // containerId가 변경되면 초기화 플래그 리셋 (모달 닫힌 후 재오픈 시 재초기화)
  useEffect(() => {
    isInitializedRef.current = false;
  }, [containerId]);

  // updateNodeData 함수 추가
  const updateNodeData = useCallback((id: string, key: string, value: any) => {
    setNodes((nds) => {
      const updated = nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, [key]: value } };
        }
        return node;
      });
      // nodesRef를 setNodes 콜백 안에서 동기적으로 업데이트 (React 배칭 우회)
      nodesRef.current = updated;
      return updated;
    });
  }, [setNodes]);

  // Ref를 직접 동기화 (useEffect 대신 렌더 시점에 즉시 반영)
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Ref-based openNodeEditor - always uses latest state
  const openNodeEditorRef = useRef<(nodeId: string) => void>(() => {});

  // Update ref whenever dependencies change
  useEffect(() => {
    openNodeEditorRef.current = (nodeId: string) => {
      const node = nodesRef.current.find(n => n.id === nodeId);
      if (!node) {
        return;
      }

      if (node.type === 'IfElse') {
        setConditionModal({
          isOpen: true,
          nodeId: node.id,
          expression: node.data.expression || '',
        });
      } else if (node.type === 'Script') {
        setScriptModal({
          isOpen: true,
          nodeId: node.id,
          scriptType: node.data.scriptType || '',
          variableName: node.data.variableName || '',
          scriptContent: node.data.scriptContent || '',
        });
      } else if (node.type === 'Error') {
        setCodeModal({ isOpen: true, nodeId: node.id });
      } else if (node.type === 'Mapping') {
        setMappingEditorModal({
          isOpen: true,
          nodeId: node.id,
          mappings: node.data.mappings || [],
        });
      } else if (['Method', 'For', 'ForEach', 'While'].includes(node.type || '')) {
        setNestedContainerModal({
          isOpen: true,
          containerId: node.id,
          containerType: node.type as 'Method' | 'For' | 'ForEach' | 'While',
          containerLabel: node.data.label || (node.type === 'Method' ? 'Method' : 'Loop'),
          startValue: node.data.startValue || '',
          endValue: node.data.endValue || '',
          selectedNode: node.data.selectedNode || '',
          fieldType: node.data.fieldType || 'input',
          fieldName: node.data.fieldName || '',
          expression: node.data.expression || '',
        });
      }
    };
  }); // No dependencies - always update ref with latest closures

  // Stable wrapper function that calls the ref
  const openNodeEditor = useCallback((nodeId: string) => {
    openNodeEditorRef.current(nodeId);
  }, []);

  // Initialize nodes/edges when containerId changes
  // Note: updateNodeData를 의존성에서 제외 - 노드 수정 시 재초기화 방지
  useEffect(() => {
    // 이미 초기화되었으면 스킵 (노드 추가/수정 시 재초기화 방지)
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    const initNodes = getInitialNodes(containerId, propsInitialNodes);
    const initEdges = getInitialEdges(containerId, propsInitialNodes, propsInitialEdges);

    // 각 노드에 onChange 콜백 및 타입별 콜백 주입
    const nodesWithCallbacks = initNodes.map(node => {
      const isDO = node.type === 'CallDO';
      const isCallGroup = node.type === 'CallMethod';
      const isGroupLike = ['Method', 'While', 'For', 'ForEach'].includes(node.type || '');

      return {
        ...node,
        data: {
          ...node.data,
          onChange: (key: string, value: any) => {
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id === node.id) {
                  return { ...n, data: { ...n.data, [key]: value } };
                }
                return n;
              })
            );
          },
          // DO 노드용 콜백
          onOpenLinkedIDOSearch: isDO ? () => setIdoModal({ isOpen: true, nodeId: node.id }) : node.data?.onOpenLinkedIDOSearch,
          // CallGroup 노드용 availableGroups — getter 함수로 전달하여 항상 최신 목록 반환
          availableGroups: isCallGroup ? getAvailableGroups : node.data?.availableGroups,
          // Edit callback for button-based editing
          onEdit: () => openNodeEditor(node.id),
          // 컨테이너 노드용 더블클릭 핸들러
          onDoubleClick: isGroupLike ? () => openNodeEditorRef.current(node.id) : node.data?.onDoubleClick,
        }
      };
    });

    setNodes(nodesWithCallbacks);
    setEdges(initEdges);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, propsInitialNodes, propsInitialEdges, setNodes, setEdges]);

  // Update parent when nodes/edges change
  useEffect(() => {
    onNodesUpdate(nodes);
  }, [nodes, onNodesUpdate]);

  useEffect(() => {
    onEdgesUpdate(edges);
  }, [edges, onEdgesUpdate]);

  // 초기 스냅샷 저장 (노드가 초기화된 후)
  const isFirstSnapshotRef = useRef(false);
  useEffect(() => {
    if (nodes.length > 0 && !isFirstSnapshotRef.current) {
      isFirstSnapshotRef.current = true;
      setHistory([{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
      setHistoryIndex(0);
    }
  }, [nodes, edges]);

  // 노드/엣지 변경 감지하여 스냅샷 저장 (debounced)
  const lastSnapshotRef = useRef<string>('');
  useEffect(() => {
    if (!isFirstSnapshotRef.current || isUndoRedoRef.current) return;

    const currentState = JSON.stringify({ nodes, edges });
    if (currentState !== lastSnapshotRef.current && lastSnapshotRef.current !== '') {
      // 상태가 변경되었을 때만 스냅샷 저장
      const timer = setTimeout(() => {
        if (!isUndoRedoRef.current) {
          takeSnapshot(nodes, edges);
        }
      }, 300); // 300ms debounce
      return () => clearTimeout(timer);
    }
    lastSnapshotRef.current = currentState;
  }, [nodes, edges, takeSnapshot]);

  // 키보드 이벤트 리스너 (Undo/Redo) - 모달 내부에서만 작동
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && event.key === 'z') {
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (!isMac && modifier && event.key === 'y') {
        event.preventDefault();
        event.stopPropagation();
        redo();
      }
    };

    // capture phase에서 처리하여 App.tsx보다 먼저 이벤트를 가로챔
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [undo, redo]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const flowPosition = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setContextMenu({
      top: event.clientY,
      left: event.clientX,
      flowPosition,
    });
  }, [reactFlowInstance]);

  const labelMap: Record<string, string> = {
    Process: 'Process',
    Variable: 'Variable',
    IfElse: 'IfElse',
    Switch: 'Switch',
    Error: 'Error',
    CallDO: 'CallDO',
    Mapping: 'Mapping',
    Script: 'Script',
    Method: 'Method',
    While: 'While',
    For: 'For',
    ForEach: 'ForEach',
    CallMethod: 'CallMethod',
  };

  // Helper to get available groups (for CallGroup node) — reads latest nodes from nodesRef
  const getAvailableGroups = useCallback(() => {
    // 메인 플로우의 모든 Method 노드 조회 (컨테이너 내부 Method 선언 불가이므로 전부 최상위)
    const allMethods = propsInitialNodes.filter(
      n => n.type === 'Method' && n.id !== containerId
    );
    return allMethods.map(n => ({ id: n.id, label: n.data?.label || 'Method' }));
  }, [propsInitialNodes, containerId]);

  // IDO Search handler
  const openLinkedIDOSearch = useCallback((nodeId: string) => {
    setIdoModal({ isOpen: true, nodeId });
  }, []);

  // IDO Select handler
  const handleIDOSelect = useCallback(async (ido: ComponentItem) => {
    if (idoModal.nodeId) {
      // API에서 IO 도메인 + SQL 데이터 조회
      let ioData: { inputs: any[]; outputs: any[]; sqlList?: { sql: string; sqlDvCd: string; dbTp: string }[] } = { inputs: [], outputs: [] };
      try {
        ioData = await fetchComponentIO(ido.componentId, ido.type);
      } catch (e) {
        console.error('Failed to fetch component IO:', e);
      }

      const idoWithSql = { ...ido, sqlList: ioData.sqlList };
      updateNodeData(idoModal.nodeId, 'ido', idoWithSql);
      updateNodeData(idoModal.nodeId, 'code', ido.componentId);
      updateNodeData(idoModal.nodeId, 'codeName', ido.name);
      updateNodeData(idoModal.nodeId, 'description', ido.className);
      updateNodeData(idoModal.nodeId, 'inputs', ioData.inputs);
      updateNodeData(idoModal.nodeId, 'outputs', ioData.outputs);
    }
    setIdoModal({ isOpen: false, nodeId: null });
  }, [idoModal.nodeId, updateNodeData]);

  const addNode = useCallback((type: string, position?: { x: number; y: number }) => {
    setNodes((nds) => {
      // 최신 상태에서 ID 생성
      const allNodes = [...nds, ...propsInitialNodes];
      const existingNumbers = allNodes
        .map(n => {
          const match = n.id.match(/^node(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => !isNaN(num));

      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      const newNodeId = `node${maxNumber + 1}`;

      const isDO = type === 'CallDO';
      const isCallGroup = type === 'CallMethod';
      const isSwitch = type === 'Switch';
      const isGroupLike = ['Method', 'While', 'For', 'ForEach'].includes(type);

      const newNode: Node = {
        id: newNodeId,
        type,
        position: position || { x: 300, y: 200 },
        style: isGroupLike ? { width: 300, height: 200 } : undefined,
        data: {
          isExpanded: false,
          label: labelMap[type] || 'New Node',
          description: 'New node',
          onChange: (key: string, value: any) => updateNodeData(newNodeId, key, value),
          // DO 노드용 콜백
          onOpenLinkedIDOSearch: isDO ? () => openLinkedIDOSearch(newNodeId) : undefined,
          // CallGroup 노드용 availableGroups — getter 함수로 전달
          availableGroups: isCallGroup ? getAvailableGroups : undefined,
          // Switch 노드용 cases 초기화
          cases: isSwitch ? ['Case 1', 'Case 2'] : undefined,
          // Edit callback for button-based editing
          onEdit: () => openNodeEditor(newNodeId),
          // 컨테이너 노드용 더블클릭 핸들러
          onDoubleClick: isGroupLike ? () => openNodeEditor(newNodeId) : undefined,
        },
      };
      return [...nds, newNode];
    });
    setContextMenu(null);
  }, [setNodes, updateNodeData, propsInitialNodes, openLinkedIDOSearch, getAvailableGroups, openNodeEditor]);

  // 노드 우클릭 컨텍스트 메뉴 핸들러
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    // Start 노드는 컨텍스트 메뉴 제외 (End 노드는 IO 설정 허용)
    if (node.data?.isStart) return;

    setNodeContextMenu({
      top: event.clientY,
      left: event.clientX,
      nodeId: node.id,
    });
    setContextMenu(null);
  }, []);

  // IO Setting 핸들러
  const handleIOSetting = useCallback((nodeId: string) => {
    setIoModal({ isOpen: true, nodeId });
    setNodeContextMenu(null);
  }, []);

  const handleIOSave = useCallback((inputs: any[], outputs: any[]) => {
    if (ioModal.nodeId) {
      updateNodeData(ioModal.nodeId, 'inputs', inputs);
      updateNodeData(ioModal.nodeId, 'outputs', outputs);
      setIoModal({ isOpen: false, nodeId: null, readOnly: false });
    }
  }, [ioModal.nodeId, updateNodeData]);

  // 노드 삭제 핸들러
  const handleDeleteNode = useCallback((nodeId: string) => {
    // Start/End 노드는 삭제 불가
    const node = nodes.find(n => n.id === nodeId);
    if (node?.data?.isStart || node?.data?.isEnd) return;

    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setNodeContextMenu(null);
  }, [nodes, setNodes, setEdges]);

  // ID 변경 핸들러
  const handleChangeId = useCallback((nodeId: string) => {
    setIdChangeModal({ nodeId, currentId: nodeId });
    setNewIdValue(nodeId);
    setNodeContextMenu(null);
  }, []);

  const handleIdChangeSave = useCallback(() => {
    if (!idChangeModal || !newIdValue.trim()) return;

    const oldId = idChangeModal.nodeId;
    const newId = newIdValue.trim();

    // Check if new ID already exists
    const idExists = nodes.some(n => n.id === newId && n.id !== oldId);
    if (idExists) {
      alert(`ID "${newId}"는 이미 존재합니다. 다른 ID를 입력해주세요.`);
      return;
    }

    // 컨테이너 노드 타입 확인 (Method, While, For, ForEach)
    const containerTypes = ['Method', 'While', 'For', 'ForEach'];
    const targetNode = nodes.find(n => n.id === oldId);
    const isContainerNode = targetNode && containerTypes.includes(targetNode.type || '');

    // 컨테이너 노드의 내부 start/end ID 매핑
    const internalIdMap = new Map<string, string>();
    if (isContainerNode) {
      internalIdMap.set(`${oldId}-start`, `${newId}-start`);
      internalIdMap.set(`${oldId}-end`, `${newId}-end`);
    }

    // Update node ID: 메인 노드 + 컨테이너 자식 노드들의 parentId + 내부 start/end ID
    setNodes((nds) => nds.map((node) => {
      // 메인 노드 ID 변경
      if (node.id === oldId) {
        return { ...node, id: newId };
      }
      // 내부 start/end 노드 ID 변경 (컨테이너인 경우)
      if (isContainerNode && internalIdMap.has(node.id)) {
        const newNodeId = internalIdMap.get(node.id)!;
        return { ...node, id: newNodeId };
      }
      // 모든 자식 노드의 parentId 업데이트 (oldId를 parentId로 가진 모든 노드)
      if (node.parentId === oldId) {
        const newNodeId = internalIdMap.get(node.id) || node.id;
        return { ...node, id: newNodeId, parentId: newId };
      }
      return node;
    }));

    // Update edges with new node ID
    setEdges((eds) => eds.map((edge) => {
      let updated = { ...edge };
      if (edge.source === oldId) {
        updated = { ...updated, source: newId };
      }
      if (edge.target === oldId) {
        updated = { ...updated, target: newId };
      }
      // 내부 start/end 노드 ID 변경 (컨테이너인 경우)
      if (isContainerNode) {
        const newSource = internalIdMap.get(updated.source);
        const newTarget = internalIdMap.get(updated.target);
        if (newSource) updated = { ...updated, source: newSource };
        if (newTarget) updated = { ...updated, target: newTarget };
      }
      // edge ID 재생성
      if (updated.source !== edge.source || updated.target !== edge.target) {
        updated = { ...updated, id: `${updated.source}-${updated.target}` };
      }
      return updated;
    }));

    setIdChangeModal(null);
    setNewIdValue('');
  }, [idChangeModal, newIdValue, nodes, setNodes, setEdges]);

  // Edge snapping - 노드를 선 위에 드롭하면 자동 연결
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    // Edge snapping 제외 노드 타입들
    // 1. Start/End 노드 - 특수 노드
    // 2. Variable 노드 - 연결 불가 노드
    if (node.data?.isStart || node.data?.isEnd || node.type === 'variable') return;

    const nodeWidth = node.width || 150;
    const nodeHeight = node.height || 40;
    const nodeCenterX = node.position.x + nodeWidth / 2;
    const nodeCenterY = node.position.y + nodeHeight / 2;

    const overlappingEdge = edges.find((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (!sourceNode || !targetNode) return false;

      // 이미 연결된 edge는 제외
      if (edge.source === node.id || edge.target === node.id) return false;

      const sourceX = sourceNode.position.x + (sourceNode.width || 150) / 2;
      const sourceY = sourceNode.position.y + (sourceNode.height || 40) / 2;
      const targetX = targetNode.position.x + (targetNode.width || 150) / 2;
      const targetY = targetNode.position.y + (targetNode.height || 40) / 2;

      // 점과 선분 거리 계산
      const A = nodeCenterX - sourceX;
      const B = nodeCenterY - sourceY;
      const C = targetX - sourceX;
      const D = targetY - sourceY;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;

      if (lenSq !== 0) param = dot / lenSq;

      let xx, yy;

      if (param < 0) {
        xx = sourceX;
        yy = sourceY;
      } else if (param > 1) {
        xx = targetX;
        yy = targetY;
      } else {
        xx = sourceX + param * C;
        yy = sourceY + param * D;
      }

      const dx = nodeCenterX - xx;
      const dy = nodeCenterY - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance < 25;
    });

    if (overlappingEdge) {
      // 새 연결 유효성 검증
      const targetNode = nodes.find((n) => n.id === overlappingEdge.target);

      // edge1: overlappingEdge.source -> node.id 검증
      // source 핸들에 이미 다른 연결이 있는지 확인 (기존 edge 제외)
      const hasExistingOutgoingFromSource = edges.some(
        (e) => e.id !== overlappingEdge.id &&
               e.source === overlappingEdge.source &&
               (e.sourceHandle || null) === (overlappingEdge.sourceHandle || null)
      );

      // edge2: node.id -> overlappingEdge.target 검증
      // target 핸들에 이미 다른 연결이 있는지 확인 (End 노드 제외, 기존 edge 제외)
      const isTargetEndNode = targetNode?.data?.isEnd || targetNode?.data?.isInternalEnd;
      const hasExistingIncomingToTarget = !isTargetEndNode && edges.some(
        (e) => e.id !== overlappingEdge.id &&
               e.target === overlappingEdge.target &&
               (e.targetHandle || null) === (overlappingEdge.targetHandle || null)
      );

      // 유효성 검증 실패 시 edge snapping 하지 않음
      if (hasExistingOutgoingFromSource || hasExistingIncomingToTarget) {
        return;
      }

      setEdges((eds) => {
        // 기존 edge 제거
        const newEdges = eds.filter((e) => e.id !== overlappingEdge.id);

        // 두 개의 새 edge 추가
        const edge1: Edge = {
          id: `${overlappingEdge.source}-${node.id}`,
          source: overlappingEdge.source,
          target: node.id,
          sourceHandle: overlappingEdge.sourceHandle,
          animated: overlappingEdge.animated,
          type: overlappingEdge.type,
        };

        const edge2: Edge = {
          id: `${node.id}-${overlappingEdge.target}`,
          source: node.id,
          target: overlappingEdge.target,
          targetHandle: overlappingEdge.targetHandle,
          animated: overlappingEdge.animated,
          type: overlappingEdge.type,
        };

        return [...newEdges, edge1, edge2];
      });
    }
  }, [nodes, edges, setEdges]);

  // 노드 더블클릭 핸들러 (IfElse, Script, Error, Mapping, 루프 노드용)
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    // IfElse 노드 더블클릭 시 편집 모달 열기
    if (node.type === 'IfElse') {
      setConditionModal({
        isOpen: true,
        nodeId: node.id,
        expression: node.data.expression || '',
      });
      return;
    }

    // Script 노드 더블클릭 시 편집 모달 열기
    if (node.type === 'Script') {
      setScriptModal({
        isOpen: true,
        nodeId: node.id,
        scriptType: node.data.scriptType || '',
        variableName: node.data.variableName || '',
        scriptContent: node.data.scriptContent || '',
      });
      return;
    }

    // Error 노드 더블클릭 시 코드 선택 모달 열기
    if (node.type === 'Error') {
      setCodeModal({ isOpen: true, nodeId: node.id });
      return;
    }

    // Mapping 노드 더블클릭 시 매핑 에디터 모달 열기
    if (node.type === 'Mapping') {
      setMappingEditorModal({
        isOpen: true,
        nodeId: node.id,
        mappings: node.data.mappings || [],
      });
      return;
    }

    // 컨테이너 노드 (Method, For, ForEach, While) 더블클릭 시 중첩 ContainerFlowModal 열기
    if (['Method', 'For', 'ForEach', 'While'].includes(node.type || '')) {
      setNestedContainerModal({
        isOpen: true,
        containerId: node.id,
        containerType: node.type as 'Method' | 'For' | 'ForEach' | 'While',
        containerLabel: node.data.label || (node.type === 'Method' ? 'Method' : 'Loop'),
        startValue: node.data.startValue || '',
        endValue: node.data.endValue || '',
        selectedNode: node.data.selectedNode || '',
        fieldType: node.data.fieldType || 'input',
        fieldName: node.data.fieldName || '',
        expression: node.data.expression || '',
      });
      return;
    }

    // 자체 더블클릭 액션이 없는 노드 → readonly IO 설정 모달 (수정 불가)
    setIoModal({ isOpen: true, nodeId: node.id, readOnly: true });
  }, []);


  // Condition 모달 저장 핸들러
  const handleConditionSave = useCallback((expression: string) => {
    if (conditionModal.nodeId) {
      updateNodeData(conditionModal.nodeId, 'expression', expression);
    }
    setConditionModal({ isOpen: false, nodeId: null, expression: '' });
  }, [conditionModal.nodeId, updateNodeData]);

  // Script 모달 저장 핸들러
  const handleScriptSave = useCallback((scriptType: string, variableName: string, scriptContent: string) => {
    if (scriptModal.nodeId) {
      updateNodeData(scriptModal.nodeId, 'scriptType', scriptType);
      updateNodeData(scriptModal.nodeId, 'variableName', variableName);
      updateNodeData(scriptModal.nodeId, 'scriptContent', scriptContent);
    }
    setScriptModal({ isOpen: false, nodeId: null, scriptType: '', variableName: '', scriptContent: '' });
  }, [scriptModal.nodeId, updateNodeData]);

  // Code 선택 핸들러
  const handleCodeSelect = useCallback((codeItem: any) => {
    if (codeModal.nodeId) {
      updateNodeData(codeModal.nodeId, 'code', `${codeItem.majorCode}-${codeItem.minorCode}`);
      updateNodeData(codeModal.nodeId, 'codeName', codeItem.name);
      updateNodeData(codeModal.nodeId, 'majorCode', codeItem.majorCode);
      updateNodeData(codeModal.nodeId, 'minorCode', codeItem.minorCode);
      updateNodeData(codeModal.nodeId, 'description', codeItem.description);
    }
    setCodeModal({ isOpen: false, nodeId: null });
  }, [codeModal.nodeId, updateNodeData]);

  // MappingEditor 저장 핸들러
  const handleMappingEditorSave = useCallback((mappings: MappingConnection[]) => {
    if (mappingEditorModal.nodeId) {
      updateNodeData(mappingEditorModal.nodeId, 'mappings', mappings);
    }
    setMappingEditorModal({ isOpen: false, nodeId: null, mappings: [] });
  }, [mappingEditorModal.nodeId, updateNodeData]);

  // 현재 컨테이너 내부 노드들만 AvailableNodeInfo 형식으로 변환 (바로 한 단계 위 노드만)
  // Start/End 노드도 포함 (소스: Start의 outputs, 타겟: End의 inputs)
  const currentContainerNodes = useMemo(() => {
    // 현재 컨테이너 내부 노드들 (parentId가 없는 것만)
    return nodes
      .filter(n => !n.parentId)
      .map(n => {
        // Start 노드인 경우 type 지정
        const isStartNode = n.id.endsWith('-start');
        // End 노드인 경우 type 지정
        const isEndNode = n.id.endsWith('-end');

        const nodeData = n.data as any;
        return {
          id: n.id,
          label: n.id,
          type: isStartNode ? 'Start' : isEndNode ? 'End' : (n.type || 'unknown'),
          inputs: nodeData?.inputs || [],
          outputs: nodeData?.outputs || [],
          ido: nodeData?.ido ? {
            componentId: nodeData.ido.componentId || '',
            type: nodeData.ido.type || 'IMO',
          } : undefined,
        };
      });
  }, [nodes]);

  // ReactFlow에 표시할 노드 필터링 (중첩 컨테이너의 자식 노드는 숨김)
  // parentId가 없는 노드만 현재 컨테이너에 직접 속하는 노드
  const visibleNodes = useMemo(() => {
    return nodes.filter(n => !n.parentId);
  }, [nodes]);

  // ReactFlow에 표시할 엣지 필터링 (표시되는 노드 간의 연결만)
  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    return edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [edges, visibleNodes]);

  // 중첩 ContainerFlowModal 저장 핸들러
  const handleNestedContainerSave = useCallback((nestedNodes: Node[], nestedEdges: Edge[], loopData?: LoopData) => {
    const containerId = nestedContainerModal.containerId;
    const containerType = nestedContainerModal.containerType;

    if (containerId) {
      // 내부 노드 저장 (parentId 설정)
      // 중첩된 자식 노드의 parentId는 보존 (기존에 다른 parentId가 있는 경우)
      const childNodes = nestedNodes
        .filter(n => n.id !== `${containerId}-start` && n.id !== `${containerId}-end`)
        .map(n => {
          // 이미 다른 부모를 가진 노드는 기존 parentId 유지
          const hasNestedParent = n.parentId && n.parentId !== containerId;
          return {
            ...n,
            parentId: hasNestedParent ? n.parentId : containerId,
            extent: 'parent' as const,
          };
        });

      // 기존 자식 노드 제거 후 새 자식 노드 추가
      // 새 childNodeIds가 아닌, 기존 상태에서 이 컨테이너에 속한 노드를 parentId 기반으로 모두 제거
      const childNodeIds = new Set(childNodes.map(n => n.id));
      setNodes(nds => {
        // 이 컨테이너와 그 하위 중첩 컨테이너 ID를 재귀적으로 수집
        const oldContainerIds = new Set<string>([containerId]);
        let ch = true;
        while (ch) {
          ch = false;
          nds.forEach(n => {
            if (n.parentId && oldContainerIds.has(n.parentId) && !oldContainerIds.has(n.id)) {
              if (['Method', 'While', 'For', 'ForEach'].includes(n.type || '')) {
                oldContainerIds.add(n.id);
                ch = true;
              }
            }
          });
        }
        // 기존에 이 컨테이너에 속한 모든 노드 ID 수집
        const oldInternalIds = new Set<string>();
        nds.forEach(n => {
          if (n.parentId && oldContainerIds.has(n.parentId)) {
            oldInternalIds.add(n.id);
          }
        });
        oldInternalIds.add(`${containerId}-start`);
        oldInternalIds.add(`${containerId}-end`);
        oldContainerIds.forEach(cid => {
          if (cid !== containerId) {
            oldInternalIds.add(`${cid}-start`);
            oldInternalIds.add(`${cid}-end`);
          }
        });

        const parentNodes = nds.filter(n => !oldInternalIds.has(n.id) && !childNodeIds.has(n.id));
        return [...parentNodes, ...childNodes];
      });

      const startId = `${containerId}-start`;
      const endId = `${containerId}-end`;

      // 기존 노드 상태에서 이 컨테이너에 속했던 모든 노드 ID를 수집 (엣지 제거에 사용)
      const currentNodesList = nodesRef.current;
      const oldEdgeContainerIds = new Set<string>([containerId]);
      let edgeCh = true;
      while (edgeCh) {
        edgeCh = false;
        currentNodesList.forEach(n => {
          if (n.parentId && oldEdgeContainerIds.has(n.parentId) && !oldEdgeContainerIds.has(n.id)) {
            if (['Method', 'While', 'For', 'ForEach'].includes(n.type || '')) {
              oldEdgeContainerIds.add(n.id);
              edgeCh = true;
            }
          }
        });
      }
      const allOldInternalIds = new Set<string>([startId, endId]);
      currentNodesList.forEach(n => {
        if (n.parentId && oldEdgeContainerIds.has(n.parentId)) {
          allOldInternalIds.add(n.id);
        }
      });
      oldEdgeContainerIds.forEach(cid => {
        if (cid !== containerId) {
          allOldInternalIds.add(`${cid}-start`);
          allOldInternalIds.add(`${cid}-end`);
        }
      });

      // 새로 저장할 내부 노드 ID 집합 (중첩 컨테이너의 start/end 포함)
      const allNewInternalNodeIds = new Set(childNodeIds);
      allNewInternalNodeIds.add(startId);
      allNewInternalNodeIds.add(endId);
      childNodes.forEach(n => {
        if (['For', 'ForEach', 'While', 'Method'].includes(n.type || '')) {
          allNewInternalNodeIds.add(`${n.id}-start`);
          allNewInternalNodeIds.add(`${n.id}-end`);
        }
      });

      // 제거할 모든 내부 노드 ID (기존 + 새 모두 포함)
      const allInternalNodeIds = new Set([...allOldInternalIds, ...allNewInternalNodeIds]);

      // 중첩 컨테이너 내부 엣지 (start/end 연결 포함)
      const childEdges = nestedEdges.filter(e => {
        const sourceIsInternal = allNewInternalNodeIds.has(e.source);
        const targetIsInternal = allNewInternalNodeIds.has(e.target);
        return sourceIsInternal && targetIsInternal;
      });

      // 기존 중첩 컨테이너 엣지 제거 후 새 엣지 추가
      setEdges(eds => {
        // 기존 컨테이너 관련 엣지 모두 제거 (삭제된 노드 연결 엣지 포함)
        const otherEdges = eds.filter(e => {
          const sourceIsInternal = allInternalNodeIds.has(e.source);
          const targetIsInternal = allInternalNodeIds.has(e.target);
          return !sourceIsInternal && !targetIsInternal;
        });
        return [...otherEdges, ...childEdges];
      });

      // 루프 데이터 저장
      if (loopData && containerType === 'For') {
        updateNodeData(containerId, 'startValue', loopData.startValue || '');
        updateNodeData(containerId, 'endValue', loopData.endValue || '');
      } else if (loopData && containerType === 'ForEach') {
        updateNodeData(containerId, 'selectedNode', loopData.selectedNode || '');
        updateNodeData(containerId, 'fieldType', loopData.fieldType || 'input');
        updateNodeData(containerId, 'fieldName', loopData.fieldName || '');
      } else if (loopData && containerType === 'While') {
        updateNodeData(containerId, 'expression', loopData.expression || '');
      }
    }

    setNestedContainerModal({
      isOpen: false,
      containerId: null,
      containerType: null,
      containerLabel: '',
      startValue: '',
      endValue: '',
      selectedNode: '',
      fieldType: 'input',
      fieldName: '',
      expression: '',
    });
  }, [nestedContainerModal.containerId, nestedContainerModal.containerType, updateNodeData, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* 노드 내부 요소 클릭 활성화를 위한 CSS */}
      <style>{`
        .container-flow-canvas .react-flow__node {
          pointer-events: all !important;
        }
        .container-flow-canvas .react-flow__node .nodrag:not(.react-flow__handle) {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        .container-flow-canvas .react-flow__handle {
          pointer-events: all !important;
          cursor: crosshair !important;
        }
        /* 컨테이너 내부 루프 노드 스타일 - wrapper 투명화 */
        .container-flow-canvas .react-flow__node.react-flow__node-For,
        .container-flow-canvas .react-flow__node.react-flow__node-ForEach,
        .container-flow-canvas .react-flow__node.react-flow__node-While {
          border: none !important;
          outline: none !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        .container-flow-canvas .react-flow__node.react-flow__node-For.selected,
        .container-flow-canvas .react-flow__node.react-flow__node-For:focus,
        .container-flow-canvas .react-flow__node.react-flow__node-For:focus-visible,
        .container-flow-canvas .react-flow__node.react-flow__node-ForEach.selected,
        .container-flow-canvas .react-flow__node.react-flow__node-ForEach:focus,
        .container-flow-canvas .react-flow__node.react-flow__node-ForEach:focus-visible,
        .container-flow-canvas .react-flow__node.react-flow__node-While.selected,
        .container-flow-canvas .react-flow__node.react-flow__node-While:focus,
        .container-flow-canvas .react-flow__node.react-flow__node-While:focus-visible {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: transparent !important;
          overflow: visible !important;
        }
      `}</style>
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={() => { setContextMenu(null); setNodeContextMenu(null); }}
        nodeTypes={nodeTypes}
        deleteKeyCode={nestedContainerModal.isOpen ? null : ['Backspace', 'Delete']}
        defaultEdgeOptions={{
          style: { strokeWidth: 3, stroke: '#b1b1b7' },
        }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        className="container-flow-canvas"
        elementsSelectable={true}
        nodesDraggable={true}
        nodesConnectable={true}
        noDragClassName="nodrag"
        noPanClassName="nopan"
      >
        <Controls position="bottom-left" />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
      </ReactFlow>

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.top, left: contextMenu.left }}
          className="fixed z-50 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2"
        >
          <div className="px-3 py-1.5 text-xs font-medium text-slate-400">
            노드 추가
          </div>
          {nodeMenuItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={item.type}
                onClick={() => addNode(item.type, contextMenu.flowPosition)}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
              >
                <ItemIcon size={16} className={item.color} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Node Context Menu (Right-click on node) */}
      {nodeContextMenu && (
        <div
          style={{ top: nodeContextMenu.top, left: nodeContextMenu.left }}
          className="fixed z-50 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2"
        >
          <div className="px-3 py-1.5 text-xs font-medium text-slate-400">
            노드 설정
          </div>
          {(() => {
            const node = nodes.find(n => n.id === nodeContextMenu.nodeId);
            const isEndNode = node?.data?.isEnd || node?.data?.isInternalEnd;
            const isStartNode = node?.data?.isStart || node?.data?.isInternalStart;
            const isContainer = ['Method', 'While', 'For', 'ForEach'].includes(node?.type || '');
            const editableTypes = ['IfElse', 'Script', 'Error', 'Mapping', 'For', 'ForEach', 'While'];

            return (
              <>
                {/* Edit 버튼 - 특정 노드 타입용 (End 노드 제외) */}
                {!isEndNode && node && editableTypes.includes(node.type || '') && (
                  <button
                    onClick={() => {
                      openNodeEditorRef.current(nodeContextMenu.nodeId);
                      setNodeContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                  >
                    <Edit3 size={16} className="text-[#5277f7]" />
                    <span>노드 편집</span>
                  </button>
                )}

                {/* 입력 매핑 - Start/Container 제외 */}
                {node && !isStartNode && !isContainer && (
                  <button
                    onClick={() => {
                      setMappingEditorModal({
                        isOpen: true,
                        nodeId: nodeContextMenu.nodeId,
                        mappings: node.data?.mappings || [],
                        fixedTargetNodeId: nodeContextMenu.nodeId,
                      });
                      setNodeContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                  >
                    <ArrowDownToLine size={16} className="text-emerald-500" />
                    <span>입력 매핑</span>
                  </button>
                )}

                {/* Input/Output 설정 버튼 제거 — 더블클릭으로 readonly 모달이 열리도록 변경됨 */}

                {/* ID 변경 / 삭제 - End 노드 제외 */}
                {!isEndNode && (
                  <>
                    <button
                      onClick={() => handleChangeId(nodeContextMenu.nodeId)}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                    >
                      <Edit3 size={16} className="text-purple-500" />
                      <span>ID 변경</span>
                    </button>
                    <button
                      onClick={() => handleDeleteNode(nodeContextMenu.nodeId)}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                    >
                      <Trash2 size={16} />
                      <span>노드 삭제</span>
                    </button>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* IO Setting Modal */}
      <IOSettingModal
        isOpen={ioModal.isOpen}
        onClose={() => setIoModal({ isOpen: false, nodeId: null, readOnly: false })}
        nodeId={ioModal.nodeId}
        initialInputs={(nodes.find(n => n.id === ioModal.nodeId)?.data as any)?.inputs || []}
        initialOutputs={(nodes.find(n => n.id === ioModal.nodeId)?.data as any)?.outputs || []}
        onSave={handleIOSave}
        readOnly={ioModal.readOnly}
      />

      {/* ID Change Modal */}
      {idChangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="bg-[#5277f7] px-6 py-4">
              <h2 className="text-lg font-bold text-white">changeNodeId</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                New ID
              </label>
              <input
                type="text"
                value={newIdValue}
                onChange={(e) => setNewIdValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleIdChangeSave();
                  } else if (e.key === 'Escape') {
                    setIdChangeModal(null);
                    setNewIdValue('');
                  }
                }}
                autoFocus
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5277f7] focus:border-transparent"
                placeholder="enter new nodeId"
              />
              <p className="mt-2 text-xs text-slate-500">
                현재 ID: {idChangeModal.currentId}
              </p>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIdChangeModal(null);
                  setNewIdValue('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                취소
              </button>
              <button
                onClick={handleIdChangeSave}
                className="px-4 py-2 bg-[#5277f7] text-white rounded-md hover:bg-[#4162d9] transition-colors text-sm font-medium"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IDO Search Modal */}
      <IDOSearchModal
        isOpen={idoModal.isOpen}
        onClose={() => setIdoModal({ isOpen: false, nodeId: null })}
        onSelect={handleIDOSelect}
      />

      {/* Condition Edit Modal */}
      <ConditionEditModal
        isOpen={conditionModal.isOpen}
        onClose={() => setConditionModal({ isOpen: false, nodeId: null, expression: '' })}
        nodeId={conditionModal.nodeId}
        initialExpression={conditionModal.expression}
        onSave={handleConditionSave}
      />

      {/* Script Edit Modal */}
      <ScriptEditModal
        isOpen={scriptModal.isOpen}
        onClose={() => setScriptModal({ isOpen: false, nodeId: null, scriptType: '', variableName: '', scriptContent: '' })}
        nodeId={scriptModal.nodeId}
        nodes={nodes}
        edges={edges}
        initialScriptType={scriptModal.scriptType}
        initialVariableName={scriptModal.variableName}
        initialScriptContent={scriptModal.scriptContent}
        onSave={handleScriptSave}
      />

      {/* Code Selection Modal */}
      <CodeSelectionModal
        isOpen={codeModal.isOpen}
        onClose={() => setCodeModal({ isOpen: false, nodeId: null })}
        onSelect={handleCodeSelect}
      />

      {/* Mapping Editor Modal */}
      <MappingEditorModal
        isOpen={mappingEditorModal.isOpen}
        onClose={() => setMappingEditorModal({ isOpen: false, nodeId: null, mappings: [] })}
        nodeId={mappingEditorModal.nodeId}
        initialMappings={mappingEditorModal.mappings}
        availableNodes={currentContainerNodes}
        edges={edges}
        onSave={handleMappingEditorSave}
        fixedTargetNodeId={mappingEditorModal.fixedTargetNodeId}
      />

      {/* 중첩 ContainerFlowModal (for, forEach, while 노드 내부 편집용) */}
      <ContainerFlowModal
        isOpen={nestedContainerModal.isOpen}
        onClose={() => setNestedContainerModal({
          isOpen: false,
          containerId: null,
          containerType: null,
          containerLabel: '',
          startValue: '',
          endValue: '',
          selectedNode: '',
          fieldType: 'input',
          fieldName: '',
          expression: '',
        })}
        containerId={nestedContainerModal.containerId}
        containerType={nestedContainerModal.containerType}
        containerLabel={nestedContainerModal.containerLabel}
        initialNodes={nodes}
        initialEdges={edges}
        onSave={handleNestedContainerSave}
        initialStartValue={nestedContainerModal.startValue}
        initialEndValue={nestedContainerModal.endValue}
        initialSelectedNode={nestedContainerModal.selectedNode}
        initialFieldType={nestedContainerModal.fieldType}
        initialFieldName={nestedContainerModal.fieldName}
        initialExpression={nestedContainerModal.expression}
        availableNodes={currentContainerNodes}
      />
    </div>
  );
});

FlowCanvas.displayName = 'FlowCanvas';

export const ContainerFlowModal = ({
  isOpen,
  onClose,
  containerId,
  containerType,
  containerLabel,
  initialNodes,
  initialEdges,
  onSave,
  initialStartValue = '',
  initialEndValue = '',
  initialSelectedNode = '',
  initialFieldType = 'input',
  initialFieldName = '',
  initialExpression = '',
  availableNodes = [],
}: ContainerFlowModalProps) => {
  const [currentNodes, setCurrentNodes] = useState<Node[]>([]);
  const [currentEdges, setCurrentEdges] = useState<Edge[]>([]);

  // FlowCanvas ref (undo/redo 함수 접근용)
  const flowCanvasRef = useRef<FlowCanvasHandle>(null);

  // Undo/Redo 버튼 상태 (리렌더링 트리거용)
  const [undoRedoState, setUndoRedoState] = useState({ canUndo: false, canRedo: false });

  // useRef로 최신 상태 동기적 추적 (React 배칭 문제 해결)
  const currentNodesRef = useRef<Node[]>([]);
  const currentEdgesRef = useRef<Edge[]>([]);

  // wrapper 함수 - ref와 state 동시 업데이트
  const updateCurrentNodes = useCallback((nodes: Node[]) => {
    currentNodesRef.current = nodes;
    setCurrentNodes(nodes);
  }, []);

  const updateCurrentEdges = useCallback((edges: Edge[]) => {
    currentEdgesRef.current = edges;
    setCurrentEdges(edges);
  }, []);

  // Undo/Redo 버튼 핸들러
  const handleUndo = useCallback(() => {
    if (flowCanvasRef.current) {
      flowCanvasRef.current.undo();
      // 상태 업데이트 (버튼 활성화/비활성화)
      setTimeout(() => {
        if (flowCanvasRef.current) {
          setUndoRedoState({
            canUndo: flowCanvasRef.current.canUndo(),
            canRedo: flowCanvasRef.current.canRedo(),
          });
        }
      }, 150);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (flowCanvasRef.current) {
      flowCanvasRef.current.redo();
      // 상태 업데이트 (버튼 활성화/비활성화)
      setTimeout(() => {
        if (flowCanvasRef.current) {
          setUndoRedoState({
            canUndo: flowCanvasRef.current.canUndo(),
            canRedo: flowCanvasRef.current.canRedo(),
          });
        }
      }, 150);
    }
  }, []);

  // currentNodes 변경 시 undoRedoState 업데이트
  useEffect(() => {
    if (flowCanvasRef.current) {
      setUndoRedoState({
        canUndo: flowCanvasRef.current.canUndo(),
        canRedo: flowCanvasRef.current.canRedo(),
      });
    }
  }, [currentNodes, currentEdges]);

  // For node state (시작값, 종료값)
  const [startValue, setStartValue] = useState(initialStartValue);
  const [endValue, setEndValue] = useState(initialEndValue);

  // ForEach node state (노드 선택, 구분, 필드명)
  const [selectedNode, setSelectedNode] = useState(initialSelectedNode);
  const [fieldType, setFieldType] = useState<'input' | 'output'>(initialFieldType as 'input' | 'output');
  const [fieldName, setFieldName] = useState(initialFieldName);
  const [showNodeDropdown, setShowNodeDropdown] = useState(false);
  const [showFieldTypeDropdown, setShowFieldTypeDropdown] = useState(false);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);

  // ForEach: 선택된 노드의 IO 데이터 (API 동적 조회)
  const [fetchedIO, setFetchedIO] = useState<{ inputs: Array<{ name: string }>; outputs: Array<{ name: string }> }>({ inputs: [], outputs: [] });

  // While node state (expression)
  const [expression, setExpression] = useState(initialExpression);

  // Reset options when modal opens
  useEffect(() => {
    if (isOpen) {
      setStartValue(initialStartValue || '');
      setEndValue(initialEndValue || '');
      setSelectedNode(initialSelectedNode || '');
      setFieldType((initialFieldType as 'input' | 'output') || 'input');
      setFieldName(initialFieldName || '');
      setExpression(initialExpression || '');
      setFetchedIO({ inputs: [], outputs: [] });
    }
  }, [isOpen, initialStartValue, initialEndValue, initialSelectedNode, initialFieldType, initialFieldName, initialExpression]);

  // ForEach: 노드 선택 변경 시 해당 노드의 IO를 API로 조회
  useEffect(() => {
    if (!selectedNode || containerType !== 'ForEach') return;
    const fullNode = currentNodesRef.current.find(n => n.id === selectedNode)
      || initialNodes.find(n => n.id === selectedNode);
    if (!fullNode) return;

    // availableNodes에 이미 IO가 있으면 그대로 사용
    const avNode = availableNodes.find(n => n.id === selectedNode);
    if (avNode && (avNode.inputs.length > 0 || avNode.outputs.length > 0)) {
      setFetchedIO({ inputs: avNode.inputs, outputs: avNode.outputs });
      return;
    }

    // CallDO/Process 노드: IDO componentId로 API 조회
    const ido = fullNode.data?.ido;
    if (ido && ido.componentId) {
      fetchComponentIO(ido.componentId, ido.type || 'IDO')
        .then(result => {
          setFetchedIO({
            inputs: result.inputs.map(f => ({ name: f.name || f.englishName || f.koreanName || '' })).filter(f => f.name),
            outputs: result.outputs.map(f => ({ name: f.name || f.englishName || f.koreanName || '' })).filter(f => f.name),
          });
        })
        .catch(() => setFetchedIO({ inputs: [], outputs: [] }));
    } else {
      setFetchedIO({ inputs: [], outputs: [] });
    }
  }, [selectedNode, containerType, initialNodes, availableNodes]);

  // Get selected node info
  const getSelectedNodeInfo = () => {
    return availableNodes.find(n => n.id === selectedNode);
  };

  // Get field options for selected node (filtered by fieldType)
  const getFieldOptions = () => {
    const options: Array<{ value: string; label: string }> = [];

    // API로 조회한 IO 데이터 우선 사용
    if (fieldType === 'input') {
      fetchedIO.inputs.forEach(input => {
        options.push({ value: input.name, label: input.name });
      });
    } else {
      fetchedIO.outputs.forEach(output => {
        options.push({ value: output.name, label: output.name });
      });
    }

    // fallback: availableNodes에 있는 데이터
    if (options.length === 0) {
      const nodeInfo = getSelectedNodeInfo();
      if (nodeInfo) {
        if (fieldType === 'input') {
          nodeInfo.inputs?.forEach(input => {
            options.push({ value: input.name, label: input.name });
          });
        } else {
          nodeInfo.outputs?.forEach(output => {
            options.push({ value: output.name, label: output.name });
          });
        }
      }
    }

    return options;
  };

  // ForEach: 선택된 노드가 CallDO + IDO + SELECT인 경우 구분을 'outputList'로 표시하고 필드 선택 비활성화
  const isOutputList = useMemo(() => {
    if (!selectedNode) return false;
    const fullNode = currentNodesRef.current.find(n => n.id === selectedNode)
      || initialNodes.find(n => n.id === selectedNode);
    if (!fullNode || fullNode.type !== 'CallDO') return false;
    const ido = fullNode?.data?.ido;
    if (!ido) return false;
    if (ido.type === 'IMO') return false;
    // returnType이 명시적으로 설정되어있으면 그 값으로만 판단
    // returnType은 객체 {name, id} 또는 문자열일 수 있음
    const returnType = fullNode.data?.returnType;
    if (returnType) {
      const rtId = typeof returnType === 'string' ? returnType : (returnType.id || returnType.name || '');
      return rtId === 'JexDataList';
    }
    // returnType 미설정 시에만 sqlDvCd 폴백
    return ido.type === 'IDO' && ido.sqlList?.[0]?.sqlDvCd === 'SELECT';
  }, [selectedNode, initialNodes]);

  // outputList일 때 필드 선택값 초기화
  useEffect(() => {
    if (isOutputList && fieldType === 'output') {
      setFieldName('');
    }
  }, [isOutputList, fieldType]);

  const getSelectedNodeText = () => {
    if (!selectedNode) return '노드 선택';
    const node = availableNodes.find(n => n.id === selectedNode);
    return node ? `${node.id} [${node.type}]` : selectedNode;
  };

  const handleSave = useCallback(() => {
    if (!containerId) return;

    // FlowCanvas ref에서 최신 상태 직접 읽기 (React 배칭 문제 해결)
    const latestNodes = flowCanvasRef.current?.getNodes() || currentNodesRef.current;
    const latestEdges = flowCanvasRef.current?.getEdges() || currentEdgesRef.current;


    // Restore parentId and extent for nodes
    // 이미 parentId가 있는 노드(중첩 컨테이너의 자식)는 기존 parentId 유지
    // parentId가 없는 노드만 현재 containerId 적용
    // 주의: `-start`/`-end`로 끝나더라도 중첩 컨테이너(node3-start 등)의 경우
    //       parentId가 'node3' 등으로 설정되어 있으므로 그대로 보존해야 함
    const restoredNodes = latestNodes.map(n => {
      const hasNestedParent = n.parentId && n.parentId !== containerId;

      return {
        ...n,
        parentId: hasNestedParent ? n.parentId : containerId,
        extent: 'parent' as const,
        zIndex: 1000,
        hidden: true, // 항상 숨김 상태로 저장 (toggleGroupExpanded에서만 unhide)
      };
    });

    // Include loop data for For/ForEach/While
    let loopData: LoopData | undefined;
    if (containerType === 'For') {
      loopData = { startValue, endValue };
    } else if (containerType === 'ForEach') {
      loopData = { selectedNode, fieldType, fieldName };
    } else if (containerType === 'While') {
      loopData = { expression };
    }

    // onSave 콜백(App.tsx handleContainerFlowSave)에서 직접 모달을 닫음
    // 취소 시에는 onClose가 스냅샷을 복원하므로, 저장 경로에서는 onClose를 호출하지 않음
    onSave(restoredNodes, latestEdges, loopData);
  }, [containerId, onSave, containerType, startValue, endValue, selectedNode, fieldType, fieldName, expression]);

  const getTypeConfig = () => {
    switch (containerType) {
      case 'Method':
        return {
          icon: FolderOpen,
          title: 'Method',
          color: 'bg-teal-100',
          iconColor: 'text-teal-600',
        };
      case 'While':
        return {
          icon: Repeat,
          title: 'While',
          color: 'bg-cyan-100',
          iconColor: 'text-cyan-600',
        };
      case 'For':
        return {
          icon: RotateCw,
          title: 'For',
          color: 'bg-purple-100',
          iconColor: 'text-purple-600',
        };
      case 'ForEach':
        return {
          icon: Repeat2,
          title: 'ForEach',
          color: 'bg-blue-100',
          iconColor: 'text-[#5277f7]',
        };
      default:
        return {
          icon: FolderOpen,
          title: 'Container',
          color: 'bg-slate-100',
          iconColor: 'text-slate-600',
        };
    }
  };

  if (!isOpen || !containerId) return null;

  const config = getTypeConfig();
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col" style={{ width: '90vw', height: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 bg-[#dce4fd] border-b border-[#cddbfd]" style={{ padding: '20px 32px' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/60 rounded-xl">
              <Icon size={22} className="text-[#5277f7]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{config.title}: {containerLabel}</h2>
              <p className="text-xs text-slate-400 mt-0.5">내부 노드를 추가하고 연결하세요</p>
            </div>
          </div>

          {/* While Node - expression 입력 */}
          {containerType === 'While' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#5277f7] font-mono font-bold">while (</span>
              <input
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="expression..."
                className="w-64 px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-[#5277f7] focus:ring-2 focus:ring-blue-100 bg-white"
              />
              <span className="text-xs text-[#5277f7] font-mono font-bold">)</span>
            </div>
          )}

          {/* For Node - 시작값, 종료값 입력 */}
          {containerType === 'For' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">시작 값</span>
                <input
                  type="text"
                  value={startValue}
                  onChange={(e) => setStartValue(e.target.value)}
                  placeholder="0"
                  className="w-20 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#5277f7] focus:ring-2 focus:ring-blue-100 bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">종료 값</span>
                <input
                  type="text"
                  value={endValue}
                  onChange={(e) => setEndValue(e.target.value)}
                  placeholder="10"
                  className="w-20 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#5277f7] focus:ring-2 focus:ring-blue-100 bg-white"
                />
              </div>
            </div>
          )}

          {/* ForEach Node - 노드 선택 콤보 + 필드 선택 콤보 */}
          {containerType === 'ForEach' && (
            <div className="flex items-center gap-3">
              {/* 노드 선택 콤보박스 */}
              <div className="relative">
                <span className="text-xs text-slate-500 font-medium mr-2">노드</span>
                <button
                  className={`w-48 text-left bg-white px-3 py-1.5 rounded-lg border transition-all duration-200 text-sm ${
                    showNodeDropdown
                      ? 'border-[#5277f7] shadow-[0_0_0_2px_rgba(82,119,247,0.15)]'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => { setShowNodeDropdown(!showNodeDropdown); setShowFieldDropdown(false); }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 truncate">{getSelectedNodeText()}</span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform duration-200 ${showNodeDropdown ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>
                {showNodeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 max-h-48 overflow-auto" style={{ zIndex: 99999 }}>
                    {availableNodes.length > 0 ? (
                      availableNodes.map((node) => (
                        <button
                          key={node.id}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            selectedNode === node.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                          }`}
                          onClick={() => {
                            setSelectedNode(node.id);
                            setFieldName(''); // Reset field when node changes
                            setShowNodeDropdown(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-700 font-medium">{node.id}</span>
                            <span className="text-blue-600 text-xs font-mono bg-blue-50 px-1.5 py-0.5 rounded">{node.type}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-slate-400">선택 가능한 노드 없음</div>
                    )}
                  </div>
                )}
              </div>

              {/* 구분 선택 콤보박스 (input/output) */}
              <div className="relative">
                <span className="text-xs text-slate-500 font-medium mr-2">구분</span>
                <button
                  className={`w-28 text-left bg-white px-3 py-1.5 rounded-lg border transition-all duration-200 text-sm ${
                    showFieldTypeDropdown
                      ? 'border-[#5277f7] shadow-[0_0_0_2px_rgba(82,119,247,0.15)]'
                      : 'border-slate-200 hover:border-slate-300'
                  } ${!selectedNode ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => {
                    if (selectedNode) {
                      setShowFieldTypeDropdown(!showFieldTypeDropdown);
                      setShowNodeDropdown(false);
                      setShowFieldDropdown(false);
                    }
                  }}
                  disabled={!selectedNode}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">{isOutputList && fieldType === 'output' ? 'outputList' : fieldType}</span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform duration-200 ${showFieldTypeDropdown ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>
                {showFieldTypeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1" style={{ zIndex: 99999 }}>
                    <button
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        fieldType === 'input' ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => {
                        setFieldType('input');
                        setFieldName(''); // Reset field when type changes
                        setShowFieldTypeDropdown(false);
                      }}
                    >
                      <span className="text-slate-700">input</span>
                    </button>
                    <button
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        fieldType === 'output' ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => {
                        setFieldType('output');
                        setFieldName(''); // Reset field when type changes
                        setShowFieldTypeDropdown(false);
                      }}
                    >
                      <span className="text-slate-700">{isOutputList ? 'outputList' : 'output'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 필드 선택 콤보박스 */}
              <div className="relative">
                <span className="text-xs text-slate-500 font-medium mr-2">필드</span>
                <button
                  className={`w-44 text-left bg-white px-3 py-1.5 rounded-lg border transition-all duration-200 text-sm ${
                    showFieldDropdown
                      ? 'border-[#5277f7] shadow-[0_0_0_2px_rgba(82,119,247,0.15)]'
                      : 'border-slate-200 hover:border-slate-300'
                  } ${(!selectedNode || (isOutputList && fieldType === 'output')) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => {
                    if (selectedNode && !(isOutputList && fieldType === 'output')) {
                      setShowFieldDropdown(!showFieldDropdown);
                      setShowNodeDropdown(false);
                      setShowFieldTypeDropdown(false);
                    }
                  }}
                  disabled={!selectedNode || (isOutputList && fieldType === 'output')}
                >
                  <div className="flex items-center justify-between">
                    <span className={`truncate ${fieldName ? 'text-slate-700' : 'text-slate-400'}`}>
                      {fieldName || '필드 선택'}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform duration-200 ${showFieldDropdown ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>
                {showFieldDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 max-h-48 overflow-auto" style={{ zIndex: 99999 }}>
                    {getFieldOptions().length > 0 ? (
                      getFieldOptions().map((field) => (
                        <button
                          key={field.value}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            fieldName === field.value ? 'bg-blue-50' : 'hover:bg-slate-50'
                          }`}
                          onClick={() => { setFieldName(field.value); setShowFieldDropdown(false); }}
                        >
                          <span className="text-slate-700">{field.label}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-slate-400">필드 없음</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Undo/Redo 버튼 */}
          <div className="flex items-center gap-1 border-l border-slate-200 pl-4 ml-4">
            <button
              onClick={handleUndo}
              disabled={!undoRedoState.canUndo}
              className={`p-2 rounded-lg transition-colors ${
                undoRedoState.canUndo
                  ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
              title="되돌리기 (Ctrl+Z)"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={handleRedo}
              disabled={!undoRedoState.canRedo}
              className={`p-2 rounded-lg transition-colors ${
                undoRedoState.canRedo
                  ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
              title="다시 실행 (Ctrl+Shift+Z)"
            >
              <Redo2 size={18} />
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-2 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Flow Canvas */}
        <div className="flex-1 bg-slate-50 border-t border-b border-slate-200 relative">
          <ReactFlowProvider>
            <FlowCanvas
              ref={flowCanvasRef}
              key={containerId}
              containerId={containerId}
              initialNodes={initialNodes}
              initialEdges={initialEdges}
              onNodesUpdate={updateCurrentNodes}
              onEdgesUpdate={updateCurrentEdges}
              availableNodes={availableNodes}
            />
          </ReactFlowProvider>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 shrink-0 bg-slate-50/80" style={{ padding: '16px 32px' }}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[#5277f7] rounded-lg hover:bg-[#4162d9] transition-colors shadow-sm"
          >
            <Save size={16} />
            저장
          </button>
        </div>
      </div>
    </div>
  );
};
