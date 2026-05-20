# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 빌드 명령어

```bash
npm run dev    # 개발 서버 시작 (포트 3000, 자동 열기)
npm run build  # 프로덕션 빌드 (build/ 디렉토리로 출력)
```

테스트 또는 린트 명령어는 설정되어 있지 않음.

## 아키텍처 개요

**ReactFlow 기반 시각적 노드 워크플로우 에디터**. 사용자가 캔버스에서 노드를 연결하여 워크플로우를 설계하고, 모달을 통해 속성을 편집함.

### 핵심 데이터 흐름

```
App.tsx (메인 컨테이너)
├── nodes/edges 상태 (ReactFlow)
├── 15개 이상의 모달 상태 (속성 편집용)
├── 컨텍스트 메뉴 (노드, 그룹, 매핑, 캔버스)
└── useUndoRedo 훅 (히스토리 관리)
```

**이벤트 패턴:**
사용자 액션 → 핸들러 콜백 → setNodes() → takeSnapshot() → 모달 닫기

### 노드 시스템
**노드 타입** (`/src/components/`에 14개 커스텀 타입):
- **액션**: CustomNode, VariableNode, MappingNode, ScriptNode
- **제어 흐름**: ConditionNode, SwitchNode, DONode, ErrorNode
- **루프 컨테이너**: ForNode, ForEachNode, WhileNode
- **그룹화**: GroupNode, CallGroupNode

**컨테이너 노드** (Method, While, For, ForEach)는 `parentId`를 통해 중첩된 자식 노드를 지원함. 확장 시 내부 Start/End 노드가 표시되며 ContainerFlowModal을 통해 내부 플로우 편집 가능.

### 노드 타입 및 레이블 정의 (절대 변경 금지)

| type | label | 설명 |
|------|-------|------|
| `Start` | Start | 시작 노드 |
| `End` | End | 종료 노드 |
| `Process` | Process | 일반 프로세스 노드 |
| `Variable` | Variable | 변수 노드 |
| `Mapping` | Mapping | 매핑 노드 |
| `Script` | Script | 스크립트 노드 |
| `IfElse` | IfElse | 조건 분기 노드 |
| `Switch` | Switch | 스위치 분기 노드 |
| `CallDO` | CallDO | DO 호출 노드 |
| `Error` | Error | 에러 처리 노드 |
| `While` | While | While 루프 노드 |
| `For` | For | For 루프 노드 |
| `ForEach` | ForEach | ForEach 루프 노드 |
| `Method` | Method | 메서드(그룹) 노드 |
| `CallMethod` | CallMethod | 메서드 호출 노드 |

**중요**: type과 label은 동일한 PascalCase 값을 사용합니다. 띄어쓰기나 특수문자를 사용하지 않습니다.

# 핵심 노드 데이터 구조
## 전체 구조 분석
```typescript
interface WorkflowDiagram {
    nodes: FlowNode[];           // 워크플로우의 각 단계/노드
    edges: FlowEdge[];           // 노드 간 연결선
    version: string;             // 다이어그램 버전
    timestamp: number;           // 생성/수정 시간 (Unix timestamp)
}
```

## Nodes(노드/단계)
```typescript
interface FlowNode {
    id: string;                  // 노드 고유 식별자
    type: NodeType;              // 노드 타입 ('Start' | 'Mapping' | 'End' | 기타)
    position: Position;          // 캔버스 상의 위치 (x, y 좌표)
    data: NodeData;              // 노드의 실제 데이터/메타정보
    width: number;               // 노드 UI 너비 (픽셀)
    height: number;              // 노드 UI 높이 (픽셀)
    positionAbsolute?: Position; // 절대 좌표 (중첩된 그룹이 있을 경우)
}

interface Position {
    x: number;                   // X축 좌표
    y: number;                   // Y축 좌표
}

interface NodeData {
    label: string;               // 노드 표시 이름
    description: string;         // 노드 설명/메모
    isStart?: boolean;           // 시작 노드 여부
    isEnd?: boolean;             // 종료 노드 여부
    isExpanded?: boolean;        // 확장/축소 상태 (mapping 노드용)
}
```



## Edges(연결선)
```typescript
interface FlowEdge {
  id: string;                  // 연결선 고유 식별자
  source: string;              // 출발 노드 ID
  target: string;              // 도착 노드 ID
  sourceHandle?: string | null; // 출발 노드의 특정 핸들(연결점)
  targetHandle?: string | null; // 도착 노드의 특정 핸들(연결점)
}
```


## 명확한 네이밍으로 재정의(데이터 꼬일시)
```typescript
// claude.md에 추가할 타입 정의
interface WorkflowConfiguration {
  workflowNodes: WorkflowNode[];
  nodeConnections: NodeConnection[];
  schemaVersion: string;
  lastModifiedTimestamp: number;
}

interface WorkflowNode {
  nodeId: string;
  nodeType: 'Start' | 'Mapping' | 'End' | string;
  canvasPosition: CoordinatePosition;
  nodeMetadata: NodeMetadata;
  uiDimensions: NodeDimensions;
  absolutePosition?: CoordinatePosition;
}

interface CoordinatePosition {
  xCoordinate: number;
  yCoordinate: number;
}

interface NodeMetadata {
  displayLabel: string;
  nodeDescription: string;
  isStartNode?: boolean;
  isEndNode?: boolean;
  isNodeExpanded?: boolean;
}

interface NodeDimensions {
  widthPixels: number;
  heightPixels: number;
}

interface NodeConnection {
  connectionId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceConnectionPoint?: string | null;
  targetConnectionPoint?: string | null;
}
```

## 예시 사용법
```typescript
const workflow: WorkflowConfiguration = {
  workflowNodes: [
    {
      nodeId: "start",
      nodeType: "Start",
      canvasPosition: { xCoordinate: 250, yCoordinate: 50 },
      nodeMetadata: {
        displayLabel: "Start Node",
        nodeDescription: "Entry point",
        isStartNode: true
      },
      uiDimensions: { widthPixels: 180, heightPixels: 119 }
    }
    // ... 기타 노드
  ],
  nodeConnections: [
    {
      connectionId: "start-node1",
      sourceNodeId: "start",
      targetNodeId: "node1",
      sourceConnectionPoint: null
    }
    // ... 기타 연결
  ],
  schemaVersion: "2.0",
  lastModifiedTimestamp: 1766404061044
}
```
JSON 형식은 절때 변경되서는 안된다.

### 매핑 데이터 규칙 (절대 변경 금지)

**매핑 순서는 매우 중요함** - JSON으로 전달할 때 매핑 배열의 순서가 반드시 유지되어야 함.
- 사용자가 MappingEditorModal에서 설정한 매핑 순서 그대로 저장
- 매핑 순서 변경 기능(위/아래 버튼)으로 변경된 순서가 JSON에 반영됨
- 순서는 실행 순서를 의미하므로 임의로 변경하면 안 됨

### 모달 시스템

모든 속성 편집은 모달을 통해 처리:
- **IOSettingModal** - 노드 입력/출력 설정
- **ContainerFlowModal** - 컨테이너 내부 플로우 편집 (별도 ReactFlow 인스턴스)
- **MappingSettingModal**, **ConditionEditModal**, **ScriptEditModal** - 전용 에디터
- **IDOSearchModal** - DO 컴포넌트 선택

### 유틸리티

- **useUndoRedo** (`/src/hooks/`) - Cmd/Ctrl+Z 지원, 최대 50개 상태 저장
- **relationshipUtils** (`/src/utils/`) - Export 준비: `cleanNodeForExport()`로 콜백 제거, `separateNodesAndGroups()`로 계층 구조 평탄화

### UI 컴포넌트

`/src/components/ui/`에 shadcn/ui 컴포넌트 (Radix UI + Tailwind) 포함. 일관된 스타일링을 위해 사용.


## 기술 스택

- React 18 + TypeScript + Vite (SWC)
- ReactFlow 11.11.4 (핵심 그래프 라이브러리)
- Tailwind CSS + Radix UI (shadcn/ui)
- lucide-react (아이콘)

---

## UI 스타일 가이드

### 색상 팔레트
```css
/* 기본 색상 */
--primary-blue: #5277f7;        /* 주요 버튼, 아이콘, 연결선 */
--primary-blue-hover: #4166d9;  /* 호버 상태 */

/* 배경 색상 */
--header-bg: #dce4fd;           /* 모달 헤더 배경 */
--filter-bg: #f6f7fa;           /* 필터/검색 영역 배경 */
--content-bg: #f8fafc;          /* 콘텐츠 영역 배경 */

/* 텍스트 색상 */
--text-primary: #1e293b;        /* 주요 텍스트 */
--text-secondary: #64748b;      /* 보조 텍스트 */
--text-muted: #94a3b8;          /* 비활성/힌트 텍스트 */

/* 테두리 색상 */
--border-light: #e2e8f0;        /* 기본 테두리 */
--border-input: #cbd5e1;        /* 입력 필드 테두리 */
```

### 모달 헤더 스타일
```css
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background-color: #dce4fd;    /* 연한 파란색 배경 */
}

.modal-header h2 {
  font-size: 18px;
  font-weight: bold;
  color: #1e293b;
}

.modal-header p {
  font-size: 13px;
  color: #64748b;
}

.modal-header .icon {
  color: #5277f7;               /* 아이콘 색상 */
}
```

### 필터/검색 영역 스타일
```css
.filter-section {
  display: flex;
  column-gap: 28px;
  padding: 16px 24px;
  background-color: #f6f7fa;
  border-bottom: 1px solid #e2e8f0;
}
```

### 버튼 스타일
```css
/* 기본 파란색 버튼 */
.btn-primary {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 14px;
  background-color: #5277f7;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: #4166d9;
}

/* 작은 버튼 (h26) */
.btn-small {
  height: 26px;
  padding: 0 10px;
  border-radius: 4px;
  font-size: 13px;
}

/* 취소/보조 버튼 */
.btn-secondary {
  height: 32px;
  padding: 0 14px;
  background-color: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 4px;
}

.btn-secondary:hover {
  background-color: #e2e8f0;
}
```

### 드롭다운/Select 스타일
```css
.dropdown-button {
  width: 100%;
  padding: 12px 16px;
  background-color: white;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  text-align: left;
}

.dropdown-menu {
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  max-height: 240px;
  overflow-y: auto;
}

.dropdown-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.dropdown-item:hover {
  background-color: #eff6ff;
}

.dropdown-item.selected {
  background-color: #eff6ff;
}
```

### 연결선/매핑 라인 스타일
```css
.connection-line {
  stroke: #5277f7;
  stroke-width: 2;
  fill: none;
}

.connection-point {
  fill: #5277f7;
  r: 4;
}
```

## 중요한 패턴

1. **노드 생성 시 콜백 주입 필수** - 노드 추가 시 (App.tsx 또는 ContainerFlowModal) `onChange`와 타입별 콜백(`onOpenLinkedIDOSearch` 등) 주입 필요

2. **컨테이너 내부 노드** - `parentId`로 자식 노드 연결, `extent: 'parent'` 설정으로 이동 범위 제한

3. **Edge 스내핑** - 노드를 Edge 위에 드롭하면 자동으로 Edge 분할 (`onNodeDragStop`에서 구현)

4. **Export/Import** - `nodes`, `edges`, `group` 배열을 포함한 JSON 형식. `cleanNodeForExport()`로 콜백 제거 후 내보내기

---

## 2024-12-23 세션 변경사항

### 1. ContainerFlowModal 노드 저장 버그 수정
- **문제**: ForEach 등 컨테이너에서 노드를 추가하고 저장해도 데이터가 유지되지 않음
- **원인**: 노드가 `hidden: true`로 저장되어 모달 재오픈 시 보이지 않음
- **해결**: `getInitialNodes`에서 `hidden: false` 설정 추가

### 2. ContainerFlowModal 더블클릭 이벤트 추가
- **파일**: `src/components/ContainerFlowModal.tsx`
- **변경**: FlowCanvas에 `onNodeDoubleClick` 핸들러 추가
- **기능**: Condition, Script, Error 노드 더블클릭 시 편집 모달 표시
- **추가된 모달**: ConditionEditModal, ScriptEditModal, CodeSelectionModal

### 3. CustomNode Service Type 콤보박스 수정
- **문제**: 컨테이너 모달 내부에서 Service Type 드롭다운이 표시되지 않음
- **원인**: ReactFlow 노드의 스택 컨텍스트로 인해 드롭다운이 가려짐
- **해결**:
  - 드롭다운을 `ReactDOM.createPortal`로 `document.body`에 렌더링
  - `position: fixed` + viewport 좌표 사용
  - `z-index: 2147483647` (최대값) 적용
  - `!important` CSS 규칙으로 강제 표시

### 4. ServiceTypeInputModal z-index 수정
- **문제**: 컨테이너 모달에서 Service Type 선택 시 입력 모달이 컨테이너 뒤에 표시됨
- **해결**:
  - `z-index: 2147483647` 적용
  - `!important` CSS 규칙 추가
  - `visibility: visible`, `opacity: 1`, `pointer-events: auto` 강제 적용

### 5. ContainerFlowModal CSS 수정
- **파일**: `src/components/ContainerFlowModal.tsx`
- **변경**: `.react-flow__handle` CSS 규칙 추가
  ```css
  .container-flow-canvas .react-flow__handle {
    pointer-events: all !important;
    cursor: crosshair !important;
  }
  ```

## 기술적 참고사항 (추가)

### ReactFlow 노드 내부 요소 클릭 문제
- ReactFlow 노드는 자체 스택 컨텍스트를 가짐
- 노드 내부의 드롭다운/모달은 `document.body`로 포털 렌더링 필요
- `z-index`만으로는 해결 불가 → `position: fixed` + 포털 조합 필요

### 컨테이너 모달 내 노드 연결
- `.react-flow__handle`에 `pointer-events: all !important` 필요
- `.nodrag` 클래스와 handle 클래스가 충돌할 수 있음
- `:not(.react-flow__handle)` 선택자로 handle 제외

---

## 수정 로그 자동 저장 (필수)

**중요**: 코드 수정 작업을 완료할 때마다 자동으로 `doc/` 폴더에 수정 내용을 기록해야 합니다.

### 파일 형식
```
doc/YYYYMMDD-editlist.txt
```

### 저장 시점
- 코드 수정 작업이 완료될 때마다 즉시 저장
- 같은 날짜의 파일이 있으면 내용 추가 (append)
- 새로운 날짜면 새 파일 생성

### 내용 구성
```markdown
# YYYY-MM-DD 수정사항

## 1. [기능/수정 제목]

### 수정된 파일:
1. **파일경로**
   - 변경 내용 설명

---

## 2. [다음 기능/수정 제목]
...
```

### 예시
- `doc/20251223-editlist.txt`
- `doc/20251224-editlist.txt`

---

## 관련 프로젝트 구조 (JEX 시스템)

이 프로젝트는 JEX 시스템의 일부로, 여러 프로젝트와 연계되어 동작합니다.

### 프로젝트 관계도
```
/Users/ijaeseog/Documents/_JEX_CHECKOUT/
├── jex_project/
│   ├── jex-flow/         ← 현재 프로젝트 (ReactFlow 워크플로우 에디터)
│   └── jexq-flow/        ← 별도의 ReactFlow 프로젝트 (유사 구조)
│
├── JEXQ/
│   ├── JEXQ/             ← JEXQ 메인 서버
│   │   └── frontend/     ← 프론트엔드 리소스
│   └── SVC_GRP/
│       └── P_BIZ/        ← 서비스 등록/수정 화면 (svc_0002_01)
│           └── src/main/resources/
│               ├── templates/svc/svc_0002_01.html  ← jex-flow 임베딩 페이지
│               ├── templates/svc/svc_0002_02.html  ← ReactFlow 렌더링
│               └── static/js/menu/svc/svc_0002_01.js ← 탭 전환/데이터 전송 로직
│
├── JEXQ-FRONT/           ← React 기반 프론트엔드 (별도)
└── ARCADIA_ADM/          ← 메인 프레임 시스템
```

### jex-flow 임베딩 구조

jex-flow는 JEXQ 시스템의 `svc_0002_01`(서비스 등록 화면)에 iframe으로 임베딩됩니다:

1. **svc_0002_01.html** (252-270 라인)
   - 7개 탭(DEFAULT, GET, POST, PUT, DELETE, BCS, TRANSACTION)마다 별도 iframe
   - 각 iframe은 `svc_0002_02?area=minimap-only`를 로드
   - 미니맵 미리보기용 (높이 200px)

2. **svc_0002_01.js**
   - `changeDomainTab()`: 탭 전환 시 `.studio-hide` 클래스 토글
   - `sendMiniMapDataForTab()`: postMessage로 미니맵에 데이터 전송
   - `openFlowEditor()`: Flow Editor 팝업 열기 (전체 편집)
   - `handleFlowSave()`: Flow Editor에서 저장 시 데이터 수신

3. **postMessage 통신**
   - `SET_MINIMAP_DATA`: 부모 → iframe (미니맵 데이터 전송)
   - `SAVE_FLOW_DATA`: iframe → 부모 (저장 데이터 전송)
   - `SET_FLOW_DATA`: 부모 → Flow Editor (편집 데이터 전송)
   - `FLOW_EDITOR_READY`: Flow Editor → 부모 (준비 완료 알림)

### jex-flow 내 관련 파일

- **src/pages/MiniMapOnlyPage.tsx**: 미니맵 전용 페이지, `SET_MINIMAP_DATA` 수신
- **src/App.tsx**:
  - `saveToParent()` (2338-2366): `SAVE_FLOW_DATA` 전송
  - `handleParentMessage` useEffect (2425-2446): `SET_FLOW_DATA` 수신

### 빌드 및 배포

jex-flow 빌드 결과물은 JEXQ의 static 리소스로 복사됩니다:
```
jex-flow/build/ → JEXQ/SVC_GRP/P_BIZ/src/main/resources/static/react/p_biz/
```

---

## 알려진 이슈

### 탭 전환 시 노드 위치 이동 버그 (미해결)

**증상**: JEXQ svc_0002_01 화면에서 탭을 전환할 때마다 노드가 점점 아래로 이동함

**관련 파일**:
- `JEXQ/SVC_GRP/P_BIZ/.../svc_0002_01.js`: 탭 전환 로직
- `jex-flow/src/pages/MiniMapOnlyPage.tsx`: 미니맵 데이터 수신
- `jex-flow/src/App.tsx`: Flow Editor 데이터 처리

**조사 필요**:
- hidden input에 저장된 JSON 데이터가 탭 전환 시 변경되는지 확인
- `separateNodesAndGroups()` 함수에서 노드 위치 변환 확인
- postMessage 전송 시 y좌표 정규화 로직 검토
