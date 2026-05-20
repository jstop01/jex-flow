# JEX-Flow JSON 데이터 명세서

이 문서는 JEX-Flow 워크플로우 에디터에서 생성되는 JSON 데이터의 구조와 각 필드에 대한 상세 설명을 제공합니다.

---

## 1. 최상위 구조 (Root Structure)

```typescript
interface WorkflowData {
  nodes: Node[];           // 메인 플로우 노드 배열 (컨테이너 노드 제외)
  edges: Edge[];           // 노드 간 연결선 배열
  group?: Node[];          // 컨테이너 노드 + 내부 노드 (flat 배열)
  version: string;         // 스키마 버전 (현재: "2.0")
  timestamp: number;       // 생성/수정 시간 (Unix timestamp, milliseconds)
}
```

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `nodes` | Node[] | O | 메인 플로우의 노드들. 컨테이너(group, while, for, forEach) 제외 |
| `edges` | Edge[] | O | 노드 간 연결 관계 |
| `group` | Node[] | X | 컨테이너 노드와 그 내부 노드들 (flat 구조) |
| `version` | string | O | 데이터 스키마 버전 |
| `timestamp` | number | O | 마지막 수정 시간 |

---

## 2. Node (노드) 구조

### 2.1 공통 노드 구조

```typescript
interface Node {
  id: string;                    // 노드 고유 식별자
  type: NodeType;                // 노드 타입
  position: Position;            // 캔버스 상의 위치
  data: NodeData;                // 노드 메타데이터 (타입별로 다름)

  // 선택적 필드
  style?: CSSProperties;         // 인라인 스타일
  parentId?: string;             // 부모 컨테이너 ID (내부 노드용)
  extent?: 'parent';             // 이동 범위 제한 ('parent'면 부모 내부로 제한)
  zIndex?: number;               // 렌더링 순서
  hidden?: boolean;              // 숨김 여부
  width?: number;                // 노드 너비 (픽셀)
  height?: number;               // 노드 높이 (픽셀)
  positionAbsolute?: Position;   // 절대 좌표
}

interface Position {
  x: number;                     // X축 좌표
  y: number;                     // Y축 좌표
}
```

### 2.2 노드 타입 (NodeType)

```typescript
type NodeType =
  | 'process'     // Process (일반 프로세스)
  | 'start'       // Start (시작 노드) - process의 특수 형태
  | 'end'         // End (종료 노드) - process의 특수 형태
  | 'variable'    // Variable (변수 설정)
  | 'mapping'     // Mapping (필드 매핑)
  | 'condition'   // If/Else (조건 분기)
  | 'switch'      // Switch (다중 분기)
  | 'do'          // Call DO (DO 호출)
  | 'script'      // Script (스크립트 실행)
  | 'error'       // Error (에러 처리)
  | 'group'       // Method (메서드 그룹)
  | 'callGroup'   // Call Method (메서드 호출)
  | 'while'       // While Loop (While 반복)
  | 'for'         // For Loop (For 반복)
  | 'forEach';    // For Each Loop (ForEach 반복)
```

---

## 3. 노드 타입별 Data 구조

### 3.1 Custom Node (Process / Start / End)

```typescript
interface CustomNodeData {
  label: string;                          // 노드 표시명
  description?: string;                   // 설명

  // Start/End 노드 식별
  isStart?: boolean;                      // 시작 노드 여부
  isEnd?: boolean;                        // 종료 노드 여부

  // 컨테이너 내부 Start/End 식별
  isInternalStart?: boolean;              // 컨테이너 내부 시작 노드
  isInternalEnd?: boolean;                // 컨테이너 내부 종료 노드

  // 서비스 설정 (일반 Process 노드용)
  serviceType?: string;                   // 서비스 타입 (Java 클래스 경로)
  serviceTypeInput?: Record<string, any>; // 서비스 타입 입력값

  // Input/Output 필드
  inputs?: IOField[];                     // 입력 필드 목록
  outputs?: IOField[];                    // 출력 필드 목록
}
```

### 3.2 Variable Node (변수 설정)

```typescript
interface VariableNodeData {
  label: string;                 // 노드 표시명 (기본: "Set Variable")
  description?: string;          // 설명
  variableName?: string;         // 변수명
  variableValue?: string;        // 변수 값
  inputs?: IOField[];            // 입력 필드
  outputs?: IOField[];           // 출력 필드
}
```

### 3.3 Mapping Node (필드 매핑)

```typescript
interface MappingNodeData {
  label: string;                          // 노드 표시명 (기본: "Mapping")
  description?: string;                   // 설명
  mappings?: MappingConnection[];         // 매핑 연결 목록 ★ 매핑 관계 저장
  inputs?: IOField[];                     // 입력 필드
  outputs?: IOField[];                    // 출력 필드
}

// 매핑 연결 정보
interface MappingConnection {
  id: string;                             // 연결 고유 ID
  sourceNodeId: string;                   // 소스 노드 ID
  sourceFieldName: string;                // 소스 필드명 (output 필드)ㅇ
  targetNodeId: string;                   // 타겟 노드 ID
  targetFieldName: string;                // 타겟 필드명 (input 필드)
}
```

### 3.4 Condition Node (If/Else)

```typescript
interface ConditionNodeData {
  label: string;                 // 노드 표시명 (기본: "IF")
  description?: string;          // 설명
  expression?: string;           // 조건식 (예: "x > 10 && y < 20")
}
```

**Handle 정보:**
- `true` (Bottom): 조건이 참일 때 연결
- `false` (Right): 조건이 거짓일 때 연결

### 3.5 Switch Node (다중 분기)

```typescript
interface SwitchNodeData {
  label: string;                 // 노드 표시명 (기본: "Switch")
  description?: string;          // 설명
  cases?: SwitchCase[];          // 케이스 목록
}

interface SwitchCase {
  value: string;                 // 케이스 값
  label?: string;                // 케이스 표시명
}
```

### 3.6 DO Node (DO 호출)

```typescript
interface DONodeData {
  label: string;                          // 노드 표시명 (기본: "Call DO")
  description?: string;                   // 설명

  // 연결된 DO 정보
  ido?: {
    componentId: string;                  // DO 컴포넌트 ID
    name: string;                         // DO 이름
    type: 'IDO' | 'IMO';                  // DO 타입 (IDO 또는 IMO)
  };

  // 반환 타입
  returnType?: {
    id: string;                           // 반환 타입 ID (예: "JexData")
    name: string;                         // 반환 타입명
  };

  inputs?: IOField[];                     // 입력 필드
  outputs?: IOField[];                    // 출력 필드
}
```

**Handle 정보:**
- `true` (Bottom Left): 성공 시 연결
- `false` (Bottom Right): 실패 시 연결

### 3.7 Script Node (스크립트)

```typescript
interface ScriptNodeData {
  label: string;                 // 노드 표시명
  description?: string;          // 설명

  scriptType?: 'standard' | 'function' | 'expression';  // 스크립트 타입
  variableName?: string;         // 결과를 저장할 변수명
  code?: string;                 // 스크립트 코드
}
```

### 3.8 Error Node (에러 처리)

```typescript
interface ErrorNodeData {
  label: string;                 // 노드 표시명
  code?: string;                 // 에러 코드
  codeName?: string;             // 에러 코드명 (표시용)
}
```

### 3.9 Group Node (Method)

```typescript
interface GroupNodeData {
  label: string;                 // 메서드 이름
  description?: string;          // 설명
  isExpanded?: boolean;          // 확장 상태
  hasChildren?: boolean;         // 내부 노드 존재 여부
  inputs?: IOField[];            // 입력 필드
  outputs?: IOField[];           // 출력 필드
}
```

### 3.10 CallGroup Node (Call Method)

```typescript
interface CallGroupNodeData {
  label: string;                 // 노드 표시명
  description?: string;          // 설명
  targetGroupId?: string;        // 호출할 그룹(메서드) ID
}
```

### 3.11 While Node (While Loop)

```typescript
interface WhileNodeData {
  label: string;                 // 노드 표시명 (기본: "While Loop")
  description?: string;          // 설명
  expression?: string;           // 반복 조건식
  isExpanded?: boolean;          // 확장 상태
  hasChildren?: boolean;         // 내부 노드 존재 여부
}
```

### 3.12 For Node (For Loop)

```typescript
interface ForNodeData {
  label: string;                 // 노드 표시명 (기본: "For Loop")
  description?: string;          // 설명
  startValue?: string;           // 시작 값
  endValue?: string;             // 종료 값
  isExpanded?: boolean;          // 확장 상태
  hasChildren?: boolean;         // 내부 노드 존재 여부
}
```

### 3.13 ForEach Node (ForEach Loop)

```typescript
interface ForEachNodeData {
  label: string;                 // 노드 표시명 (기본: "For Each Loop")
  description?: string;          // 설명
  selectedNode?: string;         // 반복 대상 노드 ID
  fieldType?: 'input' | 'output'; // 필드 구분
  fieldName?: string;            // 필드명
  isExpanded?: boolean;          // 확장 상태
  hasChildren?: boolean;         // 내부 노드 존재 여부
}
```

---

## 4. IOField 구조 (입력/출력 필드)

```typescript
interface IOField {
  id: string;                    // 필드 고유 ID
  englishName: string;           // 영문명
  koreanName: string;            // 한글명
  length: string;                // 길이
  fieldType: string;             // 필드 타입 (예: "String", "Number")
  ruleName: string;              // 룰명
  target: string;                // 타겟
  dataType: string;              // 데이터 타입
  alignment: string;             // 정렬 방식 (예: "Left", "Right")
  padding: string;               // 패딩 문자
  defaultValue: string;          // 기본값
  required: boolean;             // 필수 여부
  encryption: string;            // 암호화 방식 (예: "None", "AES")
  masking: string;               // 마스킹 방식 (예: "None", "Partial")
  checked: boolean;              // 선택 상태 (UI용)

  // 호환성 필드
  name?: string;                 // 필드명 (englishName 또는 koreanName 복사)
  type?: string;                 // 타입 (fieldType 복사)
}
```

---

## 5. Edge 구조 (연결선)

```typescript
interface Edge {
  id: string;                    // 연결선 고유 ID
  source: string;                // 출발 노드 ID
  target: string;                // 도착 노드 ID
  sourceHandle?: string | null;  // 출발 핸들 ID (예: "true", "false")
  targetHandle?: string | null;  // 도착 핸들 ID
}
```

### Edge ID 생성 규칙

```
{source}-{sourceHandle || 'default'}-{target}
```

예시:
- `node1-default-node2` (일반 연결)
- `condition1-true-node3` (조건 참 연결)
- `condition1-false-node4` (조건 거짓 연결)

---

## 6. Export 시 제외되는 필드

다음 콜백 함수들은 export 시 자동으로 제거됩니다:

| 필드 | 설명 |
|------|------|
| `onChange` | 노드 데이터 변경 콜백 |
| `onInternalPan` | 컨테이너 내부 패닝 콜백 |
| `onOpenLinkedIDOSearch` | DO 검색 모달 열기 콜백 |
| `availableGroups` | 사용 가능한 그룹 목록 (런타임) |

---

## 7. 데이터 생성 규칙

### 7.1 노드 정렬 순서

Export 시 노드는 다음 순서로 정렬됩니다:

1. **Start 노드**부터 BFS(너비 우선 탐색) 순서
2. **Edge 연결 기반** 부모 → 자식 순서
3. **컨테이너 노드**의 경우:
   - 컨테이너 노드 자체가 먼저
   - 내부 Start 노드부터 BFS 순서로 내부 노드들
4. **연결되지 않은 노드**는 마지막에 추가

### 7.2 컨테이너 노드와 내부 노드

컨테이너 노드(group, while, for, forEach)와 그 내부 노드들은 `group` 배열에 **flat 구조**로 저장됩니다:

```javascript
// 예시 구조 (실제 JSON에서는 주석 불가)
{
  "nodes": [],           // 메인 캔버스 노드들
  "edges": [],           // 연결선들
  "group": [
    { "id": "container1", "type": "group", "position": {"x": 0, "y": 0}, "data": {} },
    { "id": "internal-start", "parentId": "container1", "type": "start", "data": {} },
    { "id": "internal-node1", "parentId": "container1", "type": "process", "data": {} },
    { "id": "internal-end", "parentId": "container1", "type": "end", "data": {} }
    // 추가 컨테이너들...
  ]
}
```

### 7.3 내부 노드 식별

내부 노드는 다음 필드로 식별됩니다:
- `parentId`: 부모 컨테이너 노드의 ID
- `extent: 'parent'`: 이동 범위 제한
- `data.isInternalStart`: 내부 시작 노드 여부
- `data.isInternalEnd`: 내부 종료 노드 여부

---

## 8. 예시 JSON

### 8.1 간단한 워크플로우

```json
{
  "nodes": [
    {
      "id": "start",
      "type": "process",
      "position": { "x": 250, "y": 50 },
      "data": {
        "label": "Start",
        "description": "워크플로우 시작",
        "isStart": true
      },
      "width": 180,
      "height": 119
    },
    {
      "id": "mapping1",
      "type": "mapping",
      "position": { "x": 250, "y": 200 },
      "data": {
        "label": "Data Mapping",
        "mappings": [
          {
            "id": "map1",
            "sourceNodeId": "start",
            "sourceFieldName": "userId",
            "targetNodeId": "mapping1",
            "targetFieldName": "targetUserId"
          }
        ],
        "inputs": [
          {
            "id": "f1",
            "englishName": "targetUserId",
            "koreanName": "대상사용자ID",
            "length": "20",
            "fieldType": "String",
            "dataType": "String",
            "required": true
          }
        ]
      }
    },
    {
      "id": "end",
      "type": "process",
      "position": { "x": 250, "y": 350 },
      "data": {
        "label": "End",
        "isEnd": true
      }
    }
  ],
  "edges": [
    { "id": "start-default-mapping1", "source": "start", "target": "mapping1" },
    { "id": "mapping1-default-end", "source": "mapping1", "target": "end" }
  ],
  "version": "2.0",
  "timestamp": 1735470000000
}
```

### 8.2 조건 분기 포함

```json
{
  "nodes": [
    {
      "id": "condition1",
      "type": "condition",
      "position": { "x": 250, "y": 200 },
      "data": {
        "label": "Check User",
        "expression": "user.age >= 18"
      }
    }
  ],
  "edges": [
    { "id": "start-default-condition1", "source": "start", "target": "condition1" },
    { "id": "condition1-true-adult", "source": "condition1", "target": "adult", "sourceHandle": "true" },
    { "id": "condition1-false-minor", "source": "condition1", "target": "minor", "sourceHandle": "false" }
  ]
}
```

### 8.3 컨테이너 노드 포함

```javascript
// 예시 구조 (실제 JSON에서는 주석 불가)
{
  "nodes": [],    // 메인 캔버스 노드들 (생략)
  "edges": [],    // 연결선들 (생략)
  "group": [
    {
      "id": "while1",
      "type": "while",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Process Loop",
        "expression": "counter < 10",
        "isExpanded": false,
        "hasChildren": true
      },
      "style": { "width": 400, "height": 300 }
    },
    {
      "id": "while1-start",
      "type": "process",
      "position": { "x": 50, "y": 50 },
      "parentId": "while1",
      "extent": "parent",
      "data": {
        "label": "Loop Start",
        "isInternalStart": true
      }
    },
    {
      "id": "while1-process",
      "type": "process",
      "position": { "x": 50, "y": 150 },
      "parentId": "while1",
      "extent": "parent",
      "data": {
        "label": "Process Item"
      }
    },
    {
      "id": "while1-end",
      "type": "process",
      "position": { "x": 50, "y": 250 },
      "parentId": "while1",
      "extent": "parent",
      "data": {
        "label": "Loop End",
        "isInternalEnd": true
      }
    }
  ],
  "version": "2.0"
}
```

---

## 9. Import 시 주의사항

1. **Start 노드**: 정확히 1개만 허용
2. **End 노드**: 여러 개 허용
3. **condition → expression 마이그레이션**: 구버전의 `condition` 필드는 `expression`으로 자동 변환
4. **콜백 함수 복원**: import 후 런타임에 onChange 등 콜백 함수 재주입

---

## 10. 버전 히스토리

| 버전 | 변경 내용                        |
|------|----------------------------------|
| 2.0  | 현재 버전. group 배열 flat 구조  |
| 1.0  | 초기 버전                        |

---

*문서 작성일: 2025-12-29*
*JEX-Flow v2.0*
