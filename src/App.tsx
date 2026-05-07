// ==========================================
// File: /App.tsx
// ==========================================
import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  MiniMap,
  Panel,
  MarkerType,
  Connection,
  SelectionMode,
  ReactFlowInstance,
  ConnectionMode,
} from 'reactflow@11.11.4';
import 'reactflow@11.11.4/dist/style.css';
import { ProcessNode } from './components/ProcessNode';
import { VariableNode } from './components/VariableNode';
import { ConditionNode } from './components/ConditionNode';
import { SwitchNode } from './components/SwitchNode';
import { useUndoRedo } from './hooks/useUndoRedo';
import { IDOSearchModal, ComponentItem } from './components/IDOSearchModal';
import { fetchComponentIO } from './services/componentService';
import { JsonExportModal } from './components/JsonExportModal';
import { JsonImportModal } from './components/JsonImportModal';
import {
  Plus,
  Database,
  Split,
  Workflow,
  Trash2,
  Undo,
  Redo,
  GitMerge,
  Download,
  Upload,
  AlertCircle,
  Repeat,
  Box,
  Layers,
  FolderOpen,
  RotateCw,
  MousePointer2,
  Hand,
} from 'lucide-react';
import { ErrorNode } from './components/ErrorNode';
import { WhileNode } from './components/WhileNode';
import { ForNode } from './components/ForNode';
import { ForEachNode } from './components/ForEachNode';
import { DONode } from './components/DONode';
import { GroupNode } from './components/GroupNode';
import { CallGroupNode } from './components/CallGroupNode';
import { CodeSelectionModal } from './components/CodeSelectionModal';
import { TextEditModal } from './components/TextEditModal';
import { ContextMenu } from './components/ContextMenu';
import { GroupContextMenu } from './components/GroupContextMenu';
import { PaneContextMenu } from './components/PaneContextMenu';
import { IOSettingModal, IOField } from './components/IOSettingModal';
import { IOPanel } from './components/IOPanel';
import { MappingNode } from './components/MappingNode';
import { ScriptNode } from './components/ScriptNode';
import { ScriptEditModal } from './components/ScriptEditModal';
import { AutocompleteManagerModal } from './components/AutocompleteManagerModal';
import { AutocompleteItem } from './types/autocomplete';
import { MappingContextMenu } from './components/MappingContextMenu';
import { MappingSettingModal, MappingField } from './components/MappingSettingModal';
import { MappingEditorModal, MappingConnection } from './components/MappingEditorModal';
import { ConditionEditModal } from './components/ConditionEditModal';
import { ContainerFlowModal, LoopData } from './components/ContainerFlowModal';
import { ForEditModal } from './components/ForEditModal';
import { ForEachEditModal } from './components/ForEachEditModal';
import { separateNodesAndGroups, cleanNodeForExport } from './utils/relationshipUtils';
import { validateFlow } from './utils/validationUtils';
import { useActionApproval } from './hooks/useActionApproval';
import { ApprovalOverlay } from './components/ApprovalOverlay';
import { ApprovalActionType } from './types/approval';

// Domain 필드를 IOField 형식으로 변환하는 함수
interface DomainField {
  ENG_WRD_SRT?: string;
  KOR_WRD_NM?: string;
  LENGTH?: string | number;
  FLD_TP?: string;
  RULE_NM?: string;
  TARGET?: string;
  DAT_TP?: string;
  BASE_VLU?: string;
  MDTY_YN?: string;
  CRYP_YN?: string;
  MASK_YN?: string;
  FORMAT?: string;
  [key: string]: any;
}

const convertDomainFieldToIOField = (field: DomainField, index: number): IOField => {
  return {
    id: `field_${index}_${Date.now()}`,
    englishName: field.ENG_WRD_SRT || '',
    koreanName: field.KOR_WRD_NM || '',
    length: String(field.LENGTH || ''),
    fieldType: field.FLD_TP || 'Field',
    ruleName: field.RULE_NM || '',
    target: field.TARGET || '',
    dataType: field.DAT_TP || 'X',
    alignment: 'Left',
    padding: '',
    defaultValue: field.BASE_VLU || '',
    required: field.MDTY_YN === 'Y',
    encryption: field.CRYP_YN || 'None',
    masking: field.MASK_YN || 'None',
    checked: false,
    name: field.ENG_WRD_SRT || '',
    type: field.FLD_TP || 'Field'
  };
};

const convertDomainFieldsToIOFields = (fields: DomainField[]): IOField[] => {
  if (!Array.isArray(fields)) return [];
  return fields.map((field, index) => convertDomainFieldToIOField(field, index));
};

// NOTE: Node ID counters removed - IDs are now generated dynamically based on existing nodes

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'Start',
    position: { x: 400, y: 50 },
    data: {
      label: 'Start',
      description: '',
      isStart: true
    },
  },
  {
    id: 'end',
    type: 'End',
    position: { x: 400, y: 800 },
    data: {
      label: 'End',
      description: '',
      isEnd: true
    },
  },
];

const initialEdges: Edge[] = [];

export default function App() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isIDOModalOpen, setIsIDOModalOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Node types - defined inside component to ensure hot reload updates work correctly
  const nodeTypes = useMemo(() => ({
    Process: ProcessNode,
    Start: ProcessNode,  // Start node uses ProcessNode
    End: ProcessNode,    // End node uses ProcessNode
    Variable: VariableNode,
    IfElse: ConditionNode,
    Switch: SwitchNode,
    Error: ErrorNode,
    While: WhileNode,
    For: ForNode,
    ForEach: ForEachNode,
    CallDO: DONode,
    Method: GroupNode,
    CallMethod: CallGroupNode,
    Mapping: MappingNode,
    Script: ScriptNode,
  }), []);

  // Code Selection Modal State
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  
  // Text Edit Modal State
  const [isTextEditModalOpen, setIsTextEditModalOpen] = useState(false);
  const [textEditConfig, setTextEditConfig] = useState<{
    title: string;
    label: string;
    placeholder: string;
    field: string;
  }>({
    title: '',
    label: '',
    placeholder: '',
    field: '',
  });
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ top: number; left: number; nodeId: string; nodeType?: string } | null>(null);
  const [groupContextMenu, setGroupContextMenu] = useState<{ top: number; left: number; nodeId: string; currentLabel: string } | null>(null);
  const [paneContextMenu, setPaneContextMenu] = useState<{ top: number; left: number; flowPosition: { x: number; y: number } } | null>(null);
  const [isIOModalOpen, setIsIOModalOpen] = useState(false);
  const [isIOModalReadOnly, setIsIOModalReadOnly] = useState(false);

  // Export/Import Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [exportData, setExportData] = useState<any>(null);

  // ID Change Modal State
  const [idChangeModal, setIdChangeModal] = useState<{ nodeId: string; currentId: string } | null>(null);
  const [newIdValue, setNewIdValue] = useState('');

  // Mapping Context Menu and Modal State
  const [mappingContextMenu, setMappingContextMenu] = useState<{ top: number; left: number; nodeId: string } | null>(null);
  const [mappingModal, setMappingModal] = useState<{ isOpen: boolean; nodeId: string | null; mappingType: 'input' | 'output' }>({
    isOpen: false,
    nodeId: null,
    mappingType: 'input',
  });

  // Mapping Editor Modal State (new drag-and-drop mapping editor)
  const [mappingEditorModal, setMappingEditorModal] = useState<{
    isOpen: boolean;
    nodeId: string | null;
    mappings: MappingConnection[];
    fixedTargetNodeId?: string | null;
  }>({
    isOpen: false,
    nodeId: null,
    mappings: [],
    fixedTargetNodeId: null,
  });

  // Condition Edit Modal State
  const [conditionModal, setConditionModal] = useState<{ isOpen: boolean; nodeId: string | null; expression: string }>({
    isOpen: false,
    nodeId: null,
    expression: '',
  });

  // Script Edit Modal State
  const [scriptModal, setScriptModal] = useState<{
    isOpen: boolean;
    nodeId: string | null;
    scriptType: string;
    variableName: string;
    scriptContent: string;
    variables: any[];
  }>({
    isOpen: false,
    nodeId: null,
    scriptType: '',
    variableName: '',
    scriptContent: '',
    variables: [],
  });

  // Autocomplete Manager Modal State
  const [autocompleteManagerOpen, setAutocompleteManagerOpen] = useState(false);
  const [autocompleteData, setAutocompleteData] = useState<AutocompleteItem[]>([]);

  // For Edit Modal State
  const [forModal, setForModal] = useState<{
    isOpen: boolean;
    nodeId: string | null;
    option1: string;
    option2: string;
  }>({
    isOpen: false,
    nodeId: null,
    option1: '',
    option2: '',
  });

  // ForEach Edit Modal State
  const [forEachModal, setForEachModal] = useState<{
    isOpen: boolean;
    nodeId: string | null;
    option1: string;
    option2: string;
  }>({
    isOpen: false,
    nodeId: null,
    option1: '',
    option2: '',
  });

  // Container Flow Modal State (for Method, While, For internal editing)
  const [containerFlowModal, setContainerFlowModal] = useState<{
    isOpen: boolean;
    containerId: string | null;
    containerType: 'Method' | 'While' | 'For' | 'ForEach' | null;
    containerLabel: string;
    // For node (시작값, 종료값)
    startValue: string;
    endValue: string;
    // ForEach node (노드 선택, 구분, 필드명)
    selectedNode: string;
    fieldType: 'input' | 'output';
    fieldName: string;
    // While node (expression)
    expression: string;
    // 취소 시 복원용 스냅샷
    snapshotNodes: Node[];
    snapshotEdges: Edge[];
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
    snapshotNodes: [],
    snapshotEdges: [],
  });

  // Error Modal State
  const [errorNodeIds, setErrorNodeIds] = useState<Set<string>>(new Set());
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Tools Mode State
  const [toolMode, setToolMode] = useState<'select' | 'pan'>('pan');

  // Clipboard State for Copy/Paste
  const clipboardRef = useRef<Node[]>([]);

  const { takeSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo(
    initialNodes,
    initialEdges,
    setNodes,
    setEdges
  );

  const containerFlowModalOpenRef = useRef(false);
  useEffect(() => {
    containerFlowModalOpenRef.current = containerFlowModal.isOpen;
  }, [containerFlowModal.isOpen]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // 모달 열려있을 때 remove 변경 차단 (Delete 키 전파 방지)
      if (containerFlowModalOpenRef.current) {
        const safeChanges = changes.filter((c) => c.type !== 'remove');
        if (safeChanges.length > 0) {
          setNodes((nds) => applyNodeChanges(safeChanges, nds));
        }
        return;
      }
      setNodes((nds) => {
        const removeChanges = changes.filter((c) => c.type === 'remove');

        // 컨테이너 노드 삭제 시 자식 노드들도 함께 삭제
        // (ReactFlow의 applyNodeChanges는 자식 노드를 자동 삭제하지 않음)
        const containerTypes = ['Method', 'While', 'For', 'ForEach'];
        let extraRemovals: string[] = [];
        if (removeChanges.length > 0) {
          const removedIds = new Set(removeChanges.map((c) => c.id));
          // 제거되는 노드 중 컨테이너 타입 찾기
          const removedContainerIds = nds
            .filter((n) => removedIds.has(n.id) && containerTypes.includes(n.type || ''))
            .map((n) => n.id);

          if (removedContainerIds.length > 0) {
            // 해당 컨테이너를 parentId로 가진 모든 자식 노드 ID 수집 (재귀적으로)
            const toRemove = new Set<string>(removedContainerIds);
            let changed = true;
            while (changed) {
              changed = false;
              nds.forEach((n) => {
                if (n.parentId && toRemove.has(n.parentId) && !toRemove.has(n.id)) {
                  toRemove.add(n.id);
                  changed = true;
                }
              });
            }
            // 원래 removeChanges에서 이미 포함된 ID 제외하고 추가 삭제 목록 구성
            removedContainerIds.forEach((cid) => {
              toRemove.forEach((id) => {
                if (!removedIds.has(id)) {
                  extraRemovals.push(id);
                }
              });
            });
            // internal start/end 노드도 추가 (containerId 기반)
            nds.forEach((n) => {
              if (
                (n.data?.isInternalStart || n.data?.isInternalEnd) &&
                n.data?.containerId &&
                removedContainerIds.includes(n.data.containerId) &&
                !removedIds.has(n.id)
              ) {
                extraRemovals.push(n.id);
              }
            });
          }
        }

        let nextNodes = applyNodeChanges(changes, nds);

        // 추가로 삭제해야 할 자식/내부 노드 제거
        if (extraRemovals.length > 0) {
          const extraRemovalSet = new Set(extraRemovals);
          nextNodes = nextNodes.filter((n) => !extraRemovalSet.has(n.id));

          // 삭제된 노드와 연결된 엣지도 제거
          setEdges((eds) => {
            const allRemovedIds = new Set([
              ...removeChanges.map((c) => c.id),
              ...extraRemovals,
            ]);
            return eds.filter(
              (e) => !allRemovedIds.has(e.source) && !allRemovedIds.has(e.target)
            );
          });
        }

        if (removeChanges.length > 0) {
          takeSnapshot(nextNodes, edges);
        }
        return nextNodes;
      });
    },
    [edges, takeSnapshot]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const nextEdges = applyEdgeChanges(changes, eds);
        if (changes.some((c) => c.type === 'remove')) {
          takeSnapshot(nodes, nextEdges);
        }
        return nextEdges;
      });
    },
    [nodes, takeSnapshot]
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => {
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const multiHandleTypes = ['IfElse', 'Switch', 'CallDO'];
        const isMultiHandle = multiHandleTypes.includes(sourceNode?.type || '');

        let filtered: Edge[];
        if (isMultiHandle) {
          // 멀티핸들 노드: 같은 소스+같은 핸들의 기존 연결만 제거
          filtered = eds.filter(
            (e) => !(e.source === connection.source &&
              (e.sourceHandle || null) === (connection.sourceHandle || null))
          );
        } else {
          // 일반 노드: 같은 소스의 모든 기존 연결 제거 (1개만 허용)
          filtered = eds.filter((e) => e.source !== connection.source);
        }

        const nextEdges = addEdge(connection, filtered);
        takeSnapshot(nodes, nextEdges);
        return nextEdges;
      });
    },
    [nodes, takeSnapshot]
  );

  const isValidConnection = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return true;

      // [NEW] 0. Container Boundary Restriction: Nodes can only connect within the same container
      // - Nodes with same parentId can connect to each other
      // - Root level nodes (no parentId) can only connect to other root level nodes
      // - Container's own handles (group, while, for) can connect to root level nodes
      const sourceParentId = sourceNode.parentId;
      const targetParentId = targetNode.parentId;

      // Check if either node is a container type (Method, While, For)
      const containerTypes = ['Method', 'While', 'For'];
      const isSourceContainer = containerTypes.includes(sourceNode.type || '');
      const isTargetContainer = containerTypes.includes(targetNode.type || '');

      // If both nodes are NOT containers, they must have the same parentId to connect
      if (!isSourceContainer && !isTargetContainer) {
        if (sourceParentId !== targetParentId) {
          return false; // Cannot connect nodes from different containers
        }
      }

      // If source is a container node (connecting from container's handle),
      // it should only connect to nodes at the same level (root level)
      if (isSourceContainer && targetParentId) {
        return false; // Container can't connect to a node inside another container
      }

      // If target is a container node (connecting to container's handle),
      // it should only connect from nodes at the same level (root level)
      if (isTargetContainer && sourceParentId) {
        return false; // Container can't receive connection from a node inside another container
      }

      // 소스 핸들 중복 연결 차단: 이미 연결이 있는 소스 핸들에서는 새 연결 불가
      const multiHandleTypes = ['IfElse', 'Switch', 'CallDO'];
      const isMultiHandle = multiHandleTypes.includes(sourceNode.type || '');

      if (isMultiHandle) {
        // 멀티핸들 노드: 같은 소스+같은 핸들에 이미 연결이 있으면 차단
        const hasExisting = edges.some(
          (e) => e.source === connection.source &&
                 (e.sourceHandle || null) === (connection.sourceHandle || null)
        );
        if (hasExisting) return false;
      } else {
        // 일반 노드: 소스에 이미 아웃고잉 연결이 있으면 차단
        const hasExisting = edges.some((e) => e.source === connection.source);
        if (hasExisting) return false;
      }

      return true;
    },
    [nodes, edges]
  );

  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    // [NEW] Internal START/END nodes cannot be dragged out of their container
    // They are locked to their container with extent: 'parent'
    if (node.data?.isInternalStart || node.data?.isInternalEnd) {
      takeSnapshot(nodes, edges);
      return;
    }

    // Edge snapping 제외 노드 타입들
    // 1. Variable 노드 - 연결 불가 노드
    // 2. Start/End 노드 - 특수 노드
    const isEdgeSnappingExcluded =
      node.data?.isStart ||
      node.data?.isEnd;

    // 1. Check for Grouping (Parenting)
    // We check if the dragged node intersects with any 'Method', 'While', or 'For' node
    const groupNode = nodes.find(n =>
      ['Method', 'While', 'For', 'ForEach'].includes(n.type || '') &&
      n.id !== node.id && // Cannot be parent of itself
      node.position.x >= n.position.x &&
      node.position.y >= n.position.y &&
      node.position.x + (node.width || 0) <= n.position.x + (n.width || 0) &&
      node.position.y + (node.height || 0) <= n.position.y + (n.height || 0)
    );

    // If dropped inside a group
    if (groupNode && !node.data?.isStart && !node.data?.isEnd) {
       // If it was NOT already a child of THIS group, we need to reparent it
       if (node.parentId !== groupNode.id) {
          setNodes((nds) => {
             return nds.map((n) => {
               if (n.id === node.id) {
                 // Convert absolute position to relative position
                 // When becoming a child, position is relative to parent's top-left
                 // NOTE: node.position is currently Absolute (because we were dragging it at root level or it was updated to absolute by ReactFlow during drag)
                 // Wait: ReactFlow onNodeDrag updates the position. If it was already a child, it updates the relative position.
                 // If it was a root node, it updates absolute.

                 // Case 1: Was Root, Now Child
                 if (!n.parentId) {
                    return {
                      ...n,
                      parentId: groupNode.id,
                      extent: 'parent',
                      position: {
                        x: node.position.x - groupNode.position.x,
                        y: node.position.y - groupNode.position.y,
                      }
                    };
                 }

                 // Case 2: Was Child of another group (Complex, skip for now or treat as absolute->relative if ReactFlow gives us absolute coords here)
                 // For now, assume simplified flow: Root -> Group or Group -> Root
                 return n;
               }

               // Mark group as having children for UI updates if needed
               if (n.id === groupNode.id) {
                 return { ...n, data: { ...n.data, hasChildren: true }};
               }
               return n;
             });
          });
          return; // Stop processing edge snapping if we just grouped it
       }
    }
    // If NOT dropped inside a group, but WAS a child (Drag out)
    else if (node.parentId) {
       // We need to calculate where it is now in Absolute coordinates
       // If we just dragged it out, ReactFlow might still be reporting relative coordinates if we haven't unset parentId yet?
       // Actually, onNodeDrag updates the position in the store.
       // If we want to "detach", we need the Parent's position to add to the current Relative position.

       const parentNode = nodes.find(p => p.id === node.parentId);
       if (parentNode) {
         // Check if it's strictly OUTSIDE the parent now
         const isOutside =
            node.position.x < 0 ||
            node.position.y < 0 ||
            node.position.x + (node.width || 0) > (parentNode.width || 0) ||
            node.position.y + (node.height || 0) > (parentNode.height || 0);

         if (isOutside) {
            setNodes((nds) => {
               return nds.map((n) => {
                 if (n.id === node.id) {
                    return {
                      ...n,
                      parentId: undefined,
                      extent: undefined, // Free to move anywhere
                      position: {
                        x: parentNode.position.x + node.position.x,
                        y: parentNode.position.y + node.position.y,
                      }
                    };
                 }
                 if (n.id === parentNode.id) {
                    // Check if any other children exist? simplified: just update
                    return { ...n, data: { ...n.data, hasChildren: false }}; // potentially inaccurate if multiple children, but visual cue only
                 }
                 return n;
               });
            });
            return;
         }
       }
    }


    // 2. Edge Snapping Logic (Existing)
    // Edge snapping 제외 노드는 스킵
    if (isEdgeSnappingExcluded) {
      takeSnapshot(nodes, edges);
      return;
    }

    // Check if the node is dropped on an edge
    const nodeWidth = node.width || 150;
    const nodeHeight = node.height || 40;
    const nodeCenterX = node.position.x + nodeWidth / 2;
    const nodeCenterY = node.position.y + nodeHeight / 2;

    const overlappingEdge = edges.find((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (!sourceNode || !targetNode) return false;

      // Prevent splitting an edge that is already connected to the dragged node
      if (edge.source === node.id || edge.target === node.id) return false;

      // Container 경계 검증: 같은 컨테이너 내에서만 edge snapping 허용
      const sourceParentId = sourceNode.parentId;
      const targetParentId = targetNode.parentId;
      const nodeParentId = node.parentId;

      // 드래그한 노드와 edge의 source/target이 같은 컨테이너에 있어야 함
      if (sourceParentId !== nodeParentId || targetParentId !== nodeParentId) {
        return false;
      }

      const sourceX = sourceNode.position.x + (sourceNode.width || 150) / 2;
      const sourceY = sourceNode.position.y + (sourceNode.height || 40) / 2;
      const targetX = targetNode.position.x + (targetNode.width || 150) / 2;
      const targetY = targetNode.position.y + (targetNode.height || 40) / 2;

      // Calculate distance from point to line segment
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

      // Threshold for "snapping" to edge
      return distance < 25;
    });

    if (overlappingEdge) {
      // 새 연결 유효성 검증
      const sourceNode = nodes.find((n) => n.id === overlappingEdge.source);
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
        takeSnapshot(nodes, edges);
        return;
      }

      setEdges((eds) => {
        // Remove the old edge
        const newEdges = eds.filter((e) => e.id !== overlappingEdge.id);

        // Add two new edges
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

        const result = [...newEdges, edge1, edge2];
        takeSnapshot(nodes, result);
        return result;
      });
    } else {
      takeSnapshot(nodes, edges);
    }
  }, [nodes, edges, takeSnapshot]);

  const updateNodeData = useCallback(
    (id: string, key: string, value: any) => {
      setNodes((nds) => {
        const nextNodes = nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                [key]: value,
              },
            };
          }
          return node;
        });
        takeSnapshot(nextNodes, edges);
        return nextNodes;
      });
    },
    [edges, takeSnapshot]
  );

  // === 액션별 서버 승인 시스템 ===
  const { approvalState, withApproval, resetApproval } = useActionApproval();

  // 노드 타입 + 변경 key 조합으로 승인이 필요한 액션 타입 판별
  // 저장 버튼이 있는 노드에만 적용 (현재: VariableNode만 해당)
  const getApprovalActionType = useCallback((nodeType: string | undefined, key: string): ApprovalActionType | null => {
    if (nodeType === 'Variable' && key === 'variableName') return 'VARIABLE_SAVE';
    return null;
  }, []);

  // 승인 래핑된 onChange 콜백 생성
  const createApprovedOnChange = useCallback((nodeId: string, nodeType?: string) => {
    return (key: string, value: any) => {
      const actionType = getApprovalActionType(nodeType, key);
      if (actionType) {
        const wrappedFn = withApproval(
          actionType,
          nodeId,
          (k: string, v: any) => updateNodeData(nodeId, k, v),
          (k: string, v: any) => ({ key: k, value: v }),
          { nodeType }
        );
        wrappedFn(key, value);
      } else {
        updateNodeData(nodeId, key, value);
      }
    };
  }, [getApprovalActionType, withApproval, updateNodeData]);

  // Internal panning for group nodes - moves all child nodes
  const onInternalPan = useCallback(
    (containerId: string, deltaX: number, deltaY: number) => {
      setNodes((nds) => {
        return nds.map((node) => {
          // Only move child nodes of this container
          if (node.parentId === containerId) {
            return {
              ...node,
              position: {
                x: node.position.x + deltaX,
                y: node.position.y + deltaY,
              },
            };
          }
          return node;
        });
      });
    },
    []
  );

  // Callback for IDO/IMO nodes to open IDOSearchModal
  const openLinkedIDOSearch = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsIDOModalOpen(true);
  }, []);

  // Helper to get available groups from current nodes (top-level only)
  const getAvailableGroups = useCallback((currentNodes: Node[]) => {
    return currentNodes
      .filter(n => n.type === 'Method' && !n.parentId)
      .map(n => ({ id: n.id, label: n.data.label || 'Unnamed Group' }));
  }, []);

  // Open For settings modal
  const openForSettings = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setForModal({
        isOpen: true,
        nodeId: nodeId,
        option1: node.data.forOption1 || '',
        option2: node.data.forOption2 || '',
      });
    }
  }, [nodes]);

  // Open ForEach settings modal
  const openForEachSettings = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setForEachModal({
        isOpen: true,
        nodeId: nodeId,
        option1: node.data.forEachOption1 || '',
        option2: node.data.forEachOption2 || '',
      });
    }
  }, [nodes]);

  // Open node editor modal based on node type
  const openNodeEditor = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Container nodes (Method, While, For, ForEach) open flow editor modal
    if (['Method', 'While', 'For', 'ForEach'].includes(node.type || '')) {
      setContainerFlowModal({
        isOpen: true,
        containerId: node.id,
        containerType: node.type as 'Method' | 'While' | 'For' | 'ForEach',
        containerLabel: node.data.label || 'Container',
        startValue: node.data.startValue || '',
        endValue: node.data.endValue || '',
        selectedNode: node.data.selectedNode || '',
        fieldType: node.data.fieldType || 'input',
        fieldName: node.data.fieldName || '',
        expression: node.data.expression || '',
        snapshotNodes: JSON.parse(JSON.stringify(nodes)),
        snapshotEdges: JSON.parse(JSON.stringify(edges)),
      });
      return;
    }

    // Mapping node opens mapping editor modal
    if (node.type === 'Mapping') {
      setMappingEditorModal({
        isOpen: true,
        nodeId: node.id,
        mappings: node.data.mappings || [],
      });
      return;
    }

    // Condition node opens edit modal
    if (node.type === 'IfElse') {
      setConditionModal({
        isOpen: true,
        nodeId: node.id,
        expression: node.data.expression || '',
      });
      return;
    }

    // Script node opens edit modal
    if (node.type === 'Script') {
      setScriptModal({
        isOpen: true,
        nodeId: node.id,
        scriptType: node.data.scriptType || '',
        variableName: node.data.variableName || '',
        scriptContent: node.data.scriptContent || '',
        variables: node.data.scriptVariables || [],
      });
      return;
    }

    // Error node opens code selection modal
    if (node.type === 'Error') {
      setSelectedNodeId(node.id);
      setIsCodeModalOpen(true);
    }
  }, [nodes]);

  const addNode = useCallback(
    (type: string, position?: { x: number; y: number }) => {
      // Generate unique node ID by checking existing nodes to avoid duplicates
      const isEnd = type === 'End';

      // Find next available ID by checking existing nodes
      let id: string;
      if (isEnd) {
        let counter = 1;
        while (nodes.some(n => n.id === `end${counter}`)) {
          counter++;
        }
        id = `end${counter}`;
      } else {
        let counter = 1;
        while (nodes.some(n => n.id === `node${counter}`)) {
          counter++;
        }
        id = `node${counter}`;
      }

      const isGroupLike = ['Method', 'While', 'For', 'ForEach'].includes(type);
      const isDO = type === 'CallDO';
      const isCallGroup = type === 'CallMethod';
      const isFor = type === 'For';
      const isForEach = type === 'ForEach';
      // Initial size is collapsed (small)
      const containerWidth = 300;
      const containerHeight = 200;

      // 컨테이너 노드의 기본 Start/End 미리보기 데이터 (정적 배열)
      const defaultStartEndPreview = [
        { id: 'start', type: 'Start', label: 'Start', position: { x: 60, y: 100 } },
        { id: 'end', type: 'End', label: 'End', position: { x: 60, y: 80 } },
      ];

      const newNode: Node = {
        id,  // "node1", "node2" 형식 (사용자 수정 가능)
        type,
        position: position || {
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100,
        },
        // Container nodes get low zIndex so child nodes render on top
        zIndex: isGroupLike ? 0 : undefined,
        style: isGroupLike ? { width: containerWidth, height: containerHeight } : undefined,
        data: {
          label: type === 'Error' ? 'Error' :
                 type === 'While' ? '' : // Label used for condition storage
                 type === 'For' ? '' :   // Label used for condition storage
                 type === 'ForEach' ? '' : // Label used for condition storage
                 type === 'Method' ? 'Method' :
                 type === 'CallMethod' ? 'CallMethod' :
                 type === 'Process' ? 'Process' :
                 type === 'Script' ? 'Script' :
                 type === 'End' ? 'End' :
                 type === 'Transaction' ? 'Transaction' :
                 type,
          description: '',
          isEnd: isEnd ? true : undefined,
          cases: type === 'Switch' ? ['Case 1', 'Case 2'] : undefined,
          isExpanded: false, // Start collapsed
          internalNodesPreview: isGroupLike ? defaultStartEndPreview : undefined, // 기본 Start/End 미리보기
          onChange: createApprovedOnChange(id, type),
          onInternalPan: isGroupLike ? onInternalPan : undefined,
          onOpenLinkedIDOSearch: isDO ? () => openLinkedIDOSearch(id) : undefined,
          // For callGroup nodes, pass available groups
          availableGroups: isCallGroup ? getAvailableGroups(nodes) : undefined,
          // For For/ForEach nodes, pass settings opener
          onOpenSettings: isFor ? openForSettings : isForEach ? openForEachSettings : undefined,
          // Edit callback for button-based editing
          onEdit: () => openNodeEditor(id),
        },
      };

      // Create internal START and END nodes for container types (group, while, for)
      const nodesToAdd: Node[] = [newNode];

      if (isGroupLike) {
        const internalStartId = `${id}-start`;
        const internalEndId = `${id}-end`;

        // Internal START node - hidden initially (collapsed state)
        const internalStartNode: Node = {
          id: internalStartId,
          type: 'Process',
          position: {
            x: (containerWidth - 180) / 2, // Center horizontally (180 is approx node width)
            y: 100, // Below the header
          },
          parentId: id,
          extent: 'parent',
          zIndex: 1000, // High zIndex to render above container
          hidden: true, // Hidden initially (collapsed state)
          data: {
            label: 'Start',
            description: 'Internal start point',
            isInternalStart: true,
            containerId: id,
            onChange: createApprovedOnChange(internalStartId, 'Process'),
          },
        };

        // Internal END node - hidden when collapsed, visible when expanded
        const internalEndNode: Node = {
          id: internalEndId,
          type: 'Process',
          position: {
            x: (containerWidth - 180) / 2, // Center horizontally
            y: containerHeight - 120, // Near the bottom (will be repositioned on expand)
          },
          parentId: id,
          extent: 'parent',
          zIndex: 1000, // High zIndex to render above container
          hidden: true, // Hidden initially (collapsed state)
          data: {
            label: 'End',
            description: 'Internal end point',
            isInternalEnd: true,
            containerId: id,
            onChange: createApprovedOnChange(internalEndId, 'Process'),
          },
        };

        nodesToAdd.push(internalStartNode, internalEndNode);
      }

      setNodes((nds) => {
        const nextNodes = [...nds, ...nodesToAdd];
        takeSnapshot(nextNodes, edges);
        return nextNodes;
      });
    },
    [updateNodeData, createApprovedOnChange, onInternalPan, openLinkedIDOSearch, edges, takeSnapshot, getAvailableGroups, nodes, openForSettings, openForEachSettings, openNodeEditor]
  );

  // Update CallMethod nodes whenever groups change
  useEffect(() => {
    const availableGroups = getAvailableGroups(nodes);
    const callGroupNodes = nodes.filter(n => n.type === 'CallMethod');

    if (callGroupNodes.length > 0) {
      setNodes(nds => nds.map(node => {
        if (node.type === 'CallMethod') {
          return {
            ...node,
            data: {
              ...node.data,
              availableGroups,
            },
          };
        }
        return node;
      }));
    }
  }, [nodes.filter(n => n.type === 'Method').map(n => n.id + n.data.label).join(',')]);

  // Update CallDO nodes to ensure they have the onOpenLinkedIDOSearch function
  useEffect(() => {
    const doNodes = nodes.filter(n => n.type === 'CallDO');

    if (doNodes.length > 0) {
      setNodes(nds => nds.map(node => {
        if (node.type === 'CallDO' && !node.data.onOpenLinkedIDOSearch) {
          return {
            ...node,
            data: {
              ...node.data,
              onOpenLinkedIDOSearch: () => openLinkedIDOSearch(node.id),
            },
          };
        }
        return node;
      }));
    }
  }, [nodes.filter(n => n.type === 'CallDO').length, openLinkedIDOSearch]);

  const deleteSelectedElements = useCallback(() => {
    setNodes((nds) => {
      // Find all selected container nodes (Method, While, For) that will be deleted
      const containerTypes = ['Method', 'While', 'For'];
      const selectedContainerIds = nds
        .filter((node) => node.selected && containerTypes.includes(node.type || ''))
        .map((node) => node.id);

      // Filter nodes:
      // 1. Keep nodes that are not selected
      // 2. Keep global Start/End nodes (protected)
      // 3. Keep internal Start/End nodes UNLESS their container is being deleted
      const nextNodes = nds.filter((node) => {
        // If node is not selected, keep it (unless it's an internal node whose container is deleted)
        if (!node.selected) {
          // Check if this is an internal node whose container is being deleted
          if ((node.data?.isInternalStart || node.data?.isInternalEnd) && node.data?.containerId) {
            return !selectedContainerIds.includes(node.data.containerId);
          }
          // Also remove any child nodes whose parent container is being deleted
          if (node.parentId && selectedContainerIds.includes(node.parentId)) {
            return false;
          }
          return true;
        }

        // If node is selected, protect global Start node
        if (node.data?.isStart) {
          return true;
        }
        // End 노드는 최소 1개만 유지 (마지막 하나는 삭제 불가)
        if (node.data?.isEnd) {
          const endNodesCount = nds.filter(n => n.data?.isEnd).length;
          const selectedEndNodes = nds.filter(n => n.selected && n.data?.isEnd).length;
          if (endNodesCount - selectedEndNodes < 1) {
            return true; // 마지막 End 노드 보호
          }
        }

        // Protect internal Start/End nodes from individual deletion (only delete with container)
        if (node.data?.isInternalStart || node.data?.isInternalEnd) {
          return true;
        }

        // Otherwise, delete the selected node
        return false;
      });

      setEdges((eds) => {
        // Remove edges connected to deleted nodes
        const deletedNodeIds = nds.filter((n) => !nextNodes.find((nn) => nn.id === n.id)).map((n) => n.id);
        const nextEdges = eds.filter(
          (edge) => !edge.selected && !deletedNodeIds.includes(edge.source) && !deletedNodeIds.includes(edge.target)
        );
        takeSnapshot(nextNodes, nextEdges);
        return nextEdges;
      });
      return nextNodes;
    });
  }, [takeSnapshot]);

  // UUID Generator
  const generateUUID = useCallback(() => {
    return crypto.randomUUID();
  }, []);

  // Copy selected nodes (excluding Start, End, and Internal Start/End nodes)
  const copySelectedNodes = useCallback(() => {
    // Get selected container nodes
    const containerTypes = ['Method', 'While', 'For'];
    const selectedContainerIds = nodes
      .filter((node) => node.selected && containerTypes.includes(node.type || ''))
      .map((node) => node.id);

    // Filter nodes to copy:
    // - Exclude global Start/End
    // - Exclude internal Start/End (they will be recreated with container)
    // - Include container's internal nodes if container is selected
    const selectedNodes = nodes.filter(
      (node) =>
        node.selected &&
        !node.data?.isStart &&
        !node.data?.isEnd &&
        !node.data?.isInternalStart &&
        !node.data?.isInternalEnd
    );

    if (selectedNodes.length > 0) {
      clipboardRef.current = selectedNodes.map((node) => ({
        ...node,
        data: { ...node.data },
      }));
    }
  }, [nodes]);

  // Paste nodes from clipboard
  const pasteNodes = useCallback(() => {
    if (clipboardRef.current.length === 0) return;

    const PASTE_OFFSET = 50;
    const oldToNewIdMap: Record<string, string> = {};
    const containerTypes = ['Method', 'While', 'For'];
    const containerWidth = 600;
    const containerHeight = 400;

    // Generate new IDs for all nodes
    clipboardRef.current.forEach((node) => {
      oldToNewIdMap[node.id] = generateUUID();
    });

    const newNodes: Node[] = [];

    clipboardRef.current.forEach((node) => {
      const newId = oldToNewIdMap[node.id];
      const isContainer = containerTypes.includes(node.type || '');

      const newNode: Node = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + PASTE_OFFSET,
          y: node.position.y + PASTE_OFFSET,
        },
        selected: true,
        // Update parentId if the parent was also copied
        parentId: node.parentId && oldToNewIdMap[node.parentId]
          ? oldToNewIdMap[node.parentId]
          : undefined,
        data: {
          ...node.data,
          onChange: createApprovedOnChange(newId, node.type),
        },
      };

      newNodes.push(newNode);

      // If it's a container, create internal START/END nodes
      if (isContainer) {
        const internalStartId = `${newId}-internal-start`;
        const internalEndId = `${newId}-internal-end`;

        const internalStartNode: Node = {
          id: internalStartId,
          type: 'Process',
          position: {
            x: (containerWidth - 180) / 2,
            y: 100,
          },
          parentId: newId,
          extent: 'parent',
          zIndex: 1000,
          data: {
            label: 'Start',
            description: 'Internal start point',
            isInternalStart: true,
            containerId: newId,
            onChange: createApprovedOnChange(internalStartId, 'Process'),
          },
        };

        const internalEndNode: Node = {
          id: internalEndId,
          type: 'Process',
          position: {
            x: (containerWidth - 180) / 2,
            y: containerHeight - 120,
          },
          parentId: newId,
          extent: 'parent',
          zIndex: 1000,
          data: {
            label: 'End',
            description: 'Internal end point',
            isInternalEnd: true,
            containerId: newId,
            onChange: createApprovedOnChange(internalEndId, 'Process'),
          },
        };

        newNodes.push(internalStartNode, internalEndNode);
      }
    });

    // Deselect existing nodes and add new ones
    setNodes((nds) => {
      const deselectedNodes = nds.map((n) => ({ ...n, selected: false }));
      const nextNodes = [...deselectedNodes, ...newNodes];
      takeSnapshot(nextNodes, edges);
      return nextNodes;
    });

    // Update clipboard positions for subsequent pastes
    clipboardRef.current = clipboardRef.current.map((node) => ({
      ...node,
      position: {
        x: node.position.x + PASTE_OFFSET,
        y: node.position.y + PASTE_OFFSET,
      },
    }));
  }, [generateUUID, updateNodeData, createApprovedOnChange, edges, takeSnapshot]);

  // Keyboard event handler for copy/paste
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if focus is on an input element
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return; // Don't intercept if typing in input
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && event.key === 'c') {
        event.preventDefault();
        copySelectedNodes();
      } else if (modifier && event.key === 'v') {
        event.preventDefault();
        pasteNodes();
      } else if (modifier && event.key === '1') {
        event.preventDefault();
        setToolMode('select');
      } else if (modifier && event.key === '2') {
        event.preventDefault();
        setToolMode('pan');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [copySelectedNodes, pasteNodes]);

  // Toggle group expanded/collapsed state
  const toggleGroupExpanded = useCallback((nodeId: string) => {
    const COLLAPSED_WIDTH = 300;
    const EXPANDED_WIDTH = 1200;
    const EXPANDED_HEIGHT = 700;

    setNodes((nds) => {
      const parentNode = nds.find(p => p.id === nodeId);
      const isCurrentlyExpanded = parentNode?.data.isExpanded;
      const COLLAPSED_HEIGHT = 200;
      const newWidth = isCurrentlyExpanded ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
      const newHeight = isCurrentlyExpanded ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT;
      const willBeExpanded = !isCurrentlyExpanded;

      // If expanding, fit view to the group after state update
      if (willBeExpanded && reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.fitView({
            nodes: [{ id: nodeId }],
            padding: 0.2,
            duration: 300,
          });
        }, 50);
      }

      return nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            style: { ...n.style, width: newWidth, height: newHeight },
            data: { ...n.data, isExpanded: willBeExpanded },
          };
        }
        // Update internal node positions and visibility when expanding/collapsing
        if (n.parentId === nodeId) {
          if (n.data.isInternalStart) {
            return {
              ...n,
              hidden: !willBeExpanded, // Show when expanded, hide when collapsed
              position: { x: (newWidth - 180) / 2, y: 100 },
            };
          }
          if (n.data.isInternalEnd) {
            return {
              ...n,
              hidden: !willBeExpanded, // Show when expanded, hide when collapsed
              position: { x: (newWidth - 180) / 2, y: newHeight - 200 },
            };
          }
          // Other child nodes - hide when collapsed, show when expanded
          return {
            ...n,
            hidden: !willBeExpanded,
          };
        }
        return n;
      });
    });
  }, [reactFlowInstance]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Start/End 노드는 IO 설정 모달 열기 (편집 가능)
    if (node.type === 'Start' || node.type === 'End') {
      setSelectedNodeId(node.id);
      setIsIOModalReadOnly(false);
      setIsIOModalOpen(true);
      return;
    }

    // Container nodes (Method, While, For, ForEach) open flow editor modal
    if (['Method', 'While', 'For', 'ForEach'].includes(node.type || '')) {
      setContainerFlowModal({
        isOpen: true,
        containerId: node.id,
        containerType: node.type as 'Method' | 'While' | 'For' | 'ForEach',
        containerLabel: node.data.label || 'Container',
        startValue: node.data.startValue || '',
        endValue: node.data.endValue || '',
        selectedNode: node.data.selectedNode || '',
        fieldType: node.data.fieldType || 'input',
        fieldName: node.data.fieldName || '',
        expression: node.data.expression || '',
        snapshotNodes: JSON.parse(JSON.stringify(nodes)),
        snapshotEdges: JSON.parse(JSON.stringify(edges)),
      });
      return;
    }

    // Mapping node opens mapping editor modal
    if (node.type === 'Mapping') {
      setMappingEditorModal({
        isOpen: true,
        nodeId: node.id,
        mappings: node.data.mappings || [],
      });
      return;
    }

    // Variable node opens expression modal (ConditionEditModal 재사용)
    if (node.type === 'Variable') {
      setConditionModal({
        isOpen: true,
        nodeId: node.id,
        expression: node.data.expression || '',
      });
      return;
    }

    // Condition node opens edit modal
    if (node.type === 'IfElse') {
      setConditionModal({
        isOpen: true,
        nodeId: node.id,
        expression: node.data.expression || '',
      });
      return;
    }

    // Script node opens edit modal
    if (node.type === 'Script') {
      setScriptModal({
        isOpen: true,
        nodeId: node.id,
        scriptType: node.data.scriptType || '',
        variableName: node.data.variableName || '',
        scriptContent: node.data.scriptContent || '',
        variables: node.data.scriptVariables || [],
      });
      return;
    }

    // Error node opens code selection modal
    if (node.type === 'Error') {
      setSelectedNodeId(node.id);
      setIsCodeModalOpen(true);
    }
  }, []);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      // Also select the node on right click
      setSelectedNodeId(node.id);

      // Close all context menus first
      setContextMenu(null);
      setGroupContextMenu(null);
      setMappingContextMenu(null);

      if (node.type === 'Mapping') {
        // Mapping 노드인 경우 전용 컨텍스트 메뉴 표시
        setMappingContextMenu({
          top: event.clientY,
          left: event.clientX,
          nodeId: node.id,
        });
      } else {
        setContextMenu({
          top: event.clientY,
          left: event.clientX,
          nodeId: node.id,
          nodeType: node.type,
        });
      }
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
    setGroupContextMenu(null);
    setMappingContextMenu(null);
    setPaneContextMenu(null);
    setSelectedNodeId(null);
  }, []);

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    // Close node context menu if open
    setContextMenu(null);

    // Convert screen coordinates to flow coordinates
    const flowPosition = reactFlowInstance
      ? reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      : { x: event.clientX, y: event.clientY };

    setPaneContextMenu({
      top: event.clientY,
      left: event.clientX,
      flowPosition: flowPosition,
    });
  }, [reactFlowInstance]);

  const handleIDOSetting = useCallback(() => {
    if (contextMenu) {
      setSelectedNodeId(contextMenu.nodeId);
      setIsIDOModalOpen(true);
      setContextMenu(null);
    }
  }, [contextMenu]);

  const handleIOSetting = useCallback(() => {
    if (contextMenu) {
      setSelectedNodeId(contextMenu.nodeId);
      setIsIOModalReadOnly(true);
      setIsIOModalOpen(true);
      setContextMenu(null);
    }
  }, [contextMenu]);

  const handleGroupNameSave = useCallback((newLabel: string) => {
    if (groupContextMenu) {
      updateNodeData(groupContextMenu.nodeId, 'label', newLabel);
      setGroupContextMenu(null);
    }
  }, [groupContextMenu, updateNodeData]);

  // Handler for opening ID change modal
  const handleChangeId = useCallback((nodeId: string) => {
    setIdChangeModal({ nodeId, currentId: nodeId });
    setNewIdValue(nodeId);
  }, []);

  // Handler for saving new node ID
  const handleIdChangeSave = useCallback(() => {
    if (!idChangeModal || !newIdValue.trim()) return;

    const oldId = idChangeModal.nodeId;
    const newId = newIdValue.trim();

    // Check if new ID already exists
    const idExists = nodes.some(n => n.id === newId && n.id !== oldId);
    if (idExists) {
      setErrorModal({
        isOpen: true,
        title: 'ID Change Error',
        message: `ID "${newId}"는 이미 존재합니다. 다른 ID를 입력해주세요.`,
      });
      return;
    }

    // 컨테이너 노드 타입 확인
    const containerTypes = ['For', 'While', 'ForEach', 'Method'];
    const targetNode = nodes.find(n => n.id === oldId);
    const isContainerNode = targetNode && containerTypes.includes(targetNode.type || '');

    // 내부 노드 ID 변경 맵 (oldId-start → newId-start 등)
    const internalIdMap = new Map<string, string>();
    if (isContainerNode) {
      internalIdMap.set(`${oldId}-start`, `${newId}-start`);
      internalIdMap.set(`${oldId}-end`, `${newId}-end`);
    }

    // Update node ID
    setNodes((nds) => {
      const nextNodes = nds.map((node) => {
        // 메인 노드 ID 변경
        if (node.id === oldId) {
          // 컨테이너 노드인 경우 internalNodesPreview도 업데이트
          if (isContainerNode && node.data?.internalNodesPreview) {
            const updatedPreview = node.data.internalNodesPreview.map((preview: any) => {
              // 내부 Start/End 노드의 ID 변경
              if (preview.id === `${oldId}-start`) {
                return { ...preview, id: `${newId}-start` };
              }
              if (preview.id === `${oldId}-end`) {
                return { ...preview, id: `${newId}-end` };
              }
              return preview;
            });

            return {
              ...node,
              id: newId,
              data: {
                ...node.data,
                internalNodesPreview: updatedPreview,
              },
            };
          }
          return { ...node, id: newId };
        }

        // 내부 Start/End 노드의 ID 변경 (parentId가 oldId인 노드 중)
        if (node.parentId === oldId) {
          const newNodeId = internalIdMap.get(node.id) || node.id;
          return { ...node, id: newNodeId, parentId: newId };
        }

        // Update containerId references for internal nodes
        if (node.data?.containerId === oldId) {
          return {
            ...node,
            data: { ...node.data, containerId: newId },
          };
        }
        return node;
      });

      // 부모 노드가 자식 노드보다 먼저 오도록 정렬 (React Flow 요구사항)
      // parentId가 있는 노드는 해당 parent 노드 뒤에 위치해야 함
      const sortedNodes = nextNodes.sort((a, b) => {
        // a가 부모이고 b가 a의 자식인 경우: a가 먼저
        if (b.parentId === a.id) return -1;
        // b가 부모이고 a가 b의 자식인 경우: b가 먼저
        if (a.parentId === b.id) return 1;
        // 둘 다 자식이 아닌 경우 또는 같은 부모를 가진 경우: 원래 순서 유지
        return 0;
      });

      // Update edges with new node ID
      setEdges((eds) => {
        const nextEdges = eds.map((edge) => {
          let updated = { ...edge };

          // 메인 노드 ID 변경
          if (edge.source === oldId) {
            updated = { ...updated, source: newId };
          }
          if (edge.target === oldId) {
            updated = { ...updated, target: newId };
          }

          // 내부 노드 ID 변경 (컨테이너인 경우)
          if (isContainerNode) {
            const newSource = internalIdMap.get(edge.source);
            const newTarget = internalIdMap.get(edge.target);
            if (newSource) {
              updated = { ...updated, source: newSource };
            }
            if (newTarget) {
              updated = { ...updated, target: newTarget };
            }
          }

          // edge ID 재생성
          if (updated.source !== edge.source || updated.target !== edge.target) {
            updated = { ...updated, id: `${updated.source}-${updated.target}` };
          }

          return updated;
        });
        takeSnapshot(sortedNodes, nextEdges);
        return nextEdges;
      });

      return sortedNodes;
    });

    setIdChangeModal(null);
    setNewIdValue('');
  }, [idChangeModal, newIdValue, nodes, takeSnapshot]);

  const handleIOSave = useCallback((inputs: any[], outputs: any[]) => {
    if (selectedNodeId) {
      updateNodeData(selectedNodeId, 'inputs', inputs);
      updateNodeData(selectedNodeId, 'outputs', outputs);
    }
  }, [selectedNodeId, updateNodeData]);

  // Mapping handlers - 모든 노드에서 사용 가능
  const handleInputMapping = useCallback(() => {
    // mappingContextMenu 또는 contextMenu에서 nodeId 가져오기
    const targetNodeId = mappingContextMenu?.nodeId || contextMenu?.nodeId;
    if (targetNodeId) {
      const targetNode = nodes.find(n => n.id === targetNodeId);
      if (targetNode) {
        setMappingEditorModal({
          isOpen: true,
          nodeId: targetNodeId,
          mappings: targetNode.data.mappings || [],
          fixedTargetNodeId: targetNodeId, // 입력 매핑: 우클릭한 노드를 타겟으로 고정
        });
      }
    }
  }, [mappingContextMenu, contextMenu, nodes]);

  const handleOutputMapping = useCallback(() => {
    // mappingContextMenu 또는 contextMenu에서 nodeId 가져오기
    const targetNodeId = mappingContextMenu?.nodeId || contextMenu?.nodeId;
    if (targetNodeId) {
      const targetNode = nodes.find(n => n.id === targetNodeId);
      if (targetNode) {
        setMappingEditorModal({
          isOpen: true,
          nodeId: targetNodeId,
          mappings: targetNode.data.mappings || [],
        });
      }
    }
  }, [mappingContextMenu, contextMenu, nodes]);

  const handleMappingSave = useCallback((data: MappingField[], mappingType: 'input' | 'output') => {
    if (mappingModal.nodeId) {
      // Remove id and checked fields from each mapping field before saving
      const cleanedData = data.map(({ id, checked, ...rest }) => rest);
      if (mappingType === 'input') {
        updateNodeData(mappingModal.nodeId, 'inputMapping', cleanedData);
      } else {
        updateNodeData(mappingModal.nodeId, 'outputMapping', cleanedData);
      }
    }
  }, [mappingModal.nodeId, updateNodeData]);

  // Handler for new Mapping Editor Modal
  const handleMappingEditorSave = useCallback((mappings: MappingConnection[]) => {
    if (mappingEditorModal.nodeId) {
      updateNodeData(mappingEditorModal.nodeId, 'mappings', mappings);
      setMappingEditorModal({ isOpen: false, nodeId: null, mappings: [] });
    }
  }, [mappingEditorModal.nodeId, updateNodeData]);

  const handleConditionSave = useCallback((expression: string) => {
    if (conditionModal.nodeId) {
      updateNodeData(conditionModal.nodeId, 'expression', expression);
    }
  }, [conditionModal.nodeId, updateNodeData]);

  const handleScriptSave = useCallback((scriptType: string, variableName: string, scriptContent: string, variables: any[]) => {
    if (scriptModal.nodeId) {
      updateNodeData(scriptModal.nodeId, 'scriptType', scriptType);
      updateNodeData(scriptModal.nodeId, 'variableName', variableName);
      updateNodeData(scriptModal.nodeId, 'scriptContent', scriptContent);
      updateNodeData(scriptModal.nodeId, 'scriptVariables', variables);
    }
  }, [scriptModal.nodeId, updateNodeData]);

  // Handle For settings save
  const handleForSave = useCallback((option1: string, option2: string) => {
    if (forModal.nodeId) {
      updateNodeData(forModal.nodeId, 'forOption1', option1);
      updateNodeData(forModal.nodeId, 'forOption2', option2);
    }
  }, [forModal.nodeId, updateNodeData]);

  // Handle ForEach settings save
  const handleForEachSave = useCallback((option1: string, option2: string) => {
    if (forEachModal.nodeId) {
      updateNodeData(forEachModal.nodeId, 'forEachOption1', option1);
      updateNodeData(forEachModal.nodeId, 'forEachOption2', option2);
    }
  }, [forEachModal.nodeId, updateNodeData]);

  const handleContainerFlowSave = useCallback((newInternalNodes: Node[], newInternalEdges: Edge[], loopData?: LoopData) => {
    if (!containerFlowModal.containerId) return;

    const containerId = containerFlowModal.containerId;
    const containerType = containerFlowModal.containerType;

    // 현재 nodes 상태에서 이 컨테이너에 속했던 모든 노드 ID를 수집 (삭제된 노드 포함)
    // 재귀적으로 중첩 컨테이너의 자식들도 포함
    const oldContainerIds = new Set<string>([containerId]);
    let changed = true;
    while (changed) {
      changed = false;
      nodes.forEach(n => {
        if (n.parentId && oldContainerIds.has(n.parentId) && !oldContainerIds.has(n.id)) {
          if (['Method', 'While', 'For', 'ForEach'].includes(n.type || '')) {
            oldContainerIds.add(n.id);
            changed = true;
          }
        }
      });
    }
    // 재귀적으로 모든 내부 노드 수집 (중첩 컨테이너 후손 포함)
    const allOldInternalIds = new Set<string>();
    let changed2 = true;
    while (changed2) {
      changed2 = false;
      nodes.forEach(n => {
        if (n.parentId && (oldContainerIds.has(n.parentId) || allOldInternalIds.has(n.parentId)) && !allOldInternalIds.has(n.id)) {
          allOldInternalIds.add(n.id);
          changed2 = true;
        }
      });
    }
    allOldInternalIds.add(`${containerId}-start`);
    allOldInternalIds.add(`${containerId}-end`);
    oldContainerIds.forEach(cid => {
      if (cid !== containerId) {
        allOldInternalIds.add(`${cid}-start`);
        allOldInternalIds.add(`${cid}-end`);
      }
    });

    // 새로운 내부 노드 ID 집합
    const newInternalNodeIds = new Set(newInternalNodes.map(n => n.id));

    // 새 중첩 컨테이너들의 start/end 노드 ID도 추가
    const allNewInternalNodeIds = new Set(newInternalNodeIds);
    allNewInternalNodeIds.add(`${containerId}-start`);
    allNewInternalNodeIds.add(`${containerId}-end`);
    newInternalNodes.forEach(n => {
      if (['For', 'ForEach', 'While', 'Method'].includes(n.type || '')) {
        allNewInternalNodeIds.add(`${n.id}-start`);
        allNewInternalNodeIds.add(`${n.id}-end`);
      }
    });

    // 기존 + 새 내부 노드 ID 합집합 (엣지 제거에 사용)
    const allInternalNodeIds = new Set([...allOldInternalIds, ...allNewInternalNodeIds]);

    // Remove old internal nodes and add new ones
    setNodes((nds) => {
      // 최신 nds 기준으로 이 컨테이너의 모든 내부 노드 ID를 재수집
      const liveOldIds = new Set<string>();
      let scanning = true;
      while (scanning) {
        scanning = false;
        nds.forEach(n => {
          if (n.parentId && (n.parentId === containerId || liveOldIds.has(n.parentId)) && !liveOldIds.has(n.id)) {
            liveOldIds.add(n.id);
            scanning = true;
          }
        });
      }
      // start/end 노드도 포함
      liveOldIds.add(`${containerId}-start`);
      liveOldIds.add(`${containerId}-end`);

      // 기존 내부 노드 전부 제거
      const nonInternalNodes = nds.filter(n => !liveOldIds.has(n.id));

      // 새 내부 노드는 항상 숨김 (확장/축소는 toggleGroupExpanded에서만)
      const processedInternalNodes = newInternalNodes.map(n => ({
        ...n,
        hidden: true,
      }));

      return [...nonInternalNodes, ...processedInternalNodes];
    });

    setEdges((eds) => {
      // 기존 엣지 중 내부 노드(삭제된 노드 포함)와 관련된 것 모두 제거
      const nonInternalEdges = eds.filter(e => {
        const sourceIsInternal = allInternalNodeIds.has(e.source);
        const targetIsInternal = allInternalNodeIds.has(e.target);
        return !sourceIsInternal && !targetIsInternal;
      });

      // Add new internal edges
      return [...nonInternalEdges, ...newInternalEdges];
    });

    // Update container to show it has children
    updateNodeData(containerId, 'hasChildren', newInternalNodes.length > 0);

    // Save internal nodes preview for silhouette display
    // Include all direct child nodes (including start/end) for preview
    const internalNodesPreview = newInternalNodes
      .filter(n => n.parentId === containerId)
      .map(n => ({
        id: n.id,
        type: n.id.endsWith('-start') ? 'Start' : n.id.endsWith('-end') ? 'End' : n.type,
        label: n.data?.label || n.type || '',
        position: n.position,
      }));
    updateNodeData(containerId, 'internalNodesPreview', internalNodesPreview);

    // Save loop data for For/ForEach/While nodes
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

    // 저장 완료 후 모달 닫기 (스냅샷 복원 없이)
    setContainerFlowModal({ isOpen: false, containerId: null, containerType: null, containerLabel: '', startValue: '', endValue: '', selectedNode: '', fieldType: 'input', fieldName: '', expression: '', snapshotNodes: [], snapshotEdges: [] });
  }, [containerFlowModal.containerId, containerFlowModal.containerType, nodes, setNodes, setEdges, updateNodeData]);
  const handleCodeSelect = useCallback((codeItem: any) => {
    if (selectedNodeId) {
      // Update node with selected code info
      updateNodeData(selectedNodeId, 'code', `${codeItem.majorCode}-${codeItem.minorCode}`);
      updateNodeData(selectedNodeId, 'codeName', codeItem.name);
      updateNodeData(selectedNodeId, 'majorCode', codeItem.majorCode);
      updateNodeData(selectedNodeId, 'minorCode', codeItem.minorCode);
      updateNodeData(selectedNodeId, 'description', codeItem.description);
      
      setIsCodeModalOpen(false);
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, updateNodeData]);

  const handleTextEditSave = useCallback((value: string) => {
    if (selectedNodeId && textEditConfig.field) {
      updateNodeData(selectedNodeId, textEditConfig.field, value);
      setIsTextEditModalOpen(false);
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, textEditConfig, updateNodeData]);

  const handleIDOSelect = useCallback(async (ido: ComponentItem) => {
    if (selectedNodeId) {
      // API에서 컴포넌트 IO 도메인 데이터 조회
      let ioData: { inputs: IOField[]; outputs: IOField[]; sqlList?: { sql: string; sqlDvCd: string; dbTp: string }[] } = { inputs: [], outputs: [] };
      try {
        ioData = await fetchComponentIO(ido.componentId, ido.type);
      } catch (e) {
        console.error('Failed to fetch component IO:', e);
      }

      setNodes((nds) => {
        const nextNodes = nds.map((node) => {
          if (node.id === selectedNodeId) {
            // returnType 자동 세팅: IMO→JexData, IDO+SELECT→JexDataList, IDO+그외→JexData
            const returnTypeValue = ido.type === 'IMO'
              ? { name: 'JexData', id: 'JexData' }
              : ioData.sqlList?.[0]?.sqlDvCd === 'SELECT'
                ? { name: 'JexDataList', id: 'JexDataList' }
                : { name: 'JexData', id: 'JexData' };

            // inputs/outputs/sqlList는 저장하지 않음 — IOPanel에서 API로 동적 조회
            return {
              ...node,
              data: {
                ...node.data,
                ido: ido, // componentId, type, name 등만 저장 (sqlList 미포함)
                returnType: returnTypeValue,
                code: ido.componentId,
                codeName: ido.name,
                description: ido.className,
              },
            };
          }
          return node;
        });
        takeSnapshot(nextNodes, edges);
        return nextNodes;
      });
      setIsIDOModalOpen(false);
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, takeSnapshot, edges]);

  const getSelectedNodeValue = () => {
    if (!selectedNodeId) return undefined;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return undefined;
    
    // Return value based on what we are editing
    if (textEditConfig.field === 'label') return node.data.label;
    if (textEditConfig.field === 'description') return node.data.description;
    return '';
  };

  const exportFlow = useCallback(() => {
    // 모든 노드를 nodes 하나에 통합 (이전 형식 호환)
    const allCleanNodes = nodes.map(n => cleanNodeForExport(n));

    const flowData: any = {
      nodes: allCleanNodes,
      edges,
      version: '2.0',
      timestamp: Date.now(),
    };

    setExportData(flowData);
    setIsExportModalOpen(true);
  }, [nodes, edges]);

  // 모달/컨테이너 상태를 부모에 알림 → "저장 후 닫기" 버튼 비활성화 제어
  const anyOverlayOpen = isIDOModalOpen || isIOModalOpen || isCodeModalOpen || isTextEditModalOpen
    || isExportModalOpen || isImportModalOpen || mappingEditorModal.isOpen || mappingModal.isOpen
    || containerFlowModal.isOpen;
  useEffect(() => {
    const msg = { type: anyOverlayOpen ? 'FLOW_MODAL_OPENED' : 'FLOW_MODAL_CLOSED' };
    window.parent.postMessage(msg, '*');
    if (window.top && window.top !== window.parent) {
      window.top.postMessage(msg, '*');
    }
  }, [anyOverlayOpen]);

  // 부모 창의 #comFlowData에 저장 (postMessage 방식)
  const saveToParent = useCallback((): boolean => {
    try {
      const validation = validateFlow(nodes, edges);

      if (!validation.isValid) {
        // 에러 노드 ID 수집 → 빨간 테두리 하이라이트
        const allErrorNodeIds = new Set<string>();
        validation.errors.forEach(e => {
          e.nodeIds?.forEach(id => allErrorNodeIds.add(id));
        });
        setErrorNodeIds(allErrorNodeIds);

        const errorMsg = validation.errors.map(e => {
          const ids = e.nodeIds?.length ? ` [${e.nodeIds.join(', ')}]` : '';
          return '• ' + e.message + ids;
        }).join('\n');
        setErrorModal({
          isOpen: true,
          title: '저장 실패',
          message: '다음 문제를 해결해주세요:\n\n' + errorMsg,
        });
        return false;
      }
      // 검증 통과 시 하이라이트 제거
      setErrorNodeIds(new Set());

      // 모든 노드를 nodes 하나에 통합 (이전 형식 호환)
      const allCleanNodes = nodes.map(n => cleanNodeForExport(n));

      const flowData: any = {
        nodes: allCleanNodes,
        edges,
        version: '2.0',
        timestamp: Date.now(),
      };

      const jsonStr = JSON.stringify(flowData);

      const message = {
        type: 'SAVE_FLOW_DATA',
        payload: jsonStr
      };

      window.parent.postMessage(message, '*');
      if (window.top && window.top !== window.parent) {
        window.top.postMessage(message, '*');
      }
      return true;

    } catch (e) {
      console.error('저장 중 오류 발생:', e);
      setErrorModal({ isOpen: true, title: '저장 오류', message: '저장 중 오류가 발생했습니다: ' + e });
      return false;
    }
  }, [nodes, edges]);

  const handleImportJson = useCallback((flowData: any) => {
    if (Array.isArray(flowData.nodes) && Array.isArray(flowData.edges)) {
      // 모든 노드를 수집 (메인 노드 + groups/group 노드들)
      let allNodes: any[] = [...flowData.nodes];

      // groups 또는 group 배열이 있으면 추가 (flat 구조)
      const groupArray = flowData.groups || flowData.group;
      if (Array.isArray(groupArray)) {
        allNodes = allNodes.concat(groupArray);
      }

      // Validate Start and End node counts (메인 노드만 검사, 컨테이너 내부 Start/End 제외)
      const startNodes = allNodes.filter((node: any) => node.data?.isStart && !node.data?.isInternalStart && !node.parentId);
      const endNodes = allNodes.filter((node: any) => node.data?.isEnd && !node.data?.isInternalEnd && !node.parentId);

      if (startNodes.length > 1) {
        setErrorModal({
          isOpen: true,
          title: 'Import Error',
          message: `Start 노드가 ${startNodes.length}개 존재합니다. Start 노드는 1개만 허용됩니다.`,
        });
        return;
      }

      // End 노드 개수 제한 해제 - 여러 개 허용

      // Restore nodes: flat 데이터 정규화 → cleanNodeForExport → 콜백 추가
      const restoredNodes = allNodes.map((node: any) => {
        // CallDO/Process: flat 형식(이전 버전) → ido 객체로 정규화
        if ((node.type === 'CallDO' || node.type === 'Process') && !node.data?.ido && node.data?.componentId) {
          const idoFields = ['id', 'type', 'package', 'packagePath', 'componentId', 'name', 'className', 'modifier', 'modifiedDate', 'svrId'];
          const ido: any = {};
          idoFields.forEach(f => { if (node.data[f] !== undefined) ido[f] = node.data[f]; });
          node = { ...node, data: { ...node.data, ido } };
          // returnType: 문자열 → 객체 변환
          if (typeof node.data.returnType === 'string') {
            node = { ...node, data: { ...node.data, returnType: { name: node.data.returnType, id: node.data.returnType } } };
          }
        }
        // import 시 이사님 태그 → 내부 필드명 변환 (S010 역방향)
        const IMPORT_RENAME: Record<string, Record<string, string>> = {
          For:     { start: 'startVal', end: 'endVal' },
          Script:  { type: 'scriptType' },
          Process: { serviceTypeInput: 'serviceTypeInputs' },
        };
        const renameMap = IMPORT_RENAME[node.type || ''];
        if (renameMap) {
          const d = { ...node.data };
          Object.entries(renameMap).forEach(([from, to]) => {
            if (d[from] !== undefined && d[to] === undefined) { d[to] = d[from]; }
          });
          node = { ...node, data: d };
        }
        // 화이트리스트로 정제 (CallDO/Process는 건너뛰기 — ido flat 변환이 import와 충돌)
        const isCallDOProcess = node.type === 'CallDO' || node.type === 'Process';
        const cleaned = isCallDOProcess ? node : cleanNodeForExport(node as any);
        return {
          ...cleaned,
          data: {
            ...cleaned.data,
            // Start/End 노드 플래그 자동 보정
            ...(node.type === 'Start' ? { isStart: true } : {}),
            ...(node.type === 'End' ? { isEnd: true } : {}),
            // condition → expression 마이그레이션 (호환성)
            expression: cleaned.data?.expression || node.data?.condition,
            onChange: createApprovedOnChange(node.id, node.type),
          }
        };
      });

      setNodes(restoredNodes);
      setEdges(flowData.edges);
      takeSnapshot(restoredNodes, flowData.edges);

      // 로드 후 모든 노드가 보이도록 fitView 자동 실행
      // reactFlowInstanceRef 사용: SET_FLOW_DATA가 onInit보다 먼저 도착해도 ref는 항상 최신값
      setTimeout(() => {
        reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 300 });
      }, 500);
    }
  }, [setNodes, setEdges, takeSnapshot, updateNodeData, createApprovedOnChange]);

  // 부모 창에서 SET_FLOW_DATA 메시지로 전달된 초기 flow 데이터 수신
  useEffect(() => {
    const handleParentMessage = (event: MessageEvent) => {
      // REQUEST_SAVE_AND_CLOSE: 부모에서 저장 확인 후 수신
      if (event.data && event.data.type === 'REQUEST_SAVE_AND_CLOSE') {
        const saved = saveToParent();
        if (saved) {
          const closeMsg = { type: 'CLOSE_FLOW_EDITOR' };
          window.parent.postMessage(closeMsg, '*');
          if (window.top && window.top !== window.parent) {
            window.top.postMessage(closeMsg, '*');
          }
        }
        return;
      }

      if (event.data && event.data.type === 'SET_FLOW_DATA') {
        const { payload, inputData, outputData } = event.data;

        // Flow 데이터 로드
        try {
          const flowData = typeof payload === 'string'
            ? JSON.parse(payload)
            : payload;
          if (flowData && Array.isArray(flowData.nodes) && Array.isArray(flowData.edges)) {
            handleImportJson(flowData);
          }
        } catch (e) {
          console.error('SET_FLOW_DATA 파싱 오류:', e);
        }

        // Input/Output 데이터를 Start/End 노드에 세팅
        if (inputData || outputData) {
          setNodes((nds) => {
            return nds.map((node) => {
              // Start 노드에 inputData 세팅
              if (node.data?.isStart && inputData) {
                const convertedInputs = convertDomainFieldsToIOFields(inputData);
                return {
                  ...node,
                  data: {
                    ...node.data,
                    inputs: convertedInputs,
                  }
                };
              }
              // End 노드에 outputData 세팅
              if (node.data?.isEnd && outputData) {
                const convertedOutputs = convertDomainFieldsToIOFields(outputData);
                return {
                  ...node,
                  data: {
                    ...node.data,
                    outputs: convertedOutputs,
                  }
                };
              }
              return node;
            });
          });
        }
      }

      // 전체 초기화: Start + End 노드만 남기기
      if (event.data && event.data.type === 'RESET_FLOW') {
        const startNode = {
          id: 'start', type: 'Start',
          position: { x: 400, y: 50 },
          data: { label: 'Start', isStart: true, onChange: createApprovedOnChange('start', 'Start') },
        };
        const endNode = {
          id: 'end', type: 'End',
          position: { x: 400, y: 800 },
          data: { label: 'End', isEnd: true, onChange: createApprovedOnChange('end', 'End') },
        };
        setNodes([startNode, endNode] as any);
        setEdges([]);
        takeSnapshot([startNode, endNode] as any, []);
        setTimeout(() => {
          reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 300 });
        }, 100);
      }
    };
    window.addEventListener('message', handleParentMessage);

    // 부모에게 준비 완료 알림
    try {
      window.parent.postMessage({ type: 'FLOW_EDITOR_READY' }, '*');
      if (window.top && window.top !== window.parent) {
        window.top.postMessage({ type: 'FLOW_EDITOR_READY' }, '*');
      }
    } catch (e) {}

    return () => window.removeEventListener('message', handleParentMessage);
  }, [handleImportJson, saveToParent]);

  const onImportClick = () => {
    setIsImportModalOpen(true);
  };

  // Styles based on user request
  // .bt_blue3_h26 { display: inline-block; height: 26px; padding: 0 10px; border-radius: 4px; background-color: #5277f7; overflow: hidden; }
  const btnClass = "h-[26px] px-[10px] rounded-[4px] bg-[#5277f7] text-white text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-[#4162d9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
  const btnRedClass = "h-[26px] px-[10px] rounded-[4px] bg-red-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-red-600 transition-colors shadow-sm";

  // 기존 broken 노드 대응: 축소된 컨테이너의 자식 노드를 hidden:true로 강제
  const displayNodes = useMemo(() => {
    return nodes.map(node => {
      if (node.parentId) {
        const parent = nodes.find(n => n.id === node.parentId);
        if (parent?.data && parent.data.isExpanded === false) {
          return { ...node, hidden: true };
        }
      }
      // 에러 노드 빨간 테두리 하이라이트
      if (errorNodeIds.has(node.id)) {
        return {
          ...node,
          style: { ...node.style, border: '3px solid #ef4444', borderRadius: '8px', boxShadow: '0 0 12px rgba(239,68,68,0.4)' },
        };
      }
      return node;
    });
  }, [nodes, errorNodeIds]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* Global styles for React Flow child nodes */}
      <style>{`
        /* Ensure child nodes (with parentId) render above their parent containers */
        .react-flow__node[data-id$="-internal-start"],
        .react-flow__node[data-id$="-internal-end"] {
          z-index: 1000 !important;
        }

        /* Container nodes should have lower z-index (negative to go below edges) */
        .react-flow__node-group,
        .react-flow__node-while,
        .react-flow__node-for {
          z-index: -1 !important;
        }

        /* Ensure edges and connection lines are visible above containers */
        .react-flow__edges {
          z-index: 1 !important;
        }

        .react-flow__connection {
          z-index: 1001 !important;
        }

        .react-flow__connection-path {
          stroke: #b1b1b7;
          stroke-width: 3;
        }

        /* Ensure handles are always clickable */
        .react-flow__handle {
          pointer-events: auto !important;
        }
      `}</style>

      {/* Main Content Area - Canvas + Right Panel */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas Area */}
        <div className="flex-1 min-w-0 relative bg-slate-50">
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            onPaneContextMenu={onPaneContextMenu}
            onInit={(instance) => { setReactFlowInstance(instance); reactFlowInstanceRef.current = instance; }}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.5, minZoom: 0.5, maxZoom: 1 }}
            minZoom={0.3}
            maxZoom={2}
            selectionOnDrag={true}
            selectionMode={SelectionMode.Partial}
            panOnDrag={toolMode === 'pan'}
            panOnScroll={true}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{
              style: { strokeWidth: 3, stroke: '#b1b1b7' },
            }}
            deleteKeyCode={containerFlowModal.isOpen ? null : ['Backspace', 'Delete']}
            className="bg-slate-50"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls className="bg-white border border-slate-200 shadow-md rounded-lg overflow-hidden" />

            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="bg-white border-2 border-slate-200 rounded-lg shadow-lg"
            />
          </ReactFlow>
        </div>

        {/* Right Panel - IO Details */}
        <IOPanel nodes={nodes} selectedNodeId={selectedNodeId} />
      </div>

      <IDOSearchModal
        isOpen={isIDOModalOpen}
        onClose={() => setIsIDOModalOpen(false)}
        onSelect={handleIDOSelect}
        currentNodeLabel={getSelectedNodeValue()} // Pass value if needed for context, or just label
      />
      
      {contextMenu && (
        <ContextMenu
          top={contextMenu.top}
          left={contextMenu.left}
          nodeId={contextMenu.nodeId}
          nodeType={contextMenu.nodeType}
          onClose={() => setContextMenu(null)}
          onIOSetting={handleIOSetting}
          onChangeId={handleChangeId}
          onInputMapping={handleInputMapping}
          onOutputMapping={handleOutputMapping}
        />
      )}

      {groupContextMenu && (
        <GroupContextMenu
          top={groupContextMenu.top}
          left={groupContextMenu.left}
          nodeId={groupContextMenu.nodeId}
          currentLabel={groupContextMenu.currentLabel}
          onClose={() => setGroupContextMenu(null)}
          onSave={handleGroupNameSave}
          onChangeId={handleChangeId}
        />
      )}

      {mappingContextMenu && (
        <MappingContextMenu
          top={mappingContextMenu.top}
          left={mappingContextMenu.left}
          nodeId={mappingContextMenu.nodeId}
          onClose={() => setMappingContextMenu(null)}
          onInputMapping={handleInputMapping}
          onOutputMapping={handleOutputMapping}
          onChangeId={handleChangeId}
        />
      )}

      {paneContextMenu && (
        <PaneContextMenu
          top={paneContextMenu.top}
          left={paneContextMenu.left}
          onClose={() => setPaneContextMenu(null)}
          onAddNode={(type) => {
            addNode(type, paneContextMenu.flowPosition);
            setPaneContextMenu(null);
          }}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onDelete={deleteSelectedElements}
          onExport={exportFlow}
          onImport={onImportClick}
          toolMode={toolMode}
          onToolModeChange={setToolMode}
        />
      )}

      <IOSettingModal
        isOpen={isIOModalOpen}
        onClose={() => { setIsIOModalOpen(false); setIsIOModalReadOnly(false); }}
        nodeId={selectedNodeId}
        initialInputs={nodes.find(n => n.id === selectedNodeId)?.data.inputs}
        initialOutputs={nodes.find(n => n.id === selectedNodeId)?.data.outputs}
        onSave={handleIOSave}
        readOnly={isIOModalReadOnly}
        outputReadOnly={(() => {
          const node = nodes.find(n => n.id === selectedNodeId);
          const rt = node?.data?.returnType;
          const rtId = rt ? (typeof rt === 'string' ? rt : (rt.id || rt.name || '')) : '';
          if (rtId) return rtId === 'JexDataList';
          const ido = node?.data?.ido;
          return ido?.type === 'IDO' && (ido?.sqlList?.[0]?.sqlDvCd || '') === 'SELECT';
        })()}
        outputTitle={(() => {
          const node = nodes.find(n => n.id === selectedNodeId);
          const rt = node?.data?.returnType;
          const rtId = rt ? (typeof rt === 'string' ? rt : (rt.id || rt.name || '')) : '';
          if (rtId === 'JexDataList') return 'outputList (JexDataList)';
          if (rtId) return undefined;
          const ido = node?.data?.ido;
          return ido?.type === 'IDO' && (ido?.sqlList?.[0]?.sqlDvCd || '') === 'SELECT' ? 'outputList (JexDataList)' : undefined;
        })()}
        hideOutput={nodes.find(n => n.id === selectedNodeId)?.type === 'Start'}
        hideInput={nodes.find(n => n.id === selectedNodeId)?.type === 'End'}
      />

      <MappingSettingModal
        isOpen={mappingModal.isOpen}
        onClose={() => setMappingModal({ isOpen: false, nodeId: null, mappingType: 'input' })}
        nodeId={mappingModal.nodeId}
        mappingType={mappingModal.mappingType}
        initialData={
          mappingModal.nodeId
            ? mappingModal.mappingType === 'input'
              ? nodes.find(n => n.id === mappingModal.nodeId)?.data.inputMapping
              : nodes.find(n => n.id === mappingModal.nodeId)?.data.outputMapping
            : []
        }
        onSave={handleMappingSave}
      />

      <MappingEditorModal
        isOpen={mappingEditorModal.isOpen}
        onClose={() => setMappingEditorModal({ isOpen: false, nodeId: null, mappings: [] })}
        nodeId={mappingEditorModal.nodeId}
        initialMappings={mappingEditorModal.mappings}
        availableNodes={
          nodes
            .filter(n => {
              if (n.data?.isInternalStart || n.data?.isInternalEnd) return false;
              // 입력 매핑(fixedTargetNodeId)일 때는 고정 타겟 노드(자기 자신)를 포함
              if (mappingEditorModal.fixedTargetNodeId && n.id === mappingEditorModal.fixedTargetNodeId) return true;
              // 그 외에는 현재 노드(Mapping 노드) 자신은 제외
              return n.id !== mappingEditorModal.nodeId;
            })
            .map(n => {
              // Record/CMO 타입의 children을 재귀적으로 변환하는 함수
              // fieldType: 'RECORD', 'Record', 'COMMON', 'Common' 모두 허용
              const isRecordType = (ft: string | undefined) => {
                const upper = ft?.toUpperCase();
                return upper === 'RECORD' || upper === 'COMMON';
              };

              const convertField = (field: any): any => {
                if (!field) return null;
                const ft = field.fieldType || field.type;
                const result: any = {
                  name: field.name || field.englishName || field.koreanName,
                  fieldType: ft,
                };
                // Record 타입이면 children도 변환
                if (isRecordType(ft) && field.children && field.children.length > 0) {
                  result.children = field.children
                    .filter((child: any) => child && (child.name || child.englishName || child.koreanName))
                    .map(convertField)
                    .filter(Boolean);
                }
                return result;
              };

              const convertedInputs = (n.data?.inputs || [])
                  .filter((input: any) => input && (input.name || input.englishName || input.koreanName))
                  .map(convertField)
                  .filter(Boolean);
              const convertedOutputs = (n.data?.outputs || [])
                  .filter((output: any) => output && (output.name || output.englishName || output.koreanName))
                  .map(convertField)
                  .filter(Boolean);

              // Start 노드: inputMessage가 다음 노드로 전달되므로 inputs를 outputs로도 사용
              // End 노드: outputMessage가 이전 노드에서 받으므로 outputs를 inputs로도 사용
              const nodeType = n.type || 'unknown';
              let finalInputs = convertedInputs;
              let finalOutputs = convertedOutputs;

              if (nodeType === 'Start') {
                // Start 노드의 inputs(inputMessage)를 outputs로도 제공
                if (finalOutputs.length === 0 && finalInputs.length > 0) {
                  finalOutputs = finalInputs;
                }
              }
              if (nodeType === 'End') {
                // End 노드의 outputs(outputMessage)를 inputs로도 제공
                if (finalInputs.length === 0 && finalOutputs.length > 0) {
                  finalInputs = finalOutputs;
                }
              }

              // Variable 노드: variableName을 outputs 필드로 제공 (매핑 소스로 사용 가능)
              if (nodeType === 'Variable' && n.data?.variableName) {
                finalOutputs = [{ name: n.data.variableName, fieldType: 'String' }];
              }

              // 노드 타입별 label 구성: 모든 타입에서 node.id를 기본 표시값으로 사용
              const displayLabel: string = n.id;

              return {
                id: n.id,
                label: displayLabel,
                type: nodeType,
                inputs: finalInputs,
                outputs: finalOutputs,
                ido: n.data?.ido ? {
                  componentId: n.data.ido.componentId || '',
                  type: n.data.ido.type || 'IMO',
                } : undefined,
              };
            })
        }
        edges={edges}
        onSave={handleMappingEditorSave}
        fixedTargetNodeId={mappingEditorModal.fixedTargetNodeId}
      />

      <ConditionEditModal
        isOpen={conditionModal.isOpen}
        onClose={() => setConditionModal({ isOpen: false, nodeId: null, expression: '' })}
        nodeId={conditionModal.nodeId}
        initialExpression={conditionModal.expression}
        onSave={handleConditionSave}
      />

      <ScriptEditModal
        isOpen={scriptModal.isOpen}
        onClose={() => setScriptModal({ isOpen: false, nodeId: null, scriptType: '', variableName: '', scriptContent: '', variables: [] })}
        nodeId={scriptModal.nodeId}
        nodes={nodes}
        edges={edges}
        initialScriptType={scriptModal.scriptType}
        initialVariableName={scriptModal.variableName}
        initialScriptContent={scriptModal.scriptContent}
        initialVariables={scriptModal.variables}
        onSave={handleScriptSave}
        autocompleteData={autocompleteData}
        onOpenAutocompleteManager={() => setAutocompleteManagerOpen(true)}
      />

      <AutocompleteManagerModal
        isOpen={autocompleteManagerOpen}
        onClose={() => setAutocompleteManagerOpen(false)}
        onDataUpdate={setAutocompleteData}
      />

      <ForEditModal
        isOpen={forModal.isOpen}
        onClose={() => setForModal({ isOpen: false, nodeId: null, option1: '', option2: '' })}
        nodeId={forModal.nodeId}
        initialOption1={forModal.option1}
        initialOption2={forModal.option2}
        onSave={handleForSave}
      />

      <ForEachEditModal
        isOpen={forEachModal.isOpen}
        onClose={() => setForEachModal({ isOpen: false, nodeId: null, option1: '', option2: '' })}
        nodeId={forEachModal.nodeId}
        initialOption1={forEachModal.option1}
        initialOption2={forEachModal.option2}
        onSave={handleForEachSave}
      />

      <ContainerFlowModal
        isOpen={containerFlowModal.isOpen}
        onClose={() => {
          setContainerFlowModal({ isOpen: false, containerId: null, containerType: null, containerLabel: '', startValue: '', endValue: '', selectedNode: '', fieldType: 'input', fieldName: '', expression: '', snapshotNodes: [], snapshotEdges: [] });
        }}
        containerId={containerFlowModal.containerId}
        containerType={containerFlowModal.containerType}
        containerLabel={containerFlowModal.containerLabel}
        initialNodes={nodes}
        initialEdges={edges}
        onSave={handleContainerFlowSave}
        initialStartValue={containerFlowModal.startValue}
        initialEndValue={containerFlowModal.endValue}
        initialSelectedNode={containerFlowModal.selectedNode}
        initialFieldType={containerFlowModal.fieldType}
        initialFieldName={containerFlowModal.fieldName}
        initialExpression={containerFlowModal.expression}
        availableNodes={
          // For ForEach, provide list of all nodes except self with their inputs/outputs
          nodes
            .filter(n =>
              !n.data?.isStart &&
              !n.data?.isEnd &&
              n.id !== containerFlowModal.containerId // Exclude current container
            )
            .map(n => ({
              id: n.id,
              label: n.data?.label || n.id,
              type: n.type || 'unknown',
              inputs: (n.data?.inputs || [])
                .filter((input: any) => input && (input.name || input.englishName || input.koreanName))
                .map((input: any) => ({
                  name: input.name || input.englishName || input.koreanName
                })),
              outputs: (n.data?.outputs || [])
                .filter((output: any) => output && (output.name || output.englishName || output.koreanName))
                .map((output: any) => ({
                  name: output.name || output.englishName || output.koreanName
                })),
            }))
        }
      />

      <JsonExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        data={exportData}
      />

      <JsonImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportJson}
      />

      <CodeSelectionModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        onSelect={handleCodeSelect}
      />

      <TextEditModal
        isOpen={isTextEditModalOpen}
        onClose={() => setIsTextEditModalOpen(false)}
        onSave={handleTextEditSave}
        title={textEditConfig.title}
        label={textEditConfig.label}
        placeholder={textEditConfig.placeholder}
        initialValue={getSelectedNodeValue()}
      />

      {/* Error Modal */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-red-500 px-6 py-4 flex items-center gap-3">
              <AlertCircle className="text-white" size={24} />
              <h2 className="text-lg font-bold text-white">{errorModal.title}</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-700 text-sm leading-relaxed" style={{ whiteSpace: 'pre-line' }}>{errorModal.message}</p>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setErrorModal({ isOpen: false, title: '', message: '' });
                  setErrorNodeIds(new Set());
                  // 무시하고 강제 저장
                  const allCleanNodes = nodes.map(n => cleanNodeForExport(n));
                  const flowData = { nodes: allCleanNodes, edges, version: '2.0', timestamp: Date.now() };
                  const jsonStr = JSON.stringify(flowData);
                  const message = { type: 'SAVE_FLOW_DATA', payload: jsonStr };
                  window.parent.postMessage(message, '*');
                  if (window.top && window.top !== window.parent) {
                    window.top.postMessage(message, '*');
                  }
                  // 닫기 신호
                  const closeMsg = { type: 'CLOSE_FLOW_EDITOR' };
                  window.parent.postMessage(closeMsg, '*');
                  if (window.top && window.top !== window.parent) {
                    window.top.postMessage(closeMsg, '*');
                  }
                }}
                className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors text-sm font-medium"
              >
                무시 저장
              </button>
              <button
                onClick={() => setErrorModal({ isOpen: false, title: '', message: '' })}
                className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors text-sm font-medium"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID Change Modal */}
      {idChangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="bg-[#5277f7] px-6 py-4">
              <h2 className="text-lg font-bold text-white">nodeId 변경</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                새 nodeId
              </label>
              <input
                type="text"
                value={newIdValue}
                onChange={(e) => {
                  // Java 변수 명명 규칙: 영문자, 숫자, _, $ 만 허용
                  // 첫 글자는 숫자 불가
                  const value = e.target.value;
                  // 허용 문자만 필터링 (a-z, A-Z, 0-9, _, $)
                  const filtered = value.replace(/[^a-zA-Z0-9_$]/g, '');
                  // 첫 글자가 숫자면 제거
                  const validated = filtered.replace(/^[0-9]+/, '');
                  setNewIdValue(validated);
                }}
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
                placeholder="새 nodeId 입력"
              />
              <p className="mt-2 text-xs text-slate-500">
                현재 ID: {idChangeModal.currentId}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                영문, 숫자, _, $ 사용 가능 (숫자로 시작 불가)
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

      {/* Approval Overlay - 서버 승인 대기/결과 표시 */}
      <ApprovalOverlay state={approvalState} onDismiss={resetApproval} />
    </div>
  );
}
