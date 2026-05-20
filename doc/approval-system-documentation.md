# 액션별 서버 승인 시스템 문서

## 개요
노드의 **저장 버튼** 클릭 시 서버로 액션 정보를 전송하고, 승인 응답을 받아야만 실제 데이터가 반영되는 시스템.

---

## 검증이 적용된 노드

| 노드 타입 | 검증 대상 | 트리거 | 액션 타입 |
|----------|----------|--------|----------|
| **VariableNode** | 변수명 저장 | 저장 버튼 클릭 | `VARIABLE_SAVE` |

> 현재는 VariableNode만 저장 버튼이 있어 해당 노드에만 적용됨.
> 향후 저장 버튼이 있는 노드 추가 시 `getApprovalActionType()` 함수에 추가하면 됨.

---

## 새로 생성된 파일 (5개)

| 파일 경로 | 역할 |
|----------|------|
| `src/types/approval.ts` | 타입 정의 (ApprovalActionType, Request, Response, State) |
| `src/data/approval-mock.ts` | Mock 응답 생성기 (800ms 딜레이, 거부 테스트 가능) |
| `src/services/approvalService.ts` | 서버 통신 서비스 (`requestApproval()`) |
| `src/hooks/useActionApproval.ts` | 커스텀 훅 (`withApproval()` 래퍼) |
| `src/components/ApprovalOverlay.tsx` | 승인 대기/결과 UI 오버레이 |

---

## 수정된 파일: `src/App.tsx`

### Import 추가 (라인 82-84)
```typescript
import { useActionApproval } from './hooks/useActionApproval';
import { ApprovalOverlay } from './components/ApprovalOverlay';
import { ApprovalActionType } from './types/approval';
```

### 훅 초기화 (라인 1158)
```typescript
const { approvalState, withApproval, resetApproval } = useActionApproval();
```

### 승인 필요 여부 판별 함수 (라인 1160-1166)
```typescript
const getApprovalActionType = useCallback((nodeType: string | undefined, key: string): ApprovalActionType | null => {
  if (nodeType === 'Variable' && key === 'variableName') return 'VARIABLE_SAVE';
  return null;
}, []);
```

### 승인 래핑된 onChange 콜백 생성 함수 (라인 1168-1184)
```typescript
const createApprovedOnChange = useCallback((nodeId: string, nodeType?: string) => {
  return (key: string, value: any) => {
    const actionType = getApprovalActionType(nodeType, key);
    if (actionType) {
      // 승인 필요: withApproval로 래핑
      const wrappedFn = withApproval(...);
      wrappedFn(key, value);
    } else {
      // 승인 불필요: 즉시 실행
      updateNodeData(nodeId, key, value);
    }
  };
}, [...]);
```

### onChange 주입 위치 (7곳)

| 위치 | 라인 | 설명 |
|-----|------|------|
| `addNode()` 메인 노드 | 1371 | 새 노드 생성 시 onChange 주입 |
| `addNode()` 내부 Start 노드 | 1407 | 컨테이너 내부 Start 노드 |
| `addNode()` 내부 End 노드 | 1428 | 컨테이너 내부 End 노드 |
| `paste()` 복제 노드 | 1615 | 노드 복사/붙여넣기 시 |
| `paste()` 내부 Start 노드 | 1641 | 컨테이너 복제 시 내부 Start |
| `paste()` 내부 End 노드 | 1660 | 컨테이너 복제 시 내부 End |
| `handleImportJson()` | 2409 | JSON import 시 onChange 재주입 |

### ApprovalOverlay 렌더링 (라인 2898)
```tsx
<ApprovalOverlay state={approvalState} onDismiss={resetApproval} />
```

---

## 동작 흐름

```
VariableNode에서 저장 버튼 클릭
  ↓
onChange('variableName', value) 호출
  ↓
getApprovalActionType() → 'VARIABLE_SAVE' 반환
  ↓
withApproval()로 래핑된 함수 실행
  ↓
ApprovalOverlay에 스피너 표시 ("서버 승인 대기중...")
  ↓
requestApproval() → Mock 서버 800ms 딜레이
  ↓
응답 수신
  ├─ 승인: updateNodeData() 실행 → 오버레이 사라짐
  └─ 거부: 오버레이에 거부 메시지 표시 → 데이터 미반영
```

---

## 테스트 방법

### 1. 정상 승인 테스트
1. `npm run dev`로 개발 서버 실행
2. Variable 노드 추가
3. 변수명 입력 후 저장 버튼 클릭
4. 스피너가 약 800ms 표시 후 저장 완료 확인

### 2. 거부 테스트
`src/data/approval-mock.ts` 수정:
```typescript
// 파일 상단에 추가
MOCK_APPROVAL_RESPONSES.setRejected('VARIABLE_SAVE', true);
```
저장 버튼 클릭 시 거부 메시지가 표시되고 데이터가 반영되지 않음.

### 3. 콘솔 로그 확인
브라우저 개발자 도구 콘솔에서 `[ApprovalMock]` 로그 확인:
```
[ApprovalMock] 승인 요청: { actionType: 'VARIABLE_SAVE', nodeId: '...', payload: {...} }
[ApprovalMock] 승인됨: VARIABLE_SAVE
```

---

## 향후 확장

저장 버튼이 있는 새 노드 추가 시:

1. `src/types/approval.ts`에 액션 타입 추가:
```typescript
export type ApprovalActionType =
  | 'VARIABLE_SAVE'
  | 'NEW_NODE_SAVE';  // 새 노드 타입 추가
```

2. `src/App.tsx`의 `getApprovalActionType()` 함수에 조건 추가:
```typescript
const getApprovalActionType = useCallback((nodeType, key) => {
  if (nodeType === 'Variable' && key === 'variableName') return 'VARIABLE_SAVE';
  if (nodeType === 'NewNode' && key === 'someField') return 'NEW_NODE_SAVE';  // 추가
  return null;
}, []);
```

---

## 관련 파일 전체 목록

```
src/
├── types/
│   └── approval.ts           # 타입 정의
├── data/
│   └── approval-mock.ts      # Mock 응답
├── services/
│   └── approvalService.ts    # API 서비스
├── hooks/
│   └── useActionApproval.ts  # 커스텀 훅
├── components/
│   └── ApprovalOverlay.tsx   # UI 오버레이
└── App.tsx                   # 통합 (라인 82-84, 1158-1184, 1371, 1407, 1428, 1615, 1641, 1660, 2409, 2898)
```
